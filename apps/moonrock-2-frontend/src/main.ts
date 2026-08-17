import "./styles.css";
import { startDiscovery } from "./api.js";
import type { BusinessPath } from "./types.js";

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
      <div class="progress" aria-hidden="true"><span id="nova-progress"></span></div>
      <p class="foundation-note">Mission 20 foundation: production discovery API connection established. Dynamic question controls arrive in the next frontend increment.</p>
    </section>
  </main>
`;

const status = document.querySelector<HTMLParagraphElement>("#status")!;
const panel = document.querySelector<HTMLElement>("#nova-panel")!;
const eyebrow = document.querySelector<HTMLParagraphElement>("#nova-eyebrow")!;
const headline = document.querySelector<HTMLHeadingElement>("#nova-headline")!;
const body = document.querySelector<HTMLParagraphElement>("#nova-body")!;
const progress = document.querySelector<HTMLSpanElement>("#nova-progress")!;

function newSessionId(): string {
  return `web-${crypto.randomUUID()}`;
}

async function begin(path: BusinessPath): Promise<void> {
  status.textContent = "Nova is opening your discovery session…";
  try {
    const response = await startDiscovery(newSessionId(), path);
    eyebrow.textContent = response.view.eyebrow;
    headline.textContent = response.view.headline;
    body.textContent = response.view.body ?? "";
    progress.style.width = `${response.view.progressPercent}%`;
    panel.hidden = false;
    panel.scrollIntoView({ behavior: "smooth", block: "center" });
    status.textContent = "Connected to Nova.";
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "Nova could not start the session.";
  }
}

document.querySelectorAll<HTMLButtonElement>("[data-path]").forEach((button) => {
  button.addEventListener("click", () => void begin(button.dataset.path as BusinessPath));
});
