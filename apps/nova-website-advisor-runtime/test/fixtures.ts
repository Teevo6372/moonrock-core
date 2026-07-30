import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { ModelProposal } from "../src/domain.js";
import {
  ApprovedKnowledgeRepository,
  calculateKnowledgeHash,
  type KnowledgeRecord,
} from "../src/knowledge.js";

export function loadModelSchema(): object {
  const path = fileURLToPath(
    new URL(
      "../../../0000-enterprise/programs/program-006/runtime-activation/website-advisor/sprint-003/schemas/model-output.schema.json",
      import.meta.url,
    ),
  );
  return JSON.parse(readFileSync(path, "utf8")) as object;
}

export function proposal(
  overrides: Partial<ModelProposal> = {},
): ModelProposal {
  return {
    responseText: "Tell me a little more about what you want to accomplish.",
    primaryIntent: "LAUNCH",
    secondaryIntents: [],
    intentConfidence: "high",
    facts: [],
    visitorStatements: [],
    inferences: [],
    unknowns: [],
    knowledgeCitations: [],
    recommendedState: "DISCOVERY_IN_PROGRESS",
    recommendedRoute: null,
    riskSignals: [],
    requestedTool: null,
    requestedToolArguments: null,
    ...overrides,
  };
}

export function knowledgeRepository(
  records?: KnowledgeRecord[],
): ApprovedKnowledgeRepository {
  const safeRecords: KnowledgeRecord[] = records ?? [
    {
      id: "faq-launch",
      intent: "ALL",
      content: "Moonrock helps visitors clarify a practical next step.",
      sourceId: "nova-role",
      version: "1.0.0",
      section: "Public role",
      status: "approved",
      classification: "public-approved",
      reviewAt: "2099-01-01T00:00:00.000Z",
    },
  ];
  return new ApprovedKnowledgeRepository({
    bundleId: "nova-website-advisor-r1",
    version: "1.0.0-test",
    contentHash: calculateKnowledgeHash(safeRecords),
    records: safeRecords,
  });
}

