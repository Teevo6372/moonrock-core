import { Hono } from "hono";
import { AI_EMPLOYEE_CATALOG, FOUNDING_CUSTOMER_LIMIT } from "./ai-employee-catalog.js";
import type { PostgresLaunchPlanRepository } from "./postgres-launch-plan-repository.js";

export interface LaunchPlanRouterOptions {
  launchPlanRepository?: PostgresLaunchPlanRepository;
}

export interface LaunchPlanStatus {
  remainingFoundingSlots: number;
  foundingSetupFeeUsd: number;
  standardSetupFeeUsd: number;
  monthlyFeeUsd: number;
}

/** Read-only for now - createCheckoutSession (a later PR) will consult the same repository before picking a setup price, and the webhook handler is the only writer. */
export function createLaunchPlanRouter(options: LaunchPlanRouterOptions = {}): Hono {
  const router = new Hono();
  const { launchPlanRepository } = options;
  const offer = AI_EMPLOYEE_CATALOG.moonrock_launch_plan;

  router.get("/status", async (context) => {
    if (!launchPlanRepository) {
      return context.json({ code: "LAUNCH_PLAN_STATUS_UNAVAILABLE", detail: "Launch Plan signup tracking is not configured in this environment." }, 503);
    }
    const founding = await launchPlanRepository.countFoundingSignups();
    const status: LaunchPlanStatus = {
      remainingFoundingSlots: Math.max(0, FOUNDING_CUSTOMER_LIMIT - founding),
      foundingSetupFeeUsd: offer.foundingCustomerSetupFeeUsd ?? offer.setupFeeUsd,
      standardSetupFeeUsd: offer.setupFeeUsd,
      monthlyFeeUsd: offer.monthlyFeeUsd,
    };
    return context.json(status);
  });

  return router;
}
