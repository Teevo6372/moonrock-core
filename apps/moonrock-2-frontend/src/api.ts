import "./voice-chat-experience.js";
import { assertFrontendConfig, config } from "./config.js";
import { publishProgressiveFlightPlanResponse } from "./progressive-flight-plan.js";
import { appendConversationTurn, archiveActiveConversation, consumeResume, getOrCreateVisitorId, initializeVisitorContinuity, migrateConversationSession, previousConversationSummary, saveConversation, updateLastResponse } from "./visitor-continuity.js";
import type { BusinessPath, ContactIdentity, DiscoveryResponse, HumanHandoffResponse, NovaConversationTurn } from "./types.js";

let activeDiscoverySessionId = "";
let activeDiscoveryPath: BusinessPath | undefined;

interface DiscoveryResumeEnvelope {
  state: { path: BusinessPath; answers: Record<string, unknown>; completed: boolean; meaningfulTurns?: number };
  version: number;
  response: DiscoveryResponse;
}

interface NovaConversationEnvelope extends NovaConversationTurn {
  completed?: boolean;
  tier?: DiscoveryResponse["tier"];
  progress?: DiscoveryResponse["progress"];
  view?: DiscoveryResponse["view"];
  progressiveFlightPlan?: DiscoveryResponse["progressiveFlightPlan"];
  result?: DiscoveryResponse["result"];
  websiteBuildResult?: DiscoveryResponse["websiteBuildResult"];
  ghlSaasResult?: DiscoveryResponse["ghlSaasResult"];
  conversationTurn?: NovaConversationTurn;
}

interface SaveFlightPlanResponse { status: string; answer: string; }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  assertFrontendConfig();
  const response = await fetch(`${config.novaApiBaseUrl}${path}`, init);
  const text = await response.text();
  let payload: Record<string, unknown> = {};
  try { payload = text ? JSON.parse(text) as Record<string, unknown> : {}; } catch { payload = {}; }
  if (!response.ok) {
    const detail = typeof payload.detail === "string" ? payload.detail : undefined;
    const title = typeof payload.title === "string" ? payload.title : undefined;
    const error = new Error(detail ?? title ?? `Nova request failed (${response.status})`);
    Object.assign(error, { status: response.status });
    throw error;
  }
  return payload as T;
}

function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
function get<T>(path: string): Promise<T> { return request<T>(path); }

function publish(response: DiscoveryResponse): DiscoveryResponse {
  publishProgressiveFlightPlanResponse(response);
  window.dispatchEvent(new CustomEvent("nova:conversation-state", { detail: response }));
  if (response.completed && response.result) window.dispatchEvent(new CustomEvent("nova:flight-plan", { detail: response.result.flightPlan }));
  if (response.completed && response.websiteBuildResult) window.dispatchEvent(new CustomEvent("nova:website-build-result", { detail: response.websiteBuildResult }));
  if (response.completed && response.ghlSaasResult) window.dispatchEvent(new CustomEvent("nova:ghl-saas-result", { detail: response.ghlSaasResult }));
  if (response.humanHandoff) window.dispatchEvent(new CustomEvent("nova:human-handoff", { detail: response.humanHandoff }));
  return response;
}

async function createServerConversation(sessionId: string, path: BusinessPath): Promise<DiscoveryResponse> {
  return post<DiscoveryResponse>(`/v1/discovery/${encodeURIComponent(sessionId)}/start`, {
    path,
    visitorId: getOrCreateVisitorId(),
    conversationId: sessionId,
    previousConversationSummary: previousConversationSummary(),
  });
}

async function rehydrateConversation(sessionId: string, path: BusinessPath, answers: Record<string, string | number | boolean>): Promise<DiscoveryResponse> {
  let response = await createServerConversation(sessionId, path);
  for (const [field, value] of Object.entries(answers)) {
    if (response.completed) break;
    const candidate = await post<DiscoveryResponse>(`/v1/discovery/${encodeURIComponent(sessionId)}/answers`, { field, value, visitorId: getOrCreateVisitorId() });
    if (!candidate.clarification) response = candidate;
  }
  return response;
}

export async function startDiscovery(sessionId: string, path: BusinessPath): Promise<DiscoveryResponse> {
  const resumable = consumeResume(path);
  if (resumable) {
    activeDiscoverySessionId = resumable.sessionId;
    activeDiscoveryPath = resumable.path;
    try {
      const restored = await get<DiscoveryResumeEnvelope>(`/v1/discovery/${encodeURIComponent(resumable.sessionId)}`);
      saveConversation(resumable.sessionId, resumable.path, restored.response);
      return publish(restored.response);
    } catch (error) {
      const statusCode = typeof error === "object" && error !== null && "status" in error ? Number((error as { status?: unknown }).status) : 0;
      if (statusCode !== 404) throw error;
      activeDiscoverySessionId = sessionId;
      activeDiscoveryPath = path;
      const rebuilt = await rehydrateConversation(sessionId, path, resumable.answers);
      migrateConversationSession(resumable, sessionId, rebuilt);
      return publish(rebuilt);
    }
  }

  archiveActiveConversation();
  activeDiscoverySessionId = sessionId;
  activeDiscoveryPath = path;
  const response = await createServerConversation(sessionId, path);
  saveConversation(sessionId, path, response);
  return publish(response);
}

export async function answerDiscovery(sessionId: string, field: string, value: string | number | boolean, _identity?: ContactIdentity): Promise<DiscoveryResponse> {
  const effectiveSessionId = activeDiscoverySessionId || sessionId;
  const response = await post<DiscoveryResponse>(`/v1/discovery/${encodeURIComponent(effectiveSessionId)}/answers`, { field, value, visitorId: getOrCreateVisitorId() });
  if (activeDiscoveryPath) saveConversation(effectiveSessionId, activeDiscoveryPath, response, { field, value });
  return publish(response);
}

