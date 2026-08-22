import { answerDiscovery, askNova } from "./api.js";
import { loadActiveConversation, requestResume } from "./visitor-continuity.js";

function learnedCount(): number {
  const active = loadActiveConversation();
  if (!active) return 0;
  return Math.max(active.lastResponse.progress.answered, Object.keys(active.answers).length);
}

function syncLearnedCount(): void {
  const progress = document.querySelector<HTMLButtonElement>("#nova-quiet-progress");
  if (!progress) return;
  const count = learnedCount();
  progress.textContent = `Building your Flight Plan · ${count} ${count === 1 ? "thing" : "things"} learned`;
}

function renderNovaAside(answer: string): void {
  const reaction = document.querySelector<HTMLParagraphElement>("#nova-reaction");
  const headline = document.querySelector<HTMLHeadingElement>("#nova-headline");
  const body = document.querySelector<HTMLParagraphElement>("#nova-body");
  if (reaction) {
    reaction.hidden = true;
    reaction.textContent = "";
  }
  if (headline) headline.textContent = "";
  if (body) body.textContent = answer;
  const status = document.querySelector<HTMLElement>("#status");
  if (status) status.textContent = "Nova is with you.";
}

function looksLikeConversationAside(value: string): boolean {
  return /^(hi|hello|hey|good morning|good afternoon|good evening)\b/i.test(value.trim()) || /\?$/.test(value.trim());
}

async function restoreRenderedState(path: string): Promise<void> {
  requestResume();
  const button = document.querySelector<HTMLButtonElement>(`[data-path="${path}"]`);
  if (!button) {
    window.location.reload();
    return;
  }
  button.disabled = false;
  button.click();
}

async function handleOptionalSaveConversation(input: HTMLInputElement): Promise<void> {
  const value = input.value.trim();
  if (!value) return;
  const active = loadActiveConversation();
  if (!active) return;

  input.value = "";
  const status = document.querySelector<HTMLElement>("#status");
  if (status) status.textContent = "Nova is thinking…";

  if (looksLikeConversationAside(value)) {
    try {
      const turn = await askNova(value);
      renderNovaAside(turn.answer);
      syncLearnedCount();
    } catch (error) {
      input.value = value;
      if (status) status.textContent = error instanceof Error ? error.message : "Nova could not respond right now.";
    }
    return;
  }

  const field = active.lastResponse.nextQuestion?.field;
  if (!field) {
    try {
      const turn = await askNova(value);
      renderNovaAside(turn.answer);
    } catch (error) {
      input.value = value;
      if (status) status.textContent = error instanceof Error ? error.message : "Nova could not respond right now.";
    }
    return;
  }

  try {
    await answerDiscovery(active.sessionId, field, value);
    await restoreRenderedState(active.path);
    syncLearnedCount();
  } catch (error) {
    input.value = value;
    if (status) status.textContent = error instanceof Error ? error.message : "Nova could not process that message right now.";
  }
}

function optionalSaveCardBlocks(form: HTMLFormElement): boolean {
  const controls = form.closest<HTMLElement>("#nova-controls");
  const card = controls?.querySelector<HTMLElement>(".identity-card");
  if (!card) return false;
  const saveReady = card.dataset.saveReady === "true";
  if (saveReady) return false;
  return card.hidden || card.dataset.minimized === "true" || card.dataset.dismissed === "true";
}

document.addEventListener("submit", (event) => {
  const form = event.target instanceof HTMLFormElement ? event.target : null;
  if (!form || !form.matches("[data-conversation-form]") || !optionalSaveCardBlocks(form)) return;
  const input = form.querySelector<HTMLInputElement>('input[name="answer"]');
  if (!input?.value.trim()) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  void handleOptionalSaveConversation(input);
}, true);

function scan(): void {
  syncLearnedCount();
}

scan();
new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
