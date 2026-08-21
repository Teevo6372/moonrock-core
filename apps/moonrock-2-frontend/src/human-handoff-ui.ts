import "./human-handoff-ui.css";
import { askNova } from "./api.js";
import type { ContactIdentity, HumanHandoffPrompt, HumanHandoffResponse } from "./types.js";

let requestText = "";
let retentionAttempted = false;
let latestHandoffDetail: HumanHandoffPrompt | undefined;
let preservedDiscoveryControls: Node[] = [];

function controls(): HTMLElement | null { return document.querySelector<HTMLElement>("#nova-controls"); }
function voiceSupported(): boolean { return "SpeechRecognition" in window || "webkitSpeechRecognition" in window; }

function appendNova(text: string): void {
  const thread = document.querySelector<HTMLElement>("#nova-live-chat");
  if (!thread) return;
  const item = document.createElement("article");
  item.className = "nova-chat-message nova-chat-nova is-current";
  item.innerHTML = `<div class="nova-chat-meta"><strong>Nova</strong></div><p></p>`;
  item.querySelector("p")!.textContent = text;
  thread.append(item);
  thread.scrollTo({ top: thread.scrollHeight, behavior: "smooth" });
}

function appendVisitor(text: string): void {
  const thread = document.querySelector<HTMLElement>("#nova-live-chat");
  if (!thread) return;
  const item = document.createElement("article");
  item.className = "nova-chat-message nova-chat-visitor is-current";
  item.innerHTML = `<div class="nova-chat-meta"><strong>You</strong><span>typed</span></div><p></p>`;
  item.querySelector("p")!.textContent = text;
  thread.append(item);
  thread.scrollTo({ top: thread.scrollHeight, behavior: "smooth" });
}

function chatMarkup(message: string): string {
  return `
    <section class="handoff-continue-card" aria-label="Keep chatting with Nova">
      <p>${escapeHtml(message)}</p>
      <form id="handoff-chat-form" class="answer-form" data-conversation-form>
        <input id="handoff-chat-input" name="answer" type="text" autocomplete="off" placeholder="Keep chatting with Nova…">
        <button type="submit">Send</button>
      </form>
      <p id="handoff-chat-status" class="handoff-status" aria-live="polite"></p>
    </section>`;
}

function retentionMarkup(): string {
  const voiceLine = voiceSupported()
    ? "If typing is the problem, we can switch the mic on and just talk instead."
    : "If typing is the problem, keep it conversational and tell me what’s getting in the way—I’ll work with however you want to explain it.";
  return `
    <section class="human-handoff-card nova-retention-card" aria-labelledby="nova-retention-title">
      <p class="handoff-kicker">BEFORE I HAND YOU OFF</p>
      <h3 id="nova-retention-title">Did I miss something?</h3>
      <p>${escapeHtml(voiceLine)} I’m a pretty capable virtual agent and can answer most questions about your business, Moonrock’s services, pricing, options, and what we’ve already covered.</p>
      <p>Want to give me another shot, or would you still rather talk with a person?</p>
      <div class="handoff-choice-row">
        <button type="button" id="keep-nova">Keep talking with Nova</button>
        <button type="button" id="confirm-human">Talk to a person</button>
      </div>
    </section>
    ${chatMarkup("You can keep talking with me right here. I won’t force you back into the discovery sequence while we sort this out.")}`;
}

function handoffMarkup(detail: HumanHandoffPrompt): string {
  return `
    <section class="human-handoff-card" aria-labelledby="human-handoff-title">
      <p class="handoff-kicker">TALK TO A PERSON</p>
      <h3 id="human-handoff-title">Absolutely. I just wanted to make sure I wasn’t sending you away over something I could fix.</h3>
      <p>${escapeHtml(detail.message)}</p>
      <form id="human-handoff-form">
        <div class="human-handoff-grid">
          <label>First name<input id="handoff-first-name" autocomplete="given-name" required></label>
          <label>Last name <span>optional</span><input id="handoff-last-name" autocomplete="family-name"></label>
          <label>Email<input id="handoff-email" type="email" autocomplete="email" required></label>
          <label>Phone <span>optional</span><input id="handoff-phone" type="tel" autocomplete="tel"></label>
        </div>
        <label class="handoff-consent"><input id="handoff-consent" type="checkbox" required><span>Yes, save what I’ve shared so a Moonrock person can continue from here.</span></label>
        <button type="submit">Request a person</button>
        <p id="handoff-status" class="handoff-status" aria-live="polite"></p>
      </form>
    </section>
    ${chatMarkup("I’ll keep the conversation open while the handoff gets lined up. You can still ask me anything in the meantime.")}`;
}

function wireChatForm(target: HTMLElement): void {
  target.querySelector<HTMLFormElement>("#handoff-chat-form")?.addEventListener("submit", continueWithNova);
}

function restoreDiscoveryControls(): void {
  const target = controls();
  document.body.classList.remove("nova-human-handoff-active");
  window.dispatchEvent(new CustomEvent("nova:voice-state", { detail: { state: "idle" } }));
  if (!target) return;
  target.replaceChildren(...preservedDiscoveryControls);
  preservedDiscoveryControls = [];
  const input = target.querySelector<HTMLInputElement>("input[name=answer], input[type=text]");
  input?.focus();
}

