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
