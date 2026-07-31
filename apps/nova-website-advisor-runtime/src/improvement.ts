import { randomUUID } from "node:crypto";
import { redactSensitiveText } from "./redaction.js";

export const improvementStatuses = [
  "RECORDED",
  "TRIAGED",
  "INVESTIGATED",
  "PROPOSED",
  "REVIEWED",
  "APPROVED",
  "IMPLEMENTED",
  "VERIFIED",
  "PUBLISHED",
  "REJECTED",
] as const;

export type ImprovementStatus = (typeof improvementStatuses)[number];
export type ImprovementActor =
  | "NOVA"
  | "OPERATOR"
  | "APPROVER"
  | "IMPLEMENTER"
  | "PUBLISHER";
export type TriageClass =
  | "correctness_or_safety"
  | "knowledge_gap_or_contradiction"
  | "client_experience"
  | "operational_efficiency"
  | "capability_enhancement"
  | "automation_opportunity"
  | "governance_or_compliance"
  | "deferred_idea";
export type RiskClass = "low" | "moderate" | "high" | "protected";

export interface ImprovementInput {
  observation: string;
  sourceReference: string;
  affectedCapability: string;
  evidenceReferences: string[];
  confidence: "low" | "medium" | "high";
  businessImpact: string;
  urgency: "routine" | "priority" | "urgent";
  privacyConcern: boolean;
  proposedAction: string;
  owner: string;
  reviewers: string[];
  approvalClass: "operational" | "executive" | "legal_security_privacy";
  successMeasure: string;
  triageClass: TriageClass;
  riskClass: RiskClass;
}

export interface ImprovementHistory {
  from: ImprovementStatus | null;
  to: ImprovementStatus;
  actor: ImprovementActor;
  actorId: string;
  reason: string;
  occurredAt: string;
}

export interface ImprovementRecord extends ImprovementInput {
  id: string;
  status: ImprovementStatus;
  controllingKnowledge: false;
  redactionApplied: boolean;
  createdAt: string;
  updatedAt: string;
  history: ImprovementHistory[];
}

const nextStatuses: Readonly<Record<ImprovementStatus, readonly ImprovementStatus[]>> = {
  RECORDED: ["TRIAGED", "REJECTED"],
  TRIAGED: ["INVESTIGATED", "REJECTED"],
  INVESTIGATED: ["PROPOSED", "REJECTED"],
  PROPOSED: ["REVIEWED", "REJECTED"],
  REVIEWED: ["APPROVED", "REJECTED"],
  APPROVED: ["IMPLEMENTED", "REJECTED"],
  IMPLEMENTED: ["VERIFIED", "REJECTED"],
  VERIFIED: ["PUBLISHED", "REJECTED"],
  PUBLISHED: [],
  REJECTED: [],
};

const actorForTarget: Readonly<Record<ImprovementStatus, readonly ImprovementActor[]>> = {
  RECORDED: ["NOVA", "OPERATOR"],
  TRIAGED: ["OPERATOR"],
  INVESTIGATED: ["OPERATOR"],
  PROPOSED: ["NOVA", "OPERATOR"],
  REVIEWED: ["APPROVER"],
  APPROVED: ["APPROVER"],
  IMPLEMENTED: ["IMPLEMENTER"],
  VERIFIED: ["APPROVER"],
  PUBLISHED: ["PUBLISHER"],
  REJECTED: ["OPERATOR", "APPROVER"],
};

export class ImprovementGovernanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImprovementGovernanceError";
  }
}

export class InMemoryContinuousLearningQueue {
  readonly #records = new Map<string, ImprovementRecord>();

