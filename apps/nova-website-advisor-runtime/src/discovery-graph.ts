import type { ServiceTier } from "./ai-employee-catalog.js";
import { ALA_CARTE_CATALOG } from "./ala-carte-catalog.js";
import type { BusinessPath, DiagnosticInput } from "./diagnostic-engine.js";

export type DiscoveryField = keyof DiagnosticInput;
export type DiscoveryAnswerType = "text" | "number" | "boolean" | "single_select" | "multi_select";

export interface DiscoveryQuestion {
  id: string;
  path: BusinessPath | "shared";
  field: DiscoveryField;
  prompt: string;
  /** Optional rotation pool. When present, resolveQuestionPrompt picks the variant at (variantIndex % prompts.length) instead of prompt. */
  prompts?: readonly string[];
  helpText?: string;
  answerType: DiscoveryAnswerType;
  required: boolean;
  options?: readonly string[];
  askWhen?: (answers: Partial<DiagnosticInput>) => boolean;
}

/** Returns the variant-resolved prompt for a question given the session's variant index. Falls back to question.prompt when no rotation pool exists. */
export function resolveQuestionPrompt(question: DiscoveryQuestion, variantIndex: number): string {
  if (!question.prompts || question.prompts.length === 0) return question.prompt;
  return question.prompts[variantIndex % question.prompts.length]!;
}

function challenges(answers: Partial<DiagnosticInput>): string { return String(answers.businessChallenges ?? "").toLowerCase(); }
function challengeMentions(answers: Partial<DiagnosticInput>, pattern: RegExp): boolean { return pattern.test(challenges(answers)); }

const sharedQuestions: DiscoveryQuestion[] = [
  {
    id: "owner-name", path: "shared", field: "ownerName",
    prompt: "What's your name, and what does your business do?",
    prompts: [
      "What's your name, and what does your business do?",
      "Who am I talking to, and what's the business called?",
      "Before we get into it — what's your name?",
    ],
    answerType: "text", required: false,
  },
  { id: "business-name", path: "shared", field: "businessName", prompt: "What should I call your business?", answerType: "text", required: false },
  {
    id: "industry", path: "shared", field: "industry",
    prompt: "What kind of business are you building or operating?",
    prompts: [
      "What does your business actually do day to day?",
      "What service or product does your business sell?",
      "What industry are you in, and roughly how long have you been running?",
      "Describe your typical customer — who do you serve?",
    ],
    answerType: "text", required: true,
  },
  {
    id: "business-challenges", path: "shared", field: "businessChallenges",
    prompt: "What's the main thing you want fixed or made easier?",
    prompts: [
      "What's costing you the most time or money right now?",
      "Where does your business feel like it's leaking — leads falling through, jobs getting delayed, admin piling up?",
      "If you could fix one thing about how your business runs today, what would it be?",
      "What part of your week feels most like putting out fires?",
      "What's stopping you from growing as fast as you'd like — is it getting customers, keeping up with demand, or managing the back office?",
      "Walk me through what happens when a new lead or customer comes in — where does it usually break down?",
    ],
    helpText: "Tell me the biggest headache or goal in your own words. I can build an initial direction from that and tighten it up afterward.", answerType: "text", required: true,
  },
  {
    id: "monthly-leads", path: "shared", field: "monthlyLeads",
    prompt: "Roughly how much customer or lead activity are we talking about?",
    prompts: [
      "How many new enquiries or jobs do you typically get in a week?",
      "Are you busier than you can handle, just keeping up, or trying to grow?",
      "On a busy week, how many customers or active jobs are you juggling at once?",
    ],
    helpText: "A daily, weekly, or monthly estimate is plenty. If volume is not relevant to the problem, tell me that instead.", answerType: "text", required: false,
  },
  { id: "manual-scheduling", path: "shared", field: "appointmentsNeedManualScheduling", prompt: "Does a person usually have to handle scheduling manually?", answerType: "boolean", required: false, askWhen: (answers) => challengeMentions(answers, /schedule|book|appointment|calendar/) },
  { id: "manual-estimate-followup", path: "shared", field: "estimatesNeedManualFollowUp", prompt: "Does someone have to remember to follow up with these leads, quotes, or customers?", answerType: "boolean", required: false, askWhen: (answers) => challengeMentions(answers, /follow.?up|quote|estimate|proposal|lead|sales/) },
  { id: "support-load", path: "shared", field: "repetitiveSupportLoad", prompt: "Would you call the repetitive customer-question load low, medium, or high?", answerType: "single_select", required: false, options: ["low", "medium", "high"], askWhen: (answers) => challengeMentions(answers, /support|question|customer|repeat|inbox|message/) },
  { id: "custom-integrations", path: "shared", field: "requestedCustomIntegrations", prompt: "Are there existing systems this would need to work with?", helpText: "You can describe them; we do not need a full technical inventory yet.", answerType: "text", required: false, askWhen: (answers) => challengeMentions(answers, /crm|system|software|app|integration|calendar|phone|website|form/) },
  { id: "voice-volume", path: "shared", field: "expectedVoiceMinutesPerMonth", prompt: "If AI helped with the phones, what kind of coverage would actually be useful?", helpText: "After-hours, overflow, weekends, or full coverage is enough for the initial plan.", answerType: "text", required: false, askWhen: (answers) => challengeMentions(answers, /call|phone|voicemail|after.?hours|weekend|answering/) || (answers.missedCallsPerMonth ?? 0) > 0 },
];

