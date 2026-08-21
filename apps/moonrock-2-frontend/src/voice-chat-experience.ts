import "./voice-chat-experience.css";

type SpeechRecognitionResultLike = { isFinal: boolean; 0?: { transcript: string } };
type SpeechRecognitionResultEventLike = Event & { results: ArrayLike<SpeechRecognitionResultLike | undefined> };
type SpeechRecognitionErrorEventLike = Event & { error?: string };
type SpeechRecognitionLike = {
  lang: string; interimResults: boolean; continuous: boolean; start: () => void; stop: () => void; abort: () => void;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
declare global { interface Window { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor; } }

let lastNovaSignature = "";
let activeRecognition: SpeechRecognitionLike | undefined;
let observed = false;
let learnedCount = 0;

function panel(): HTMLElement | null { return document.querySelector<HTMLElement>("#nova-panel"); }
function dockAvatar(): void {
  const root = panel(); const stage = document.querySelector<HTMLElement>(".nova-visual-stage");
  if (!root || root.hidden || !stage || stage.classList.contains("conversation-docked")) return;
  stage.classList.add("conversation-docked"); root.prepend(stage);
}
function enterFocusMode(): void {
  const root = panel(); if (!root || root.classList.contains("nova-focus-mode")) return;
  root.classList.add("nova-focus-mode");
  const header = document.createElement("header"); header.className = "nova-focus-header";
  header.innerHTML = `<div><strong>Nova</strong><span>Moonrock Virtual Growth Advisor</span></div><button type="button" class="nova-history-toggle" aria-expanded="false">Conversation</button>`;
  root.prepend(header);
  header.querySelector("button")?.addEventListener("click", () => {
    const thread = chatThread(); if (!thread) return;
    const expanded = thread.classList.toggle("show-history");
    header.querySelector("button")?.setAttribute("aria-expanded", String(expanded));
  });
}
function chatThread(): HTMLDivElement | null {
  let thread = document.querySelector<HTMLDivElement>("#nova-live-chat"); const root = panel(); const dialogue = document.querySelector<HTMLElement>(".nova-dialogue");
  if (!root || !dialogue) return null;
  if (!thread) { thread = document.createElement("div"); thread.id = "nova-live-chat"; thread.className = "nova-live-chat"; thread.setAttribute("role", "log"); thread.setAttribute("aria-live", "polite"); thread.setAttribute("aria-label", "Conversation with Nova"); dialogue.insertAdjacentElement("afterend", thread); }
  return thread;
}
function updateProgress(): void {
  let progress = document.querySelector<HTMLButtonElement>("#nova-quiet-progress"); const thread = chatThread(); if (!thread) return;
  if (!progress) { progress = document.createElement("button"); progress.id = "nova-quiet-progress"; progress.className = "nova-quiet-progress"; progress.type = "button"; progress.title = "Show conversation history"; progress.addEventListener("click", () => document.querySelector<HTMLButtonElement>(".nova-history-toggle")?.click()); thread.insertAdjacentElement("afterend", progress); }
  progress.textContent = `Building your Flight Plan · ${learnedCount} ${learnedCount === 1 ? "thing" : "things"} learned`;
}
function appendMessage(role: "nova" | "visitor" | "system", text: string, source?: "voice" | "text"): void {
  const clean = text.trim(); const thread = chatThread(); if (!thread || !clean) return; enterFocusMode();
  if (role === "visitor") learnedCount += 1;
  const message = document.createElement("article"); message.className = `nova-chat-message nova-chat-${role}`;
  const who = role === "nova" ? "Nova" : role === "visitor" ? "You" : "Status";
  message.innerHTML = `<div class="nova-chat-meta"><strong>${who}</strong>${source ? `<span>${source === "voice" ? "spoken" : "typed"}</span>` : ""}</div><p></p>`;
  message.querySelector("p")!.textContent = clean; thread.append(message);
  thread.querySelectorAll<HTMLElement>(".nova-chat-message").forEach((item, index, all) => item.classList.toggle("is-current", index >= all.length - 2));
  thread.scrollTo({ top: thread.scrollHeight, behavior: "smooth" }); updateProgress();
}
function syncNovaMessage(): void {
  const reaction = document.querySelector<HTMLParagraphElement>("#nova-reaction"); const headline = document.querySelector<HTMLHeadingElement>("#nova-headline"); const body = document.querySelector<HTMLParagraphElement>("#nova-body"); if (!headline || !body) return;
  const parts = [!reaction?.hidden ? reaction?.textContent : "", headline.textContent, body.textContent].map((part) => part?.trim() ?? "").filter(Boolean); if (!parts.length) return;
  const signature = parts.join("\n"); if (signature === lastNovaSignature) return; lastNovaSignature = signature; appendMessage("nova", signature); window.dispatchEvent(new CustomEvent("nova:voice-state", { detail: { state: "speaking", durationMs: 1500 } }));
}
function recognitionConstructor(): SpeechRecognitionConstructor | undefined { return window.SpeechRecognition ?? window.webkitSpeechRecognition; }
function voiceSupported(): boolean { return Boolean(recognitionConstructor()); }
function stopRecognition(): void { activeRecognition?.stop(); activeRecognition = undefined; }
function startRecognition(input: HTMLInputElement, form: HTMLFormElement, button: HTMLButtonElement): void {
  const Constructor = recognitionConstructor(); if (!Constructor) { appendMessage("system", "Voice input isn't available here. You can keep typing without losing your place."); return; }
  stopRecognition(); const recognition = new Constructor(); activeRecognition = recognition; recognition.lang = document.documentElement.lang || "en-US"; recognition.interimResults = true; recognition.continuous = false; let finalTranscript = "";
  button.classList.add("is-listening"); button.setAttribute("aria-pressed", "true"); button.textContent = "Listening…"; window.dispatchEvent(new CustomEvent("nova:voice-state", { detail: { state: "listening" } }));
  recognition.onresult = (event) => { let interim = ""; finalTranscript = ""; for (let index = 0; index < event.results.length; index += 1) { const result = event.results[index]; if (!result) continue; const transcript = result[0]?.transcript ?? ""; if (result.isFinal) finalTranscript += transcript; else interim += transcript; } input.value = (finalTranscript || interim).trim(); input.dispatchEvent(new Event("input", { bubbles: true })); };
  recognition.onerror = (event) => appendMessage("system", event.error === "not-allowed" ? "Microphone access wasn't allowed. Typing still works normally." : "I couldn't catch that clearly. Try the mic again or type your answer.");
  recognition.onend = () => { activeRecognition = undefined; button.classList.remove("is-listening"); button.setAttribute("aria-pressed", "false"); button.textContent = "Speak"; window.dispatchEvent(new CustomEvent("nova:voice-state", { detail: { state: "idle" } })); const value = input.value.trim(); if (!value) return; appendMessage("visitor", value, "voice"); input.dataset.voiceCaptured = "true"; window.setTimeout(() => form.requestSubmit(), 250); };
  recognition.start();
}
function attachVoiceButton(form: HTMLFormElement): void {
  if (form.dataset.voiceReady === "true") return; const input = form.querySelector<HTMLInputElement>('input[name="answer"], #post-plan-input'); if (!input) return; form.dataset.voiceReady = "true";
  input.placeholder = "Type a message…"; const button = document.createElement("button"); button.type = "button"; button.className = "nova-mic-button"; button.setAttribute("aria-label", voiceSupported() ? "Speak to Nova" : "Voice input unavailable"); button.setAttribute("aria-pressed", "false"); button.textContent = voiceSupported() ? "Speak" : "Mic unavailable"; button.disabled = !voiceSupported();
  button.addEventListener("click", () => button.classList.contains("is-listening") ? stopRecognition() : startRecognition(input, form, button)); form.querySelector<HTMLButtonElement>('button[type="submit"]')?.insertAdjacentElement("beforebegin", button);
}
function enhanceForms(): void { document.querySelectorAll<HTMLFormElement>("[data-conversation-form], #post-plan-question").forEach(attachVoiceButton); }
function captureVisitorSubmission(event: Event): void { const form = event.target instanceof HTMLFormElement ? event.target : null; if (!form || (!form.matches("[data-conversation-form]") && form.id !== "post-plan-question")) return; const input = form.querySelector<HTMLInputElement>('input[name="answer"], #post-plan-input'); const value = input?.value.trim() ?? ""; if (!value) return; if (input?.dataset.voiceCaptured === "true") { delete input.dataset.voiceCaptured; return; } appendMessage("visitor", value, "text"); }
function captureChoice(event: Event): void { const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("[data-answer], [data-choice]") : null; if (!target) return; const value = target.dataset.choice ?? (target.dataset.answer === "true" ? "Yes, mostly" : "No, not really"); appendMessage("visitor", value, "text"); }
function syncRuntimeAnswer(): void { const answer = document.querySelector<HTMLDivElement>("#resource-answer"); const text = answer?.textContent?.trim() ?? ""; if (!text || /Nova is thinking about that/.test(text) || text === lastNovaSignature) return; lastNovaSignature = text; appendMessage("nova", text); window.dispatchEvent(new CustomEvent("nova:voice-state", { detail: { state: "speaking", durationMs: 1700 } })); }
function scheduleSync(): void { window.setTimeout(() => { dockAvatar(); chatThread(); enhanceForms(); syncNovaMessage(); syncRuntimeAnswer(); }, 20); }
export function initializeNovaVoiceChatExperience(): void { if (observed) return; observed = true; document.addEventListener("submit", captureVisitorSubmission, true); document.addEventListener("click", captureChoice, true); const observer = new MutationObserver(scheduleSync); observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["hidden"] }); scheduleSync(); }
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initializeNovaVoiceChatExperience, { once: true }); else initializeNovaVoiceChatExperience();
