export type ProviderMode = "disconnected" | "sandbox";

export interface StagingRuntimeConfig {
  environment: "staging";
  releaseId: string;
  publicOrigin: string;
  deploymentTargetId: string;
  secretStoreId: string;
  secretReferences: {
    modelCredential: string;
    ghlCredential: string;
    stateCredential: string;
  };
  state: {
    backend: "durable";
    namespace: string;
    retentionPolicyId: string;
    transcriptStorage: "disabled";
  };
  providers: {
    model: ProviderMode;
    ghl: ProviderMode;
    externalWritesEnabled: false;
  };
  observability: {
    sinkId: string;
    alertPolicyId: string;
    rawMessageLogging: false;
  };
  gates: StagingActivationGates;
}

export interface StagingActivationGates {
  deploymentTargetApproved: boolean;
  secretStoreApproved: boolean;
  durableStateDesignApproved: boolean;
  providerSandboxApproved: boolean;
  knowledgeBundleApproved: boolean;
  privacyReviewApproved: boolean;
  securityThreatModelApproved: boolean;
  accessibilityReviewApproved: boolean;
  incidentOwnerAssigned: boolean;
  rollbackArtifactVerified: boolean;
}

export interface StagingReadinessDecision {
  ready: boolean;
  blockers: Array<keyof StagingActivationGates | "modelProviderDisconnected" | "ghlProviderDisconnected">;
  authority: "HUMAN_RELEASE_OWNER";
  externalWritesEnabled: false;
}

export class StagingConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StagingConfigurationError";
  }
}

const idPattern = /^[a-z0-9][a-z0-9._-]{2,127}$/;
const secretReferencePattern = /^secretref:\/\/[a-z0-9][a-z0-9/_-]{2,255}$/;
const secretReferenceNames = [
  "modelCredential",
  "ghlCredential",
  "stateCredential",
] as const;
const gateNames = [
  "deploymentTargetApproved",
  "secretStoreApproved",
  "durableStateDesignApproved",
  "providerSandboxApproved",
  "knowledgeBundleApproved",
  "privacyReviewApproved",
  "securityThreatModelApproved",
  "accessibilityReviewApproved",
  "incidentOwnerAssigned",
  "rollbackArtifactVerified",
] as const satisfies readonly (keyof StagingActivationGates)[];

export function validateStagingConfig(value: unknown): StagingRuntimeConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new StagingConfigurationError("Staging configuration must be an object");
  }
  const input = value as Partial<StagingRuntimeConfig>;
  if (input.environment !== "staging") {
    throw new StagingConfigurationError("Only the staging environment is accepted");
  }
  validateId(input.releaseId, "releaseId");
  validateId(input.deploymentTargetId, "deploymentTargetId");
  validateId(input.secretStoreId, "secretStoreId");
  validateHttpsOrigin(input.publicOrigin);
  if (!input.secretReferences) {
    throw new StagingConfigurationError("secretReferences are required");
  }
  for (const name of secretReferenceNames) {
    const reference = input.secretReferences[name];
    if (typeof reference !== "string" || !secretReferencePattern.test(reference)) {
      throw new StagingConfigurationError(`${name} must be an opaque secretref URI`);
    }
  }
  if (
    input.state?.backend !== "durable"
    || input.state.transcriptStorage !== "disabled"
  ) {
    throw new StagingConfigurationError(
      "Staging requires durable state and disabled transcript storage",
    );
  }
  validateId(input.state.namespace, "state.namespace");
  validateId(input.state.retentionPolicyId, "state.retentionPolicyId");
  if (
    !input.providers
    || !["disconnected", "sandbox"].includes(input.providers.model)
    || !["disconnected", "sandbox"].includes(input.providers.ghl)
    || input.providers.externalWritesEnabled !== false
  ) {
    throw new StagingConfigurationError(
      "Providers must be disconnected or sandboxed and external writes must remain disabled",
    );
  }
  if (
    !input.observability
    || input.observability.rawMessageLogging !== false
  ) {
    throw new StagingConfigurationError("Raw message logging must remain disabled");
  }
  validateId(input.observability.sinkId, "observability.sinkId");
  validateId(input.observability.alertPolicyId, "observability.alertPolicyId");
  if (
    !input.gates
    || gateNames.some((name) => typeof input.gates?.[name] !== "boolean")
  ) {
    throw new StagingConfigurationError("Every staging activation gate is required");
  }
  return structuredClone(input as StagingRuntimeConfig);
}

export function evaluateStagingReadiness(
  config: StagingRuntimeConfig,
): StagingReadinessDecision {
  const blockers = (Object.entries(config.gates) as Array<
    [keyof StagingActivationGates, boolean]
  >)
    .filter(([, approved]) => !approved)
    .map(([gate]) => gate) as StagingReadinessDecision["blockers"];
  if (config.providers.model !== "sandbox") blockers.push("modelProviderDisconnected");
  if (config.providers.ghl !== "sandbox") blockers.push("ghlProviderDisconnected");
  return {
    ready: blockers.length === 0,
    blockers,
    authority: "HUMAN_RELEASE_OWNER",
    externalWritesEnabled: false,
  };
}

function validateId(value: unknown, name: string): asserts value is string {
  if (typeof value !== "string" || !idPattern.test(value)) {
    throw new StagingConfigurationError(`${name} is not a valid opaque identifier`);
  }
}

function validateHttpsOrigin(value: unknown): asserts value is string {
  if (typeof value !== "string") {
    throw new StagingConfigurationError("publicOrigin is required");
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new StagingConfigurationError("publicOrigin must be a valid URL");
  }
  if (
    url.protocol !== "https:"
    || url.username
    || url.password
    || url.pathname !== "/"
    || url.search
    || url.hash
  ) {
    throw new StagingConfigurationError(
      "publicOrigin must be an HTTPS origin without credentials, path, query, or fragment",
    );
  }
}
