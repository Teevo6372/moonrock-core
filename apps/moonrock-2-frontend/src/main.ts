import "./styles.css";
import { answerDiscovery, startDiscovery } from "./api.js";
import { createNovaVisualStage } from "./visual-stage.js";
import type { BusinessPath, ContactIdentity, DiscoveryQuestion, DiscoveryResponse } from "./types.js";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Moonrock frontend root not found");

app.innerHTML = `
  <main class="shell">
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">MOONROCK 2.0</p>
        <h1>AI Employees built around the way your business actually works.</h1>
        <p class="lede">Nova is becoming Moonrock's first autonomous AI Employee. Start with the path that best matches where you are today.</p>
        <div class="paths" role="group" aria-label="Choose your business path">
          <button data-path="startup">I'm starting something</button>
          <button data-path="existing_business">My business needs to grow</button>
        </div>
        <p id="status" class="status" aria-live="polite"></p>
      </div>
    </section>
    <section id="nova-panel" class="nova-panel" hidden>
      <p id="nova-eyebrow" class="eyebrow"></p>
      <div class="nova-dialogue" aria-live="polite">
        <p id="nova-reaction" class="nova-reaction" hidden></p>
        <h2 id="nova-headline"></h2>
        <p id="nova-body"></p>
      </div>
      <div class="progress" aria-label="Discovery progress"><span id="nova-progress"></span></div>
      <div id="nova-controls" class="nova-controls"></div>
      <div id="nova-result" class="nova-result" hidden></div>
    </section>
  </main>
`;

const status = document.querySelector<HTMLParagraphElement>("#status")!;
const panel = document.querySelector<HTMLElement>("#nova-panel")!;
const eyebrow = document.querySelector<HTMLParagraphElement>("#nova-eyebrow")!;
const reaction = document.querySelector<HTMLParagraphElement>("#nova-reaction")!;
const headline = document.querySelector<HTMLHeadingElement>("#nova-headline")!;
const body = document.querySelector<HTMLParagraphElement>("#nova-body")!;
const progress = document.querySelector<HTMLSpanElement>("#nova-progress")!;
const controls = document.querySelector<HTMLDivElement>("#nova-controls")!;
const result = document.querySelector<HTMLDivElement>("#nova-result")!;
const hero = document.querySelector<HTMLElement>(".hero")!;
const visualStage = createNovaVisualStage(hero);
let sessionId = "";
let businessName = "";
let busy = false;
let currentPath: BusinessPath | undefined;
let lastTurn: { field: string; value: string | number | boolean } | undefined;

function newSessionId(): string {
  return `web-${crypto.randomUUID()}`;
}

function setBusy(value: boolean, processingState: "thinking" | "diagnosis" = "thinking"): void {
  busy = value;
  visualStage.setBusy(value, processingState);
  controls.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement>("input,button,select").forEach((element) => {
    element.disabled = value;
  });
}

function renderResponse(response: DiscoveryResponse, isOpening = false): void {
  visualStage.setState(response.view.visualState);
  progress.style.width = `${response.view.progressPercent}%`;
  panel.hidden = false;
  result.hidden = true;
  controls.innerHTML = "";

  if (response.completed && response.result) {
    reaction.hidden = false;
    reaction.textContent = "I have enough to connect the dots. Here's the move I'd make based on what you told me.";
    eyebrow.textContent = response.view.eyebrow;
    headline.textContent = response.view.headline;
    body.textContent = response.view.body ?? "";
    renderFlightPlan(response);
    return;
  }

  if (response.nextQuestion) {
    renderConversation(response.nextQuestion, response, isOpening);
    renderQuestion(response.nextQuestion);
  }
}

function renderConversation(question: DiscoveryQuestion, response: DiscoveryResponse, isOpening: boolean): void {
  const copy = conversationForQuestion(question, response, isOpening);
  eyebrow.textContent = copy.eyebrow;
  reaction.hidden = !copy.reaction;
  reaction.textContent = copy.reaction;
  headline.textContent = copy.question;
  body.textContent = copy.context;
}

