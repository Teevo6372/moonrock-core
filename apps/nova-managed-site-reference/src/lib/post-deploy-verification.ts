import type { ProductionReleaseResult } from "./release-gate";
import type {
  ProductionDeploymentVerificationRequest,
  ProductionDeploymentVerificationResult,
  ProductionDeploymentVerifier,
} from "./live-release-safety";

export interface VerifiedProductionRelease {
  release: ProductionReleaseResult;
  verification: ProductionDeploymentVerificationResult;
}

export async function verifyProductionRelease(
  release: ProductionReleaseResult,
  verifier: ProductionDeploymentVerifier,
  expectedContentMarker: string,
): Promise<VerifiedProductionRelease> {
  const request: ProductionDeploymentVerificationRequest = {
    deploymentUrl: release.deploymentUrl,
    expectedContentMarker,
  };

  const verification = await verifier.verify(request);
  if (verification.deploymentUrl !== release.deploymentUrl) {
    throw new Error("production_verification_url_mismatch");
  }

  return { release, verification };
}
