import "./flight-plan-details.css";

interface DisplayDetails {
  features: string[];
  delivery: string;
}

const DETAILS_BY_OFFER: Record<string, DisplayDetails> = {
  "AI Reputation & Retention Agent": {
    features: ["Automated review-request follow-up", "Past-customer and dormant-lead re-engagement", "Routine customer follow-up workflows", "Human escalation when needed"],
    delivery: "About 3–5 business days after onboarding details are confirmed",
  },
  "AI Lead Response Agent": {
    features: ["Immediate lead acknowledgement and capture", "Basic lead qualification and routing", "Automated follow-up for unanswered opportunities", "Human escalation for sales-ready conversations"],
    delivery: "About 3–5 business days after onboarding details are confirmed",
  },
  "AI Customer Care Agent": {
    features: ["Routine customer-question handling", "Customer and service-request intake", "Consistent approved responses", "Human escalation for exceptions"],
    delivery: "About 3–5 business days after onboarding details are confirmed",
  },
  "AI Receptionist": {
    features: ["AI phone answering and routine caller assistance", "Call and customer-intent capture", "Basic qualification and appointment-routing support", "300 included voice minutes per month", "Human escalation for calls that need a person"],
    delivery: "About 4–7 business days after onboarding details are confirmed",
  },
  "AI Sales & Follow-Up Agent": {
    features: ["Lead and estimate follow-up workflows", "Lead nurture and re-engagement", "Monitoring for stalled opportunities", "Sales-ready escalation to a human"],
    delivery: "About 4–7 business days after onboarding details are confirmed",
  },
  "Moonrock AI Front Office": {
    features: ["AI phone and digital lead response", "Lead capture, qualification, and routing", "Appointment and follow-up workflow support", "Monitoring for missed or stalled opportunities", "500 included voice minutes per month", "Human escalation and exception handling"],
    delivery: "About 5–10 business days after onboarding details are confirmed",
  },
  "Moonrock AI Workforce": {
    features: ["Coordinated AI support across multiple business functions", "Custom workflow automation and monitoring", "Cross-functional lead/customer routing", "Human escalation and exception handling", "Implementation planning for approved integrations"],
    delivery: "About 7–14 business days after scope and onboarding details are confirmed",
  },
};

function enhanceFlightPlan(): void {
  const result = document.querySelector<HTMLElement>("#nova-result");
  if (!result || result.hidden || result.dataset.detailsEnhanced === "true") return;
  const heading = result.querySelector<HTMLHeadingElement>("h3");
  const priceRow = result.querySelector<HTMLElement>(".price-row");
  if (!heading || !priceRow) return;
  const details = DETAILS_BY_OFFER[heading.textContent?.trim() ?? ""];
  if (!details) return;

  const block = document.createElement("section");
  block.className = "flight-plan-scope-details";
  block.setAttribute("aria-label", "Preliminary Flight Plan scope and delivery estimate");
  block.innerHTML = `
    <div class="flight-plan-status-badge">PRELIMINARY FLIGHT PLAN</div>
    <div class="flight-plan-detail-grid">
      <div>
        <h4>Included in this recommendation</h4>
        <ul>${details.features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join("")}</ul>
      </div>
      <div>
        <h4>Estimated delivery</h4>
        <p>${escapeHtml(details.delivery)}</p>
        <small>Timing is an estimate until Moonrock confirms the final scope, integrations, access, and onboarding details.</small>
      </div>
    </div>
  `;
  priceRow.insertAdjacentElement("afterend", block);
  result.dataset.detailsEnhanced = "true";
}

function escapeHtml(value: string): string {
  const replacements: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" };
  return value.replace(/[&<>'"]/g, (character) => replacements[character] ?? character);
}

const observer = new MutationObserver(() => window.setTimeout(enhanceFlightPlan, 0));
observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", enhanceFlightPlan, { once: true });
else enhanceFlightPlan();
