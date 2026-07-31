export const modelReleaseStatuses = [
  "candidate",
  "approved",
  "rejected",
  "retired",
] as const;

export interface ModelReleaseManifest {
  releaseId: string;
  status: (typeof modelReleaseStatuses)[number];
  provider: "openai";
  api: "responses";
  model: string;
  reasoningEffort: "low" | "medium" | "high";
  promptVersion: string;
  policyVersion: string;
  schemaVersion: string;
  promptHash: `sha256:${string}`;
  schemaHash: `sha256:${string}`;
  store: false;
  toolsEnabled: false;
  externalWritesEnabled: false;
  evaluationSuite: string;
  evaluationStatus: "pending" | "passed" | "failed";
  approverReference: string | null;
  rollbackReleaseId: string;
  sourceUrls: string[];
}

export class ModelReleaseValidationError extends Error {}

export function validateModelReleaseManifest(
  value: ModelReleaseManifest,
): ModelReleaseManifest {
  if (
    !value.releaseId ||
    !value.model ||
    value.model === "gpt-5.6" ||
    value.model.endsWith("-latest")
  ) {
    throw new ModelReleaseValidationError(
      "A release must use an exact model identifier, not an alias",
    );
  }
  if (value.store || value.toolsEnabled || value.externalWritesEnabled) {
    throw new ModelReleaseValidationError(
      "Nova Release 1 model access must be non-stored and tool-disconnected",
    );
  }
  if (
    !value.promptHash.startsWith("sha256:") ||
    !value.schemaHash.startsWith("sha256:")
  ) {
    throw new ModelReleaseValidationError("Release assets require SHA-256 hashes");
  }
  if (value.status === "approved") {
    if (value.evaluationStatus !== "passed" || !value.approverReference) {
      throw new ModelReleaseValidationError(
        "Approval requires passing evaluations and an approver reference",
      );
    }
  }
  if (value.sourceUrls.some((url) => !url.startsWith("https://developers.openai.com/"))) {
    throw new ModelReleaseValidationError(
      "Model guidance sources must be official OpenAI developer documentation",
    );
  }
  return structuredClone(value);
}
