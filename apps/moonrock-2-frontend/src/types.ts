export type BusinessPath = "startup" | "existing_business";

export interface DiscoveryView {
  visualState: string;
  eyebrow: string;
  headline: string;
  body?: string;
  progressPercent: number;
  input?: {
    field: string;
    type: "text" | "number" | "boolean" | "single_select";
    options?: string[];
  };
  flightPlanReady: boolean;
  escalationRequired: boolean;
}

export interface DiscoveryResponse {
  path: BusinessPath;
  completed: boolean;
  progress: { answered: number; requiredRemaining: number };
  nextQuestion?: {
    id: string;
    field: string;
    prompt: string;
    answerType: string;
    helpText?: string;
    options?: string[];
  };
  view: DiscoveryView;
  result?: unknown;
  ghlHandoff?: unknown;
}
