import type { BusinessPath, DiagnosticInput, DiagnosticResult } from "./diagnostic-engine.js";
import type { FlightPlan } from "./flight-plan.js";
import { getDiscoveryQuestions } from "./discovery-graph.js";
import { applyDiscoveryAnswer, createDiscoverySession, forcePreliminaryFlightPlan, resumeDiscovery, type DiscoveryContinuity, type DiscoverySessionState } from "./discovery-session.js";
import { mapDiscoveryToGhl, type GhlDiscoveryPayload } from "./ghl-discovery-mapping.js";
import { normalizeDiscoveryAnswer } from "./conversation-normalizer.js";
import { buildProgressiveFlightPlan, type ProgressiveFlightPlan } from "./progressive-flight-plan.js";

export interface NovaDiscoveryResponse {
  path: BusinessPath;
  completed: boolean;
  progress: { answered: number; requiredRemaining: number };
  nextQuestion?: { id: string; field: keyof DiagnosticInput; prompt: string; helpText?: string; answerType: string; required: boolean; isFinalRequired: boolean; options?: readonly string[] };
  interpretation?: { field: keyof DiagnosticInput; raw: unknown; normalized: unknown; note?: string };
  clarification?: { field: keyof DiagnosticInput; message: string; originalAnswer: unknown };
  progressiveFlightPlan: ProgressiveFlightPlan;
  result?: { diagnostic: DiagnosticResult; flightPlan: FlightPlan; ghl: GhlDiscoveryPayload };
}

function toResponse(state: DiscoverySessionState, progress: ReturnType<typeof resumeDiscovery>): NovaDiscoveryResponse {
  const answered = Object.keys(state.answers).filter((key) => key !== "path").length;
  const nextQuestion = progress.nextQuestion;
  const requiredRemaining = state.completed ? 0 : getDiscoveryQuestions(state.path, state.answers).filter((question) => question.required && state.answers[question.field] === undefined).length;
  const response: NovaDiscoveryResponse = { path: state.path, completed: state.completed, progress: { answered, requiredRemaining }, progressiveFlightPlan: buildProgressiveFlightPlan(state.answers, state.completed) };
  if (nextQuestion) response.nextQuestion = { id: nextQuestion.id, field: nextQuestion.field, prompt: nextQuestion.prompt, answerType: nextQuestion.answerType, required: nextQuestion.required, isFinalRequired: nextQuestion.required && requiredRemaining === 1, ...(nextQuestion.helpText ? { helpText: nextQuestion.helpText } : {}), ...(nextQuestion.options ? { options: nextQuestion.options } : {}) };
  if (progress.diagnostic && progress.flightPlan) response.result = { diagnostic: progress.diagnostic, flightPlan: progress.flightPlan, ghl: mapDiscoveryToGhl(state.answers as DiagnosticInput, progress.diagnostic, progress.flightPlan) };
  return response;
}

export function startNovaDiscovery(path: BusinessPath, continuity?: DiscoveryContinuity): { state: DiscoverySessionState; response: NovaDiscoveryResponse } {
  const state = createDiscoverySession(path, continuity); const progress = resumeDiscovery(state); return { state, response: toResponse(state, progress) };
}

export function requestPreliminaryFlightPlan(state: DiscoverySessionState): { state: DiscoverySessionState; response: NovaDiscoveryResponse } {
  const progress = forcePreliminaryFlightPlan(state);
  return { state: progress.state, response: toResponse(progress.state, progress) };
}

export function submitNovaDiscoveryAnswer(state: DiscoverySessionState, field: keyof DiagnosticInput, value: unknown): { state: DiscoverySessionState; response: NovaDiscoveryResponse } {
  const normalized = normalizeDiscoveryAnswer(field, value);
  if (normalized.needsClarification) {
    const progress = resumeDiscovery(state); const response = toResponse(state, progress);
    response.clarification = { field, message: normalized.clarification ?? "I want to make sure I understood that before I use it in your Flight Plan.", originalAnswer: value };
    return { state, response };
  }
  const progress = applyDiscoveryAnswer(state, field, normalized.value); const response = toResponse(progress.state, progress);
  if (normalized.interpreted) response.interpretation = { field, raw: value, normalized: normalized.value, ...(normalized.note ? { note: normalized.note } : {}) };
  return { state: progress.state, response };
}
