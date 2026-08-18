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

export interface NormalizedDiscoveryAnswer {
  value: unknown;
  interpreted: boolean;
  note?: string;
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

export function normalizeDiscoveryAnswer(field: keyof DiagnosticInput, raw: unknown): NormalizedDiscoveryAnswer {
  if (!NUMERIC_FIELDS.has(field) || typeof raw !== "string") return { value: raw, interpreted: false };
  const text = raw.trim();
  if (!text) return { value: raw, interpreted: false };

  let number = field === "closeRatePercent" ? fractionPercent(text) ?? firstNumber(text) : firstNumber(text);

  if (number === undefined) {
    const qualitative: Partial<Record<keyof DiagnosticInput, number>> = {
      requestedCustomIntegrations: /none|no other|nothing custom/i.test(text) ? 0 : undefined,
      departmentsAffected: /one|single|just one/i.test(text) ? 1 : undefined,
      expectedVoiceMinutesPerMonth: /not sure|unknown|no idea/i.test(text) ? 0 : undefined,
    };
    number = qualitative[field];
  }

  if (number === undefined || !Number.isFinite(number)) {
    return { value: 0, interpreted: true, note: `No reliable numeric estimate was found in: ${text}` };
  }

  if (field === "expectedVoiceMinutesPerMonth") number = voiceToMinutes(text, number);
  if (field === "medianLeadResponseMinutes") number = timeToMinutes(text, number);
  if (field === "monthlyLeads" || field === "missedCallsPerMonth") number = cadenceToMonthly(text, number);
  if (field === "closeRatePercent") number = Math.max(0, Math.min(100, number));

  return {
    value: Math.max(0, Math.round(number * 100) / 100),
    interpreted: true,
    note: text,
  };
}
