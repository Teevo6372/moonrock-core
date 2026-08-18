export type BusinessPath = "startup" | "existing_business";
export type AnswerType = "text" | "number" | "boolean" | "single_select";
export type NovaVisualState = "idle" | "listening" | "thinking" | "speaking" | "diagnosis" | "recommendation" | "handoff";

export interface DiscoveryView {
  visualState: NovaVisualState;
  eyebrow: string;
  headline: string;
  body?: string;
  progressPercent: number;
  input?: { field: string; type: AnswerType; options?: string[] };
  flightPlanReady: boolean;
  escalationRequired: boolean;
  recommendedOffer?: { name: string; monthlyUsd: number; setupUsd: number; autonomousCloseAllowed: boolean };
  estimatedOpportunityUsd?: number;
}

export interface DiscoveryQuestion {
  id: string;
  field: string;
  prompt: string;
  answerType: AnswerType;
  required: boolean;
  isFinalRequired: boolean;
  helpText?: string;
  options?: string[];
}

export interface ContactIdentity {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  companyName?: string;
  followUpConsent?: boolean;
}

export interface GhlHandoffResult {
  status: string;
  contactId?: string;
  opportunityId?: string;
  pipelineId?: string;
  pipelineStageId?: string;
  tagsApplied?: string[];
  noteCreated?: boolean;
  autonomousCloseAllowed?: boolean;
  followUpEnabled?: boolean;
  deferredOperations?: string[];
}

export interface FlightPlanResult {
  diagnostic: {
    recommendationReason: string;
    opportunityEstimate?: { monthlyOpportunityUsd: number; basis: string; disclaimer: string };
  };
  flightPlan: {
    headline: string;
    primaryBottlenecks: Array<{ id: string; score: number; explanation: string }>;
    recommendation: { offerName: string; setupFeeUsd: number; monthlyFeeUsd: number; reason: string };
    opportunity?: { monthlyOpportunityUsd: number; basis: string; disclaimer: string };
    nextAction: string;
    disclosures: string[];
  };
}

export interface ProgressiveFlightPlanSignal {
  id: string;
  label: string;
  status: "watching" | "emerging" | "confirmed" | "healthy";
  insight: string;
}

export interface ProgressiveFlightPlan {
  phase: "listening" | "mapping" | "prioritizing" | "ready";
  summary: string;
  signals: ProgressiveFlightPlanSignal[];
  nextFocus?: string;
}

export interface DiscoveryResponse {
  path: BusinessPath;
  completed: boolean;
  progress: { answered: number; requiredRemaining: number };
  nextQuestion?: DiscoveryQuestion;
  view: DiscoveryView;
  interpretation?: { field: string; raw: unknown; normalized: unknown; note?: string };
  progressiveFlightPlan: ProgressiveFlightPlan;
  result?: FlightPlanResult;
  ghlHandoff?: GhlHandoffResult;
}
