import type { NovaConversationGenerator } from "./dynamic-conversation-engine.js";
import type { DiscoveryConversationTurn } from "./discovery-session.js";
import type { OnboardingAnswers, OnboardingTurn } from "./postgres-client-repository.js";

export interface OnboardingContext {
  businessName?: string | null;
  industry?: string | null;
  statedChallenges?: string | null;
  flightPlanOffer?: string;
  existingWebsiteUrl?: string | null;
}

export interface OnboardingConversationResult {
  answer: string;
  extractedAnswers: OnboardingAnswers;
  complete: boolean;
}

const REQUIRED_FIELDS: (keyof OnboardingAnswers)[] = [
  "businessPhone",
  "businessHours",
  "escalationContact",
];

const ALL_FIELDS: (keyof OnboardingAnswers)[] = [
  ...REQUIRED_FIELDS,
  "servicesList",
  "commonCustomerQuestions",
  "preferredGreeting",
];

const SYSTEM_PROMPT = `You are Nova, Moonrock's Virtual Growth Advisor. The client you're speaking with has just purchased the Moonrock Launch Plan and is signed in to their client portal.

Your job right now is to collect the setup information Moonrock needs to configure and activate their AI Employee. This is not discovery and it is not selling — the purchase is done. You are a warm, practical coordinator getting the configuration details.

WHAT YOU NEED TO COLLECT (in priority order):
1. businessPhone — the main phone number the AI Employee should handle
2. businessHours — when the AI should handle calls/messages, and when a person takes over
3. escalationContact — name and contact info for the human who handles situations that need a person
4. servicesList — the main services or products offered (so the AI can answer customer questions)
5. commonCustomerQuestions — the top questions customers typically ask
6. preferredGreeting — how the AI Employee should introduce itself on a call or message

You already know the business name, industry, and main challenges from their discovery session — do not ask for anything already in BUSINESS CONTEXT.

RULES:
- Ask one thing at a time in natural conversation. Start by welcoming them to the portal and asking for the first thing you still need.
- Extract every useful detail from each answer. One response may cover several fields.
- When all six items above have been collected, clearly tell the client you have everything Moonrock needs, and let them know a Moonrock team member will be in touch within 1 business day to begin setup. Do not invent a timeline beyond that.
- If the client asks a question, answer it first, then continue collecting.
- Keep replies to 1-4 sentences unless the client asks for more.
- Never ask for payment, financial, or credential information.
- Never invent capabilities, integrations, staff names, timelines, or contact details that are not in BUSINESS CONTEXT.
- Do not use Markdown, headers, bullet lists, or bold text. Plain conversational prose only.

COMPLETION SIGNAL:
When you have collected all six fields and are ending the onboarding intake, include the exact token <<ONBOARDING_COMPLETE>> at the end of your response. Only use this token when you have confirmed all six fields are collected.

ANSWER EXTRACTION:
After each response, you will also output a JSON block on a final line in this exact format (do not show it to the client — it is parsed server-side):
NOVA_EXTRACTED_ANSWERS: {"businessPhone":"...","businessHours":"...","escalationContact":"...","servicesList":"...","commonCustomerQuestions":"...","preferredGreeting":"..."}
Only include keys where you actually extracted a value this turn. Omit keys where nothing was collected. Use null to explicitly clear a field if the client corrected themselves.`;

function buildContext(context: OnboardingContext, answers: OnboardingAnswers): Record<string, unknown> {
  const missing = ALL_FIELDS.filter((field) => !answers[field]);
  const collected = ALL_FIELDS.filter((field) => Boolean(answers[field]));
  return {
    businessName: context.businessName,
    industry: context.industry,
    statedChallenges: context.statedChallenges,
    flightPlanOffer: context.flightPlanOffer,
    existingWebsiteUrl: context.existingWebsiteUrl,
    collectedSetupFields: collected,
    missingSetupFields: missing,
    currentAnswers: answers,
    requiredFieldsComplete: REQUIRED_FIELDS.every((f) => Boolean(answers[f])),
    allFieldsComplete: ALL_FIELDS.every((f) => Boolean(answers[f])),
  };
}

function parseExtractedAnswers(text: string): OnboardingAnswers {
  const match = /NOVA_EXTRACTED_ANSWERS:\s*(\{[^\n]+\})/m.exec(text);
  if (!match) return {};
  try {
    return JSON.parse(match[1]!) as OnboardingAnswers;
  } catch {
    return {};
  }
}

function stripInternalTokens(text: string): string {
  return text
    .replace(/NOVA_EXTRACTED_ANSWERS:[^\n]*/g, "")
    .replace(/<<ONBOARDING_COMPLETE>>/g, "")
    .trim();
}

export class OnboardingConversationEngine {
  constructor(private readonly generator: NovaConversationGenerator) {}

  async respond(
    question: string,
    context: OnboardingContext,
    history: OnboardingTurn[],
    currentAnswers: OnboardingAnswers,
  ): Promise<OnboardingConversationResult> {
    const businessContext = buildContext(context, currentAnswers);
    const historyForGenerator: DiscoveryConversationTurn[] = history.map((turn) => ({
      role: turn.role === "nova" ? ("nova" as const) : ("visitor" as const),
      text: turn.text,
      at: turn.ts,
    }));

    const raw = await this.generator.generate({
      system: SYSTEM_PROMPT,
      businessContext,
      question,
      history: historyForGenerator,
    });

    const extractedAnswers = parseExtractedAnswers(raw);
    const complete = raw.includes("<<ONBOARDING_COMPLETE>>");
    const answer = stripInternalTokens(raw);

    return { answer, extractedAnswers, complete };
  }
}
