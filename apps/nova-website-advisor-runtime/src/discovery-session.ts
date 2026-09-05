import type { ServiceTier } from "./ai-employee-catalog.js";
import { composeCrossTierBundle, type AscensionBundle } from "./ascension-bundle.js";
import { computeAscensionScore, type AscensionBand, type AscensionConversationalSignals, type AscensionLadderTier, type AscensionPurchaseRecord } from "./ascension-score.js";
import { extractTeamSizeMentioned, extractUrgencyStated } from "./conversation-normalizer.js";
import type { BusinessPath, DiagnosticInput, DiagnosticResult, GhlSaasDiagnosticResult } from "./diagnostic-engine.js";
import { classifyServiceTier, diagnoseBusiness, diagnoseGhlSaas } from "./diagnostic-engine.js";
import { buildFlightPlan, type FlightPlan } from "./flight-plan.js";
import { discoveryIsComplete, discoveryIsCompleteForTier, getNextDiscoveryQuestion, getNextDiscoveryQuestionForTier, tierHasBespokeQuestionBank, type DiscoveryQuestion } from "./discovery-graph.js";
import { buildWebsiteBrief, type WebsiteBuildBrief } from "./website-build.js";

export interface DiscoveryContinuity {
  visitorId: string;
  conversationId: string;
  previousConversationSummary?: string;
}

export interface DiscoveryConversationTurn {
  role: "visitor" | "nova";
  text: string;
  at: string;
}

export interface DiscoverySessionState {
  path: BusinessPath;
  answers: Partial<DiagnosticInput>;
  completed: boolean;
  meaningfulTurns?: number;
  continuity?: DiscoveryContinuity;
  conversationHistory?: DiscoveryConversationTurn[];
  tier?: ServiceTier;
  // Ascension funnel (see ascension-score.ts). All computed exactly once by
  // refreshAscensionState, below - nothing else in this file or elsewhere
  // should set these fields directly.
  ascensionScore?: number;
  ascensionBand?: AscensionBand;
  currentTier?: AscensionLadderTier;
  lastOfferedTier?: AscensionLadderTier;
  lastEngagementAt?: string;
  purchaseHistory?: AscensionPurchaseRecord[];
}

export interface DiscoveryProgress {
  state: DiscoverySessionState;
  nextQuestion?: DiscoveryQuestion;
  diagnostic?: DiagnosticResult;
  flightPlan?: FlightPlan;
  websiteBuildBrief?: WebsiteBuildBrief;
  ghlSaasResult?: GhlSaasDiagnosticResult;
  alaCarteResult?: AscensionBundle;
  bundle?: AscensionBundle;
}

export const MAX_MEANINGFUL_TURNS_BEFORE_PRELIMINARY_PLAN = 4;
export const MAX_CONVERSATION_HISTORY_TURNS = 12;

/**
 * The only place ascensionScore/ascensionBand/currentTier get set on session
 * state - always via computeAscensionScore, never independently. Touches
 * lastEngagementAt to now (a turn is engagement); purchaseHistory is left
 * untouched here since no purchase-tracking call site exists yet - this only
 * recomputes the score from whatever purchase history already exists plus
 * fresh conversational signals.
 */
export function refreshAscensionState(state: DiscoverySessionState, signals: AscensionConversationalSignals = {}): DiscoverySessionState {
  const now = new Date().toISOString();
  const result = computeAscensionScore({
    purchaseHistory: state.purchaseHistory ?? [],
    conversationalSignals: signals,
    ...(state.lastEngagementAt ? { lastEngagementAt: state.lastEngagementAt } : {}),
    now,
  });
  return {
    ...state,
    ascensionScore: result.score,
    ascensionBand: result.band,
    ...(result.currentTier ? { currentTier: result.currentTier } : {}),
    lastEngagementAt: now,
  };
}

export function isFlightPlanRequest(text: string): boolean {
  return /\b(?:provide|show|give|build|create|generate|see|view|ready for|want)\b[\s\S]{0,40}\b(?:flight\s*plan|recommendation|recommended plan|starting plan)\b|\b(?:flight\s*plan|recommendation)\b[\s\S]{0,30}\b(?:now|please|ready)\b/i.test(text.trim());
}

export function shouldProducePreliminaryPlan(path: BusinessPath, answers: Partial<DiagnosticInput>, meaningfulTurns: number, force = false): boolean {
  if (force) return true;
  if (discoveryIsComplete(path, answers)) return true;
  return meaningfulTurns >= MAX_MEANINGFUL_TURNS_BEFORE_PRELIMINARY_PLAN;
}