const startupQuestions: DiscoveryQuestion[] = [
  { id: "founder-admin", path: "startup", field: "founderHandlesMostAdmin", prompt: "At launch, are you expecting to handle most of this yourself, or will you have help?", answerType: "boolean", required: true },
  { id: "departments-startup", path: "startup", field: "departmentsAffected", prompt: "What other parts of the business would you eventually want help with?", helpText: "This fine-tunes the plan; it does not need to hold up an initial recommendation.", answerType: "text", required: false },
];

const existingBusinessQuestions: DiscoveryQuestion[] = [
  {
    id: "primary-workflow", path: "existing_business", field: "departmentsAffected",
    prompt: "Is this mostly one part of the business, or is the problem spilling into several areas?",
    prompts: [
      "Where specifically does the bottleneck happen — is it getting new clients, scheduling, doing the actual work, following up after, or something else?",
      "Is the problem mostly about getting more customers, or more about handling the ones you already have?",
      "What part of running the business takes time away from the work you're actually good at?",
    ],
    helpText: "A rough answer is enough for the initial Flight Plan.", answerType: "text", required: true,
  },
  { id: "missed-calls", path: "existing_business", field: "missedCallsPerMonth", prompt: "About how often are calls getting missed or delayed?", helpText: "A rough weekly pattern is enough.", answerType: "text", required: false, askWhen: (answers) => challengeMentions(answers, /call|phone|voicemail|answer|after.?hours|weekend/) },
  { id: "lead-response", path: "existing_business", field: "medianLeadResponseMinutes", prompt: "How quickly do those new inquiries usually get a response?", helpText: "Minutes, hours, or same-day is fine.", answerType: "text", required: false, askWhen: (answers) => challengeMentions(answers, /lead|response|slow|miss|sales|follow.?up/) },
  { id: "average-job-value", path: "existing_business", field: "averageJobValueUsd", prompt: "Roughly what is a new customer or job worth?", helpText: "Only needed when it helps us estimate the size of the opportunity.", answerType: "text", required: false, askWhen: (answers) => (answers.missedCallsPerMonth ?? 0) > 0 },
  { id: "close-rate", path: "existing_business", field: "closeRatePercent", prompt: "About what share of good opportunities turn into customers?", helpText: "A rough estimate is fine and can be confirmed later.", answerType: "text", required: false, askWhen: (answers) => (answers.missedCallsPerMonth ?? 0) > 0 && answers.averageJobValueUsd !== undefined },
  { id: "dormant-list", path: "existing_business", field: "dormantCustomerList", prompt: "Do you also have old leads or customers you'd eventually want to reconnect with?", answerType: "boolean", required: false, askWhen: (answers) => challengeMentions(answers, /old lead|past customer|reactivat|retention|follow.?up/) },
];

export function getDiscoveryQuestions(path: BusinessPath, answers: Partial<DiagnosticInput> = {}): DiscoveryQuestion[] {
  const withPath = { ...answers, path } as Partial<DiagnosticInput>;
  return [...sharedQuestions, ...(path === "startup" ? startupQuestions : existingBusinessQuestions)].filter((question) => !question.askWhen || question.askWhen(withPath));
}

