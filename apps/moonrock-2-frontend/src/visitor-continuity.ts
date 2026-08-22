import type { BusinessPath, DiscoveryResponse } from "./types.js";

const VISITOR_KEY = "moonrock:nova:visitor-id:v1";
const ACTIVE_KEY = "moonrock:nova:active-conversation:v1";
const PREVIOUS_KEY = "moonrock:nova:previous-summary:v1";
const RESUME_KEY = "moonrock:nova:resume-requested:v1";
const MAX_RECENT_TURNS = 8;

export interface StoredConversationTurn { user?: string; nova?: string; at: string; }

export interface StoredNovaConversation {
  visitorId: string;
  sessionId: string;
  path: BusinessPath;
  updatedAt: string;
  businessName?: string;
  answers: Record<string, string | number | boolean>;
  lastResponse: DiscoveryResponse;
  recentTurns?: StoredConversationTurn[];
}

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try { return JSON.parse(value) as T; } catch { return null; }
}

function compact(value: string, limit = 180): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > limit ? `${normalized.slice(0, limit - 1)}…` : normalized;
}

export function getOrCreateVisitorId(): string {
  const existing = localStorage.getItem(VISITOR_KEY)?.trim();
  if (existing) return existing;
  const created = `visitor-${crypto.randomUUID()}`;
  localStorage.setItem(VISITOR_KEY, created);
  return created;
}

export function loadActiveConversation(): StoredNovaConversation | null {
  return safeParse<StoredNovaConversation>(localStorage.getItem(ACTIVE_KEY));
}

export function previousConversationSummary(): string | undefined {
  return localStorage.getItem(PREVIOUS_KEY)?.trim() || undefined;
}

function summaryFor(conversation: StoredNovaConversation): string {
  const learned = Math.max(conversation.lastResponse.progress.answered, Object.keys(conversation.answers).length);
  const subject = conversation.businessName ? ` for ${conversation.businessName}` : "";
  const path = conversation.path === "startup" ? "a startup" : "an existing business";
  const state = conversation.lastResponse.completed ? "completed a Flight Plan" : `worked through ${learned} discovery ${learned === 1 ? "item" : "items"}`;
  const recent = (conversation.recentTurns ?? []).slice(-3).map((turn) => [turn.user ? `Visitor: ${compact(turn.user)}` : "", turn.nova ? `Nova: ${compact(turn.nova)}` : ""].filter(Boolean).join(" / ")).filter(Boolean);
  return `This returning visitor previously discussed ${path}${subject} and ${state}.${recent.length ? ` Recent conversation context: ${recent.join(" | ")}.` : ""} Treat this as prior context, not guaranteed-current fact.`;
}

function persist(stored: StoredNovaConversation): void {
  localStorage.setItem(ACTIVE_KEY, JSON.stringify(stored));
  localStorage.setItem(PREVIOUS_KEY, summaryFor(stored));
}

export function archiveActiveConversation(): void {
  const active = loadActiveConversation();
  if (active) localStorage.setItem(PREVIOUS_KEY, summaryFor(active));
  localStorage.removeItem(ACTIVE_KEY);
  sessionStorage.removeItem(RESUME_KEY);
}

export function saveConversation(sessionId: string, path: BusinessPath, response: DiscoveryResponse, answer?: { field: string; value: string | number | boolean }): StoredNovaConversation {
  const previous = loadActiveConversation();
  const sameSession = previous?.sessionId === sessionId;
  const answers = sameSession ? { ...previous.answers } : {};
  if (answer) {
    const normalized = response.interpretation?.field === answer.field ? response.interpretation.normalized : undefined;
    answers[answer.field] = typeof normalized === "string" || typeof normalized === "number" || typeof normalized === "boolean" ? normalized : answer.value;
  }
  const businessName = answer?.field === "businessName" && typeof answer.value === "string" ? answer.value.trim() : sameSession ? previous?.businessName : undefined;
  const recentTurns = sameSession ? [...(previous?.recentTurns ?? [])] : [];
  if (answer && response.conversationTurn?.answer) recentTurns.push({ user: String(answer.value), nova: response.conversationTurn.answer, at: new Date().toISOString() });
  const stored: StoredNovaConversation = { visitorId: getOrCreateVisitorId(), sessionId, path, updatedAt: new Date().toISOString(), answers, lastResponse: response, recentTurns: recentTurns.slice(-MAX_RECENT_TURNS), ...(businessName ? { businessName } : {}) };
  persist(stored);
  return stored;
}

export function migrateConversationSession(previous: StoredNovaConversation, newSessionId: string, response: DiscoveryResponse): StoredNovaConversation {
  const stored: StoredNovaConversation = {
    ...previous,
    visitorId: getOrCreateVisitorId(),
    sessionId: newSessionId,
    updatedAt: new Date().toISOString(),
    lastResponse: response,
    answers: { ...previous.answers },
    recentTurns: [...(previous.recentTurns ?? [])].slice(-MAX_RECENT_TURNS),
  };
  persist(stored);
  return stored;
}

export function appendConversationTurn(user: string, nova: string): void {
  const active = loadActiveConversation();
  if (!active) return;
  const recentTurns = [...(active.recentTurns ?? []), { user: compact(user, 500), nova: compact(nova, 500), at: new Date().toISOString() }].slice(-MAX_RECENT_TURNS);
  persist({ ...active, updatedAt: new Date().toISOString(), recentTurns });
}

export function updateLastResponse(response: DiscoveryResponse): void {
  const active = loadActiveConversation();
  if (!active) return;
  persist({ ...active, updatedAt: new Date().toISOString(), lastResponse: response });
}

export function requestResume(): void { sessionStorage.setItem(RESUME_KEY, "true"); }

export function consumeResume(path: BusinessPath): StoredNovaConversation | null {
  const requested = sessionStorage.getItem(RESUME_KEY) === "true";
  sessionStorage.removeItem(RESUME_KEY);
  if (!requested) return null;
  const active = loadActiveConversation();
  return active && active.path === path ? active : null;
}

function installResumePrompt(): void {
  const active = loadActiveConversation();
  if (!active) return;
  const paths = document.querySelector<HTMLElement>(".paths");
  if (!paths || document.querySelector("#nova-continuity-prompt")) return;
  const card = document.createElement("section");
  card.id = "nova-continuity-prompt";
  card.className = "nova-continuity-prompt";
  const subject = active.businessName ? ` with ${active.businessName}` : "";
  const status = active.lastResponse.completed ? "I still have the Flight Plan we built" : "I saved where we left off";
  card.innerHTML = `<strong>Welcome back.</strong><span>${status}${subject}. Want to pick it back up?</span><div><button type="button" data-resume-nova>Continue with Nova</button><button type="button" data-start-fresh>Start fresh</button></div>`;
  paths.insertAdjacentElement("beforebegin", card);
  card.querySelector<HTMLButtonElement>("[data-resume-nova]")?.addEventListener("click", () => { requestResume(); card.remove(); document.querySelector<HTMLButtonElement>(`[data-path="${active.path}"]`)?.click(); });
  card.querySelector<HTMLButtonElement>("[data-start-fresh]")?.addEventListener("click", () => { archiveActiveConversation(); window.dispatchEvent(new CustomEvent("nova:continuity-start-fresh")); card.remove(); });
}

export function initializeVisitorContinuity(): void {
  getOrCreateVisitorId();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", installResumePrompt, { once: true });
  else window.setTimeout(installResumePrompt, 0);
}