function conversationForQuestion(
  question: DiscoveryQuestion,
  response: DiscoveryResponse,
  isOpening: boolean,
): { eyebrow: string; reaction: string; question: string; context: string } {
  if (isOpening) {
    return {
      eyebrow: currentPath === "startup" ? "NOVA · STARTUP DISCOVERY" : "NOVA · GROWTH DISCOVERY",
      reaction: currentPath === "startup"
        ? "Perfect. I’m going to help you pressure-test the idea before you build too much around assumptions."
        : "Good. I’m going to trace where opportunities are getting slowed down, missed, or handled manually.",
      question: friendlyPrompt(question),
      context: whyNovaAsks(question),
    };
  }

  return {
    eyebrow: response.view.progressPercent >= 70 ? "NOVA · CONNECTING THE DOTS" : "NOVA · DISCOVERY",
    reaction: lastTurn ? reactionToAnswer(lastTurn.field, lastTurn.value) : "That gives me another useful signal.",
    question: friendlyPrompt(question),
    context: whyNovaAsks(question),
  };
}

function friendlyPrompt(question: DiscoveryQuestion): string {
  const prompts: Record<string, string> = {
    businessName: "First, what should I call your business?",
    industry: "Give me the quick version—what kind of business are you building or running?",
    monthlyLeads: "About how many new leads or customer inquiries hit the business in a typical month?",
    appointmentsNeedManualScheduling: "When someone wants to book, does a person still have to step in and handle the scheduling?",
    estimatesNeedManualFollowUp: "What happens after a quote or qualified lead—does someone have to remember to chase it down?",
    repetitiveSupportLoad: "How much of your team's time gets eaten up answering the same customer questions over and over?",
    reviewRequestProcess: "How are you asking happy customers for reviews today?",
    requestedCustomIntegrations: "How many systems would Nova or another AI Employee realistically need to connect with?",
    expectedVoiceMinutesPerMonth: "If AI handled some of your calls, roughly how much phone traffic would you expect it to cover each month?",
    founderHandlesMostAdmin: "At launch, are you going to be the one wearing most of the hats—calls, scheduling, follow-up, and customer admin?",
    departmentsAffected: currentPath === "startup"
      ? "How many parts of the business do you already expect AI could help you carry at launch?"
      : "Looking at what we've uncovered so far, how many parts of the business feel affected?",
    missedCallsPerMonth: "Think about a normal month. Roughly how many calls are missed or don't get a fast response?",
    medianLeadResponseMinutes: "When a new lead comes in, how long does it usually take before a real response goes out?",
    averageJobValueUsd: "If one of those opportunities turns into a customer, what's an average job or sale worth?",
    closeRatePercent: "Of the qualified opportunities you actually talk to, about what percentage become customers?",
    dormantCustomerList: "Do you have old leads or past customers sitting there without consistent follow-up?",
  };
  return prompts[question.field] ?? question.prompt;
}

function whyNovaAsks(question: DiscoveryQuestion): string {
  const reasons: Record<string, string> = {
    businessName: "I’ll use it to make the rest of this feel like your Flight Plan—not a generic assessment.",
    industry: "The workflow that helps a contractor is very different from the one that helps a retail shop, consultant, or service company.",
    monthlyLeads: "Volume tells me whether the first priority should be creating demand or protecting the opportunities you already have.",
    appointmentsNeedManualScheduling: "Scheduling is one of the easiest places for good leads to stall while everyone is busy doing the actual work.",
    estimatesNeedManualFollowUp: "I’m checking whether revenue depends on somebody’s memory. That’s usually an automation opportunity hiding in plain sight.",
    repetitiveSupportLoad: "Repeated questions are often a sign that an AI Employee can give your team time back without hurting the customer experience.",
    reviewRequestProcess: "Reviews compound over time, but only when the request happens consistently instead of whenever someone remembers.",
    requestedCustomIntegrations: "This helps me separate a clean deployment from something that needs custom engineering before I recommend a package.",
    expectedVoiceMinutesPerMonth: "Voice volume affects both architecture and operating cost, so I’d rather size it honestly than guess later.",
    founderHandlesMostAdmin: "I’m looking for the work that will quietly consume your time once customers start showing up.",
    departmentsAffected: "This tells me whether we’re solving one isolated bottleneck or designing a broader AI workforce around the business.",
    missedCallsPerMonth: "Missed calls can be more than a service issue—they can be measurable lost revenue if the caller simply moves to the next company.",
    medianLeadResponseMinutes: "Lead response speed is one of the clearest places automation can protect intent while it’s still hot.",
    averageJobValueUsd: "That lets me put the missed-opportunity problem into dollars instead of vague percentages.",
    closeRatePercent: "I don’t want to pretend every missed call is a lost sale. Your real conversion rate gives me a more grounded estimate.",
    dormantCustomerList: "A neglected database can sometimes be the fastest source of revenue because those people already know the business.",
  };
  return reasons[question.field] ?? question.helpText ?? "I’m using this to decide what should—and should not—be automated first.";
}

