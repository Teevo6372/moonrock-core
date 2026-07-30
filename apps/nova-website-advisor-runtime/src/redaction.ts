const patterns: ReadonlyArray<[RegExp, string]> = [
  [/\b(?:\d[ -]*?){13,19}\b/g, "[REDACTED_PAYMENT_CARD]"],
  [/\b\d{3}-\d{2}-\d{4}\b/g, "[REDACTED_GOVERNMENT_ID]"],
  [
    /\b(?:password|passwd|api[_ -]?key|access[_ -]?token)\s*[:=]\s*\S+/gi,
    "[REDACTED_SECRET]",
  ],
  [/\b\d{6}\b(?=\s*(?:is|was)?\s*(?:my\s*)?(?:code|otp|pin))/gi, "[REDACTED_CODE]"],
];

export interface RedactionResult {
  text: string;
  redacted: boolean;
  labels: string[];
}

export function redactSensitiveText(input: string): RedactionResult {
  let text = input;
  const labels = new Set<string>();
  for (const [pattern, replacement] of patterns) {
    if (pattern.test(text)) {
      labels.add(replacement.slice(1, -1));
      pattern.lastIndex = 0;
      text = text.replace(pattern, replacement);
    }
    pattern.lastIndex = 0;
  }
  return { text, redacted: labels.size > 0, labels: [...labels] };
}

