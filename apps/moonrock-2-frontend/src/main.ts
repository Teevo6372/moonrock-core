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
        <p class="lede">Meet Nova, Moonrock's Virtual Growth Advisor. She'll learn how your business works, spot practical opportunities, and build a Flight Plan around what you actually need.</p>
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
let lastTurn: { field: string; raw: string | number | boolean } | undefined;

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
    reaction.textContent = "All right, I’ve got enough to connect the dots. This isn’t a grade on your business—it’s a practical starting point based on what you shared.";
    eyebrow.textContent = "NOVA · YOUR FLIGHT PLAN";
    headline.textContent = response.view.headline;
    body.textContent = "I’ll show you what I’m seeing, why it matters, and a few reasonable ways Moonrock could help. You can keep asking me questions after the plan—there’s no pressure to make a decision right now.";
    renderFlightPlan(response);
    return;
  }

  if (response.nextQuestion) {
    renderConversation(response.nextQuestion, response, isOpening);
    renderQuestion(response.nextQuestion);
  }
}

function renderConversation(question: DiscoveryQuestion, response: DiscoveryResponse, isOpening: boolean): void {
  eyebrow.textContent = response.view.progressPercent >= 70 ? "NOVA · CONNECTING THE DOTS" : "NOVA · DISCOVERY";
  if (isOpening) {
    reaction.hidden = false;
    reaction.textContent = currentPath === "startup"
      ? "Hey, I’m Nova. I’m Moonrock’s Virtual Growth Advisor. Think of this less like filling out an assessment and more like sitting down with somebody who wants to understand what you’re building before recommending anything. I’ll help pressure-test the idea, look for bottlenecks before they become expensive, and build a practical Flight Plan around where AI can actually take work off your plate. Nothing fancy—you tell me what’s going on, and we’ll work through it together."
      : "Hey, I’m Nova. I’m Moonrock’s Virtual Growth Advisor. My job is to learn how the business really works—not just what it says on the website—then look for places where leads get missed, customers wait, repetitive work piles up, or good opportunities stall. I’ll turn what we learn into a practical Flight Plan and explain where an AI Employee could help. No hard sell. Just tell me what’s going on and we’ll sort through it together.";
  } else {
    reaction.hidden = false;
    reaction.textContent = interpretLastTurn(response);
  }
  headline.textContent = friendlyPrompt(question);
  body.textContent = whyNovaAsks(question);
}

function friendlyPrompt(question: DiscoveryQuestion): string {
  const prompts: Record<string, string> = {
    businessName: "First off, what should I call the business?",
    industry: "Give me the quick version—what kind of business are you building or running?",
    businessChallenges: currentPath === "startup"
      ? "Before we get into numbers, what are you most unsure about or worried could get messy as you launch?"
      : "Before we get into numbers, what feels harder than it should in the business right now?",
    monthlyLeads: "What kind of lead or inquiry volume are you dealing with in a normal month?",
    appointmentsNeedManualScheduling: "When somebody wants to book, how much of that still depends on a person stepping in?",
    estimatesNeedManualFollowUp: "What happens after a quote, estimate, or qualified lead—does follow-up mostly take care of itself, or does somebody have to remember it?",
    repetitiveSupportLoad: "How much time gets chewed up answering the same customer questions over and over?",
    reviewRequestProcess: "How are you asking happy customers for reviews these days?",
    requestedCustomIntegrations: "What systems would this need to work with—CRM, calendars, forms, phones, anything custom?",
    expectedVoiceMinutesPerMonth: "If AI helped with the phones, what kind of coverage would actually be useful?",
    founderHandlesMostAdmin: "At launch, are you going to be the one wearing most of the hats—calls, scheduling, follow-up, customer admin, all of it?",
    departmentsAffected: currentPath === "startup"
      ? "Which parts of the business do you already expect you’ll want help carrying at launch?"
      : "Looking at what we’ve uncovered, which parts of the business seem tied into the same problem?",
    missedCallsPerMonth: "On a normal week or month, what happens with calls you can’t get to right away?",
    medianLeadResponseMinutes: "When a new lead comes in, what does response time usually look like?",
    averageJobValueUsd: "When one of those opportunities turns into a customer, what’s a typical job or sale worth?",
    closeRatePercent: "Of the qualified opportunities you actually talk to, about how many usually become customers?",
    dormantCustomerList: "Do you have old leads or past customers sitting there without much consistent follow-up?",
  };
  return prompts[question.field] ?? question.prompt;
}