function renderRetention(detail: HumanHandoffPrompt): void {
  requestText = detail.requestText;
  latestHandoffDetail = detail;
  retentionAttempted = true;
  document.body.classList.add("nova-human-handoff-active");
  window.dispatchEvent(new CustomEvent("nova:voice-state", { detail: { state: "speaking", durationMs: 2200 } }));
  const target = controls();
  if (!target) return;
  target.innerHTML = retentionMarkup();
  target.querySelector<HTMLButtonElement>("#keep-nova")?.addEventListener("click", () => {
    appendNova("Good deal. I’m here—let’s keep going.");
    restoreDiscoveryControls();
  });
  target.querySelector<HTMLButtonElement>("#confirm-human")?.addEventListener("click", () => renderConfirmedHandoff(detail));
  wireChatForm(target);
  target.querySelector<HTMLInputElement>("#handoff-chat-input")?.focus();
}

function renderConfirmedHandoff(detail: HumanHandoffPrompt): void {
  requestText = detail.requestText;
  latestHandoffDetail = detail;
  document.body.classList.add("nova-human-handoff-active");
  window.dispatchEvent(new CustomEvent("nova:voice-state", { detail: { state: "handoff" } }));
  const target = controls();
  if (!target) return;
  target.innerHTML = handoffMarkup(detail);
  target.querySelector<HTMLInputElement>("#handoff-first-name")?.focus();
  target.querySelector<HTMLFormElement>("#human-handoff-form")?.addEventListener("submit", submitHandoff);
  wireChatForm(target);
}

function handleHandoffRequest(detail: HumanHandoffPrompt): void {
  latestHandoffDetail = detail;
  const target = controls();
  if (!retentionAttempted && target && preservedDiscoveryControls.length === 0) {
    preservedDiscoveryControls = Array.from(target.childNodes);
  }
  window.setTimeout(() => {
    if (retentionAttempted) renderConfirmedHandoff(detail);
    else renderRetention(detail);
  }, 0);
}

async function continueWithNova(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const input = form.querySelector<HTMLInputElement>("#handoff-chat-input");
  const status = form.parentElement?.querySelector<HTMLElement>("#handoff-chat-status");
  const question = input?.value.trim() ?? "";
  if (!question || !input) return;
  input.value = "";
  appendVisitor(question);
  input.disabled = true;
  if (status) status.textContent = "Nova is thinking…";
  try {
    const turn = await askNova(question);
    appendNova(turn.answer);
    if (status) status.textContent = "";
    if (turn.intent === "human_handoff" && latestHandoffDetail) renderConfirmedHandoff(latestHandoffDetail);
  } catch (error) {
    if (status) status.textContent = error instanceof Error ? error.message : "Nova couldn’t answer that right now.";
  } finally {
    if (input.isConnected) {
      input.disabled = false;
      input.focus();
    }
  }
}

function submitHandoff(event: SubmitEvent): void {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const firstName = form.querySelector<HTMLInputElement>("#handoff-first-name")?.value.trim() ?? "";
  const lastName = form.querySelector<HTMLInputElement>("#handoff-last-name")?.value.trim() ?? "";
  const email = form.querySelector<HTMLInputElement>("#handoff-email")?.value.trim() ?? "";
  const phone = form.querySelector<HTMLInputElement>("#handoff-phone")?.value.trim() ?? "";
  const consent = form.querySelector<HTMLInputElement>("#handoff-consent")?.checked ?? false;
  const status = form.querySelector<HTMLElement>("#handoff-status");
  if (!firstName || !email || !consent) {
    if (status) status.textContent = "I just need your first name, email, and permission to save the conversation.";
    return;
  }
  const identity: ContactIdentity = { firstName, lastName, email, ...(phone ? { phone } : {}), followUpConsent: true };
  form.querySelectorAll<HTMLInputElement | HTMLButtonElement>("input,button").forEach((element) => { element.disabled = true; });
  if (status) status.textContent = "Saving what we covered and flagging Moonrock…";
  document.dispatchEvent(new CustomEvent("nova:complete-human-handoff", { detail: { identity, requestText } }));
}

window.addEventListener("nova:human-handoff", (event) => handleHandoffRequest((event as CustomEvent<HumanHandoffPrompt>).detail));
window.addEventListener("nova:human-handoff-complete", (event) => {
  const response = (event as CustomEvent<HumanHandoffResponse>).detail;
  const card = document.querySelector<HTMLElement>(".human-handoff-card");
  if (card) card.innerHTML = `<p class="handoff-kicker">HANDOFF REQUESTED</p><h3>You’re all set.</h3><p>${escapeHtml(response.answer)}</p><p class="handoff-small">Keep chatting with Nova below if there’s anything else you want Moonrock to know.</p>`;
  appendNova(response.answer);
  document.querySelector<HTMLInputElement>("#handoff-chat-input")?.focus();
});
window.addEventListener("nova:human-handoff-error", (event) => {
  const message = (event as CustomEvent<{ message: string }>).detail.message;
  const status = document.querySelector<HTMLElement>("#handoff-status");
  if (status) status.textContent = message;
  document.querySelectorAll<HTMLInputElement | HTMLButtonElement>("#human-handoff-form input, #human-handoff-form button").forEach((element) => { element.disabled = false; });
});

function escapeHtml(value: string): string {
  const replacements: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '\"': "&quot;" };
  return value.replace(/[&<>'\"]/g, (character) => replacements[character] ?? character);
}
