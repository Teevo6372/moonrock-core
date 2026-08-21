import type { BusinessPath, DiagnosticInput, DiagnosticResult } from "./diagnostic-engine.js";
import { diagnoseBusiness } from "./diagnostic-engine.js";
import { buildFlightPlan, type FlightPlan } from "./flight-plan.js";
import { discoveryIsComplete, getNextDiscoveryQuestion, type DiscoveryQuestion } from "./discovery-graph.js";

export interface DiscoveryContinuity {
  visitorId: string;
  conversationId: string;
  previousConversationSummary?: string;
}

export interface DiscoverySessionState {
  path: BusinessPath;
  answers: Partial<DiagnosticInput>;
  completed: boolean;
  meaningfulTurns?: number;
  continuity?: DiscoveryContinuity;
}

export interface DiscoveryProgress {
  state: DiscoverySessionState;
  nextQuestion?: DiscoveryQuestion;
  diagnostic?: DiagnosticResult;
  flightPlan?: FlightPlan;
}

const MAX_MEANINGFUL_TURNS_BEFORE_PRELIMINARY_PLAN = 4;

function hasMinimumRecommendationContext(answers: Partial<DiagnosticInput>): boolean {
  return Boolean(answers.industry && answers.businessChallenges);
}

function shouldProducePreliminaryPlan(path: BusinessPath, answers: Partial<DiagnosticInput>, meaningfulTurns: number): boolean {
  if (discoveryIsComplete(path, answers)) return true;
  return meaningfulTurns >= MAX_MEANINGFUL_TURNS_BEFORE_PRELIMINARY_PLAN && hasMinimumRecommendationContext(answers);
}

export function createDiscoverySession(path: BusinessPath, continuity?: DiscoveryContinuity): DiscoverySessionState {
  return { path, answers: { path }, completed: false, meaningfulTurns: 0, ...(continuity ? { continuity } : {}) };
}

export function applyDiscoveryAnswer(
  state: DiscoverySessionState,
  field: keyof DiagnosticInput,
  value: unknown,
): DiscoveryProgress {
  const answers = { ...state.answers, [field]: value, path: state.path } as Partial<DiagnosticInput>;
  const meaningfulTurns = (state.meaningfulTurns ?? 0) + 1;
  const completed = shouldProducePreliminaryPlan(state.path, answers, meaningfulTurns);
  const nextState: DiscoverySessionState = {
    path: state.path,
    answers,
    completed,
    meaningfulTurns,
    ...(state.continuity ? { continuity: state.continuity } : {}),
  };

  if (!completed) {
    const nextQuestion = getNextDiscoveryQuestion(state.path, answers);
    return nextQuestion ? { state: nextState, nextQuestion } : { state: nextState };
  }

  const diagnostic = diagnoseBusiness(answers as DiagnosticInput);
  return {
    state: nextState,
    diagnostic,
    flightPlan: buildFlightPlan(answers as DiagnosticInput, diagnostic),
  };
}

export function resumeDiscovery(state: DiscoverySessionState): DiscoveryProgress {
  const completed = shouldProducePreliminaryPlan(state.path, state.answers, state.meaningfulTurns ?? 0);
  const resumedState = completed === state.completed ? state : { ...state, completed };
  if (completed) {
    const diagnostic = diagnoseBusiness(state.answers as DiagnosticInput);
    return {
      state: resumedState,
      diagnostic,
      flightPlan: buildFlightPlan(state.answers as DiagnosticInput, diagnostic),
    };
  }
  const nextQuestion = getNextDiscoveryQuestion(state.path, state.answers);
  return nextQuestion ? { state: resumedState, nextQuestion } : { state: resumedState };
}
