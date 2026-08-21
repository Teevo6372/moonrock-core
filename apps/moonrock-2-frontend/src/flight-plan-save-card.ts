import "./flight-plan-save-card.css";

const CARD_SELECTOR = ".identity-card";
const ENHANCED = "data-save-card-enhanced";

function statusElement(): HTMLElement | null {
  return document.querySelector<HTMLElement>("#status");
}

function setStatus(message: string): void {
  const status = statusElement();
  if (status) status.textContent = message;
}

function cardInputs(card: HTMLElement): HTMLInputElement[] {
  return Array.from(card.querySelectorAll<HTMLInputElement>("input"));
}

function validateSaveCard(card: HTMLElement): boolean {
  let valid = true;
  for (const input of cardInputs(card)) {
    if (input.required && !input.checkValidity()) {
      valid = false;
      input.reportValidity();
      break;
    }
  }
  if (!valid) return false;

  const consent = card.querySelector<HTMLInputElement>("#identity-consent");
  if (!consent?.checked) {
    consent?.focus();
    setStatus("Please confirm permission to save and send your Flight Plan.");
    return false;
  }
  return true;
}

function ensureReopenBar(card: HTMLElement): HTMLButtonElement {
  const controls = card.closest<HTMLElement>("#nova-controls") ?? card.parentElement ?? document.body;
  let bar = controls.querySelector<HTMLButtonElement>("[data-save-card-reopen]");
  if (bar) return bar;
  bar = document.createElement("button");
  bar.type = "button";
  bar.className = "save-card-reopen";
  bar.dataset.saveCardReopen = "true";
  bar.textContent = "Save My Flight Plan";
  bar.hidden = true;
  bar.addEventListener("click", () => {
    card.hidden = false;
    card.dataset.minimized = "false";
    bar!.hidden = true;
    card.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  controls.insertBefore(bar, card);
  return bar;
}

function minimize(card: HTMLElement): void {
  const bar = ensureReopenBar(card);
  card.dataset.minimized = "true";
  card.hidden = true;
  bar.hidden = false;
  setStatus("Flight Plan save form minimized. You can keep talking with Nova and reopen it anytime.");
}

function close(card: HTMLElement): void {
  const controls = card.closest<HTMLElement>("#nova-controls") ?? card.parentElement;
  card.dataset.dismissed = "true";
  card.hidden = true;
  controls?.querySelector<HTMLElement>("[data-save-card-reopen]")?.remove();
  setStatus("Save form closed. You can continue with Nova without saving a copy.");
}

function markSaveReady(card: HTMLElement): void {
  if (!validateSaveCard(card)) return;
  card.dataset.saveReady = "true";
  const confirmation = card.querySelector<HTMLElement>("[data-save-card-confirmation]");
  if (confirmation) {
    confirmation.hidden = false;
    confirmation.textContent = "Save details ready. Nova will attach them when your Flight Plan is submitted.";
  }
  minimize(card);

  const controls = card.closest<HTMLElement>("#nova-controls");
  const answerInput = controls?.querySelector<HTMLInputElement>("[data-conversation-form] input[name=answer]");
  const answerForm = controls?.querySelector<HTMLFormElement>("[data-conversation-form]");
  if (answerInput?.value.trim() && answerForm) {
    answerForm.requestSubmit();
    return;
  }
  setStatus("Your save details are ready. Continue with Nova; when the Flight Plan is generated, the requested copy can be attached to your inquiry.");
}

function enhance(card: HTMLElement): void {
  if (card.getAttribute(ENHANCED) === "true") return;
  card.setAttribute(ENHANCED, "true");

  const toolbar = document.createElement("div");
  toolbar.className = "save-card-toolbar";
  toolbar.setAttribute("aria-label", "Flight Plan save form controls");
  toolbar.innerHTML = `
    <button type="button" class="save-card-icon" data-save-card-minimize aria-label="Minimize save form" title="Minimize">−</button>
    <button type="button" class="save-card-icon" data-save-card-close aria-label="Close save form" title="Close">×</button>
  `;
  card.prepend(toolbar);

  const actions = document.createElement("div");
  actions.className = "save-card-actions";
  actions.innerHTML = `
    <button type="button" class="save-card-submit" data-save-card-submit>Save &amp; Send My Flight Plan</button>
    <p class="save-card-confirmation" data-save-card-confirmation hidden></p>
    <p class="save-card-note">Optional — you can minimize or close this and keep talking with Nova.</p>
  `;
  card.append(actions);

  toolbar.querySelector<HTMLButtonElement>("[data-save-card-minimize]")?.addEventListener("click", () => minimize(card));
  toolbar.querySelector<HTMLButtonElement>("[data-save-card-close]")?.addEventListener("click", () => close(card));
  actions.querySelector<HTMLButtonElement>("[data-save-card-submit]")?.addEventListener("click", () => markSaveReady(card));

  const controls = card.closest<HTMLElement>("#nova-controls");
  controls?.querySelectorAll<HTMLButtonElement>("[data-conversation-form] button[type=submit]").forEach((button) => {
    if (/build my flight plan/i.test(button.textContent ?? "")) button.textContent = "Continue to My Plan";
  });
}

function scan(): void {
  document.querySelectorAll<HTMLElement>(CARD_SELECTOR).forEach(enhance);
}

scan();
new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
