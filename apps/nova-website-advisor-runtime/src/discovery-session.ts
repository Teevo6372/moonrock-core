import type { BusinessPath, DiagnosticInput, DiagnosticResult } from "./diagnostic-engine.js";
import { diagnoseBusiness } from "./diagnostic-engine.js";
import { buildFlightPlan, type FlightPlan } from "./flight-plan.js";
import { discoveryIsComplete, getNextDiscoveryQuestion, type DiscoveryQuestion } from "./discovery-graph.js";

export interface DiscoverySessionState {
  path: BusinessPath;
  answers: Partial<DiagnosticInput>;
  completed: boolean;
}

export interface DiscoveryProgress {
  state: DiscoverySessionState;
  nextQuestion?: DiscoveryQuestion;
  diagnostic?: DiagnosticResult;
  flightPlan?: FlightPlan;
}

export function createDiscoverySession(path: BusinessPath): DiscoverySessionState {
  return { path, answers: { path }, completed: false };
}

export function applyDiscoveryAnswer(
  state: DiscoverySessionState,
  field: keyof DiagnosticInput,
  value: unknown,
): DiscoveryProgress {
  const answers = { ...state.answers, [field]: value, path: state.path } as Partial<DiagnosticInput>;
  const completed = discoveryIsComplete(state.path, answers);
  const nextState: DiscoverySessionState = { path: state.path, answers, completed };

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
  if (state.completed) {
    const diagnostic = diagnoseBusiness(state.answers as DiagnosticInput);
    return {
      state,
      diagnostic,
      flightPlan: buildFlightPlan(state.answers as DiagnosticInput, diagnostic),
    };
  }
  const nextQuestion = getNextDiscoveryQuestion(state.path, state.answers);
  return nextQuestion ? { state, nextQuestion } : { state };
}
