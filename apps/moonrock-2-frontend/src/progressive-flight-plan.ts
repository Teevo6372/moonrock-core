import "./progressive-flight-plan.css";
import type { DiscoveryResponse, ProgressiveFlightPlan } from "./types.js";

let container: HTMLElement | undefined;

export function publishProgressiveFlightPlanResponse(response: DiscoveryResponse): void {
  if (!response.completed) {
    const existing = document.querySelector<HTMLElement>("#progressive-flight-plan");
    existing?.remove();
    container = undefined;
    return;
  }
  const model = response.progressiveFlightPlan;
  if (!model) return;
  const target = ensureContainer();
  if (!target) return;
  renderModel(target, model, response.completed);
}

function ensureContainer(): HTMLElement | undefined {
  if (container?.isConnected) return container;
  const controls = document.querySelector<HTMLElement>("#nova-controls");
  if (!controls?.parentElement) return undefined;
  const existing = document.querySelector<HTMLElement>("#progressive-flight-plan");
  if (existing) {
    container = existing;
    return container;
  }
  const section = document.createElement("section");
  section.id = "progressive-flight-plan";
  section.className = "progressive-flight-plan";
  section.setAttribute("aria-live", "polite");
  controls.parentElement.insertBefore(section, controls);
  container = section;
  return section;
}

function renderModel(target: HTMLElement, model: ProgressiveFlightPlan, completed: boolean): void {
  const signals = Array.isArray(model.signals) ? model.signals : [];
  const signalMarkup = signals.length
    ? `<div class="progressive-signals">${signals.map((signal) => `
        <article class="progressive-signal" data-status="${escapeHtml(signal.status)}">
          <div class="progressive-signal-head">
            <strong>${escapeHtml(signal.label)}</strong>
            <span>${escapeHtml(statusLabel(signal.status))}</span>
          </div>
          <p>${escapeHtml(signal.insight)}</p>
        </article>`).join("")}</div>`
    : `<p class="progressive-empty">Nothing to flag yet. Nova is still listening for enough context to form a useful working signal.</p>`;

  target.innerHTML = `
    <div class="progressive-header">
      <div>
        <p class="result-kicker">FLIGHT PLAN · ${escapeHtml(phaseLabel(model.phase))}</p>
        <h3>${completed ? "Flight Plan reconciled" : "Building while we talk"}</h3>
      </div>
      <span class="progressive-live">${completed ? "READY" : "LIVE"}</span>
    </div>
    <p class="progressive-summary">${escapeHtml(model.summary ?? "Nova is still gathering enough context to build a useful working plan.")}</p>
    ${signalMarkup}
    ${model.nextFocus ? `<div class="progressive-focus"><span>Nova is checking next</span><strong>${escapeHtml(model.nextFocus)}</strong></div>` : ""}
  `;
}

function statusLabel(status: string): string {
  if (status === "confirmed") return "CONFIRMED";
  if (status === "healthy") return "LOOKS HEALTHY";
  if (status === "emerging") return "EMERGING";
  return "WATCHING";
}

function phaseLabel(phase: string): string {
  if (phase === "mapping") return "MAPPING";
  if (phase === "prioritizing") return "PRIORITIZING";
  if (phase === "ready") return "READY";
  return "LISTENING";
}

function escapeHtml(value: string): string {
  const replacements: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" };
  return value.replace(/[&<>'"]/g, (character) => replacements[character] ?? character);
}
