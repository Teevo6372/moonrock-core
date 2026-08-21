import "./voice-chat-experience.js";
import { assertFrontendConfig, config } from "./config.js";
import { publishProgressiveFlightPlanResponse } from "./progressive-flight-plan.js";
import type { BusinessPath, ContactIdentity, DiscoveryResponse, HumanHandoffResponse, NovaConversationTurn } from "./types.js";

let activeDiscoverySessionId = "";

async function post<T>(path: string, body: unknown): Promise<T> {
  assertFrontendConfig();
  const response = await fetch(`${config.novaApiBaseUrl}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const text = await response.text();
  let payload: Record<string, unknown> = {};
  try { payload = text ? JSON.parse(text) as Record<string, unknown> : {}; } catch { payload = {}; }
  if (!response.ok) {
    const detail = typeof payload.detail === "string" ? payload.detail : undefined;
    const title = typeof payload.title === "string" ? payload.title : undefined;
    throw new Error(detail ?? title ?? `Nova request failed (${response.status})`);
  }
  return payload as T;
}

function surfaceClarification(response: DiscoveryResponse): void {
  if (!response.clarification) return;
  window.setTimeout(() => {
    const reaction = document.querySelector<HTMLParagraphElement>("#nova-reaction");
    const status = document.querySelector<HTMLParagraphElement>("#status");
    if (reaction) { reaction.hidden = false; reaction.textContent = response.clarification!.message; }
    if (status) status.textContent = "Nova wants to make sure she understood that correctly.";
  }, 0);
}

function publish(response: DiscoveryResponse): DiscoveryResponse {
  publishProgressiveFlightPlanResponse(response);
  surfaceClarification(response);
  if (response.humanHandoff) window.dispatchEvent(new CustomEvent("nova:human-handoff", { detail: response.humanHandoff }));
  return response;
}

export function startDiscovery(sessionId: string, path: BusinessPath): Promise<DiscoveryResponse> {
  activeDiscoverySessionId = sessionId;
  return post<DiscoveryResponse>(`/v1/discovery/${encodeURIComponent(sessionId)}/start`, { path }).then(publish);
}

export function answerDiscovery(sessionId: string, field: string, value: string | number | boolean, identity?: ContactIdentity): Promise<DiscoveryResponse> {
  activeDiscoverySessionId = sessionId;
  return post<DiscoveryResponse>(`/v1/discovery/${encodeURIComponent(sessionId)}/answers`, { field, value, ...(identity ? { identity } : {}) }).then(publish);
}

export function askNova(question: string): Promise<NovaConversationTurn> {
  if (!activeDiscoverySessionId) return Promise.reject(new Error("Nova's discovery session is not active."));
  return post<NovaConversationTurn>(`/v1/discovery/${encodeURIComponent(activeDiscoverySessionId)}/conversation`, { question }).then((turn) => {
    if (turn.humanHandoff) window.dispatchEvent(new CustomEvent("nova:human-handoff", { detail: turn.humanHandoff }));
    return turn;
  });
}

export function completeHumanHandoff(identity: ContactIdentity, requestText: string): Promise<HumanHandoffResponse> {
  if (!activeDiscoverySessionId) return Promise.reject(new Error("Nova's discovery session is not active."));
  return post<HumanHandoffResponse>(`/v1/discovery/${encodeURIComponent(activeDiscoverySessionId)}/handoff`, { identity, requestText });
}

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