function reactionToAnswer(field: string, value: string | number | boolean): string {
  if (field === "businessName" && typeof value === "string") return `Got it—${value}. Now I can make this about the business you're actually building.`;
  if (field === "industry" && typeof value === "string") return `That helps. A ${value} business has its own customer rhythm, so I’ll keep the recommendations grounded in that.`;
  if (field === "monthlyLeads" && typeof value === "number") {
    if (value >= 100) return `That's meaningful volume. At around ${value} inquiries a month, small delays and missed follow-up can become expensive fast.`;
    if (value >= 25) return `That's enough activity for process gaps to matter. I’m watching for places where those opportunities can slip through.`;
    return `Okay—at that volume I don't want to overbuild automation. The priority may be making each opportunity count while you grow demand.`;
  }
  if (field === "appointmentsNeedManualScheduling") return value === true
    ? "That’s a useful signal. Every manual scheduling handoff creates another place where a ready customer can get stuck."
    : "Good—scheduling may already be one of the stronger parts of the operation, so I won’t force automation where it isn’t needed.";
  if (field === "estimatesNeedManualFollowUp") return value === true
    ? "There it is. Follow-up that depends on memory is exactly the kind of bottleneck an AI Employee can take ownership of."
    : "Good. That tells me your follow-up process may already have some discipline, so I’ll look elsewhere for higher-impact gaps.";
  if (field === "repetitiveSupportLoad") return value === "high"
    ? "That’s a real capacity drain. Repetitive support is a strong candidate for automation because the team gets time back immediately."
    : value === "medium"
      ? "That’s enough repetition to be worth watching. It may not be priority one, but it belongs on the board."
      : "Good—support repetition doesn’t sound like the main pain point, so I won’t make it one.";
  if (field === "reviewRequestProcess") return value === "automated"
    ? "Nice. Reviews are already systemized, so there’s no reason for me to sell you a solution to a problem you’ve handled."
    : value === "manual"
      ? "That works when people remember. I’m flagging consistency—not effort—as the issue there."
      : "That’s an easy visibility gap to understand. I’ll keep it in the Flight Plan, but only if higher-value bottlenecks don’t outrank it.";
  if (field === "founderHandlesMostAdmin") return value === true
    ? "That’s exactly what I wanted to catch early. Founder time is expensive, and admin work expands faster than most launch plans expect."
    : "Good. You already have some separation between founder work and operational work, which gives us more options.";
  if (field === "missedCallsPerMonth" && typeof value === "number") return value > 0
    ? `Even ${value} missed or delayed calls a month can be worth measuring. Let me see what one converted opportunity is actually worth before I call it a revenue problem.`
    : "That’s a strong sign. If calls are consistently being answered, I’ll shift attention toward what happens after the lead arrives.";
  if (field === "medianLeadResponseMinutes" && typeof value === "number") return value > 60
    ? `That response window is long enough that I’d treat speed-to-lead as a serious candidate for automation.`
    : value > 15
      ? "That’s not catastrophic, but there’s room to tighten it—especially when buyer intent is high."
      : "That’s a healthy response window. I’m less interested in fixing what already works and more interested in what happens next.";
  if (field === "averageJobValueUsd" && typeof value === "number") return `At roughly $${value.toLocaleString()} per job, we can stop talking about missed opportunities abstractly and start sizing the impact.`;
  if (field === "closeRatePercent" && typeof value === "number") return `A ${value}% close rate gives me a much more realistic basis for the opportunity estimate. I’ll use that instead of assuming every lead becomes revenue.`;
  if (field === "dormantCustomerList") return value === true
    ? "That may be one of the quickest wins in the whole diagnosis. Those contacts already know the business; the gap is consistent re-engagement."
    : "Good to know. I won’t invent a reactivation opportunity if there isn’t a meaningful list to work.";
  if (field === "requestedCustomIntegrations" && typeof value === "number") return value > 2
    ? "That integration count changes the implementation picture. I’m treating this as a more customized deployment, not a plug-and-play setup."
    : "That sounds manageable. The technical footprint shouldn’t dominate the recommendation.";
  if (field === "expectedVoiceMinutesPerMonth" && typeof value === "number") return value > 1000
    ? "That’s substantial call volume. Voice can still make sense, but usage economics need to be part of the recommendation from day one."
    : "That gives me enough to size voice without making it the center of the plan unless the diagnosis supports it.";
  if (field === "departmentsAffected" && typeof value === "number") return value >= 3
    ? "That’s broader than a single automation. I’m starting to look at this as an AI workforce design problem rather than one isolated fix."
    : "Good—that keeps the scope focused. I’d rather solve the highest-impact area well before expanding into everything at once.";
  return "That helps. I’m updating the picture as we go rather than treating each answer like an isolated form field.";
}

