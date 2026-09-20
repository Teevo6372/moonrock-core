import "./styles.css";
import "./onboarding.css";
import { loadClerk, getClerkAuthToken, onClerkAuthChange } from "./clerk-auth.js";
import { assertFrontendConfig, config } from "./config.js";

interface ClientInfo {
  id: string;
  email: string;
  tier: string;
  status: string;
  flightPlanId: string;
}

interface OnboardingTurn {
  role: "nova" | "client";
  text: string;
  ts: string;
}

interface OnboardingState {
  status: "pending" | "in_progress" | "complete";
  conversation: OnboardingTurn[];
  answers: Record<string, string>;
}

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App root not found");

app.innerHTML = `
  <main class="onboarding-shell">
    <header class="onboarding-header">
      <a class="onboarding-logo-link" href="/" aria-label="Moonrock home">
        <img class="onboarding-logo" src="/moonrock-logo-badge.png" alt="Moonrock" />
      </a>
      <div class="onboarding-header-right">
        <span id="onboarding-user-label" class="onboarding-user-label" hidden></span>
        <button type="button" id="onboarding-sign-out" class="onboarding-sign-out" hidden>Sign out</button>
      </div>
    </header>

    <section id="onboarding-auth-gate" class="onboarding-auth-gate">
      <div class="onboarding-auth-inner">
        <p class="onboarding-eyebrow">MOONROCK CLIENT PORTAL</p>
        <h1>Welcome to your onboarding.</h1>
        <p>Sign in with the invitation Moonrock sent to your email to get started.</p>
        <button type="button" id="onboarding-sign-in-btn" class="onboarding-cta">Sign in to continue</button>
      </div>
    </section>

    <section id="onboarding-loading" class="onboarding-loading" hidden>
      <p>Getting your account ready…</p>
    </section>

    <section id="onboarding-chat" class="onboarding-chat-section" hidden>
      <div class="onboarding-chat-intro">
        <p class="onboarding-eyebrow">MOONROCK CLIENT PORTAL</p>
        <h1>Let's get you set up.</h1>
        <p>Nova will collect the details Moonrock needs to configure your Launch Plan. This takes about 5 minutes.</p>
      </div>

      <div id="onboarding-thread" class="onboarding-thread" role="log" aria-live="polite" aria-label="Conversation with Nova"></div>

      <form id="onboarding-form" class="onboarding-form">
        <label class="sr-only" for="onboarding-input">Your message</label>
        <input id="onboarding-input" type="text" placeholder="Type your answer…" autocomplete="off" required />
        <button type="submit">Send</button>
      </form>
    </section>

    <section id="onboarding-complete" class="onboarding-complete-section" hidden>
      <div class="onboarding-complete-inner">
        <p class="onboarding-eyebrow">ALL DONE</p>
        <h1>You're all set.</h1>
        <p>Moonrock has everything needed to configure your Launch Plan. A team member will be in touch within 1 business day to begin setup.</p>
        <p class="onboarding-complete-note">Have a question in the meantime? Email <a href="mailto:stephen@moonrockmarketing.com">stephen@moonrockmarketing.com</a>.</p>
      </div>
    </section>
  </main>
`;

const authGate = document.querySelector<HTMLElement>("#onboarding-auth-gate")!;
const loadingSection = document.querySelector<HTMLElement>("#onboarding-loading")!;
const chatSection = document.querySelector<HTMLElement>("#onboarding-chat")!;
const completeSection = document.querySelector<HTMLElement>("#onboarding-complete")!;
const thread = document.querySelector<HTMLDivElement>("#onboarding-thread")!;
const form = document.querySelector<HTMLFormElement>("#onboarding-form")!;
const input = document.querySelector<HTMLInputElement>("#onboarding-input")!;
const signInBtn = document.querySelector<HTMLButtonElement>("#onboarding-sign-in-btn")!;
const signOutBtn = document.querySelector<HTMLButtonElement>("#onboarding-sign-out")!;
const userLabel = document.querySelector<HTMLSpanElement>("#onboarding-user-label")!;

let clientInfo: ClientInfo | null = null;
let busy = false;

function showSection(section: "auth" | "loading" | "chat" | "complete"): void {
  authGate.hidden = section !== "auth";
  loadingSection.hidden = section !== "loading";
  chatSection.hidden = section !== "chat";
  completeSection.hidden = section !== "complete";
}

