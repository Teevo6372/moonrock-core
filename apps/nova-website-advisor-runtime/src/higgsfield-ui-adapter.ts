import type { NovaDiscoveryResponse } from "./discovery-api-contract.js";

export type NovaVisualState = "idle" | "listening" | "thinking" | "speaking" | "diagnosis" | "recommendation" | "handoff";

export interface ImmersiveNovaViewModel {
  visualState: NovaVisualState;
  eyebrow: string;
  headline: string;
  body?: string;
  progressPercent: number;
  input?: {
    field: string;
    type: string;
    options?: readonly string[];
  };
  flightPlanReady: boolean;
  recommendedOffer?: {
    name: string;
    monthlyUsd: number;
    setupUsd: number;
    autonomousCloseAllowed: boolean;
  };
  estimatedOpportunityUsd?: number;
  escalationRequired: boolean;
}

/** Framework-neutral contract for the Higgsfield/mobile-first experience. */
export function toImmersiveNovaView(response: NovaDiscoveryResponse): ImmersiveNovaViewModel {
  const result = response.result;
  const question = response.nextQuestion;
  const answered = response.progress.answered;
  const progressPercent = response.completed ? 100 : Math.min(95, 8 + answered * 8);

  if (result) {
    return {
      visualState: result.diagnostic.autonomousCloseAllowed ? "recommendation" : "handoff",
      eyebrow: "YOUR MOONROCK FLIGHT PLAN",
      headline: result.flightPlan.headline,
      body: result.diagnostic.recommendationReason,
      progressPercent: 100,
      flightPlanReady: true,
      recommendedOffer: {
        name: result.flightPlan.recommendation.offerName,
        monthlyUsd: result.flightPlan.recommendation.monthlyFeeUsd,
        setupUsd: result.flightPlan.recommendation.setupFeeUsd,
        autonomousCloseAllowed: result.flightPlan.recommendation.autonomousCloseAllowed,
      },
      ...(result.diagnostic.opportunityEstimate
        ? { estimatedOpportunityUsd: result.diagnostic.opportunityEstimate.monthlyOpportunityUsd }
        : {}),
      escalationRequired: !result.diagnostic.autonomousCloseAllowed,
    };
  }

  return {
    visualState: answered === 0 ? "listening" : "diagnosis",
    eyebrow: response.path === "startup" ? "STARTUP FLIGHT PLAN" : "GROWTH DIAGNOSIS",
    headline: question?.prompt ?? "Nova is analyzing your business.",
    ...(question?.helpText ? { body: question.helpText } : {}),
    progressPercent,
    ...(question ? {
      input: {
        field: String(question.field),
        type: question.answerType,
        ...(question.options ? { options: question.options } : {}),
      },
    } : {}),
    flightPlanReady: false,
    escalationRequired: false,
  };
}