function playDiscoveryBehavior(response: DiscoveryResponse): void {
  if (response.completed) {
    visualStage.playBehavior("excited");
    return;
  }
  const progressPercent = response.view.progressPercent;
  if (progressPercent >= 70) {
    visualStage.playBehavior("energetic");
  } else if (progressPercent >= 35) {
    visualStage.playBehavior("playful");
  }
}

function renderQuestion(question: DiscoveryQuestion): void {
  const help = question.helpText ? `<p class="help">${escapeHtml(question.helpText)}</p>` : "";
  const identity = question.isFinalRequired ? identityFieldsHtml() : "";

  if (question.answerType === "boolean") {
    controls.innerHTML = `${help}${identity}<div class="choice-grid"><button data-answer="true">Yes</button><button data-answer="false">No</button></div>`;
    controls.querySelectorAll<HTMLButtonElement>("[data-answer]").forEach((button) => {
      button.addEventListener("click", () => void submit(question, button.dataset.answer === "true"));
    });
    return;
  }
  if (question.answerType === "single_select") {
    controls.innerHTML = `${help}${identity}<div class="choice-grid">${(question.options ?? []).map((option) => `<button data-choice="${escapeHtml(option)}">${escapeHtml(labelOption(option))}</button>`).join("")}</div>`;
    controls.querySelectorAll<HTMLButtonElement>("[data-choice]").forEach((button) => {
      button.addEventListener("click", () => void submit(question, button.dataset.choice ?? ""));
    });
    return;
  }
  const inputType = question.answerType === "number" ? "number" : "text";
  controls.innerHTML = `${help}${identity}<form id="nova-answer-form" class="answer-form"><label class="sr-only" for="nova-answer">${escapeHtml(question.prompt)}</label><input id="nova-answer" name="answer" type="${inputType}" ${inputType === "number" ? "inputmode=\"decimal\" step=\"any\"" : "autocomplete=\"off\""} required><button type="submit">${question.isFinalRequired ? "Build my Flight Plan" : "Tell Nova"}</button></form>`;
  const form = controls.querySelector<HTMLFormElement>("#nova-answer-form")!;
  const input = controls.querySelector<HTMLInputElement>("#nova-answer")!;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = inputType === "number" ? Number(input.value) : input.value.trim();
    if (inputType === "number" && !Number.isFinite(value)) return;
    if (inputType === "text" && !value) return;
    void submit(question, value);
  });
  input.focus();
}

function identityFieldsHtml(): string {
  return `
    <section class="identity-card" aria-labelledby="identity-title">
      <p class="identity-kicker">SAVE YOUR FLIGHT PLAN</p>
      <h3 id="identity-title">Where should I attach your recommendation?</h3>
      <p>Enter your contact details so Moonrock can save this Flight Plan to your inquiry. Automated follow-up remains disabled during this controlled launch.</p>
      <div class="identity-grid">
        <label>First name<input id="identity-first-name" autocomplete="given-name" required></label>
        <label>Last name<input id="identity-last-name" autocomplete="family-name" required></label>
        <label class="identity-email">Email<input id="identity-email" type="email" autocomplete="email" required></label>
      </div>
      <label class="consent-row"><input id="identity-consent" type="checkbox" required><span>I agree to have this Flight Plan and inquiry saved by Moonrock Marketing.</span></label>
    </section>
  `;
}

