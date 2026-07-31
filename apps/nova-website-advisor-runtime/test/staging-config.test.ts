import { describe, expect, it } from "vitest";
import {
  evaluateStagingReadiness,
  StagingConfigurationError,
  type StagingRuntimeConfig,
  validateStagingConfig,
} from "../src/index.js";

function candidate(
  overrides: Partial<StagingRuntimeConfig> = {},
): StagingRuntimeConfig {
  return {
    environment: "staging",
    releaseId: "nova-web-r1-s001",
    publicOrigin: "https://nova-staging.moonrock.test",
    deploymentTargetId: "pending-managed-node-target",
    secretStoreId: "pending-host-secret-store",
    secretReferences: {
      modelCredential: "secretref://nova-staging/model",
      ghlCredential: "secretref://nova-staging/ghl",
      stateCredential: "secretref://nova-staging/state",
    },
    state: {
      backend: "durable",
      namespace: "nova-web-staging",
      retentionPolicyId: "retention-policy-pending-approval",
      transcriptStorage: "disabled",
    },
    providers: {
      model: "disconnected",
      ghl: "disconnected",
      externalWritesEnabled: false,
    },
    observability: {
      sinkId: "pending-redacted-event-sink",
      alertPolicyId: "pending-staging-alert-policy",
      rawMessageLogging: false,
    },
    gates: {
      deploymentTargetApproved: false,
      secretStoreApproved: false,
      durableStateDesignApproved: false,
      providerSandboxApproved: false,
      knowledgeBundleApproved: false,
      privacyReviewApproved: false,
      securityThreatModelApproved: false,
      accessibilityReviewApproved: false,
      incidentOwnerAssigned: false,
      rollbackArtifactVerified: false,
    },
    ...overrides,
  };
}

describe("staging configuration contract", () => {
  it("accepts a provider-disconnected, fail-closed staging candidate", () => {
    expect(validateStagingConfig(candidate())).toEqual(candidate());
  });

  it("rejects a production environment", () => {
    expect(() => validateStagingConfig({
      ...candidate(),
      environment: "production",
    })).toThrow(StagingConfigurationError);
  });

  it("rejects non-HTTPS and path-bearing public origins", () => {
    expect(() => validateStagingConfig({
      ...candidate(),
      publicOrigin: "http://localhost:8787/prototype",
    })).toThrow(/HTTPS origin/);
  });

  it("accepts only opaque secret references, never inline values", () => {
    expect(() => validateStagingConfig({
      ...candidate(),
      secretReferences: {
        ...candidate().secretReferences,
        modelCredential: "sk-inline-value",
      },
    })).toThrow(/secretref URI/);
  });

  it("requires every secret reference", () => {
    const value = candidate() as unknown as {
      secretReferences: Record<string, string>;
    };
    delete value.secretReferences.stateCredential;
    expect(() => validateStagingConfig(value)).toThrow(/stateCredential/);
  });

  it("requires durable state with transcript storage disabled", () => {
    expect(() => validateStagingConfig({
      ...candidate(),
      state: {
        ...candidate().state,
        backend: "memory",
        transcriptStorage: "enabled",
      },
    })).toThrow(/durable state/);
  });

  it("cannot enable external writes in the architecture sprint", () => {
    expect(() => validateStagingConfig({
      ...candidate(),
      providers: {
        ...candidate().providers,
        externalWritesEnabled: true,
      },
    })).toThrow(/external writes/);
  });

  it("requires raw visitor-message logging to remain disabled", () => {
    expect(() => validateStagingConfig({
      ...candidate(),
      observability: {
        ...candidate().observability,
        rawMessageLogging: true,
      },
    })).toThrow(/Raw message logging/);
  });

  it("reports every unresolved gate and disconnected provider", () => {
    const decision = evaluateStagingReadiness(candidate());
    expect(decision.ready).toBe(false);
    expect(decision.authority).toBe("HUMAN_RELEASE_OWNER");
    expect(decision.externalWritesEnabled).toBe(false);
    expect(decision.blockers).toContain("deploymentTargetApproved");
    expect(decision.blockers).toContain("modelProviderDisconnected");
    expect(decision.blockers).toContain("ghlProviderDisconnected");
  });

  it("rejects an incomplete gate set", () => {
    const value = candidate() as unknown as {
      gates: Record<string, boolean>;
    };
    delete value.gates.rollbackArtifactVerified;
    expect(() => validateStagingConfig(value)).toThrow(/Every staging activation gate/);
  });

  it("still prohibits writes when all readiness controls are satisfied", () => {
    const config = candidate({
      providers: {
        model: "sandbox",
        ghl: "sandbox",
        externalWritesEnabled: false,
      },
      gates: Object.fromEntries(
        Object.keys(candidate().gates).map((gate) => [gate, true]),
      ) as unknown as StagingRuntimeConfig["gates"],
    });
    expect(evaluateStagingReadiness(config)).toEqual({
      ready: true,
      blockers: [],
      authority: "HUMAN_RELEASE_OWNER",
      externalWritesEnabled: false,
    });
  });
});
