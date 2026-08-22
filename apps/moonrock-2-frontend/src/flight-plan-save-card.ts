import "./flight-plan-save-card.css";
import { saveFlightPlan } from "./api.js";
import type { ContactIdentity, FlightPlanResult } from "./types.js";

type FlightPlan = FlightPlanResult["flightPlan"];
let latestPlan: FlightPlan | undefined;

function statusElement(): HTMLElement | null { return document.querySelector<HTMLElement>("#status"); }
function setStatus(message: string): void { const status = statusElement(); if (status) status.textContent = message; }

function cardMarkup(): string {
  return `
    <section class="identity-card" data-flight-plan-save-card aria-labelledby="identity-title">
      <div class="save-card-toolbar" aria-label="Flight Plan save form controls">
        <button type="button" class="save-card-icon" data-save-card-minimize aria-label="Minimize save form" title="Minimize">−</button>
        <button type="button" class="save-card-icon" data-save-card-close aria-label="Close save form" title="Close">×</button>
      </div>
      <p class="identity-kicker">KEEP YOUR FLIGHT PLAN</p>
      <h3 id="identity-title">Want me to save this with Moonrock?</h3>
      <p>This is optional. Saving your plan does not control whether you can keep talking with Nova or continue reviewing the recommendation.</p>
      <form data-flight-plan-save-form>
        <div class="identity-grid">
          <label>First name<input name="firstName" autocomplete="given-name" required></label>
          <label>Last name<input name="lastName" autocomplete="family-name" required></label>
          <label>Email<input name="email" type="email" autocomplete="email" required></label>
          <label>Phone <span class="optional">optional</span><input name="phone" type="tel" autocomplete="tel"></label>
        </div>
        <label class="consent-row"><input name="consent" type="checkbox" required><span>Yes, save my Flight Plan and Moonrock inquiry using this email.</span></label>
        <label class="consent-row"><input name="followUpConsent" type="checkbox"><span>Moonrock may follow up with me about this Flight Plan. Optional.</span></label>
        <div class="save-card-actions"><button type="submit" class="save-card-submit">Save My Flight Plan</button><p data-save-card-confirmation class="save-card-confirmation" hidden></p></div>
      </form>
      <p class="save-card-note">Optional — minimize or close this and keep talking with Nova.</p>
    </section>`;
}

function renderCard(): void {
  if (!latestPlan) return;
  const result = document.querySelector<HTMLElement>("#nova-result");
  if (!result || result.hidden || result.querySelector("[data-flight-plan-save-card]")) return;
  result.insertAdjacentHTML("beforeend", cardMarkup());
  const card = result.querySelector<HTMLElement>("[data-flight-plan-save-card]");
  if (!card) return;
  wireCard(card);
}

function ensureReopenBar(card: HTMLElement): HTMLButtonElement {
  const result = card.parentElement ?? document.body;
  let bar = result.querySelector<HTMLButtonElement>("[data-save-card-reopen]");
  if (bar) return bar;
  bar = document.createElement("button");
  bar.type = "button"; bar.className = "save-card-reopen"; bar.dataset.saveCardReopen = "true"; bar.textContent = "Save My Flight Plan"; bar.hidden = true;
  bar.addEventListener("click", () => { card.hidden = false; bar!.hidden = true; card.scrollIntoView({ behavior: "smooth", block: "center" }); });
  card.insertAdjacentElement("beforebegin", bar);
  return bar;
}

function wireCard(card: HTMLElement): void {
  card.querySelector<HTMLButtonElement>("[data-save-card-minimize]")?.addEventListener("click", () => {
    const bar = ensureReopenBar(card); card.hidden = true; bar.hidden = false; setStatus("Flight Plan save form minimized. Nova is still available.");
  });
  card.querySelector<HTMLButtonElement>("[data-save-card-close]")?.addEventListener("click", () => {
    card.parentElement?.querySelector("[data-save-card-reopen]")?.remove(); card.remove(); setStatus("Save form closed. Your Nova conversation remains open.");
  });
  card.querySelector<HTMLFormElement>("[data-flight-plan-save-form]")?.addEventListener("submit", (event) => void submitSave(event, card));
}

async function submitSave(event: SubmitEvent, card: HTMLElement): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  if (!data.get("consent")) { setStatus("Please confirm permission to save the Flight Plan."); return; }
  const identity: ContactIdentity = {
    firstName: String(data.get("firstName") ?? "").trim(),
    lastName: String(data.get("lastName") ?? "").trim(),
    email: String(data.get("email") ?? "").trim(),
    ...(String(data.get("phone") ?? "").trim() ? { phone: String(data.get("phone") ?? "").trim() } : {}),
    followUpConsent: Boolean(data.get("followUpConsent")),
  };
  form.querySelectorAll<HTMLInputElement | HTMLButtonElement>("input,button").forEach((element) => { element.disabled = true; });
  setStatus("Saving your Flight Plan with Moonrock…");
  try {
    const response = await saveFlightPlan(identity);
    const confirmation = card.querySelector<HTMLElement>("[data-save-card-confirmation]");
    if (confirmation) { confirmation.hidden = false; confirmation.textContent = response.answer; }
    setStatus(response.answer);
    window.setTimeout(() => { if (!card.isConnected) return; const bar = ensureReopenBar(card); card.hidden = true; bar.hidden = false; bar.textContent = "Flight Plan Saved"; }, 900);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Moonrock could not save the Flight Plan right now.");
    form.querySelectorAll<HTMLInputElement | HTMLButtonElement>("input,button").forEach((element) => { element.disabled = false; });
  }
}

window.addEventListener("nova:flight-plan", (event) => {
  latestPlan = (event as CustomEvent<FlightPlan>).detail;
  window.setTimeout(renderCard, 0);
});
