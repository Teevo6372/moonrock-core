import { AI_EMPLOYEE_CATALOG, GHL_SAAS_CATALOG, WEBSITE_BUILD_CATALOG } from "./ai-employee-catalog.js";
import { ALA_CARTE_CATALOG } from "./ala-carte-catalog.js";

const ALL_CATALOG_OFFER_NAMES: readonly string[] = [
  ...Object.values(AI_EMPLOYEE_CATALOG).map((offer) => offer.name),
  ...Object.values(WEBSITE_BUILD_CATALOG).map((offer) => offer.name),
  ...Object.values(GHL_SAAS_CATALOG).map((offer) => offer.name),
  ...Object.values(ALA_CARTE_CATALOG).map((offer) => offer.name),
];

const DOLLAR_AMOUNT_PATTERN = /\$\s*\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?/g;

/**
 * Reduces a matched "$1,499.00"-shaped substring to the bare numeric string
 * ("1499") that would actually appear in a JSON-stringified tool result -
 * catalog prices are plain integers with no currency symbol, grouping, or
 * forced decimals, so comparing against the raw "$"-prefixed text would never
 * match even when the amount is perfectly correct.
 */
function bareNumeral(amount: string): string {
  const digits = amount.replace(/[^0-9.]/g, "");
  return String(Number(digits));
}

function containsWholeWordOrPhrase(text: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

/**
 * Log-only guardrail (never blocks a reply): flags any dollar amount or
 * catalog offer name in Claude's final reply that isn't traceable to a tool
 * result returned in the same turn. Exact/substring matching, not fuzzy -
 * fuzzy matching against short catalog names risks false positives on
 * ordinary conversational language, and over-triggering here only produces
 * log noise, not a broken conversation.
 */
export function verifyPriceProvenance(finalText: string, toolResultsThisTurn: readonly unknown[]): string[] {
  const violations: string[] = [];
  const resultsAsText = toolResultsThisTurn.map((result) => JSON.stringify(result)).join("\n");

  const dollarAmounts = finalText.match(DOLLAR_AMOUNT_PATTERN) ?? [];
  for (const amount of dollarAmounts) {
    if (!resultsAsText.includes(bareNumeral(amount))) {
      violations.push(`Dollar amount "${amount}" not found in any tool result this turn`);
    }
  }

  for (const name of ALL_CATALOG_OFFER_NAMES) {
    if (containsWholeWordOrPhrase(finalText, name) && !resultsAsText.toLowerCase().includes(name.toLowerCase())) {
      violations.push(`Offer/catalog name "${name}" mentioned but not present in any tool result this turn`);
    }
  }

  return violations;
}
