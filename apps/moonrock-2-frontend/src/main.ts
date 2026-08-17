import "./styles.css";
import { answerDiscovery, startDiscovery } from "./api.js";
import type { BusinessPath, DiscoveryQuestion, DiscoveryResponse } from "./types.js";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Moonrock frontend root not found");

app.innerHTML = `
  <main class="shell">
    <section class="hero">
      <p class="eyebrow">MOONROCK 2.0</p>
      <h1>AI Employees built around the way your business actually works.</h1>
      <p class="lede">Nova is becoming Moonrock's first autonomous AI Employee. Start with the path that best matches where you are today.</p>
      <div class="paths" role="group" aria-label="Choose your business path">
        <button data-path="startup">I'm starting something</button>
        <button data-path="existing_business">My business needs to grow</button>
      </div>
      <p id="status" class="status" aria-live="polite"></p>
    </section>
    <section id="nova-panel" class="nova-panel" hidden>
      <p id="nova-eyebrow" class="eyebrow"></p>
      <h2 id="nova-headline"></h2>
      <p id="nova-body"></p>
      <div class="progress" aria-label="Discovery progress"><span id="nova-progress"></span></div>
      <div id="nova-controls" class="nova-controls"></div>
      <div id="nova-result" class="nova-result" hidden></div>
    </section>
  </main>
`;

const status = document.querySelector<HTMLParagraphElement>("#status")!;
const panel = document.querySelector<HTMLElement>("#nova-panel")!;
const eyebrow = document.querySelector<HTMLParagraphElement>("#nova-eyebrow")!;
const headline = document.querySelector<HTMLHeadingElement>("#nova-headline")!;
const body = document.querySelector<HTMLParagraphElement>("#nova-body")!;
const progress = document.querySelector<HTMLSpanElement>("#nova-progress")!;
const controls = document.querySelector<HTMLDivElement>("#nova-controls")!;
const result = document.querySelector<HTMLDivElement>("#nova-result")!;
let sessionId = "";
let busy = false;

function newSessionId(): string {
  return `web-${crypto.randomUUID()}`;
}

function setBusy(value: boolean): void {
  busy = value;
  controls.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement>("input,button,select").forEach((element) => {
    element.disabled = value;
  });
}

function renderResponse(response: DiscoveryResponse): void {
  eyebrow.textContent = response.view.eyebrow;
  headline.textContent = response.view.headline;
  body.textContent = response.view.body ?? "";
  progress.style.width = `${response.view.progressPercent}%`;
  panel.hidden = false;
  result.hidden = true;
  controls.innerHTML = "";

  if (response.completed && response.result) {
    renderFlightPlan(response);
    return;
  }
  if (response.nextQuestion) renderQuestion(response.nextQuestion);
}

function renderQuestion(question: DiscoveryQuestion): void {
  const help = question.helpText ? `<p class="help">${escapeHtml(question.helpText)}</p>` : "";
  if (question.answerType === "boolean") {
    controls.innerHTML = `${help}<div class="choice-grid"><button data-answer="true">Yes</button><button data-answer="false">No</button></div>`;
    controls.querySelectorAll<HTMLButtonElement>("[data-answer]").forEach((button) => {
      button.addEventListener("click", () => void submit(question.field, button.dataset.answer === "true"));
    });
    return;
  }
  if (question.answerType === "single_select") {
    controls.innerHTML = `${help}<div class="choice-grid">${(question.options ?? []).map((option) => `<button data-choice="${escapeHtml(option)}">${escapeHtml(labelOption(option))}</button>`).join("")}</div>`;
    controls.querySelectorAll<HTMLButtonElement>("[data-choice]").forEach((button) => {
      button.addEventListener("click", () => void submit(question.field, button.dataset.choice ?? ""));
    });
    return;
  }
  const inputType = question.answerType === "number" ? "number" : "text";
  controls.innerHTML = `${help}<form id="nova-answer-form" class="answer-form"><label class="sr-only" for="nova-answer">${escapeHtml(question.prompt)}</label><input id="nova-answer" name="answer" type="${inputType}" ${inputType === "number" ? "inputmode=\"decimal\" step=\"any\"" : "autocomplete=\"off\""} required><button type="submit">Continue</button></form>`;
  const form = controls.querySelector<HTMLFormElement>("#nova-answer-form")!;
  const input = controls.querySelector<HTMLInputElement>("#nova-answer")!;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = inputType === "number" ? Number(input.value) : input.value.trim();
    if (inputType === "number" && !Number.isFinite(value)) return;
    if (inputType === "text" && !value) return;
    void submit(question.field, value);
  });
  input.focus();
}

async function submit(field: string, value: string | number | boolean): Promise<void> {
  if (busy || !sessionId) return;
  setBusy(true);
  status.textContent = "Nova is analyzing your answer…";
  try {
    const response = await answerDiscovery(sessionId, field, value);
    renderResponse(response);
    status.textContent = response.completed ? "Your Moonrock Flight Plan is ready." : "Connected to Nova.";
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "Nova could not process that answer.";
  } finally {
    setBusy(false);
  }
}

function renderFlightPlan(response: DiscoveryResponse): void {
  const flightPlan = response.result!.flightPlan;
  const opportunity = flightPlan.opportunity;
  controls.innerHTML = "";
  result.hidden = false;
  result.innerHTML = `
    <div class="result-kicker">RECOMMENDED AI EMPLOYEE</div>
    <h3>${escapeHtml(flightPlan.recommendation.offerName)}</h3>
    <p>${escapeHtml(flightPlan.recommendation.reason)}</p>
    <div class="price-row"><strong>$${flightPlan.recommendation.monthlyFeeUsd}/mo</strong><span>+$${flightPlan.recommendation.setupFeeUsd} setup</span></div>
    ${opportunity ? `<div class="opportunity"><span>Estimated monthly opportunity</span><strong>$${opportunity.monthlyOpportunityUsd.toLocaleString()}</strong><small>${escapeHtml(opportunity.basis)}</small></div>` : ""}
    <div class="bottlenecks"><h4>Primary bottlenecks</h4>${flightPlan.primaryBottlenecks.map((item) => `<div class="bottleneck"><strong>${escapeHtml(labelOption(item.id))}</strong><span>${escapeHtml(item.explanation)}</span></div>`).join("")}</div>
    <p class="disclaimer">${escapeHtml(opportunity?.disclaimer ?? flightPlan.disclosures[0] ?? "")}</p>
  `;
}

async function begin(path: BusinessPath): Promise<void> {
  if (busy) return;
  sessionId = newSessionId();
  status.textContent = "Nova is opening your discovery session…";
  document.querySelectorAll<HTMLButtonElement>("[data-path]").forEach((button) => { button.disabled = true; });
  try {
    const response = await startDiscovery(sessionId, path);
    renderResponse(response);
    panel.scrollIntoView({ behavior: "smooth", block: "center" });
    status.textContent = "Connected to Nova.";
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "Nova could not start the session.";
    document.querySelectorAll<HTMLButtonElement>("[data-path]").forEach((button) => { button.disabled = false; });
  }
}

function labelOption(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

document.querySelectorAll<HTMLButtonElement>("[data-path]").forEach((button) => {
  button.addEventListener("click", () => void begin(button.dataset.path as BusinessPath));
});
