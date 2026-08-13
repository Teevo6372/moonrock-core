import type { BusinessPath, DiagnosticInput, DiagnosticResult } from "./diagnostic-engine.js";
import type { FlightPlan } from "./flight-plan.js";
import { applyDiscoveryAnswer, createDiscoverySession, resumeDiscovery, type DiscoverySessionState } from "./discovery-session.js";
import { mapDiscoveryToGhl, type GhlDiscoveryPayload } from "./ghl-discovery-mapping.js";

export interface NovaDiscoveryResponse {
  path: BusinessPath;
  completed: boolean;
  progress: {
    answered: number;
    requiredRemaining: number;
  };
  nextQuestion?: {
    id: string;
    field: keyof DiagnosticInput;
    prompt: string;
    helpText?: string;
    answerType: string;
    options?: readonly string[];
  };
  result?: {
    diagnostic: DiagnosticResult;
    flightPlan: FlightPlan;
    ghl: GhlDiscoveryPayload;
  };
}

function toResponse(state: DiscoverySessionState, progress: ReturnType<typeof resumeDiscovery>): NovaDiscoveryResponse {
  const answered = Object.keys(state.answers).filter((key) => key !== "path").length;
  const nextQuestion = progress.nextQuestion;
  const response: NovaDiscoveryResponse = {
    path: state.path,
    completed: state.completed,
    progress: {
      answered,
      requiredRemaining: state.completed ? 0 : 1,
    },
  };

  if (nextQuestion) {
    response.nextQuestion = {
      id: nextQuestion.id,
      field: nextQuestion.field,
      prompt: nextQuestion.prompt,
      answerType: nextQuestion.answerType,
      ...(nextQuestion.helpText ? { helpText: nextQuestion.helpText } : {}),
      ...(nextQuestion.options ? { options: nextQuestion.options } : {}),
    };
  }

  if (progress.diagnostic && progress.flightPlan) {
    response.result = {
      diagnostic: progress.diagnostic,
      flightPlan: progress.flightPlan,
      ghl: mapDiscoveryToGhl(
        state.answers as DiagnosticInput,
        progress.diagnostic,
        progress.flightPlan,
      ),
    };
  }

  return response;
}

export function startNovaDiscovery(path: BusinessPath): { state: DiscoverySessionState; response: NovaDiscoveryResponse } {
  const state = createDiscoverySession(path);
  const progress = resumeDiscovery(state);
  return { state, response: toResponse(state, progress) };
}

export function submitNovaDiscoveryAnswer(
  state: DiscoverySessionState,
  field: keyof DiagnosticInput,
  value: unknown,
): { state: DiscoverySessionState; response: NovaDiscoveryResponse } {
  const progress = applyDiscoveryAnswer(state, field, value);
  return { state: progress.state, response: toResponse(progress.state, progress) };
}
