import type {
  CloudflareProductionReleaseResult,
  CloudflareProductionReleaseTask,
  CloudflareProductionTransport,
} from "./production-deployment";
import type { SiteRevision } from "./orchestration";

export interface ProductionBranchPromotion {
  repository: string;
  productionBranch: string;
  expectedCurrentCommitSha: string;
  targetCommitSha: string;
}

export interface ProductionBranchPromoter {
  promoteFastForward(promotion: ProductionBranchPromotion): Promise<{
    productionRevision: SiteRevision;
  }>;
}

export interface CloudflareProductionDeployment {
  deploymentId: string;
  deploymentUrl: string;
  environment: "production";
  branch: string;
  commitSha: string;
}

export interface CloudflareProductionDeploymentWatcher {
  waitForProductionDeployment(input: {
    siteId: string;
    productionBranch: string;
    commitSha: string;
  }): Promise<CloudflareProductionDeployment>;
}

export interface GitBackedCloudflareProductionConfig {
  productionBranch: string;
  expectedProductionCommitSha: string;
}

function assertExactProductionRevision(
  expected: SiteRevision,
  actual: SiteRevision,
  productionBranch: string,
): void {
  if (actual.repository !== expected.repository) {
    throw new Error("production_repository_mismatch");
  }

  if (actual.branch !== productionBranch) {
    throw new Error("production_branch_mismatch");
  }

  if (actual.commitSha !== expected.commitSha) {
    throw new Error("production_revision_mismatch");
  }
}

function assertExactCloudflareDeployment(
  deployment: CloudflareProductionDeployment,
  task: CloudflareProductionReleaseTask,
  productionBranch: string,
): void {
  if (deployment.environment !== "production") {
    throw new Error("cloudflare_environment_mismatch");
  }

  if (deployment.branch !== productionBranch) {
    throw new Error("cloudflare_branch_mismatch");
  }

  if (deployment.commitSha !== task.revision.commitSha) {
    throw new Error("cloudflare_revision_mismatch");
  }
}

/**
 * Publishes an already-authorized release without rebuilding an arbitrary branch HEAD.
 * The reviewed commit is first promoted to the configured production branch using a
 * fast-forward-only Git operation. Cloudflare Pages then deploys that production branch,
 * and the resulting production deployment must report the exact reviewed commit SHA.
 */
export class GitBackedCloudflareProductionTransport implements CloudflareProductionTransport {
  constructor(
    private readonly config: GitBackedCloudflareProductionConfig,
    private readonly promoter: ProductionBranchPromoter,
    private readonly deploymentWatcher: CloudflareProductionDeploymentWatcher,
  ) {}

  async publish(
    task: CloudflareProductionReleaseTask,
  ): Promise<CloudflareProductionReleaseResult> {
    if (!task.constraints.exactRevisionRequired || !task.constraints.productionPublishAllowed) {
      throw new Error("production_constraints_invalid");
    }

    if (task.constraints.dnsMutationAllowed || task.constraints.customDomainMutationAllowed) {
      throw new Error("production_scope_invalid");
    }

    const promotion = await this.promoter.promoteFastForward({
      repository: task.revision.repository,
      productionBranch: this.config.productionBranch,
      expectedCurrentCommitSha: this.config.expectedProductionCommitSha,
      targetCommitSha: task.revision.commitSha,
    });

    assertExactProductionRevision(
      task.revision,
      promotion.productionRevision,
      this.config.productionBranch,
    );

    const deployment = await this.deploymentWatcher.waitForProductionDeployment({
      siteId: task.siteId,
      productionBranch: this.config.productionBranch,
      commitSha: task.revision.commitSha,
    });

    assertExactCloudflareDeployment(deployment, task, this.config.productionBranch);

    return {
      deploymentId: deployment.deploymentId,
      deploymentUrl: deployment.deploymentUrl,
    };
  }
}
