import type {
  ConsentCategory,
  RiskSignal,
  Session,
  ToolName,
} from "./domain.js";

export type PolicyDecision =
  | { decision: "allow"; reasonCode: "POLICY_ALLOW" }
  | { decision: "deny"; reasonCode: string }
  | {
      decision: "require_consent";
      reasonCode: "CONSENT_REQUIRED";
      requiredConsent: ConsentCategory[];
    }
  | { decision: "require_human"; reasonCode: string }
  | { decision: "degrade"; reasonCode: string };

const mandatoryHumanRisks = new Set<RiskSignal>([
  "safety",
  "legal",
  "government",
  "media",
  "fraud",
  "security",
  "privacy",
  "discrimination",
  "billing_dispute",
  "refund",
  "contract",
  "credential",
  "sensitive_data",
  "authority_uncertain",
  "knowledge_conflict",
]);

const toolConsent: Readonly<Partial<Record<ToolName, ConsentCategory[]>>> = {
  create_contact: ["save_contact"],
  update_contact_with_consent: ["save_contact"],
  create_opportunity_for_review: ["save_contact"],
  create_follow_up_task: ["save_contact"],
  request_appointment: ["save_contact", "appointment_notifications"],
  record_conversation_summary: ["save_contact"],
  record_consent_evidence: [],
  record_escalation: [],
};

const allowedToolStates: Readonly<Partial<Record<ToolName, string[]>>> = {
  find_contact_candidates: ["CONSENT_REQUESTED", "ADMINISTRATIVE_ACTION_PENDING"],
  create_contact: ["CONSENT_REQUESTED", "ADMINISTRATIVE_ACTION_PENDING"],
  update_contact_with_consent: [
    "CONSENT_REQUESTED",
    "ADMINISTRATIVE_ACTION_PENDING",
  ],
  create_opportunity_for_review: ["ADMINISTRATIVE_ACTION_PENDING"],
  create_follow_up_task: ["ADMINISTRATIVE_ACTION_PENDING"],
  list_approved_slots: ["ROUTE_PROPOSED", "CONSENT_REQUESTED"],
  request_appointment: ["ADMINISTRATIVE_ACTION_PENDING"],
  record_conversation_summary: ["ADMINISTRATIVE_ACTION_PENDING"],
  record_consent_evidence: ["CONSENT_REQUESTED", "AWAITING_CONSENT"],
  record_escalation: [
    "DISCLOSED",
    "INTENT_IDENTIFIED",
    "DISCOVERY_IN_PROGRESS",
    "ROUTE_PROPOSED",
    "ESCALATED",
  ],
};

export interface RuntimeHealth {
  model: "healthy" | "unavailable";
  ghlReads: "healthy" | "unavailable";
  ghlWrites: "healthy" | "unavailable";
}

export class PolicyEngine {
  evaluateTool(input: {
    session: Session;
    tool: ToolName;
    riskSignals: RiskSignal[];
    health: RuntimeHealth;
    killSwitchEnabled: boolean;
  }): PolicyDecision {
    if (input.killSwitchEnabled) {
      return { decision: "degrade", reasonCode: "KILL_SWITCH_ENABLED" };
    }

    if (input.riskSignals.some((risk) => mandatoryHumanRisks.has(risk))) {
      if (input.tool !== "record_escalation") {
        return { decision: "require_human", reasonCode: "PROTECTED_RISK" };
      }
    }

    const states = allowedToolStates[input.tool] ?? [];
    if (!states.includes(input.session.state)) {
      return { decision: "deny", reasonCode: "STATE_NOT_ALLOWED" };
    }

    if (
      (input.tool === "find_contact_candidates" ||
        input.tool === "list_approved_slots") &&
      input.health.ghlReads === "unavailable"
    ) {
      return { decision: "degrade", reasonCode: "GHL_READS_UNAVAILABLE" };
    }

    if (
      input.tool !== "find_contact_candidates" &&
      input.tool !== "list_approved_slots" &&
      input.health.ghlWrites === "unavailable"
    ) {
      return { decision: "degrade", reasonCode: "GHL_WRITES_UNAVAILABLE" };
    }

    const required = toolConsent[input.tool] ?? [];
    const missing = required.filter(
      (category) => input.session.consent[category] !== "granted",
    );
    if (missing.length > 0) {
      return {
        decision: "require_consent",
        reasonCode: "CONSENT_REQUIRED",
        requiredConsent: missing,
      };
    }

    return { decision: "allow", reasonCode: "POLICY_ALLOW" };
  }
}

