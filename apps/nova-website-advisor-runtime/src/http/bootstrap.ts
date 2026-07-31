import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ApprovedKnowledgeRepository,
  calculateKnowledgeHash,
  type KnowledgeBundle,
  type KnowledgeRecord,
} from "../knowledge.js";
import { MockGhlAdapter, MockModelAdapter } from "../adapters.js";
import { InMemoryEventSink } from "../events.js";
import { KillSwitch } from "../kill-switch.js";
import { NovaOrchestrator } from "../orchestrator.js";
import { PolicyEngine, type RuntimeHealth } from "../policy.js";
import { createModelProposalValidator } from "../schema-validation.js";
import { InMemorySessionStore } from "../session-store.js";
import type { Intent, ModelProposal, RiskSignal } from "../domain.js";
import { BoundedEventStreamHub, projectPublicEvent } from "../event-stream.js";

export interface LocalRuntime {
  orchestrator: NovaOrchestrator;
  sessions: InMemorySessionStore;
  events: InMemoryEventSink;
  ghl: MockGhlAdapter;
  killSwitch: KillSwitch;
  health: RuntimeHealth;
  knowledgeVersion: string;
  eventStream: BoundedEventStreamHub;
}

function parseJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

function intentFor(text: string): Intent {
  const normalized = text.toLowerCase();
  if (/\b(book|appointment|call|meeting)\b/.test(normalized)) return "BOOKING";
  if (/\b(complaint|refund|billing|charged)\b/.test(normalized)) return "COMPLAINT";
  if (/\b(grow|growth|scale|leads)\b/.test(normalized)) return "GROWTH";
  if (/\b(launch|start|new business)\b/.test(normalized)) return "LAUNCH";
  return "OTHER";
}

function proposal(text: string): ModelProposal {
  const primaryIntent = intentFor(text);
  const riskSignals: RiskSignal[] =
    primaryIntent === "COMPLAINT" ? ["billing_dispute"] : [];
  const responseText =
    primaryIntent === "COMPLAINT"
      ? "I’m sorry you’re dealing with that. A Moonrock team member needs to review this request."
      : primaryIntent === "BOOKING"
        ? "I can help prepare a booking request. You’ll review the details and provide explicit contact and notification consent before anything is recorded."
        : primaryIntent === "LAUNCH"
          ? "What are you launching, who is it for, and what outcome would make this launch successful?"
          : primaryIntent === "GROWTH"
            ? "What is growing today, and which constraint is most important to solve first?"
            : "What are you hoping to accomplish, and what is the main obstacle right now?";
  return {
    responseText,
    primaryIntent,
    secondaryIntents: [],
    intentConfidence: primaryIntent === "OTHER" ? "low" : "high",
    facts: [],
    visitorStatements: [{ statement: text, source: "visitor-message" }],
    inferences: [],
    unknowns: [],
    knowledgeCitations: [],
    recommendedState: riskSignals.length ? "ESCALATED" : "DISCOVERY_IN_PROGRESS",
    recommendedRoute: riskSignals.length ? "human-review" : null,
    riskSignals,
    requestedTool: null,
    requestedToolArguments: null,
  };
}

export function createLocalRuntime(baseDir = process.cwd()): LocalRuntime {
  const rawBundle = parseJson(resolve(baseDir, "fixtures/synthetic-knowledge.json")) as {
    bundleId: KnowledgeBundle["bundleId"];
    version: string;
    records: KnowledgeRecord[];
  };
  const knowledge = new ApprovedKnowledgeRepository({
    ...rawBundle,
    contentHash: calculateKnowledgeHash(rawBundle.records),
  });
  const modelSchema = parseJson(
    resolve(
      baseDir,
      "../../0000-enterprise/programs/program-006/runtime-activation/website-advisor/sprint-003/schemas/model-output.schema.json",
    ),
  ) as object;
  const sessions = new InMemorySessionStore();
  const events = new InMemoryEventSink();
  const eventStream = new BoundedEventStreamHub();
  events.subscribe((event) => {
    eventStream.publish(projectPublicEvent(event), event.sessionId);
  });
  const ghl = new MockGhlAdapter();
  const killSwitch = new KillSwitch();
  const health: RuntimeHealth = {
    model: "healthy",
    ghlReads: "healthy",
    ghlWrites: "healthy",
  };
  return {
    sessions,
    events,
    ghl,
    killSwitch,
    health,
    knowledgeVersion: knowledge.version,
    eventStream,
    orchestrator: new NovaOrchestrator({
      sessions,
      events,
      ghl,
      killSwitch,
      health,
      knowledge,
      model: new MockModelAdapter(({ message }) => proposal(message.text)),
      policy: new PolicyEngine(),
      validateProposal: createModelProposalValidator(modelSchema),
    }),
  };
}