function whyNovaAsks(question: DiscoveryQuestion): string {
  const reasons: Record<string, string> = {
    businessName: "It just makes this easier to talk about like your business instead of some generic worksheet.",
    industry: "Different businesses have very different customer rhythms. I don’t want to recommend a process that makes sense for somebody else but not for you.",
    businessChallenges: "This is usually more useful than starting with software. If I understand what’s frustrating you first, I can focus on the outcome—faster response, fewer dropped balls, less repetitive work, better visibility—and keep the underlying tools in the background where they belong.",
    monthlyLeads: "I’m trying to figure out whether the bigger opportunity is creating more demand or doing a better job protecting the demand you already have.",
    appointmentsNeedManualScheduling: "Scheduling is one of those little handoffs that can quietly slow everything down when the team is busy doing the actual work.",
    estimatesNeedManualFollowUp: "I’m checking whether revenue depends on somebody remembering what to do next. That’s often a good place for automation to monitor the process and step in consistently.",
    repetitiveSupportLoad: "If the same questions keep showing up, an AI Employee can often handle the routine part and escalate the unusual stuff instead of replacing the human relationship.",
    reviewRequestProcess: "Reviews matter, but consistency matters more than fancy tooling. I’m just checking whether the process happens every time or only when somebody remembers.",
    requestedCustomIntegrations: "I care more about whether the systems need to work together than which vendor logo is on the screen. Moonrock can connect and automate the workflow without turning your Flight Plan into a shopping list of tools.",
    expectedVoiceMinutesPerMonth: "Don’t worry about giving me a perfect number. Tell me the situation—after-hours, weekends, overflow, full coverage—and I’ll translate that into something we can size later.",
    founderHandlesMostAdmin: "Founder time disappears fast once customers start showing up. I’m looking for the routine work that can be monitored or automated before it owns your calendar.",
    departmentsAffected: "That helps me decide whether this is one focused AI Employee or whether several functions need to work together as a small AI workforce.",
    missedCallsPerMonth: "Phone coverage can be a customer-experience issue and a revenue issue. I want to understand the pattern before treating every missed call like a lost sale.",
    medianLeadResponseMinutes: "Speed matters when intent is high. We can monitor new inquiries, respond immediately where appropriate, and escalate anything that needs a person.",
    averageJobValueUsd: "That lets me translate process friction into dollars without pretending every missed opportunity would have closed.",
    closeRatePercent: "Your real conversion pattern gives me a more grounded estimate than using some generic industry assumption.",
    dormantCustomerList: "Past customers and old leads can be valuable because the relationship already exists. Consistent re-engagement is often easier than constantly buying new attention.",
  };
  return reasons[question.field] ?? question.helpText ?? "I’m using this to decide what should—and should not—be automated first.";
}

