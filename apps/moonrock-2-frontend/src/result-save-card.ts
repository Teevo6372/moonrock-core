import "./flight-plan-save-card.css";
import { completeHumanHandoff } from "./api.js";
import type { ContactIdentity, GhlSaasResult, WebsiteBuildResult } from "./types.js";

interface SaveCardConfig { kicker: string; title: string; requestText: string; consentLabel: string; submitLabel: string; }
let pending: SaveCardConfig | undefined;

function statusElement(): HTMLElement | null { return document.querySelector<HTMLElement>("#status"); }
function setStatus(message: string): void { const status = statusElement(); if (status) status.textContent = message; }

function cardMarkup(config: SaveCardConfig): string {
  return `
    <section class="identity-card" data-result-save-card aria-labelledby="result-save-title">
      <div class="save-card-toolbar" aria-label="Save form controls">
        <button type="button" class="save-card-icon" data-save-card-minimize aria-label="Minimize save form" title="Minimize">−</button>
        <button type="button" class="save-card-icon" data-save-card-close aria-label="Close save form" title="Close">×</button>
      </div>
      <p class="identity-kicker">${escapeHtml(config.kicker)}</p>
      <h3 id="result-save-title">${escapeHtml(config.title)}</h3>
      <p>This is optional. Saving does not control whether you can keep talking with Nova or continue reviewing the recommendation.</p>
      <form data-result-save-form>
        <div class="identity-grid">
          <label>First name<input name="firstName" autocomplete="given-name" required></label>
          <label>Last name<input name="lastName" autocomplete="family-name" required></label>
          <label>Email<input name="email" type="email" autocomplete="email" required></label>
          <label>Phone <span class="optional">optional</span><input name="phone" type="tel" autocomplete="tel"></label>
        </div>
        <label class="consent-row"><input name="consent" type="checkbox" required><span>${escapeHtml(config.consentLabel)}</span></label>
        <label class="consent-row"><input name="followUpConsent" type="checkbox"><span>Moonrock may follow up with me about this. Optional.</span></label>
        <div class="save-card-actions"><button type="submit" class="save-card-submit">${escapeHtml(config.submitLabel)}</button><p data-save-card-confirmation class="save-card-confirmation" hidden></p></div>
      </form>
      <p class="save-card-note">Optional — minimize or close this and keep talking with Nova.</p>
    </section>`;
}

function renderCard(): void {
  if (!pending) return;
  const config = pending;
  const result = document.querySelector<HTMLElement>("#nova-result");
  if (!result || result.hidden || result.querySelector("[data-result-save-card]")) return;
  result.insertAdjacentHTML("beforeend", cardMarkup(config));
  const card = result.querySelector<HTMLElement>("[data-result-save-card]");
  if (!card) return;
  wireCard(card, config);
}

function ensureReopenBar(card: HTMLElement, label: string): HTMLButtonElement {
  const result = card.parentElement ?? document.body;
  let bar = result.querySelector<HTMLButtonElement>("[data-save-card-reopen]");
  if (bar) return bar;
  bar = document.createElement("button");
  bar.type = "button"; bar.className = "save-card-reopen"; bar.dataset.saveCardReopen = "true"; bar.textContent = label; bar.hidden = true;
  bar.addEventListener("click", () => { card.hidden = false; bar!.hidden = true; card.scrollIntoView({ behavior: "smooth", block: "center" }); });
  card.insertAdjacentElement("beforebegin", bar);
  return bar;
}

function wireCard(card: HTMLElement, config: SaveCardConfig): void {
  card.querySelector<HTMLButtonElement>("[data-save-card-minimize]")?.addEventListener("click", () => {
    const bar = ensureReopenBar(card, config.submitLabel); card.hidden = true; bar.hidden = false; setStatus("Save form minimized. Nova is still available.");
  });
  card.querySelector<HTMLButtonElement>("[data-save-card-close]")?.addEventListener("click", () => {
    card.parentElement?.querySelector("[data-save-card-reopen]")?.remove(); card.remove(); setStatus("Save form closed. Your Nova conversation remains open.");
  });
  card.querySelector<HTMLFormElement>("[data-result-save-form]")?.addEventListener("submit", (event) => void submitSave(event, card, config));
}

async function submitSave(event: SubmitEvent, card: HTMLElement, config: SaveCardConfig): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  if (!data.get("consent")) { setStatus("Please confirm permission to save this."); return; }
  const identity: ContactIdentity = {
    firstName: String(data.get("firstName") ?? "").trim(),
    lastName: String(data.get("lastName") ?? "").trim(),
    email: String(data.get("email") ?? "").trim(),
    ...(String(data.get("phone") ?? "").trim() ? { phone: String(data.get("phone") ?? "").trim() } : {}),
    followUpConsent: Boolean(data.get("followUpConsent")),
  };
  form.querySelectorAll<HTMLInputElement | HTMLButtonElement>("input,button").forEach((element) => { element.disabled = true; });
  setStatus("Saving this with Moonrock…");
  try {
    const response = await completeHumanHandoff(identity, config.requestText);
    const confirmation = card.querySelector<HTMLElement>("[data-save-card-confirmation]");
    if (confirmation) { confirmation.hidden = false; confirmation.textContent = response.answer; }
    setStatus(response.answer);
    window.setTimeout(() => { if (!card.isConnected) return; const bar = ensureReopenBar(card, config.submitLabel); card.hidden = true; bar.hidden = false; bar.textContent = "Saved"; }, 900);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Moonrock could not save this right now.");
    form.querySelectorAll<HTMLInputElement | HTMLButtonElement>("input,button").forEach((element) => { element.disabled = false; });
  }
}

function escapeHtml(value: string): string {
  const replacements: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" };
  return value.replace(/[&<>'"]/g, (character) => replacements[character] ?? character);
}

window.addEventListener("nova:website-build-result", (event) => {
  const detail = (event as CustomEvent<WebsiteBuildResult>).detail;
  pending = {
    kicker: "KEEP THIS BRIEF",
    title: "Want me to save this with Moonrock?",
    requestText: `Save my Website Build brief for ${detail.brief.offerName} and have a Moonrock person follow up.`,
    consentLabel: "Yes, save my site brief and Moonrock inquiry using this email.",
    submitLabel: "Save My Site Brief",
  };
  window.setTimeout(renderCard, 0);
});

window.addEventListener("nova:ghl-saas-result", (event) => {
  const detail = (event as CustomEvent<GhlSaasResult>).detail;
  pending = {
    kicker: "KEEP THIS RECOMMENDATION",
    title: "Want me to save this with Moonrock?",
    requestText: `Save my white-label SaaS recommendation for ${detail.offerName} and have a Moonrock person follow up.`,
    consentLabel: "Yes, save my recommendation and Moonrock inquiry using this email.",
    submitLabel: "Save My Recommendation",
  };
  window.setTimeout(renderCard, 0);
});
