import type { ServiceTier } from "./ai-employee-catalog.js";
import { composeCrossTierBundle, type AscensionBundle } from "./ascension-bundle.js";
import { computeAscensionScore, type AscensionBand, type AscensionConversationalSignals, type AscensionLadderTier, type AscensionPurchaseRecord } from "./ascension-score.js";
import { extractTeamSizeMentioned, extractUrgencyStated } from "./conversation-normalizer.js";
import type { ConversationSaleRecord } from "./conversation-sale-tracker.js";
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

/**
 * In-progress conversational Flight Plan save (see isReadyToSaveSignal,
 * below, and discovery-router.ts's /conversation handling). Deliberately
 * excludes phone/SMS opt-in - that consent language stays on the real Save
 * Flight Plan form only; this flow collects just enough (name, email, one
 * explicit yes) to call the same handoffFlightPlanToGhl the form uses.
 */
export interface PendingConversationalSave {
  stage: "awaiting_name" | "awaiting_email" | "awaiting_consent";
  firstName?: string;
  lastName?: string;
  email?: string;
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
  /** Count of Tier 0 digital products downloaded (soft engagement signal - see ascension-score.ts). Set only via recordTier0Download, below. */
  tier0DownloadsCount?: number;
  /** Every sale closed autonomously THIS conversation/session (see conversation-sale-tracker.ts). Set only via recordConversationSale, below - distinct from purchaseHistory's lifetime ladder-tier record. */
  conversationSalesClosed?: ConversationSaleRecord[];
  /** Set only while a conversational Flight Plan save is in progress (see PendingConversationalSave, above); cleared on completion, decline, or cancellation. */
  pendingSave?: PendingConversationalSave;
  /**
   * Snapshot of live founding-slot availability (see FOUNDING_CUSTOMER_LIMIT /
   * PostgresLaunchPlanRepository.countFoundingSignups), resolved once in
   * discovery-router.ts's /start handler and frozen for the life of the
   * session - so a visitor's quoted setup fee never changes mid-conversation
   * even if slots fill up while they're talking to Nova. The actual Stripe
   * checkout re-checks the live count fresh at charge time (see
   * create-checkout-session) so the $0 price can never be oversold past the
   * real limit. Defaults to false (not eligible) when unset, matching this
   * codebase's "never invent a discount" default.
   */
  foundingCustomerEligible?: boolean;
  /** Picked once at session creation; selects the variant prompt for each question so the conversation feels different each time while hitting the same discovery targets. */
  questionVariantIndex?: number;
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
    tier0DownloadsCount: state.tier0DownloadsCount ?? 0,
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

/**
 * The only place tier0DownloadsCount is incremented. Callable once a Tier 0
 * download event reaches this app (e.g. a future GHL workflow webhook) -
 * that trigger doesn't exist yet (Tier 0 delivery is GHL-native file-manager
 * work per Section 9.1/9.3, not orchestrated here), so this has no caller
 * today. Mirrors purchaseHistory's own not-yet-populated state field: the
 * scoring plumbing is ready ahead of the event source that will feed it.
 */
export function recordTier0Download(state: DiscoverySessionState): DiscoverySessionState {
  return refreshAscensionState({ ...state, tier0DownloadsCount: (state.tier0DownloadsCount ?? 0) + 1 });
}

/**
 * The only place a closed autonomous sale is recorded. No live caller exists
 * yet - like recordTier0Download and purchaseHistory itself, this has no
 * payment-webhook event source in this app today (checkout happens
 * GHL-side, per Section 9.1) - but a closed sale is both a
 * conversation-sale-total event (conversation-sale-tracker.ts's $700/mo
 * threshold) AND a purchase-history event (ascension-score.ts's score), so
 * this single function feeds both rather than leaving two call sites that
 * could drift out of sync.
 */
export function recordConversationSale(state: DiscoverySessionState, sale: Omit<ConversationSaleRecord, "closedAt">): DiscoverySessionState {
  const closedAt = new Date().toISOString();
  const record: ConversationSaleRecord = { ...sale, closedAt };
  return refreshAscensionState({
    ...state,
    conversationSalesClosed: [...(state.conversationSalesClosed ?? []), record],
    purchaseHistory: [...(state.purchaseHistory ?? []), { tier: sale.ladderTier, purchasedAt: closedAt }],
  });
}

export function isFlightPlanRequest(text: string): boolean {
  return /\b(?:provide|show|give|build|create|generate|see|view|ready for|want)\b[\s\S]{0,40}\b(?:flight\s*plan|recommendation|recommended plan|starting plan)\b|\b(?:flight\s*plan|recommendation)\b[\s\S]{0,30}\b(?:now|please|ready)\b/i.test(text.trim());
}

/** A visitor signaling readiness to proceed/save, once a Flight Plan already exists (see PendingConversationalSave). */
export function isReadyToSaveSignal(text: string): boolean {
  return /\block (it|this) in\b|\bsign (me|us) up\b|\blet'?s (do this|move forward|get started|proceed|go)\b|\bready to (move forward|proceed|start|go|sign up)\b|\bi'?m ready\b|\bhow do i (get started|sign up|proceed)\b/i.test(text.trim());
}

/** A visitor backing out of an in-progress conversational save (see PendingConversationalSave). */
export function isSaveCancelSignal(text: string): boolean {
  return /^\s*(never ?mind|forget it|cancel|no thanks?|not now|nah|stop)\b/i.test(text.trim());
}

/** A clear, standalone affirmative - the bar for treating a chat reply as consent (see PendingConversationalSave's "awaiting_consent" stage). */
export function isClearYes(text: string): boolean {
  return /^\s*(yes|yeah|yep|yup|sure|confirm|i confirm|do it|please do)\b/i.test(text.trim());
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
  return { state, diagnostic, flightPlan: buildFlightPlan(answers, diagnostic, { foundingCustomer: Boolean(state.foundingCustomerEligible), ...bundleField }), ...bundleField };
}

export function createDiscoverySession(path: BusinessPath, continuity?: DiscoveryContinuity, foundingCustomerEligible?: boolean): DiscoverySessionState {
  return { path, answers: { path }, completed: false, meaningfulTurns: 0, conversationHistory: [], questionVariantIndex: Math.floor(Math.random() * 6), ...(continuity ? { continuity } : {}), ...(foundingCustomerEligible ? { foundingCustomerEligible } : {}) };
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
