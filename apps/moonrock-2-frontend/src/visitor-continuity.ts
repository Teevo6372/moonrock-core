import type { BusinessPath, DiscoveryResponse } from "./types.js";

const VISITOR_KEY = "moonrock:nova:visitor-id:v1";
const ACTIVE_KEY = "moonrock:nova:active-conversation:v1";
const PREVIOUS_KEY = "moonrock:nova:previous-summary:v1";
const RESUME_KEY = "moonrock:nova:resume-requested:v1";

export interface StoredNovaConversation {
  visitorId: string;
  sessionId: string;
  path: BusinessPath;
  updatedAt: string;
  businessName?: string;
  answers: Record<string, string | number | boolean>;
  lastResponse: DiscoveryResponse;
}

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try { return JSON.parse(value) as T; } catch { return null; }
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
  const learned = conversation.lastResponse.progress.answered;
  const subject = conversation.businessName ? ` for ${conversation.businessName}` : "";
  const path = conversation.path === "startup" ? "a startup" : "an existing business";
  const state = conversation.lastResponse.completed ? "completed a Flight Plan" : `worked through ${learned} discovery ${learned === 1 ? "item" : "items"}`;
  return `This returning visitor previously discussed ${path}${subject} and ${state}. Treat this as prior context, not guaranteed-current fact. Verify anything that could have changed before relying on it.`;
}

export function archiveActiveConversation(): void {
  const active = loadActiveConversation();
  if (active) localStorage.setItem(PREVIOUS_KEY, summaryFor(active));
  localStorage.removeItem(ACTIVE_KEY);
  sessionStorage.removeItem(RESUME_KEY);
}

export function saveConversation(
  sessionId: string,
  path: BusinessPath,
  response: DiscoveryResponse,
  answer?: { field: string; value: string | number | boolean },
): StoredNovaConversation {
  const previous = loadActiveConversation();
  const answers = previous?.sessionId === sessionId ? { ...previous.answers } : {};
  if (answer) answers[answer.field] = answer.value;
  const businessName = answer?.field === "businessName" && typeof answer.value === "string"
    ? answer.value.trim()
    : previous?.sessionId === sessionId ? previous.businessName : undefined;
  const stored: StoredNovaConversation = {
    visitorId: getOrCreateVisitorId(),
    sessionId,
    path,
    updatedAt: new Date().toISOString(),
    answers,
    lastResponse: response,
    ...(businessName ? { businessName } : {}),
  };
  localStorage.setItem(ACTIVE_KEY, JSON.stringify(stored));
  localStorage.setItem(PREVIOUS_KEY, summaryFor(stored));
  return stored;
}

export function requestResume(): void { sessionStorage.setItem(RESUME_KEY, "true"); }
export function consumeResume(path: BusinessPath): StoredNovaConversation | null {
  const requested = sessionStorage.getItem(RESUME_KEY) === "true";
  sessionStorage.removeItem(RESUME_KEY);
  if (!requested) return null;
  const active = loadActiveConversation();
  return active && !active.lastResponse.completed && active.path === path ? active : null;
}

function installResumePrompt(): void {
  const active = loadActiveConversation();
  if (!active || active.lastResponse.completed) return;
  const paths = document.querySelector<HTMLElement>(".paths");
  if (!paths || document.querySelector("#nova-continuity-prompt")) return;
  const card = document.createElement("section");
  card.id = "nova-continuity-prompt";
  card.className = "nova-continuity-prompt";
  const subject = active.businessName ? ` with ${active.businessName}` : "";
  card.innerHTML = `<strong>Welcome back.</strong><span>I saved where we left off${subject}. Want to pick it back up?</span><div><button type="button" data-resume-nova>Continue with Nova</button><button type="button" data-start-fresh>Start fresh</button></div>`;
  paths.insertAdjacentElement("beforebegin", card);
  card.querySelector<HTMLButtonElement>("[data-resume-nova]")?.addEventListener("click", () => {
    requestResume();
    card.remove();
    document.querySelector<HTMLButtonElement>(`[data-path="${active.path}"]`)?.click();
  });
  card.querySelector<HTMLButtonElement>("[data-start-fresh]")?.addEventListener("click", () => {
    archiveActiveConversation();
    window.dispatchEvent(new CustomEvent("nova:continuity-start-fresh"));
    card.remove();
  });
}

export function initializeVisitorContinuity(): void {
  getOrCreateVisitorId();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", installResumePrompt, { once: true });
  else window.setTimeout(installResumePrompt, 0);
}