function readIdentity(): ContactIdentity | undefined {
  const firstName = controls.querySelector<HTMLInputElement>("#identity-first-name")?.value.trim() ?? "";
  const lastName = controls.querySelector<HTMLInputElement>("#identity-last-name")?.value.trim() ?? "";
  const emailInput = controls.querySelector<HTMLInputElement>("#identity-email");
  const email = emailInput?.value.trim() ?? "";
  const consent = controls.querySelector<HTMLInputElement>("#identity-consent")?.checked ?? false;
  if (!firstName || !lastName || !email || !emailInput?.validity.valid || !consent) {
    status.textContent = "Please enter your name, a valid email, and confirm permission to save your Flight Plan.";
    return undefined;
  }
  return {
    firstName,
    lastName,
    email,
    ...(businessName ? { companyName: businessName } : {}),
  };
}

async function submit(question: DiscoveryQuestion, value: string | number | boolean): Promise<void> {
  if (busy || !sessionId) return;
  const identity = question.isFinalRequired ? readIdentity() : undefined;
  if (question.isFinalRequired && !identity) return;
  if (question.field === "businessName" && typeof value === "string") businessName = value;
  lastTurn = { field: question.field, value };
  const processingState = question.isFinalRequired ? "diagnosis" : "thinking";
  setBusy(true, processingState);
  reaction.hidden = false;
  reaction.textContent = question.isFinalRequired
    ? "I have what I need. Give me a second to connect this into a practical recommendation."
    : "Let me connect that to what you've already told me…";
  status.textContent = question.isFinalRequired ? "Nova is building and saving your Flight Plan…" : "Nova is thinking…";
  try {
    const response = await answerDiscovery(sessionId, question.field, value, identity);
    setBusy(false);
    renderResponse(response);
    if (response.completed) {
      playDiscoveryBehavior(response);
      status.textContent = response.ghlHandoff?.status === "confirmed"
        ? "Your Moonrock Flight Plan is ready and saved."
        : "Your Moonrock Flight Plan is ready.";
    } else {
      visualStage.playTransientState("speaking");
      window.setTimeout(() => playDiscoveryBehavior(response), 1350);
      status.textContent = "Nova is with you.";
    }
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "Nova could not process that answer.";
    setBusy(false);
  }
}

function renderFlightPlan(response: DiscoveryResponse): void {
  const flightPlan = response.result!.flightPlan;
  const opportunity = flightPlan.opportunity;
  const saved = response.ghlHandoff?.status === "confirmed";
  controls.innerHTML = "";
  result.hidden = false;
  result.innerHTML = `
    ${saved ? `<div class="save-confirmation">Flight Plan saved to Moonrock</div>` : ""}
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
  businessName = "";
  currentPath = path;
  lastTurn = undefined;
  visualStage.setState("idle");
  setBusy(true, "thinking");
  status.textContent = "Nova is opening your discovery session…";
  document.querySelectorAll<HTMLButtonElement>("[data-path]").forEach((button) => { button.disabled = true; });
  try {
    const response = await startDiscovery(sessionId, path);
    setBusy(false);
    renderResponse(response, true);
    visualStage.playTransientState("speaking");
    window.setTimeout(() => visualStage.playBehavior(path === "startup" ? "excited" : "energetic"), 1350);
    panel.scrollIntoView({ behavior: "smooth", block: "center" });
    status.textContent = "Nova is with you.";
  } catch (error) {
    setBusy(false);
    status.textContent = error instanceof Error ? error.message : "Nova could not start the session.";
    document.querySelectorAll<HTMLButtonElement>("[data-path]").forEach((button) => { button.disabled = false; });
  }
}

function labelOption(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function escapeHtml(value: string): string {
  const replacements: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  };
  return value.replace(/[&<>'"]/g, (character) => replacements[character] ?? character);
}

document.querySelectorAll<HTMLButtonElement>("[data-path]").forEach((button) => {
  button.addEventListener("click", () => void begin(button.dataset.path as BusinessPath));
});
