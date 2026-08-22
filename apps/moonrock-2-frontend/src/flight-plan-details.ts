import "./flight-plan-details.css";
import type { FlightPlanResult } from "./types.js";

type FlightPlan = FlightPlanResult["flightPlan"];
let latestPlan: FlightPlan | undefined;

function renderDetails(): void {
  const plan = latestPlan;
  const result = document.querySelector<HTMLElement>("#nova-result");
  if (!plan || !result || result.hidden) return;
  result.querySelector(".flight-plan-scope-details")?.remove();
  const priceRow = result.querySelector<HTMLElement>(".price-row");
  if (!priceRow) return;

  const voice = plan.recommendation.includedVoiceMinutes !== undefined
    ? `<li>${plan.recommendation.includedVoiceMinutes.toLocaleString()} included voice minutes per month${plan.recommendation.overageVoiceRateUsd !== undefined ? `; $${plan.recommendation.overageVoiceRateUsd.toFixed(2)}/minute overage` : ""}</li>`
    : "";
  const assumptions = plan.assumptionsToConfirm.length
    ? `<div><h4>Still to confirm</h4><ul>${plan.assumptionsToConfirm.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>`
    : "";

  const block = document.createElement("section");
  block.className = "flight-plan-scope-details";
  block.setAttribute("aria-label", "Preliminary Flight Plan scope and delivery estimate");
  block.innerHTML = `
    <div class="flight-plan-status-badge">${plan.status === "confirmed" ? "CONFIRMED FLIGHT PLAN" : "PRELIMINARY FLIGHT PLAN"}</div>
    <div class="flight-plan-detail-grid">
      <div>
        <h4>Included in this recommendation</h4>
        <ul>${plan.recommendation.includedFeatures.map((feature) => `<li>${escapeHtml(feature)}</li>`).join("")}${voice}</ul>
      </div>
      <div>
        <h4>Estimated delivery</h4>
        <p>${escapeHtml(plan.recommendation.estimatedDelivery)}</p>
        <small>Timing remains an estimate until Moonrock confirms final scope, integrations, access, and onboarding details.</small>
      </div>
      ${assumptions}
    </div>
  `;
  priceRow.insertAdjacentElement("afterend", block);
}

function escapeHtml(value: string): string {
  const replacements: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" };
  return value.replace(/[&<>'"]/g, (character) => replacements[character] ?? character);
}

window.addEventListener("nova:flight-plan", (event) => {
  latestPlan = (event as CustomEvent<FlightPlan>).detail;
  window.setTimeout(renderDetails, 0);
});
