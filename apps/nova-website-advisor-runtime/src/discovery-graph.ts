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

const sharedQuestions: DiscoveryQuestion[] = [
  {
    id: "business-name",
    path: "shared",
    field: "businessName",
    prompt: "What should I call your business?",
    answerType: "text",
    required: false,
  },
  {
    id: "industry",
    path: "shared",
    field: "industry",
    prompt: "What kind of business are you building or operating?",
    answerType: "text",
    required: true,
  },
  {
    id: "monthly-leads",
    path: "shared",
    field: "monthlyLeads",
    prompt: "About how many new leads or customer inquiries do you receive in a typical month?",
    helpText: "An estimate is fine.",
    answerType: "number",
    required: false,
  },
  {
    id: "manual-scheduling",
    path: "shared",
    field: "appointmentsNeedManualScheduling",
    prompt: "Does a person usually have to handle scheduling manually?",
    answerType: "boolean",
    required: true,
  },
  {
    id: "manual-estimate-followup",
    path: "shared",
    field: "estimatesNeedManualFollowUp",
    prompt: "Do estimates, proposals, or qualified leads depend on someone remembering to follow up?",
    answerType: "boolean",
    required: true,
  },
  {
    id: "support-load",
    path: "shared",
    field: "repetitiveSupportLoad",
    prompt: "How much staff time goes to repetitive customer questions?",
    answerType: "single_select",
    required: true,
    options: ["low", "medium", "high"],
  },
  {
    id: "review-process",
    path: "shared",
    field: "reviewRequestProcess",
    prompt: "How are customer reviews requested today?",
    answerType: "single_select",
    required: true,
    options: ["none", "manual", "automated"],
  },
  {
    id: "custom-integrations",
    path: "shared",
    field: "requestedCustomIntegrations",
    prompt: "How many custom systems or APIs would this likely need to connect to?",
    answerType: "number",
    required: false,
  },
  {
    id: "voice-volume",
    path: "shared",
    field: "expectedVoiceMinutesPerMonth",
    prompt: "If you expect AI phone handling, roughly how many call minutes per month would you expect?",
    answerType: "number",
    required: false,
  },
];

const startupQuestions: DiscoveryQuestion[] = [
  {
    id: "founder-admin",
    path: "startup",
    field: "founderHandlesMostAdmin",
    prompt: "At launch, will you personally be handling most calls, scheduling, follow-up, and customer administration?",
    answerType: "boolean",
    required: true,
  },
  {
    id: "departments-startup",
    path: "startup",
    field: "departmentsAffected",
    prompt: "How many business functions do you expect AI to help with at launch?",
    helpText: "Examples: customer calls, sales, scheduling, support, follow-up, marketing.",
    answerType: "number",
    required: false,
  },
];

const existingBusinessQuestions: DiscoveryQuestion[] = [
  {
    id: "missed-calls",
    path: "existing_business",
    field: "missedCallsPerMonth",
    prompt: "About how many customer calls do you think go unanswered or get a delayed response each month?",
    answerType: "number",
    required: false,
  },
  {
    id: "lead-response",
    path: "existing_business",
    field: "medianLeadResponseMinutes",
    prompt: "How long does it usually take to respond to a new lead?",
    helpText: "Answer in minutes. An estimate is fine.",
    answerType: "number",
    required: false,
  },
  {
    id: "average-job-value",
    path: "existing_business",
    field: "averageJobValueUsd",
    prompt: "What is an average new job or sale worth?",
    answerType: "number",
    required: false,
    askWhen: (answers) => (answers.missedCallsPerMonth ?? 0) > 0,
  },
  {
    id: "close-rate",
    path: "existing_business",
    field: "closeRatePercent",
    prompt: "Roughly what percentage of qualified opportunities become customers?",
    answerType: "number",
    required: false,
    askWhen: (answers) => (answers.missedCallsPerMonth ?? 0) > 0,
  },
  {
    id: "dormant-list",
    path: "existing_business",
    field: "dormantCustomerList",
    prompt: "Do you have old leads or past customers who are not being followed up with consistently?",
    answerType: "boolean",
    required: true,
  },
  {
    id: "departments-existing",
    path: "existing_business",
    field: "departmentsAffected",
    prompt: "How many parts of the business appear affected by the bottlenecks you've described?",
    answerType: "number",
    required: false,
  },
];

export function getDiscoveryQuestions(path: BusinessPath, answers: Partial<DiagnosticInput> = {}): DiscoveryQuestion[] {
  return [...sharedQuestions, ...(path === "startup" ? startupQuestions : existingBusinessQuestions)]
    .filter((question) => !question.askWhen || question.askWhen(answers));
}

export function getNextDiscoveryQuestion(
  path: BusinessPath,
  answers: Partial<DiagnosticInput>,
): DiscoveryQuestion | undefined {
  return getDiscoveryQuestions(path, answers).find((question) => answers[question.field] === undefined);
}

export function discoveryIsComplete(path: BusinessPath, answers: Partial<DiagnosticInput>): boolean {
  return getDiscoveryQuestions(path, answers)
    .filter((question) => question.required)
    .every((question) => answers[question.field] !== undefined);
}
