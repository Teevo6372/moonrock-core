import type { BusinessPath, DiagnosticInput, DiagnosticResult } from "./diagnostic-engine.js";
import { diagnoseBusiness } from "./diagnostic-engine.js";
import { buildFlightPlan, type FlightPlan } from "./flight-plan.js";
import { discoveryIsComplete, getNextDiscoveryQuestion, type DiscoveryQuestion } from "./discovery-graph.js";

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
}

export interface DiscoveryProgress {
  state: DiscoverySessionState;
  nextQuestion?: DiscoveryQuestion;
  diagnostic?: DiagnosticResult;
  flightPlan?: FlightPlan;
}

export const MAX_MEANINGFUL_TURNS_BEFORE_PRELIMINARY_PLAN = 4;
export const MAX_CONVERSATION_HISTORY_TURNS = 12;

export function isFlightPlanRequest(text: string): boolean {
  return /\b(?:provide|show|give|build|create|generate|see|view|ready for|want)\b[\s\S]{0,40}\b(?:flight\s*plan|recommendation|recommended plan|starting plan)\b|\b(?:flight\s*plan|recommendation)\b[\s\S]{0,30}\b(?:now|please|ready)\b/i.test(text.trim());
}

export function shouldProducePreliminaryPlan(path: BusinessPath, answers: Partial<DiagnosticInput>, meaningfulTurns: number, force = false): boolean {
  if (force) return true;
  if (discoveryIsComplete(path, answers)) return true;
  return meaningfulTurns >= MAX_MEANINGFUL_TURNS_BEFORE_PRELIMINARY_PLAN;
}

function completedProgress(state: DiscoverySessionState): DiscoveryProgress {
  const diagnostic = diagnoseBusiness(state.answers as DiagnosticInput);
  return { state, diagnostic, flightPlan: buildFlightPlan(state.answers as DiagnosticInput, diagnostic) };
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
  return appendConversationHistory(appendConversationHistory(state, "visitor", visitorText), "nova", novaText);
}

export function forcePreliminaryFlightPlan(state: DiscoverySessionState): DiscoveryProgress {
  const nextState: DiscoverySessionState = { ...state, completed: true };
  return completedProgress(nextState);
}

export function applyDiscoveryAnswer(state: DiscoverySessionState, field: keyof DiagnosticInput, value: unknown): DiscoveryProgress {
  const answers = { ...state.answers, [field]: value, path: state.path } as Partial<DiagnosticInput>;
  const meaningfulTurns = (state.meaningfulTurns ?? 0) + 1;
  const completed = shouldProducePreliminaryPlan(state.path, answers, meaningfulTurns);
  const nextState: DiscoverySessionState = { ...state, answers, completed, meaningfulTurns };

  if (!completed) {
    const nextQuestion = getNextDiscoveryQuestion(state.path, answers);
    return nextQuestion ? { state: nextState, nextQuestion } : { state: nextState };
  }
  return completedProgress(nextState);
}

export function resumeDiscovery(state: DiscoverySessionState): DiscoveryProgress {
  const completed = shouldProducePreliminaryPlan(state.path, state.answers, state.meaningfulTurns ?? 0);
  const resumedState = completed === state.completed ? state : { ...state, completed };
  if (completed) return completedProgress(resumedState);
  const nextQuestion = getNextDiscoveryQuestion(state.path, state.answers);
  return nextQuestion ? { state: resumedState, nextQuestion } : { state: resumedState };
}