export function getNextDiscoveryQuestion(path: BusinessPath, answers: Partial<DiagnosticInput>): DiscoveryQuestion | undefined {
  const questions = getDiscoveryQuestions(path, answers);
  return questions.find((question) => question.required && answers[question.field] === undefined)
    ?? questions.find((question) => answers[question.field] === undefined);
}

export function discoveryIsComplete(path: BusinessPath, answers: Partial<DiagnosticInput>): boolean {
  return getDiscoveryQuestions(path, answers).filter((question) => question.required).every((question) => answers[question.field] !== undefined);
}

// ---------------------------------------------------------------------------
// Tier-aware question selection. Additive: getDiscoveryQuestions above keeps
// its exact current signature and behavior for the ai_employee tier and any
// existing direct caller. GHL White Label SaaS has no bespoke question set —
// it classifies from the same shared business-identity questions below.
// ---------------------------------------------------------------------------

const identityQuestions = sharedQuestions.filter((question) =>
  question.id === "business-name" || question.id === "industry" || question.id === "business-challenges");

const websiteBuildQuestions: DiscoveryQuestion[] = [
  { id: "has-existing-website", path: "shared", field: "hasExistingWebsite", prompt: "Do you already have a website today, or would this be brand new?", answerType: "boolean", required: true },
  { id: "website-scope", path: "shared", field: "websiteScopeNeeded", prompt: "Roughly how many pages or sections do you think you'll need?", helpText: "A landing page, a multi-page site, or something with e-commerce is enough for the initial brief.", answerType: "single_select", required: true, options: ["landing_page", "multi_page", "ecommerce"] },
  { id: "website-must-haves", path: "shared", field: "websiteMustHaves", prompt: "Any must-have pages, integrations, or features I should know about?", answerType: "text", required: false },
  { id: "website-brand-assets", path: "shared", field: "hasApprovedBrandAssets", prompt: "Do you already have a logo and brand colors ready, or would Higgsfield need to help create some?", answerType: "boolean", required: false },
];

const alaCarteQuestions: DiscoveryQuestion[] = [
  { id: "ala-carte-items", path: "shared", field: "alaCarteItemsRequested", prompt: "Which of these would help most right now?", helpText: "Pick one or a few - we can add more later.", answerType: "multi_select", required: true, options: Object.keys(ALA_CARTE_CATALOG) },
  { id: "has-existing-crm", path: "shared", field: "hasExistingCrm", prompt: "Do you already have a CRM or contact/pipeline system in place?", answerType: "boolean", required: false },
];

// Tier -> bespoke question bank. A tier absent from this map has no bespoke
// bank and falls back to getDiscoveryQuestions's shared/path-based questions
// (this is how ghl_saas and ai_employee both work today). Adding a future
// tier's own question set means adding one entry here, not another branch.
const TIER_QUESTION_BANKS: Partial<Record<ServiceTier, DiscoveryQuestion[]>> = {
  website_build: [...identityQuestions, ...websiteBuildQuestions],
  ala_carte: [...identityQuestions, ...alaCarteQuestions],
};

export function tierHasBespokeQuestionBank(tier: ServiceTier): boolean {
  return tier in TIER_QUESTION_BANKS;
}

export function getDiscoveryQuestionsForTier(tier: ServiceTier, path: BusinessPath, answers: Partial<DiagnosticInput> = {}): DiscoveryQuestion[] {
  const bank = TIER_QUESTION_BANKS[tier];
  if (!bank) return getDiscoveryQuestions(path, answers);
  const withPath = { ...answers, path } as Partial<DiagnosticInput>;
  return bank.filter((question) => !question.askWhen || question.askWhen(withPath));
}

export function getNextDiscoveryQuestionForTier(tier: ServiceTier, path: BusinessPath, answers: Partial<DiagnosticInput>): DiscoveryQuestion | undefined {
  const questions = getDiscoveryQuestionsForTier(tier, path, answers);
  return questions.find((question) => question.required && answers[question.field] === undefined)
    ?? questions.find((question) => answers[question.field] === undefined);
}

export function discoveryIsCompleteForTier(tier: ServiceTier, path: BusinessPath, answers: Partial<DiagnosticInput>): boolean {
  return getDiscoveryQuestionsForTier(tier, path, answers).filter((question) => question.required).every((question) => answers[question.field] !== undefined);
}
