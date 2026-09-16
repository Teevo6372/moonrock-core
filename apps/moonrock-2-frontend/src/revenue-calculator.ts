import "./revenue-calculator.css";

function formatUsd(value: number): string {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function recompute(callsInput: HTMLInputElement, valueInput: HTMLInputElement, monthlyEl: HTMLElement, annualEl: HTMLElement): void {
  const missedCallsPerMonth = Math.max(0, Number(callsInput.value) || 0);
  const averageJobValueUsd = Math.max(0, Number(valueInput.value) || 0);
  const monthlyLossUsd = missedCallsPerMonth * averageJobValueUsd;
  const annualLossUsd = monthlyLossUsd * 12;

  monthlyEl.innerHTML = `${formatUsd(monthlyLossUsd)}<small>/mo</small>`;
  annualEl.textContent = `That's ${formatUsd(annualLossUsd)} a year, walking out the door.`;
}

function initializeLossCalculator(): void {
  const callsInput = document.querySelector<HTMLInputElement>("#loss-calc-calls");
  const valueInput = document.querySelector<HTMLInputElement>("#loss-calc-value");
  const monthlyEl = document.querySelector<HTMLElement>("#loss-calc-monthly");
  const annualEl = document.querySelector<HTMLElement>("#loss-calc-annual");
  if (!callsInput || !valueInput || !monthlyEl || !annualEl) return;

  const update = () => recompute(callsInput, valueInput, monthlyEl, annualEl);
  callsInput.addEventListener("input", update);
  valueInput.addEventListener("input", update);
  update();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initializeLossCalculator, { once: true });
else initializeLossCalculator();
