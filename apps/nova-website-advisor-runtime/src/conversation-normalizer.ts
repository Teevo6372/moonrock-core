import type { DiagnosticInput } from "./diagnostic-engine.js";

const NUMERIC_FIELDS = new Set<keyof DiagnosticInput>([
  "monthlyLeads",
  "missedCallsPerMonth",
  "averageJobValueUsd",
  "closeRatePercent",
  "medianLeadResponseMinutes",
  "departmentsAffected",
  "requestedCustomIntegrations",
  "expectedVoiceMinutesPerMonth",
]);

const BOOLEAN_FIELDS = new Set<keyof DiagnosticInput>([
  "appointmentsNeedManualScheduling",
  "estimatesNeedManualFollowUp",
  "dormantCustomerList",
  "founderHandlesMostAdmin",
  "hasExistingWebsite",
  "hasApprovedBrandAssets",
]);

export type ExpectedAnswerKind =
  | { type: "boolean" }
  | { type: "number" }
  | { type: "select"; options: string[] };

export interface NormalizedDiscoveryAnswer {
  value: unknown;
  interpreted: boolean;
  note?: string;
  needsClarification?: boolean;
  clarification?: string;
  expectedKind?: ExpectedAnswerKind;
}

function firstNumber(text: string): number | undefined {
  const range = text.match(/(-?\d+(?:\.\d+)?)\s*(?:-|to|–)\s*(-?\d+(?:\.\d+)?)/i);
  if (range) return (Number(range[1]) + Number(range[2])) / 2;
  const match = text.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : undefined;
}

function fractionPercent(text: string): number | undefined {
  const fraction = text.match(/(?:about\s+)?(\d+)\s+(?:out of|of)\s+(\d+)/i);
  if (!fraction) return undefined;
  const numerator = Number(fraction[1]);
  const denominator = Number(fraction[2]);
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : undefined;
}

function timeToMinutes(text: string, number: number): number {
  if (/\bhours?\b|\bhrs?\b/i.test(text)) return number * 60;
  if (/\bdays?\b/i.test(text)) return number * 1440;
  return number;
}

function voiceToMinutes(text: string, number: number): number {
  if (/\bhours?\b|\bhrs?\b/i.test(text)) return number * 60;
  return number;
}

function cadenceToMonthly(text: string, number: number): number {
  if (/\bper day\b|\ba day\b|\bdaily\b/i.test(text)) return Math.round(number * 30);
  if (/\bper week\b|\ba week\b|\bweekly\b/i.test(text)) return Math.round(number * 4.33);
  return number;
}

function booleanFromText(text: string): boolean | undefined {
  if (/\b(no|nope|not really|never|already automated|doesn't|does not|don't|do not)\b/i.test(text)) return false;
  if (/\b(yes|yeah|yep|usually|mostly|manual|someone|person|we do|i do|depends on me|depends on us|i'?ll handle|i will handle|i'?m handling|i handle|on me|myself|my responsibility|falls? on me|handle (it|most|that|those|these|this|everything))\b/i.test(text)) return true;
  return undefined;
}

function countNamedAreas(text: string): number | undefined {
  const areas = ["sales", "support", "customer service", "operations", "admin", "marketing", "phones", "phone", "scheduling", "billing", "service", "dispatch", "follow-up", "follow up"];
  const matches = areas.filter((area) => text.toLowerCase().includes(area));
  const unique = new Set(matches.map((item) => item === "phone" ? "phones" : item === "follow up" ? "follow-up" : item));
  return unique.size > 0 ? unique.size : undefined;
}

function clarificationFor(field: keyof DiagnosticInput): string {
  const prompts: Partial<Record<keyof DiagnosticInput, string>> = {
    appointmentsNeedManualScheduling: "On the scheduling piece specifically: does a person usually have to step in to finish the booking, or is that mostly handled without someone touching it?",
    estimatesNeedManualFollowUp: "For quotes and qualified leads specifically: does somebody usually have to remember the follow-up, or is that already handled consistently without manual effort?",
    dormantCustomerList: "On old leads and past customers specifically: do you have a list you could realistically follow up with, or not really?",
    founderHandlesMostAdmin: "At launch specifically: will most calls, scheduling, follow-up, and customer admin land on you, or will someone else already own a good share of that?",
    hasExistingWebsite: "Just to confirm: do you already have a website live today, or would this be a brand new site?",
    hasApprovedBrandAssets: "On brand assets specifically: do you already have an approved logo and colors ready to use, or would that need to be created?",
    monthlyLeads: "No problem—give me a rough range instead. Are we talking a handful of inquiries a month, a few dozen, or hundreds?",
    missedCallsPerMonth: "A rough pattern is enough. On a typical week, would you say you miss none, a couple, or quite a few calls?",
    averageJobValueUsd: "An estimate is fine. What would you call a typical sale or job—hundreds, a few thousand, or more?",
    closeRatePercent: "You don’t need an exact percentage. Out of ten qualified opportunities you talk to, about how many usually become customers?",
    medianLeadResponseMinutes: "Think about a normal lead. Is the first real response usually within minutes, within an hour, later that day, or longer?",
    departmentsAffected: "Just name the parts of the business that feel connected—sales, phones, scheduling, support, admin, operations, or whatever fits—and I’ll count the scope from there.",
    requestedCustomIntegrations: "That’s okay. Which systems would need to exchange information—CRM, calendar, phones, website forms, billing, or something else?",
    expectedVoiceMinutesPerMonth: "You don’t need a minutes estimate yet. Tell me the coverage you want—after-hours, weekends, overflow, or full-time—and I’ll keep the exact usage as something to confirm later.",
  };
  return prompts[field] ?? "I want to tie that back to the question I just asked. Give me the closest practical answer and I’ll keep any uncertainty in the Flight Plan.";
}