function interpretLastTurn(response: DiscoveryResponse): string {
  if (!lastTurn) return "That gives me another useful signal.";
  const field = lastTurn.field;
  const normalized = response.interpretation?.normalized;
  const raw = String(lastTurn.raw).toLowerCase();

  if (field === "businessName") return "Good deal. I’ll keep the rest of this centered on your situation instead of talking in generic business terms.";
  if (field === "industry") return "That gives me the operating context I needed. I’m going to pay attention to how customers typically enter, wait, buy, schedule, and follow up in that kind of business.";
  if (field === "businessChallenges") {
    if (/follow.?up|quote|estimate|proposal/.test(raw)) return "That sounds less like a lead-generation problem and more like a consistency problem after interest already exists. That’s useful, because monitoring stalled opportunities and triggering the right follow-up is exactly the kind of repetitive work automation can own without changing how you sell.";
    if (/call|phone|voicemail|after.?hours|weekend/.test(raw)) return "I’d treat that as a coverage problem before I call it a staffing problem. An AI Employee can handle routine questions and capture intent when nobody is available, then route the situations that actually need a person.";
    if (/time|busy|admin|overwhelm|wearing/.test(raw)) return "That sounds like capacity pressure. I’m going to look for work that repeats often enough to automate or monitor so your time stays focused on the parts that actually require judgment.";
    if (/lead|response|slow|miss/.test(raw)) return "There may be an opportunity leak between interest and response. I’m going to trace that handoff rather than assuming the answer is simply 'get more leads.'";
    return "That’s the kind of context I was looking for. I’m not going to force it into a canned category—I’ll use the rest of the questions to figure out whether the best answer is automation, better monitoring, a cleaner workflow, or simply leaving something alone.";
  }
  if (field === "monthlyLeads" && typeof normalized === "number") return normalized >= 100
    ? "That’s enough volume that small process gaps can compound quickly. I’m watching response and follow-up closely from here."
    : normalized >= 25
      ? "That’s enough activity for consistency to matter. We don’t need to automate everything—just protect the places where good opportunities can slip."
      : "At that volume, I’d rather keep the system lean and make each opportunity count than build a bunch of automation you don’t need yet.";
  if (field === "appointmentsNeedManualScheduling") return normalized === false || lastTurn.raw === false
    ? "Sounds like scheduling is already reasonably controlled. Good—I won’t manufacture a problem there."
    : "That tells me there’s a handoff worth tightening. The goal wouldn’t be to remove people; it’d be to keep customers from waiting on routine coordination.";
  if (field === "estimatesNeedManualFollowUp") return normalized === false || lastTurn.raw === false
    ? "Good. If follow-up is already consistent, we can spend our attention somewhere with more upside."
    : "That’s a useful bottleneck. A system can watch for stalled estimates, follow the agreed cadence, and flag exceptions so the team isn’t relying on memory.";
  if (field === "expectedVoiceMinutesPerMonth") return typeof normalized === "number" && normalized > 0
    ? `I can work with that. I translated the coverage you described into roughly ${Math.round(normalized)} voice minutes a month for planning purposes, but I’d validate actual usage before locking anything in.`
    : "That’s fine. You don’t need to know the usage number yet. The important part is the coverage pattern; we can measure real call volume before final pricing.";
  if (field === "medianLeadResponseMinutes" && typeof normalized === "number") return normalized > 60
    ? "That response window is long enough that I’d put speed-to-lead near the top of the board. Immediate acknowledgement plus smart escalation can protect intent without making the experience robotic."
    : "That response time doesn’t look like the biggest fire. I’ll keep moving and see whether the real friction shows up later in the customer journey.";
  if (field === "missedCallsPerMonth" && typeof normalized === "number") return normalized > 0
    ? "There’s enough missed-call activity to measure, but I’m not going to label all of it lost revenue. I want the job value and close rate before I size the opportunity."
    : "Phone coverage sounds fairly healthy. That lets me shift attention to what happens after contact is made.";
  if (field === "dormantCustomerList") return normalized === true || lastTurn.raw === true
    ? "That could be a quick-win area. Those people already know the business, so consistent re-engagement may be more efficient than chasing entirely cold demand."
    : "Good to know. I won’t build a reactivation recommendation around a list that isn’t really there.";
  return "That helps. I’m using the meaning behind the answer, not just copying it into a field.";
}

function playDiscoveryBehavior(response: DiscoveryResponse): void {
  if (response.completed) {
    visualStage.playBehavior("excited");
    return;
  }
  if (response.view.progressPercent >= 70) visualStage.playBehavior("energetic");
  else if (response.view.progressPercent >= 35) visualStage.playBehavior("playful");
}