export async function askNova(question: string): Promise<NovaConversationTurn> {
  if (!activeDiscoverySessionId) throw new Error("Nova's discovery session is not active.");
  const envelope = await post<NovaConversationEnvelope>(`/v1/discovery/${encodeURIComponent(activeDiscoverySessionId)}/conversation`, { question, visitorId: getOrCreateVisitorId() });
  const turn: NovaConversationTurn = envelope.conversationTurn
    ? { ...envelope.conversationTurn, ...(envelope.humanHandoff ? { humanHandoff: envelope.humanHandoff } : {}) }
    : { answer: envelope.answer, mode: envelope.mode, intent: envelope.intent, ...(envelope.humanHandoff ? { humanHandoff: envelope.humanHandoff } : {}) };
  appendConversationTurn(question, turn.answer);
  if (envelope.completed !== undefined && envelope.progress && envelope.view && envelope.progressiveFlightPlan) {
    const activePath = activeDiscoveryPath;
    const response = {
      path: activePath ?? "existing_business",
      completed: envelope.completed,
      ...(envelope.tier ? { tier: envelope.tier } : {}),
      progress: envelope.progress,
      view: envelope.view,
      progressiveFlightPlan: envelope.progressiveFlightPlan,
      ...(envelope.result ? { result: envelope.result } : {}),
      ...(envelope.websiteBuildResult ? { websiteBuildResult: envelope.websiteBuildResult } : {}),
      ...(envelope.ghlSaasResult ? { ghlSaasResult: envelope.ghlSaasResult } : {}),
      conversationTurn: turn,
    } as DiscoveryResponse;
    updateLastResponse(response);
    publish(response);
  }
  if (turn.humanHandoff) window.dispatchEvent(new CustomEvent("nova:human-handoff", { detail: turn.humanHandoff }));
  return turn;
}

export function saveFlightPlan(identity: ContactIdentity): Promise<SaveFlightPlanResponse> {
  if (!activeDiscoverySessionId) return Promise.reject(new Error("Nova's discovery session is not active."));
  return post<SaveFlightPlanResponse>(`/v1/discovery/${encodeURIComponent(activeDiscoverySessionId)}/save-flight-plan`, { identity, visitorId: getOrCreateVisitorId() });
}

export function completeHumanHandoff(identity: ContactIdentity, requestText: string): Promise<HumanHandoffResponse> {
  if (!activeDiscoverySessionId) return Promise.reject(new Error("Nova's discovery session is not active."));
  return post<HumanHandoffResponse>(`/v1/discovery/${encodeURIComponent(activeDiscoverySessionId)}/handoff`, { identity, requestText, visitorId: getOrCreateVisitorId() });
}

document.addEventListener("nova:complete-human-handoff", (event) => {
  const detail = (event as CustomEvent<{ identity: ContactIdentity; requestText: string }>).detail;
  if (!detail?.identity?.email || !detail.requestText) return;
  void completeHumanHandoff(detail.identity, detail.requestText)
    .then((response) => window.dispatchEvent(new CustomEvent("nova:human-handoff-complete", { detail: response })))
    .catch((error: unknown) => window.dispatchEvent(new CustomEvent("nova:human-handoff-error", { detail: { message: error instanceof Error ? error.message : "Moonrock could not complete the handoff right now." } })));
});

const resourceQuestions: Record<string, string> = {
  pricing: "Can you explain the pricing for the recommendation in my Flight Plan?",
  payments: "What payment options or payment timing can we discuss?",
  implementation: "How would implementation work for the business we just discussed?",
  local: "What does working with Moonrock as a local partner look like?",
  services: "What other Moonrock capabilities are relevant to the problems in my Flight Plan?",
};

function conversationAnswerTarget(): HTMLDivElement | null { return document.querySelector<HTMLDivElement>("#resource-answer"); }

async function renderRuntimeConversation(question: string): Promise<void> {
  const target = conversationAnswerTarget();
  if (!target) return;
  target.textContent = "Nova is thinking about that in the context of your Flight Plan…";
  window.dispatchEvent(new CustomEvent("nova:voice-state", { detail: { state: "thinking" } }));
  try {
    const turn = await askNova(question);
    target.textContent = turn.answer;
    window.dispatchEvent(new CustomEvent("nova:voice-state", { detail: { state: turn.intent === "human_handoff" ? "handoff" : "speaking", durationMs: 1800 } }));
  } catch (error) {
    target.textContent = error instanceof Error ? error.message : "Nova could not answer that question right now.";
    window.dispatchEvent(new CustomEvent("nova:voice-state", { detail: { state: "idle" } }));
  }
}

document.addEventListener("click", (event) => {
  const element = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("[data-resource]") : null;
  if (!element) return;
  const question = resourceQuestions[element.dataset.resource ?? ""];
  if (!question) return;
  event.preventDefault(); event.stopImmediatePropagation(); void renderRuntimeConversation(question);
}, true);

document.addEventListener("submit", (event) => {
  const form = event.target instanceof HTMLFormElement ? event.target : null;
  if (!form || form.id !== "post-plan-question") return;
  const input = form.querySelector<HTMLInputElement>("#post-plan-input");
  const question = input?.value.trim() ?? "";
  if (!question) return;
  event.preventDefault(); event.stopImmediatePropagation(); input!.value = ""; void renderRuntimeConversation(question);
}, true);

initializeVisitorContinuity();
