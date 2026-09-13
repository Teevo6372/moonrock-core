const MAX_NAME_LENGTH = 40;
const MAX_NAME_WORDS = 4;

/**
 * Rejects free text masquerading as a name - a question, a sentence, or
 * anything else someone typed into the wrong box. Deliberately permissive on
 * real names (hyphens, apostrophes, accented characters, multi-word names)
 * since a false rejection costs more than a false accept: this only needs to
 * catch the obvious case (punctuation, sentence length), not validate that a
 * string is a "real" name.
 */
export function isPlausibleName(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.length > MAX_NAME_LENGTH) return false;
  if (/[?!.,;:]/.test(trimmed)) return false;
  if (trimmed.split(/\s+/).length > MAX_NAME_WORDS) return false;
  return true;
}
