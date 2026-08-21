import "./human-handoff-ui.css";
import { askNova } from "./api.js";
import type { ContactIdentity, HumanHandoffPrompt, HumanHandoffResponse } from "./types.js";

let requestText = "";

function controls(): HTMLElement | null { return document.querySelector<HTMLElement>("#nova-controls"); }
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

function handoffMarkup(detail: HumanHandoffPrompt): string {
  return `
    <section class="human-handoff-card" aria-labelledby="human-handoff-title">
      <p class="handoff-kicker">TALK TO A PERSON</p>
      <h3 id="human-handoff-title">Absolutely. I’ll stop the discovery questions here.</h3>
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
    <section class="handoff-continue-card" aria-label="Keep chatting with Nova">
      <p>You can keep talking with me while I get the handoff lined up. I won’t restart the discovery questions unless you ask me to.</p>
      <form id="handoff-chat-form" class="answer-form">
        <input id="handoff-chat-input" type="text" autocomplete="off" placeholder="Keep chatting with Nova…">
        <button type="submit">Send</button>
      </form>
      <p id="handoff-chat-status" class="handoff-status" aria-live="polite"></p>
    </section>`;
}

function renderHandoff(detail: HumanHandoffPrompt): void {
  requestText = detail.requestText;
  document.body.classList.add("nova-human-handoff-active");
  window.dispatchEvent(new CustomEvent("nova:voice-state", { detail: { state: "handoff" } }));
  const target = controls();
  if (!target) return;
  target.innerHTML = handoffMarkup(detail);
  target.querySelector<HTMLInputElement>("#handoff-first-name")?.focus();
  target.querySelector<HTMLFormElement>("#human-handoff-form")?.addEventListener("submit", submitHandoff);
  target.querySelector<HTMLFormElement>("#handoff-chat-form")?.addEventListener("submit", continueWithNova);
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
  } catch (error) {
    if (status) status.textContent = error instanceof Error ? error.message : "Nova couldn’t answer that right now.";
  } finally {
    input.disabled = false;
    input.focus();
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
  if (!firstName || !email || !consent) { if (status) status.textContent = "I just need your first name, email, and permission to save the conversation."; return; }
  const identity: ContactIdentity = { firstName, lastName, email, ...(phone ? { phone } : {}), followUpConsent: true };
  form.querySelectorAll<HTMLInputElement | HTMLButtonElement>("input,button").forEach((element) => { element.disabled = true; });
  if (status) status.textContent = "Saving what we covered and flagging Moonrock…";
  document.dispatchEvent(new CustomEvent("nova:complete-human-handoff", { detail: { identity, requestText } }));
}

window.addEventListener("nova:human-handoff", (event) => renderHandoff((event as CustomEvent<HumanHandoffPrompt>).detail));
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
  const replacements: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" };
  return value.replace(/[&<>'"]/g, (character) => replacements[character] ?? character);
}
