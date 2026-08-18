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

function challenges(answers: Partial<DiagnosticInput>): string {
  return String(answers.businessChallenges ?? "").toLowerCase();
}

function challengeMentions(answers: Partial<DiagnosticInput>, pattern: RegExp): boolean {
  return pattern.test(challenges(answers));
}

const sharedQuestions: DiscoveryQuestion[] = [
  { id: "business-name", path: "shared", field: "businessName", prompt: "What should I call your business?", answerType: "text", required: false },
  { id: "industry", path: "shared", field: "industry", prompt: "What kind of business are you building or operating?", answerType: "text", required: true },
  {
    id: "business-challenges",
    path: "shared",
    field: "businessChallenges",
    prompt: "What feels harder than it should right now?",
    helpText: "Tell me in your own words—missed opportunities, repetitive work, slow follow-up, staffing pressure, launch uncertainty, or anything else that is getting in the way.",
    answerType: "text",
    required: true,
  },
  {
    id: "monthly-leads", path: "shared", field: "monthlyLeads",
    prompt: "About how many new leads or customer inquiries do you receive in a typical month?",
    helpText: "Answer naturally. A rough number, range, daily estimate, or 'I'm not sure' with context is fine.", answerType: "text", required: false,
  },
  {
    id: "manual-scheduling", path: "shared", field: "appointmentsNeedManualScheduling",
    prompt: "Does a person usually have to handle scheduling manually?", answerType: "boolean", required: true,
    askWhen: (answers) => answers.path === "existing_business" || challengeMentions(answers, /schedule|book|appointment|calendar|customer admin/),
  },
  {
    id: "manual-estimate-followup", path: "shared", field: "estimatesNeedManualFollowUp",
    prompt: "Do estimates, proposals, or qualified leads depend on someone remembering to follow up?", answerType: "boolean", required: true,
    askWhen: (answers) => answers.path === "existing_business" || challengeMentions(answers, /follow.?up|quote|estimate|proposal|lead|sales/),
  },
  {
    id: "support-load", path: "shared", field: "repetitiveSupportLoad",
    prompt: "How much staff time goes to repetitive customer questions?", answerType: "single_select", required: true, options: ["low", "medium", "high"],
    askWhen: (answers) => answers.path === "existing_business" || challengeMentions(answers, /support|question|customer|repeat|inbox|message/),
  },
  {
    id: "review-process", path: "shared", field: "reviewRequestProcess",
    prompt: "How are customer reviews requested today?", answerType: "single_select", required: false, options: ["none", "manual", "automated"],
    askWhen: (answers) => answers.path === "existing_business" && (challengeMentions(answers, /review|reputation|google|visibility/) || (answers.monthlyLeads ?? 0) >= 10),
  },
  {
    id: "custom-integrations", path: "shared", field: "requestedCustomIntegrations",
    prompt: "How many systems or apps would this likely need to connect to?",
    helpText: "You can name the systems or describe the setup if a number is not obvious.", answerType: "text", required: false,
    askWhen: (answers) => challengeMentions(answers, /crm|system|software|app|integration|calendar|phone|website|form/) || (answers.departmentsAffected ?? 0) >= 3,
  },
  {
    id: "voice-volume", path: "shared", field: "expectedVoiceMinutesPerMonth",
    prompt: "If AI helped with the phones, what kind of coverage would actually be useful?",
    helpText: "Tell me the situation in plain English—after-hours, weekends, overflow, full-time coverage, or an estimate in minutes/hours if you have one.", answerType: "text", required: false,
    askWhen: (answers) => challengeMentions(answers, /call|phone|voicemail|after.?hours|weekend|answering/) || (answers.missedCallsPerMonth ?? 0) > 0,
  },
];

const startupQuestions: DiscoveryQuestion[] = [
  { id: "founder-admin", path: "startup", field: "founderHandlesMostAdmin", prompt: "At launch, will you personally be handling most calls, scheduling, follow-up, and customer administration?", answerType: "boolean", required: true },
  {
    id: "departments-startup", path: "startup", field: "departmentsAffected",
    prompt: "How many parts of the business do you expect AI to help with at launch?",
    helpText: "You can give me a number or just describe the work you expect help with.", answerType: "text", required: false,
  },
];

const existingBusinessQuestions: DiscoveryQuestion[] = [
  {
    id: "missed-calls", path: "existing_business", field: "missedCallsPerMonth",
    prompt: "About how many customer calls go unanswered or get a delayed response each month?",
    helpText: "A rough estimate, weekly pattern, or description is fine.", answerType: "text", required: false,
    askWhen: (answers) => challengeMentions(answers, /call|phone|voicemail|answer|after.?hours|weekend/) || (answers.monthlyLeads ?? 0) >= 20,
  },
  {
    id: "lead-response", path: "existing_business", field: "medianLeadResponseMinutes",
    prompt: "How long does it usually take to respond to a new lead?",
    helpText: "You can answer in minutes, hours, 'same day,' or describe what normally happens.", answerType: "text", required: false,
    askWhen: (answers) => challengeMentions(answers, /lead|response|slow|miss|sales|follow.?up/) || (answers.monthlyLeads ?? 0) >= 10,
  },
  {
    id: "average-job-value", path: "existing_business", field: "averageJobValueUsd",
    prompt: "What is an average new job or sale worth?", helpText: "A range or rough estimate is fine.", answerType: "text", required: false,
    askWhen: (answers) => (answers.missedCallsPerMonth ?? 0) > 0 || (answers.medianLeadResponseMinutes ?? 0) > 30,
  },
  {
    id: "close-rate", path: "existing_business", field: "closeRatePercent",
    prompt: "Roughly what share of qualified opportunities become customers?",
    helpText: "A percentage, 'one out of three,' or a rough description is fine.", answerType: "text", required: false,
    askWhen: (answers) => ((answers.missedCallsPerMonth ?? 0) > 0 || (answers.medianLeadResponseMinutes ?? 0) > 30) && answers.averageJobValueUsd !== undefined,
  },
  {
    id: "departments-existing", path: "existing_business", field: "departmentsAffected",
    prompt: "How many parts of the business appear affected by the bottlenecks you've described?",
    helpText: "A number is fine, but you can also just tell me which parts feel connected.", answerType: "text", required: false,
    askWhen: (answers) => challengeMentions(answers, /multiple|everything|sales|support|operations|admin|marketing|phone|scheduling/) || Object.keys(answers).length >= 7,
  },
  {
    id: "dormant-list", path: "existing_business", field: "dormantCustomerList",
    prompt: "One last check: do you have old leads or past customers sitting there without consistent follow-up?",
    helpText: "A simple yes/no is fine, or tell me what that list looks like if there is more context.",
    answerType: "boolean",
    required: true,
  },
];

export function getDiscoveryQuestions(path: BusinessPath, answers: Partial<DiagnosticInput> = {}): DiscoveryQuestion[] {
  const withPath = { ...answers, path } as Partial<DiagnosticInput>;
  return [...sharedQuestions, ...(path === "startup" ? startupQuestions : existingBusinessQuestions)]
    .filter((question) => !question.askWhen || question.askWhen(withPath));
}

export function getNextDiscoveryQuestion(path: BusinessPath, answers: Partial<DiagnosticInput>): DiscoveryQuestion | undefined {
  return getDiscoveryQuestions(path, answers).find((question) => answers[question.field] === undefined);
}

export function discoveryIsComplete(path: BusinessPath, answers: Partial<DiagnosticInput>): boolean {
  return getDiscoveryQuestions(path, answers).filter((question) => question.required).every((question) => answers[question.field] !== undefined);
}