function conversationalInput(question: DiscoveryQuestion, compact = false): string {
  const placeholder = question.field === "expectedVoiceMinutesPerMonth"
    ? "Example: Mostly evenings and weekends—maybe 80 hours a month?"
    : question.field === "businessChallenges"
      ? "Tell Nova what’s going on in your own words…"
      : "Tell Nova in your own words…";
  return `<form class="answer-form conversational-answer" data-conversation-form><label class="sr-only" for="nova-answer-${escapeHtml(question.id)}">${escapeHtml(question.prompt)}</label><input id="nova-answer-${escapeHtml(question.id)}" name="answer" type="text" autocomplete="off" placeholder="${escapeHtml(placeholder)}" required><button type="submit">${question.isFinalRequired ? "Build my Flight Plan" : compact ? "Tell Nova" : "Send"}</button></form>`;
}

function renderQuestion(question: DiscoveryQuestion): void {
  const help = question.helpText ? `<p class="help">${escapeHtml(question.helpText)}</p>` : "";
  const identity = question.isFinalRequired ? identityFieldsHtml() : "";

  if (question.answerType === "boolean") {
    controls.innerHTML = `${help}${identity}<div class="choice-grid"><button data-answer="true">Yes, mostly</button><button data-answer="false">No, not really</button></div><div class="or-divider"><span>or answer naturally</span></div>${conversationalInput(question, true)}`;
    controls.querySelectorAll<HTMLButtonElement>("[data-answer]").forEach((button) => button.addEventListener("click", () => void submit(question, button.dataset.answer === "true")));
    bindConversationForm(question);
    return;
  }

  if (question.answerType === "single_select") {
    controls.innerHTML = `${help}${identity}<div class="choice-grid">${(question.options ?? []).map((option) => `<button data-choice="${escapeHtml(option)}">${escapeHtml(labelOption(option))}</button>`).join("")}</div><div class="or-divider"><span>or answer naturally</span></div>${conversationalInput(question, true)}`;
    controls.querySelectorAll<HTMLButtonElement>("[data-choice]").forEach((button) => button.addEventListener("click", () => void submit(question, button.dataset.choice ?? "")));
    bindConversationForm(question);
    return;
  }

  controls.innerHTML = `${help}${identity}${conversationalInput(question)}`;
  bindConversationForm(question);
}

function bindConversationForm(question: DiscoveryQuestion): void {
  const form = controls.querySelector<HTMLFormElement>("[data-conversation-form]");
  const input = form?.querySelector<HTMLInputElement>("input[name=answer]");
  if (!form || !input) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = input.value.trim();
    if (value) void submit(question, value);
  });
  if (question.answerType === "text") input.focus();
}

function identityFieldsHtml(): string {
  return `
    <section class="identity-card" aria-labelledby="identity-title">
      <p class="identity-kicker">KEEP YOUR FLIGHT PLAN</p>
      <h3 id="identity-title">Want me to save this and send you a copy?</h3>
      <p>I can attach the recommendation to your Moonrock inquiry so you don’t have to remember everything we covered. If you’d like, Moonrock can also follow up to answer questions or help you work through next steps. No pressure either way.</p>
      <div class="identity-grid">
        <label>First name<input id="identity-first-name" autocomplete="given-name" required></label>
        <label>Last name<input id="identity-last-name" autocomplete="family-name" required></label>
        <label>Email<input id="identity-email" type="email" autocomplete="email" required></label>
        <label>Phone <span class="optional">optional</span><input id="identity-phone" type="tel" autocomplete="tel"></label>
      </div>
      <label class="consent-row"><input id="identity-consent" type="checkbox" required><span>Yes, save my Flight Plan and Moonrock inquiry and use my email to provide the requested copy.</span></label>
      <label class="consent-row"><input id="identity-followup" type="checkbox"><span>Moonrock may also follow up with me about this Flight Plan and questions I may have. Optional.</span></label>
    </section>
  `;
}