  record(
    input: ImprovementInput,
    actor: Pick<ImprovementHistory, "actor" | "actorId">,
    now = new Date(),
  ): ImprovementRecord {
    if (!actorForTarget.RECORDED.includes(actor.actor)) {
      throw new ImprovementGovernanceError("Actor cannot record observations");
    }
    validateInput(input);
    const redacted = redactSensitiveText(input.observation);
    const timestamp = now.toISOString();
    const record: ImprovementRecord = {
      ...structuredClone(input),
      observation: redacted.text,
      id: randomUUID(),
      status: "RECORDED",
      controllingKnowledge: false,
      redactionApplied: redacted.redacted,
      createdAt: timestamp,
      updatedAt: timestamp,
      history: [{
        from: null,
        to: "RECORDED",
        actor: actor.actor,
        actorId: actor.actorId,
        reason: "OBSERVATION_RECORDED",
        occurredAt: timestamp,
      }],
    };
    this.#records.set(record.id, record);
    return structuredClone(record);
  }

  transition(
    id: string,
    to: ImprovementStatus,
    actor: Pick<ImprovementHistory, "actor" | "actorId">,
    reason: string,
    now = new Date(),
  ): ImprovementRecord {
    const record = this.#records.get(id);
    if (!record) throw new ImprovementGovernanceError("Improvement not found");
    if (!nextStatuses[record.status].includes(to)) {
      throw new ImprovementGovernanceError(
        `Invalid improvement transition: ${record.status} -> ${to}`,
      );
    }
    if (!actorForTarget[to].includes(actor.actor)) {
      throw new ImprovementGovernanceError(
        `${actor.actor} cannot authorize ${to}`,
      );
    }
    if (
      to === "APPROVED"
      && record.riskClass === "protected"
      && record.approvalClass !== "legal_security_privacy"
    ) {
      throw new ImprovementGovernanceError(
        "Protected changes require legal, security, or privacy approval",
      );
    }
    const timestamp = now.toISOString();
    record.history.push({
      from: record.status,
      to,
      actor: actor.actor,
      actorId: actor.actorId,
      reason: bounded(reason, "reason", 500),
      occurredAt: timestamp,
    });
    record.status = to;
    record.updatedAt = timestamp;
    return structuredClone(record);
  }

  get(id: string): ImprovementRecord | null {
    const record = this.#records.get(id);
    return record ? structuredClone(record) : null;
  }

  list(): ImprovementRecord[] {
    return [...this.#records.values()].map((record) => structuredClone(record));
  }
}

function validateInput(input: ImprovementInput): void {
  bounded(input.observation, "observation", 2_000);
  bounded(input.sourceReference, "sourceReference", 500);
  bounded(input.affectedCapability, "affectedCapability", 200);
  bounded(input.businessImpact, "businessImpact", 1_000);
  bounded(input.proposedAction, "proposedAction", 2_000);
  bounded(input.owner, "owner", 200);
  bounded(input.successMeasure, "successMeasure", 1_000);
  if (input.reviewers.length < 1) {
    throw new ImprovementGovernanceError("At least one reviewer is required");
  }
  if (input.evidenceReferences.length < 1) {
    throw new ImprovementGovernanceError("At least one evidence reference is required");
  }
}

function bounded(value: string, name: string, max: number): string {
  if (!value.trim() || value.length > max) {
    throw new ImprovementGovernanceError(`${name} must be 1-${max} characters`);
  }
  return value;
}

export interface ExperimentDefinition {
  id: string;
  hypothesis: string;
  scope: string;
  owner: string;
  participants: string[];
  dataBoundary: string;
  baseline: string;
  metric: string;
  duration: string;
  stopCondition: string;
  rollback: string;
  riskClass: RiskClass;
  approvalEvidence: string | null;
  status: "DRAFT" | "APPROVED" | "ACTIVE" | "STOPPED" | "COMPLETED";
}

export function authorizeExperiment(
  experiment: ExperimentDefinition,
  actor: ImprovementActor,
): ExperimentDefinition {
  if (actor !== "APPROVER") {
    throw new ImprovementGovernanceError("Only an approver may authorize an experiment");
  }
  if (
    (experiment.riskClass === "high" || experiment.riskClass === "protected")
    && !experiment.approvalEvidence
  ) {
    throw new ImprovementGovernanceError("High-risk experiments require approval evidence");
  }
  if (experiment.status !== "DRAFT") {
    throw new ImprovementGovernanceError("Only draft experiments may be approved");
  }
  return { ...structuredClone(experiment), status: "APPROVED" };
}