function appendBubble(role: "nova" | "client", text: string): void {
  const article = document.createElement("article");
  article.className = `onboarding-bubble onboarding-bubble-${role}`;
  const who = role === "nova" ? "Nova" : "You";
  article.innerHTML = `<strong class="onboarding-bubble-who">${who}</strong><p></p>`;
  article.querySelector("p")!.textContent = text;
  thread.append(article);
  thread.scrollTo({ top: thread.scrollHeight, behavior: "smooth" });
}

function appendThinkingBubble(): HTMLElement {
  const article = document.createElement("article");
  article.className = "onboarding-bubble onboarding-bubble-nova onboarding-bubble-thinking";
  article.setAttribute("aria-label", "Nova is thinking");
  article.innerHTML = `<strong class="onboarding-bubble-who">Nova</strong><p>…</p>`;
  thread.append(article);
  thread.scrollTo({ top: thread.scrollHeight, behavior: "smooth" });
  return article;
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  assertFrontendConfig();
  const token = await getClerkAuthToken();
  if (!token) throw new Error("Not signed in.");
  const response = await fetch(`${config.novaApiBaseUrl}${path}`, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const text = await response.text();
  const payload = text ? (JSON.parse(text) as T) : ({} as T);
  if (!response.ok) {
    const detail = (payload as Record<string, unknown>).detail;
    throw new Error(typeof detail === "string" ? detail : `Request failed (${response.status})`);
  }
  return payload;
}

async function loadClientMe(): Promise<ClientInfo | null> {
  try {
    const data = await apiRequest<{ client?: ClientInfo }>("/v1/client/me");
    return data.client ?? null;
  } catch {
    return null;
  }
}

async function loadOnboardingState(): Promise<OnboardingState> {
  try {
    return await apiRequest<OnboardingState>("/v1/client/onboarding");
  } catch {
    return { status: "pending", conversation: [], answers: {} };
  }
}

async function sendMessage(question: string): Promise<{ answer: string; complete: boolean }> {
  return apiRequest<{ answer: string; complete: boolean }>("/v1/client/onboarding/conversation", {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}

async function startChat(): Promise<void> {
  const state = await loadOnboardingState();

  if (state.status === "complete") {
    showSection("complete");
    return;
  }

  // Restore conversation history if any.
  for (const turn of state.conversation) {
    appendBubble(turn.role, turn.text);
  }

  showSection("chat");

  // If no history yet, send an opening greeting trigger.
  if (state.conversation.length === 0) {
    await sendAndDisplay("Hello! I just accepted my invitation.");
  } else {
    input.focus();
  }
}

async function sendAndDisplay(question: string): Promise<void> {
  if (busy) return;
  busy = true;
  input.disabled = true;
  form.querySelector("button")!.disabled = true;

  appendBubble("client", question);
  const thinking = appendThinkingBubble();

  try {
    const result = await sendMessage(question);
    thinking.remove();
    appendBubble("nova", result.answer);
    if (result.complete) {
      window.setTimeout(() => showSection("complete"), 1800);
    }
  } catch (error) {
    thinking.remove();
    appendBubble("nova", error instanceof Error ? error.message : "Something went wrong. Please try again.");
  } finally {
    busy = false;
    input.disabled = false;
    form.querySelector("button")!.disabled = false;
    input.focus();
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const question = input.value.trim();
  if (!question || busy) return;
  input.value = "";
  void sendAndDisplay(question);
});

signInBtn.addEventListener("click", () => void loadClerk().then((clerk) => clerk?.openSignIn({})));

signOutBtn.addEventListener("click", async () => {
  const clerk = await loadClerk();
  await clerk?.signOut();
  clientInfo = null;
  showSection("auth");
  userLabel.hidden = true;
  signOutBtn.hidden = true;
});

onClerkAuthChange(async (signedIn) => {
  if (!signedIn) {
    showSection("auth");
    userLabel.hidden = true;
    signOutBtn.hidden = true;
    return;
  }

  showSection("loading");

  clientInfo = await loadClientMe();
  if (!clientInfo) {
    showSection("auth");
    return;
  }

  userLabel.textContent = clientInfo.email;
  userLabel.hidden = false;
  signOutBtn.hidden = false;

  await startChat();
});
