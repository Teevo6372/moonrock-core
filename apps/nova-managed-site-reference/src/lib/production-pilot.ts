import type { SiteRevision } from "./orchestration";
import {
  createProductionReleaseEvidence,
  type ProductionReleaseEvidence,
} from "./release-evidence";
import type {
  ProductionReleaseResult,
  ReleaseDecision,
} from "./release-gate";
import {
  HttpProductionDeploymentVerifier,
  type ProductionDeploymentVerificationResult,
} from "./live-release-safety";
import {
  runOperatorProductionRelease,
  type OperatorReleaseEnvelope,
  type OperatorReleaseEnvironment,
  type OperatorReleaseRuntime,
} from "./operator-release";

export interface ProductionPilotRuntime extends OperatorReleaseRuntime {
  verificationFetch?: typeof fetch;
  now?: () => string;
}

export interface ProductionPilotSuccess {
  status: "verified";
  release: ProductionReleaseResult;
  verification: ProductionDeploymentVerificationResult;
  evidence: ProductionReleaseEvidence;
}

export interface ProductionPilotBlocked {
  status: "blocked";
  decision: ReleaseDecision;
}

export type ProductionPilotResult = ProductionPilotSuccess | ProductionPilotBlocked;

function buildPreviousProductionRevision(
  envelope: OperatorReleaseEnvelope,
  environment: OperatorReleaseEnvironment,
): SiteRevision {
  return {
    repository: envelope.candidate.revision.repository,
    branch: environment.productionBranch,
    commitSha: environment.expectedProductionCommitSha,
  };
}

export async function runProductionPilot(input: {
  envelope: OperatorReleaseEnvelope;
  environment: OperatorReleaseEnvironment;
  expectedContentMarker: string;
  runtime?: ProductionPilotRuntime;
}): Promise<ProductionPilotResult> {
  const marker = input.expectedContentMarker.trim();
  if (!marker) {
    throw new Error("production_pilot_marker_missing");
  }

  if (
    input.envelope.candidate.request.risk !== "low" ||
    input.envelope.candidate.request.mode !== "auto"
  ) {
    throw new Error("production_pilot_low_risk_required");
  }

  const runtime = input.runtime ?? {};
  const release = await runOperatorProductionRelease(
    input.envelope,
    input.environment,
    runtime,
  );

  if ("status" in release && release.status === "blocked") {
    return { status: "blocked", decision: release };
  }

  const verifier = new HttpProductionDeploymentVerifier(runtime.verificationFetch);
  const verification = await verifier.verify({
    deploymentUrl: release.deploymentUrl,
    expectedContentMarker: marker,
  });

  if (verification.deploymentUrl !== release.deploymentUrl) {
    throw new Error("production_pilot_verification_url_mismatch");
  }

  const evidence = createProductionReleaseEvidence({
    candidate: input.envelope.candidate,
    authorization: input.envelope.authorization,
    previousProductionRevision: buildPreviousProductionRevision(
      input.envelope,
      input.environment,
    ),
    result: release,
    recordedAt: runtime.now?.() ?? new Date().toISOString(),
  });

  return {
    status: "verified",
    release,
    verification,
    evidence,
  };
}
