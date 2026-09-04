import type { ServiceTier } from "./ai-employee-catalog.js";
import type { AnswerInterpreter } from "./answer-interpreter.js";
import type { BusinessPath, DiagnosticInput, DiagnosticResult, GhlSaasDiagnosticResult } from "./diagnostic-engine.js";
import type { FlightPlan } from "./flight-plan.js";
import { getDiscoveryQuestions, getDiscoveryQuestionsForTier } from "./discovery-graph.js";
import { applyDiscoveryAnswer, createDiscoverySession, forcePreliminaryFlightPlan, resumeDiscovery, type DiscoveryContinuity, type DiscoverySessionState } from "./discovery-session.js";
import { mapDiscoveryToGhl, type GhlDiscoveryPayload } from "./ghl-discovery-mapping.js";
import { normalizeDiscoveryAnswer } from "./conversation-normalizer.js";
import { buildProgressiveFlightPlan, type ProgressiveFlightPlan } from "./progressive-flight-plan.js";
import type { WebsiteBuildBrief } from "./website-build.js";

export interface NovaDiscoveryResponse {
  path: BusinessPath;
  completed: boolean;
  tier: ServiceTier;
  progress: { answered: number; requiredRemaining: number };
  nextQuestion?: { id: string; field: keyof DiagnosticInput; prompt: string; helpText?: string; answerType: string; required: boolean; isFinalRequired: boolean; options?: readonly string[] };
  interpretation?: { field: keyof DiagnosticInput; raw: unknown; normalized: unknown; note?: string };
  clarification?: { field: keyof DiagnosticInput; message: string; originalAnswer: unknown };
  progressiveFlightPlan: ProgressiveFlightPlan;
  result?: { diagnostic: DiagnosticResult; flightPlan: FlightPlan; ghl: GhlDiscoveryPayload };
  websiteBuildResult?: { brief: WebsiteBuildBrief };
  ghlSaasResult?: GhlSaasDiagnosticResult;
}

function toResponse(state: DiscoverySessionState, progress: ReturnType<typeof resumeDiscovery>): NovaDiscoveryResponse {
  const tier: ServiceTier = state.tier ?? "ai_employee";
  const answered = Object.keys(state.answers).filter((key) => key !== "path").length;
  const nextQuestion = progress.nextQuestion;
  const requiredRemaining = state.completed
    ? 0
    : (tier === "website_build" ? getDiscoveryQuestionsForTier(tier, state.path, state.answers) : getDiscoveryQuestions(state.path, state.answers))
        .filter((question) => question.required && state.answers[question.field] === undefined).length;
  const response: NovaDiscoveryResponse = { path: state.path, completed: state.completed, tier, progress: { answered, requiredRemaining }, progressiveFlightPlan: buildProgressiveFlightPlan(state.answers, state.completed) };
  if (nextQuestion) response.nextQuestion = { id: nextQuestion.id, field: nextQuestion.field, prompt: nextQuestion.prompt, answerType: nextQuestion.answerType, required: nextQuestion.required, isFinalRequired: false, ...(nextQuestion.helpText ? { helpText: nextQuestion.helpText } : {}), ...(nextQuestion.options ? { options: nextQuestion.options } : {}) };
  if (progress.diagnostic && progress.flightPlan) response.result = { diagnostic: progress.diagnostic, flightPlan: progress.flightPlan, ghl: mapDiscoveryToGhl(state.answers as DiagnosticInput, progress.diagnostic, progress.flightPlan) };
  if (progress.websiteBuildBrief) response.websiteBuildResult = { brief: progress.websiteBuildBrief };
  if (progress.ghlSaasResult) response.ghlSaasResult = progress.ghlSaasResult;
  return response;
}

export function startNovaDiscovery(path: BusinessPath, continuity?: DiscoveryContinuity): { state: DiscoverySessionState; response: NovaDiscoveryResponse } {
  const state = createDiscoverySession(path, continuity); const progress = resumeDiscovery(state); return { state, response: toResponse(state, progress) };
}
export function restoreNovaDiscovery(state: DiscoverySessionState): NovaDiscoveryResponse { const progress = resumeDiscovery(state); return toResponse(progress.state, progress); }
export function requestPreliminaryFlightPlan(state: DiscoverySessionState): { state: DiscoverySessionState; response: NovaDiscoveryResponse } { const progress = forcePreliminaryFlightPlan(state); return { state: progress.state, response: toResponse(progress.state, progress) }; }
function findQuestionPrompt(state: DiscoverySessionState, field: keyof DiagnosticInput): string | undefined {
  const tier: ServiceTier = state.tier ?? "ai_employee";
  return getDiscoveryQuestionsForTier(tier, state.path, state.answers).find((question) => question.field === field)?.prompt;
}

export async function submitNovaDiscoveryAnswer(
  state: DiscoverySessionState,
  field: keyof DiagnosticInput,
  value: unknown,
  interpreter?: AnswerInterpreter,
): Promise<{ state: DiscoverySessionState; response: NovaDiscoveryResponse }> {
  const normalized = normalizeDiscoveryAnswer(field, value);
  if (normalized.needsClarification) {
    if (interpreter && normalized.expectedKind && typeof value === "string" && value.trim()) {
      const prompt = findQuestionPrompt(state, field) ?? normalized.clarification ?? String(field);
      const interpreted = await interpreter.interpret({ prompt, expectedKind: normalized.expectedKind, rawText: value });
      if (interpreted) {
        const progress = applyDiscoveryAnswer(state, field, interpreted.value);
        const response = toResponse(progress.state, progress);
        response.interpretation = { field, raw: value, normalized: interpreted.value, note: `AI-assisted interpretation (${interpreted.confidence} confidence)` };
        return { state: progress.state, response };
      }
    }
    const progress = resumeDiscovery(state); const response = toResponse(state, progress);
    response.clarification = { field, message: normalized.clarification ?? "I want to make sure I understood that before I use it in your Flight Plan.", originalAnswer: value };
    return { state, response };
  }
  const progress = applyDiscoveryAnswer(state, field, normalized.value); const response = toResponse(progress.state, progress);
  if (normalized.interpreted) response.interpretation = { field, raw: value, normalized: normalized.value, ...(normalized.note ? { note: normalized.note } : {}) };
  return { state: progress.state, response };
}