function qualitativeNumber(field: keyof DiagnosticInput, text: string): number | undefined {
  if (field === "requestedCustomIntegrations" && /none|no other|nothing custom/i.test(text)) return 0;
  if (field === "departmentsAffected" && /one|single|just one/i.test(text)) return 1;
  if (field === "expectedVoiceMinutesPerMonth" && /not sure|unknown|no idea/i.test(text)) return 0;
  return undefined;
}

export function normalizeDiscoveryAnswer(field: keyof DiagnosticInput, raw: unknown): NormalizedDiscoveryAnswer {
  if (typeof raw !== "string") return { value: raw, interpreted: false };
  const text = raw.trim();
  if (!text) return { value: raw, interpreted: false };

  if (BOOLEAN_FIELDS.has(field)) {
    const value = booleanFromText(text);
    return value === undefined
      ? { value: raw, interpreted: false, needsClarification: true, clarification: clarificationFor(field), expectedKind: { type: "boolean" } }
      : { value, interpreted: true, note: text };
  }

  if (field === "websiteScopeNeeded") {
    const options = ["landing_page", "multi_page", "ecommerce"];
    const value = /e.?commerce|online store|sell (products|stuff|items)|shopping cart|checkout/i.test(text)
      ? "ecommerce"
      : /landing page|single page|one.?pager|just one page/i.test(text)
        ? "landing_page"
        : /multi.?page|several pages|\d+\s*(to|-|–)\s*\d+\s*pages?|\bpages?\b/i.test(text)
          ? "multi_page"
          : undefined;
    return value
      ? { value, interpreted: true, note: text }
      : { value: raw, interpreted: false, needsClarification: true, clarification: "Roughly how many pages or sections are we talking about — a single landing page, a handful of pages, or something with online sales/checkout?", expectedKind: { type: "select", options } };
  }

  if (field === "repetitiveSupportLoad") {
    const options = ["low", "medium", "high"];
    const value = /high|a lot|constant|tons?|heavy|all day|too much/i.test(text)
      ? "high"
      : /medium|some|sometimes|moderate|fair amount/i.test(text)
        ? "medium"
        : /low|little|not much|rare|hardly/i.test(text)
          ? "low"
          : undefined;
    return value
      ? { value, interpreted: true, note: text }
      : { value: raw, interpreted: false, needsClarification: true, clarification: "On the repetitive-question piece specifically, would you call it a small amount, a noticeable amount, or a pretty heavy load?", expectedKind: { type: "select", options } };
  }

  if (field === "reviewRequestProcess") {
    const options = ["none", "manual", "automated"];
    const value = /automat|system|workflow|trigger/i.test(text)
      ? "automated"
      : /manual|ask them|we ask|person|remember/i.test(text)
        ? "manual"
        : /none|don't ask|do not ask|no process|never/i.test(text)
          ? "none"
          : undefined;
    return value
      ? { value, interpreted: true, note: text }
      : { value: raw, interpreted: false, needsClarification: true, clarification: "On review requests specifically, is that happening automatically, manually when somebody remembers, or not consistently yet?", expectedKind: { type: "select", options } };
  }

  if (!NUMERIC_FIELDS.has(field)) return { value: raw, interpreted: false };

  let number = field === "closeRatePercent" ? fractionPercent(text) ?? firstNumber(text) : firstNumber(text);
  if (number === undefined && field === "departmentsAffected") number = countNamedAreas(text);
  if (number === undefined) number = qualitativeNumber(field, text);

  if (number === undefined || !Number.isFinite(number)) {
    return {
      value: raw,
      interpreted: false,
      note: text,
      needsClarification: true,
      clarification: clarificationFor(field),
      expectedKind: { type: "number" },
    };
  }
  if (field === "expectedVoiceMinutesPerMonth") number = voiceToMinutes(text, number);
  if (field === "medianLeadResponseMinutes") number = timeToMinutes(text, number);
  if (field === "monthlyLeads" || field === "missedCallsPerMonth") number = cadenceToMonthly(text, number);
  if (field === "closeRatePercent") number = Math.max(0, Math.min(100, number));

  return { value: Math.max(0, Math.round(number * 100) / 100), interpreted: true, note: text };
}
