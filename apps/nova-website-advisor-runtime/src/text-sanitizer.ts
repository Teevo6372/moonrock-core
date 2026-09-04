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