function readIdentity(): ContactIdentity | undefined {
  const firstName = controls.querySelector<HTMLInputElement>("#identity-first-name")?.value.trim() ?? "";
  const lastName = controls.querySelector<HTMLInputElement>("#identity-last-name")?.value.trim() ?? "";
  const emailInput = controls.querySelector<HTMLInputElement>("#identity-email");
  const email = emailInput?.value.trim() ?? "";
  const phone = controls.querySelector<HTMLInputElement>("#identity-phone")?.value.trim() ?? "";
  const consent = controls.querySelector<HTMLInputElement>("#identity-consent")?.checked ?? false;
  const followUpConsent = controls.querySelector<HTMLInputElement>("#identity-followup")?.checked ?? false;
  if (!firstName || !lastName || !email || !emailInput?.validity.valid || !consent) {
    status.textContent = "I just need your name, a valid email, and permission to save the Flight Plan before I build the final copy.";
    return undefined;
  }
  return { firstName, lastName, email, ...(phone ? { phone } : {}), followUpConsent, ...(businessName ? { companyName: businessName } : {}) };
}

async function submit(question: DiscoveryQuestion, value: string | number | boolean): Promise<void> {
  if (busy || !sessionId) return;
  const identity = question.isFinalRequired ? readIdentity() : undefined;
  if (question.isFinalRequired && !identity) return;
  if (question.field === "businessName" && typeof value === "string") businessName = value;
  lastTurn = { field: question.field, raw: value };
  setBusy(true, question.isFinalRequired ? "diagnosis" : "thinking");
  reaction.hidden = false;
  reaction.textContent = question.isFinalRequired
    ? "Give me a second. I’m turning what we covered into something practical instead of just dumping your answers back at you."
    : "Hang on a second—I’m fitting that into the bigger picture…";
  status.textContent = question.isFinalRequired ? "Nova is building your Flight Plan…" : "Nova is thinking…";
  try {
    const response = await answerDiscovery(sessionId, question.field, value, identity);
    setBusy(false);
    renderResponse(response);
    if (response.completed) {
      playDiscoveryBehavior(response);
      status.textContent = response.ghlHandoff?.status === "confirmed" ? "Your Flight Plan is ready and saved to Moonrock." : "Your Flight Plan is ready.";
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
    <div class="result-kicker">NOVA'S RECOMMENDATION</div>
    <h3>${escapeHtml(flightPlan.recommendation.offerName)}</h3>
    <p>${escapeHtml(flightPlan.recommendation.reason)}</p>
    <div class="price-row"><strong>$${flightPlan.recommendation.monthlyFeeUsd}/mo</strong><span>+$${flightPlan.recommendation.setupFeeUsd} setup</span></div>
    ${opportunity ? `<div class="opportunity"><span>Directional monthly opportunity</span><strong>$${opportunity.monthlyOpportunityUsd.toLocaleString()}</strong><small>${escapeHtml(opportunity.basis)}</small></div>` : ""}
    <div class="bottlenecks"><h4>What I’d work on first</h4>${flightPlan.primaryBottlenecks.map((item) => `<div class="bottleneck"><strong>${escapeHtml(labelOption(item.id))}</strong><span>${escapeHtml(item.explanation)}</span></div>`).join("")}</div>
    <div class="plan-guidance">
      <h4>What this means</h4>
      <p>This Flight Plan is a starting recommendation, not a judgment on how you run the business. Moonrock would validate the workflow with you before changing anything. The goal is to use reliable automation, monitoring, and AI-assisted customer handling where it removes repetitive work or protects opportunities—while keeping human judgment where it matters.</p>
    </div>
    <p class="disclaimer">${escapeHtml(opportunity?.disclaimer ?? flightPlan.disclosures[0] ?? "")}</p>
    <section class="next-steps" aria-labelledby="next-steps-title">
      <div class="result-kicker">KEEP EXPLORING</div>
      <h4 id="next-steps-title">You don’t have to decide anything right now.</h4>
      <p>Ask me about the recommendation, pricing, payment options, implementation, Moonrock’s other services, or what working with a local partner looks like.</p>
      <div class="resource-grid">
        <button data-resource="pricing">Pricing</button>
        <button data-resource="payments">Payment options</button>
        <button data-resource="implementation">How implementation works</button>
        <button data-resource="local">Working with Moonrock locally</button>
        <button data-resource="services">Other ways Moonrock can help</button>
      </div>
      <div id="resource-answer" class="resource-answer" aria-live="polite"></div>
      <form id="post-plan-question" class="answer-form post-plan-question">
        <input id="post-plan-input" type="text" placeholder="Ask Nova another question…" autocomplete="off">
        <button type="submit">Ask Nova</button>
      </form>
    </section>
  `;

  result.querySelectorAll<HTMLButtonElement>("[data-resource]").forEach((button) => {
    button.addEventListener("click", () => answerResourceQuestion(button.dataset.resource ?? ""));
  });
  result.querySelector<HTMLFormElement>("#post-plan-question")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = result.querySelector<HTMLInputElement>("#post-plan-input");
    if (input?.value.trim()) answerOpenQuestion(input.value.trim());
  });
}

function answerResourceQuestion(topic: string): void {
  const answers: Record<string, string> = {
    pricing: "The Flight Plan shows the current recommended monthly and setup pricing for this configuration. Final scope can change if we uncover unusual integrations, compliance needs, or substantially different usage. I’d rather tell you that up front than surprise you later.",
    payments: "Moonrock can discuss practical payment timing and available payment arrangements before anything is signed. The goal is to make implementation understandable and predictable—not pressure you into a payment decision during discovery.",
    implementation: "Implementation starts by validating the workflow we just discussed. Then Moonrock configures the customer-facing experience, automations, monitoring, integrations, and escalation rules behind the scenes. We focus on the business outcome rather than asking you to become an expert in the underlying software stack.",
    local: "Moonrock is based in Lawrence, Kansas. For local businesses, that means we can understand the market and work like a nearby technology partner while still using systems that support customers remotely and around the clock.",
    services: "AI Employees are the center of Moonrock 2.0, but the work can include customer response, lead capture, follow-up, scheduling, CRM workflows, reporting, operational automation, voice handling, integrations, and other supporting systems when they are part of the same business outcome.",
  };
  showResourceAnswer(answers[topic] ?? "Tell me what you want to dig into and I’ll explain it without turning it into a sales pitch.");
}

function answerOpenQuestion(question: string): void {
  const q = question.toLowerCase();
  if (/price|cost|month|setup/.test(q)) return answerResourceQuestion("pricing");
  if (/pay|financ|installment|payment/.test(q)) return answerResourceQuestion("payments");
  if (/implement|setup|how long|onboard/.test(q)) return answerResourceQuestion("implementation");
  if (/local|lawrence|kansas|nearby|partner/.test(q)) return answerResourceQuestion("local");
  if (/service|website|crm|automation|phone|voice|follow.?up/.test(q)) return answerResourceQuestion("services");
  showResourceAnswer("That’s a good question, and I don’t want to fake a specific answer from a keyword. I’d save that with your Flight Plan for a Moonrock follow-up, or we can keep narrowing it down through the options above while the full conversational answer layer is expanded.");
}

function showResourceAnswer(answer: string): void {
  const target = result.querySelector<HTMLDivElement>("#resource-answer");
  if (!target) return;
  target.textContent = answer;
  visualStage.playTransientState("speaking");
}

async function begin(path: BusinessPath): Promise<void> {
  if (busy) return;
  sessionId = newSessionId();
  businessName = "";
  currentPath = path;
  lastTurn = undefined;
  visualStage.setState("idle");
  setBusy(true, "thinking");
  status.textContent = "Nova is getting things ready…";
  document.querySelectorAll<HTMLButtonElement>("[data-path]").forEach((button) => { button.disabled = true; });
  try {
    const response = await startDiscovery(sessionId, path);
    setBusy(false);
    renderResponse(response, true);
    visualStage.playTransientState("speaking");
    window.setTimeout(() => visualStage.playBehavior(path === "startup" ? "excited" : "energetic"), 1600);
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
  const replacements: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" };
  return value.replace(/[&<>'"]/g, (character) => replacements[character] ?? character);
}

document.querySelectorAll<HTMLButtonElement>("[data-path]").forEach((button) => {
  button.addEventListener("click", () => void begin(button.dataset.path as BusinessPath));
});
