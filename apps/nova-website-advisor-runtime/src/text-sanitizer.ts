/**
 * Defensive cleanup for LLM-generated chat text rendered as plain textContent
 * on the frontend (no Markdown rendering). The system prompt already
 * instructs the model not to use Markdown; this is a safety net for when it
 * slips anyway, so a visitor never sees raw **, ---, ***, or list syntax.
 */
export function stripMarkdownArtifacts(text: string): string {
  return text
    .replace(/^[ \t]*([-*_])\1{2,}[ \t]*$/gm, "")
    .replace(/^#{1,6}[ \t]+/gm, "")
    .replace(/\*\*\*(.+?)\*\*\*/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/^[ \t]*[-*+][ \t]+/gm, "• ")
    .replace(/^[ \t]*\d+\.[ \t]+/gm, "")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Safety net for when the model hits the completion token budget mid-sentence.
 * Rather than showing a visitor a reply that stops in the middle of a word or
 * clause, drop back to the last complete sentence. If the whole answer is one
 * incomplete sentence, return it unchanged - a truncated-but-present answer
 * beats an empty one.
 */
export function truncateToLastCompleteSentence(text: string): string {
  const trimmed = text.trim();
  if (/[.!?]["')\]]?$/.test(trimmed)) return trimmed;
  const lastBoundary = Math.max(trimmed.lastIndexOf(". "), trimmed.lastIndexOf("! "), trimmed.lastIndexOf("? "), trimmed.lastIndexOf(".\n"), trimmed.lastIndexOf("!\n"), trimmed.lastIndexOf("?\n"));
  if (lastBoundary === -1) return trimmed;
  const complete = trimmed.slice(0, lastBoundary + 1).trim();
  return complete || trimmed;
}

// Known third-party platforms/tools/integrations the system prompt already
// instructs Nova never to name (only Moonrock's own approved catalog may be
// named) - grouped by the categories that prompt explicitly calls out
// (e-commerce, CRM, payment processor, etc.) plus the underlying GHL/
// HighLevel platform, which must stay invisible per the white-label rule.
const DISALLOWED_THIRD_PARTY_NAMES = [
  "Stripe", "PayPal", "Square", "Venmo", "Zelle",
  "Shopify", "WooCommerce", "BigCommerce", "Wix", "Squarespace",
  "HubSpot", "Salesforce", "Zoho",
  "GoHighLevel", "HighLevel", "GHL",
  "Calendly", "Acuity",
  "CallRail",
  "Mailchimp", "Constant Contact", "ActiveCampaign", "Keap",
  "ClickFunnels", "Leadpages",
  "DocuSign", "HelloSign",
  "Yext", "BrightLocal",
  "Jasper", "Drift", "Intercom", "Zendesk",
  "Kajabi", "Teachable", "Thinkific",
  "Skool", "Circle",
  "Podium", "Birdeye",
  "Jotform", "Typeform",
  "Skipio",
  "QuickBooks", "Xero",
  "Twilio",
] as const;

function buildWordBoundaryPattern(names: readonly string[]): RegExp {
  const escaped = names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`\\b(?:${escaped.join("|")})\\b`, "i");
}

const THIRD_PARTY_NAME_PATTERN = buildWordBoundaryPattern(DISALLOWED_THIRD_PARTY_NAMES);

/**
 * Defensive safety net for when the model names a specific third-party
 * platform/tool/integration despite the system prompt's explicit instruction
 * not to. Strips the smallest enclosing clause naming the disallowed brand -
 * a parenthetical aside, a trailing "like/such as/e.g." example clause, or
 * as a last resort the bare word itself - rather than blocking the whole
 * reply, since in practice these mentions are almost always a non-essential
 * example the model added on its own.
 */
export function stripDisallowedThirdPartyMentions(text: string): string {
  if (!THIRD_PARTY_NAME_PATTERN.test(text)) return text;

  return text
    // "(like Stripe or PayPal)" - drop the whole parenthetical.
    .replace(/\s*\([^()]*\)/g, (match) => (THIRD_PARTY_NAME_PATTERN.test(match) ? "" : match))
    // "..., like/such as/e.g. Stripe" - drop from the keyword up to (but not
    // consuming) the next sentence boundary, so terminal punctuation survives.
    .replace(/,?\s*\b(?:like|such as|e\.g\.,?|for example,?)\b[^.,!?]*(?=[.,!?]|$)/gi, (match) => (THIRD_PARTY_NAME_PATTERN.test(match) ? "" : match))
    // Last resort: remove any remaining bare mention.
    .replace(new RegExp(THIRD_PARTY_NAME_PATTERN.source, "gi"), "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;!?])/g, "$1")
    .trim();
}
