import "./voice-chat-experience.css";

type SpeechRecognitionResultEventLike = Event & { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> };
type SpeechRecognitionErrorEventLike = Event & { error?: string };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

let lastNovaSignature = "";
let activeRecognition: SpeechRecognitionLike | undefined;
let observed = false;

function dockAvatar(): void {
  const panel = document.querySelector<HTMLElement>("#nova-panel");
  const stage = document.querySelector<HTMLElement>(".nova-visual-stage");
  if (!panel || panel.hidden || !stage || stage.classList.contains("conversation-docked")) return;
  stage.classList.add("conversation-docked");
  panel.prepend(stage);
}

function chatThread(): HTMLDivElement | null {
  let thread = document.querySelector<HTMLDivElement>("#nova-live-chat");
  const panel = document.querySelector<HTMLElement>("#nova-panel");
  const dialogue = document.querySelector<HTMLElement>(".nova-dialogue");
  if (!panel || !dialogue) return null;
  if (!thread) {
    thread = document.createElement("div");
    thread.id = "nova-live-chat";
    thread.className = "nova-live-chat";
    thread.setAttribute("role", "log");
    thread.setAttribute("aria-live", "polite");
    thread.setAttribute("aria-label", "Conversation with Nova");
    dialogue.insertAdjacentElement("afterend", thread);
  }
  return thread;
}

function appendMessage(role: "nova" | "visitor" | "system", text: string, source?: "voice" | "text"): void {
  const clean = text.trim();
  const thread = chatThread();
  if (!thread || !clean) return;
  const message = document.createElement("article");
  message.className = `nova-chat-message nova-chat-${role}`;
  const who = role === "nova" ? "Nova" : role === "visitor" ? "You" : "Status";
  message.innerHTML = `<div class="nova-chat-meta"><strong>${who}</strong>${source ? `<span>${source === "voice" ? "spoken" : "typed"}</span>` : ""}</div><p></p>`;
  message.querySelector("p")!.textContent = clean;
  thread.append(message);
  thread.scrollTo({ top: thread.scrollHeight, behavior: "smooth" });
}

function syncNovaMessage(): void {
  const reaction = document.querySelector<HTMLParagraphElement>("#nova-reaction");
  const headline = document.querySelector<HTMLHeadingElement>("#nova-headline");
  const body = document.querySelector<HTMLParagraphElement>("#nova-body");
  if (!headline || !body) return;
  const parts = [!reaction?.hidden ? reaction?.textContent : "", headline.textContent, body.textContent]
    .map((part) => part?.trim() ?? "")
    .filter(Boolean);
  if (!parts.length) return;
  const signature = parts.join("\n");
  if (signature === lastNovaSignature) return;
  lastNovaSignature = signature;
  appendMessage("nova", signature);
  window.dispatchEvent(new CustomEvent("nova:voice-state", { detail: { state: "speaking", durationMs: 1500 } }));
}

