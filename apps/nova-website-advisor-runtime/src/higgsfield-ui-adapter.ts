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

/**
 * Framework-neutral settled-state contract for the immersive Nova experience.
 *
 * Request lifecycle states such as `thinking`, `diagnosis`, and `speaking` are
 * intentionally controlled by the client while a request is in flight or a
 * response is being delivered. The server only returns the stable state the UI
 * should settle into once the current response has been rendered.
 */
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
    visualState: question ? "listening" : "idle",
    eyebrow: response.path === "startup" ? "STARTUP FLIGHT PLAN" : "GROWTH DIAGNOSIS",
    headline: question?.prompt ?? "Nova is ready when you are.",
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
