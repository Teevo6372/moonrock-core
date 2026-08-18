import type { DiscoveryResponse, ProgressiveFlightPlan } from "./types.js";

export interface ProgressiveFlightPlanPanel {
  render(response: DiscoveryResponse): void;
  reset(): void;
}

export function createProgressiveFlightPlanPanel(container: HTMLElement): ProgressiveFlightPlanPanel {
  function renderModel(model: ProgressiveFlightPlan, completed: boolean): void {
    container.hidden = false;
    const signals = model.signals.length
      ? `<div class="progressive-signals">${model.signals.map((signal) => `
          <article class="progressive-signal" data-status="${escapeHtml(signal.status)}">
            <div class="progressive-signal-head">
              <strong>${escapeHtml(signal.label)}</strong>
              <span>${escapeHtml(statusLabel(signal.status))}</span>
            </div>
            <p>${escapeHtml(signal.insight)}</p>
          </article>`).join("")}</div>`
      : `<p class="progressive-empty">Nothing to flag yet. Nova is still listening for enough context to form a useful working signal.</p>`;

    container.innerHTML = `
      <div class="progressive-header">
        <div>
          <p class="result-kicker">FLIGHT PLAN · ${escapeHtml(phaseLabel(model.phase))}</p>
          <h3>${completed ? "Flight Plan reconciled" : "Building while we talk"}</h3>
        </div>
        <span class="progressive-live">${completed ? "READY" : "LIVE"}</span>
      </div>
      <p class="progressive-summary">${escapeHtml(model.summary)}</p>
      ${signals}
      ${model.nextFocus ? `<div class="progressive-focus"><span>Nova is checking next</span><strong>${escapeHtml(model.nextFocus)}</strong></div>` : ""}
    `;
  }

  return {
    render(response) {
      renderModel(response.progressiveFlightPlan, response.completed);
    },
    reset() {
      container.hidden = true;
      container.innerHTML = "";
    },
  };
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