function recognitionConstructor(): SpeechRecognitionConstructor | undefined {
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

function voiceSupported(): boolean {
  return Boolean(recognitionConstructor());
}

function stopRecognition(): void {
  activeRecognition?.stop();
  activeRecognition = undefined;
}

function startRecognition(input: HTMLInputElement, form: HTMLFormElement, button: HTMLButtonElement): void {
  const Constructor = recognitionConstructor();
  if (!Constructor) {
    appendMessage("system", "Voice input is not available in this browser. You can keep typing without losing your place.");
    return;
  }
  stopRecognition();
  const recognition = new Constructor();
  activeRecognition = recognition;
  recognition.lang = document.documentElement.lang || "en-US";
  recognition.interimResults = true;
  recognition.continuous = false;
  let finalTranscript = "";
  button.classList.add("is-listening");
  button.setAttribute("aria-pressed", "true");
  button.textContent = "Listening…";
  window.dispatchEvent(new CustomEvent("nova:voice-state", { detail: { state: "listening" } }));

  recognition.onresult = (event) => {
    let interim = "";
    finalTranscript = "";
    for (let index = 0; index < event.results.length; index += 1) {
      const result = event.results[index];
      const transcript = result[0]?.transcript ?? "";
      if (result.isFinal) finalTranscript += transcript;
      else interim += transcript;
    }
    input.value = (finalTranscript || interim).trim();
    input.dispatchEvent(new Event("input", { bubbles: true }));
  };

  recognition.onerror = (event) => {
    const reason = event.error === "not-allowed"
      ? "Microphone access was not allowed. Typing still works normally."
      : "I couldn’t catch that clearly. You can try the mic again or type your answer.";
    appendMessage("system", reason);
  };

  recognition.onend = () => {
    activeRecognition = undefined;
    button.classList.remove("is-listening");
    button.setAttribute("aria-pressed", "false");
    button.textContent = "Speak";
    window.dispatchEvent(new CustomEvent("nova:voice-state", { detail: { state: "idle" } }));
    const value = input.value.trim();
    if (!value) return;
    appendMessage("visitor", value, "voice");
    input.dataset.voiceCaptured = "true";
    window.setTimeout(() => form.requestSubmit(), 250);
  };

  recognition.start();
}

function attachVoiceButton(form: HTMLFormElement): void {
  if (form.dataset.voiceReady === "true") return;
  const input = form.querySelector<HTMLInputElement>('input[name="answer"], #post-plan-input');
  if (!input) return;
  form.dataset.voiceReady = "true";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "nova-mic-button";
  button.setAttribute("aria-label", voiceSupported() ? "Speak your answer to Nova" : "Voice input unavailable in this browser");
  button.setAttribute("aria-pressed", "false");
  button.textContent = voiceSupported() ? "Speak" : "Mic unavailable";
  button.disabled = !voiceSupported();
  button.addEventListener("click", () => {
    if (button.classList.contains("is-listening")) {
      stopRecognition();
      return;
    }
    startRecognition(input, form, button);
  });
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  submit?.insertAdjacentElement("beforebegin", button);
}

function enhanceForms(): void {
  document.querySelectorAll<HTMLFormElement>("[data-conversation-form], #post-plan-question").forEach(attachVoiceButton);
}

function captureVisitorSubmission(event: Event): void {
  const form = event.target instanceof HTMLFormElement ? event.target : null;
  if (!form || (!form.matches("[data-conversation-form]") && form.id !== "post-plan-question")) return;
  const input = form.querySelector<HTMLInputElement>('input[name="answer"], #post-plan-input');
  const value = input?.value.trim() ?? "";
  if (!value) return;
  if (input?.dataset.voiceCaptured === "true") {
    delete input.dataset.voiceCaptured;
    return;
  }
  appendMessage("visitor", value, "text");
}

function captureChoice(event: Event): void {
  const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("[data-answer], [data-choice]") : null;
  if (!target) return;
  const value = target.dataset.choice ?? (target.dataset.answer === "true" ? "Yes, mostly" : "No, not really");
  appendMessage("visitor", value, "text");
}

function syncRuntimeAnswer(): void {
  const answer = document.querySelector<HTMLDivElement>("#resource-answer");
  const text = answer?.textContent?.trim() ?? "";
  if (!text || /Nova is thinking about that/.test(text)) return;
  if (text === lastNovaSignature) return;
  lastNovaSignature = text;
  appendMessage("nova", text);
  window.dispatchEvent(new CustomEvent("nova:voice-state", { detail: { state: "speaking", durationMs: 1700 } }));
}

function scheduleSync(): void {
  window.setTimeout(() => {
    dockAvatar();
    chatThread();
    enhanceForms();
    syncNovaMessage();
    syncRuntimeAnswer();
  }, 20);
}

export function initializeNovaVoiceChatExperience(): void {
  if (observed) return;
  observed = true;
  document.addEventListener("submit", captureVisitorSubmission, true);
  document.addEventListener("click", captureChoice, true);
  const observer = new MutationObserver(scheduleSync);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["hidden"] });
  scheduleSync();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initializeNovaVoiceChatExperience, { once: true });
else initializeNovaVoiceChatExperience();
