import type { BusinessPath, DiagnosticInput } from "./diagnostic-engine.js";

export type DiscoveryField = keyof DiagnosticInput;
export type DiscoveryAnswerType = "text" | "number" | "boolean" | "single_select" | "multi_select";

export interface DiscoveryQuestion {
  id: string;
  path: BusinessPath | "shared";
  field: DiscoveryField;
  prompt: string;
  helpText?: string;
  answerType: DiscoveryAnswerType;
  required: boolean;
  options?: readonly string[];
  askWhen?: (answers: Partial<DiagnosticInput>) => boolean;
}

function challenges(answers: Partial<DiagnosticInput>): string { return String(answers.businessChallenges ?? "").toLowerCase(); }
function challengeMentions(answers: Partial<DiagnosticInput>, pattern: RegExp): boolean { return pattern.test(challenges(answers)); }

const sharedQuestions: DiscoveryQuestion[] = [
  { id: "business-name", path: "shared", field: "businessName", prompt: "What should I call your business?", answerType: "text", required: false },
  { id: "industry", path: "shared", field: "industry", prompt: "What kind of business are you building or operating?", answerType: "text", required: true },
  { id: "business-challenges", path: "shared", field: "businessChallenges", prompt: "What's the main thing you want fixed or made easier?", helpText: "Tell me the biggest headache or goal in your own words. I can build an initial direction from that and tighten it up afterward.", answerType: "text", required: true },
  { id: "monthly-leads", path: "shared", field: "monthlyLeads", prompt: "Roughly how much customer or lead activity are we talking about?", helpText: "A daily, weekly, or monthly estimate is plenty. If volume is not relevant to the problem, tell me that instead.", answerType: "text", required: false },
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
  { id: "primary-workflow", path: "existing_business", field: "departmentsAffected", prompt: "Is this mostly one part of the business, or is the problem spilling into several areas?", helpText: "A rough answer is enough for the initial Flight Plan.", answerType: "text", required: true },
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