function completedProgress(state: DiscoverySessionState): DiscoveryProgress {
  const tier = state.tier ?? classifyServiceTier(state.answers as DiagnosticInput).tier;
  const answers = state.answers as DiagnosticInput;
  const bundle = composeCrossTierBundle(tier, answers, answers.alaCarteItemsRequested ?? []);
  const bundleField = bundle ? { bundle } : {};
  if (tier === "website_build") {
    return { state, websiteBuildBrief: buildWebsiteBrief(answers), ...bundleField };
  }
  if (tier === "ghl_saas") {
    return { state, ghlSaasResult: diagnoseGhlSaas(answers), ...bundleField };
  }
  if (tier === "ala_carte") {
    return { state, ...(bundle ? { alaCarteResult: bundle } : {}) };
  }
  const diagnostic = diagnoseBusiness(answers);
  return { state, diagnostic, flightPlan: buildFlightPlan(answers, diagnostic, { ...bundleField }), ...bundleField };
}

export function createDiscoverySession(path: BusinessPath, continuity?: DiscoveryContinuity): DiscoverySessionState {
  return { path, answers: { path }, completed: false, meaningfulTurns: 0, conversationHistory: [], ...(continuity ? { continuity } : {}) };
}

export function appendConversationHistory(state: DiscoverySessionState, role: DiscoveryConversationTurn["role"], text: string): DiscoverySessionState {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return state;
  const history = [...(state.conversationHistory ?? []), { role, text: clean.slice(0, 1200), at: new Date().toISOString() }].slice(-MAX_CONVERSATION_HISTORY_TURNS);
  return { ...state, conversationHistory: history };
}

export function appendConversationExchange(state: DiscoverySessionState, visitorText: string, novaText: string): DiscoverySessionState {
  const teamSizeMentioned = extractTeamSizeMentioned(visitorText);
  const urgencyStated = extractUrgencyStated(visitorText);
  const signals: AscensionConversationalSignals = {
    ...(teamSizeMentioned !== undefined ? { teamSizeMentioned } : {}),
    ...(urgencyStated ? { urgencyStated } : {}),
  };
  return refreshAscensionState(appendConversationHistory(appendConversationHistory(state, "visitor", visitorText), "nova", novaText), signals);
}

export function forcePreliminaryFlightPlan(state: DiscoverySessionState): DiscoveryProgress {
  const nextState: DiscoverySessionState = { ...state, completed: true };
  return completedProgress(nextState);
}

export function applyDiscoveryAnswer(state: DiscoverySessionState, field: keyof DiagnosticInput, value: unknown): DiscoveryProgress {
  const answers = { ...state.answers, [field]: value, path: state.path } as Partial<DiagnosticInput>;
  const meaningfulTurns = (state.meaningfulTurns ?? 0) + 1;
  const tier = classifyServiceTier(answers as DiagnosticInput).tier;

  if (tierHasBespokeQuestionBank(tier)) {
    const completed = discoveryIsCompleteForTier(tier, state.path, answers);
    const nextState: DiscoverySessionState = refreshAscensionState({ ...state, answers, completed, meaningfulTurns, tier });
    if (!completed) {
      const nextQuestion = getNextDiscoveryQuestionForTier(tier, state.path, answers);
      return nextQuestion ? { state: nextState, nextQuestion } : { state: nextState };
    }
    return completedProgress(nextState);
  }

  // ghl_saas classifies from the same shared answers as ai_employee and has
  // no bespoke question set, so it follows the identical discovery flow
  // below; only completedProgress's tier dispatch changes the result shape.
  const completed = shouldProducePreliminaryPlan(state.path, answers, meaningfulTurns);
  const nextState: DiscoverySessionState = refreshAscensionState({ ...state, answers, completed, meaningfulTurns, tier });

  if (!completed) {
    const nextQuestion = getNextDiscoveryQuestion(state.path, answers);
    return nextQuestion ? { state: nextState, nextQuestion } : { state: nextState };
  }
  return completedProgress(nextState);
}

export function resumeDiscovery(state: DiscoverySessionState): DiscoveryProgress {
  const tier = state.tier ?? classifyServiceTier(state.answers as DiagnosticInput).tier;

  if (tierHasBespokeQuestionBank(tier)) {
    const completed = discoveryIsCompleteForTier(tier, state.path, state.answers);
    const resumedState = completed === state.completed && tier === state.tier ? state : { ...state, completed, tier };
    if (completed) return completedProgress(resumedState);
    const nextQuestion = getNextDiscoveryQuestionForTier(tier, state.path, state.answers);
    return nextQuestion ? { state: resumedState, nextQuestion } : { state: resumedState };
  }

  const completed = shouldProducePreliminaryPlan(state.path, state.answers, state.meaningfulTurns ?? 0);
  const resumedState = completed === state.completed && tier === state.tier ? state : { ...state, completed, tier };
  if (completed) return completedProgress(resumedState);
  const nextQuestion = getNextDiscoveryQuestion(state.path, state.answers);
  return nextQuestion ? { state: resumedState, nextQuestion } : { state: resumedState };
}
