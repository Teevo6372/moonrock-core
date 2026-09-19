const FETCH_TIMEOUT_MS = 8000;
const MAX_CONTENT_CHARS = 3000;
const MAX_COLORS = 6;

function normalizeUrl(raw: string): URL | undefined {
  const trimmed = raw.trim();
  try { return new URL(trimmed); } catch { /* fall through */ }
  try { return new URL(`https://${trimmed}`); } catch { return undefined; }
}

function extractColors(html: string): string[] {
  const seen = new Set<string>();
  const results: string[] = [];
  const re = /(?:color|background(?:-color)?)\s*:\s*(#[0-9a-f]{3,8})\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null && results.length < MAX_COLORS) {
    const c = m[1]!.toLowerCase();
    if (!seen.has(c)) { seen.add(c); results.push(c); }
  }
  return results;
}

function extractMeta(html: string, name: string): string {
  return (
    html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"))?.[1] ??
    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, "i"))?.[1] ??
    ""
  ).trim();
}

function htmlToText(html: string): string {
  return html
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_CONTENT_CHARS);
}

/**
 * Fetches a business website and returns a structured text summary for the
 * Nova conversation engine. Returns undefined on any error so callers can
 * degrade gracefully without disrupting the discovery flow.
 *
 * Extracts: page title, meta description, theme-color, hex brand colors from
 * CSS/inline styles, and the first ~3 KB of visible body text.
 */
export async function fetchWebsiteContext(rawUrl: string): Promise<string | undefined> {
  const url = normalizeUrl(rawUrl);
  if (!url || (url.protocol !== "http:" && url.protocol !== "https:")) return undefined;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let html: string;
  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MoonrockAdvisorBot/1.0)" },
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!response.ok) return undefined;
    if (!(response.headers.get("content-type") ?? "").includes("html")) return undefined;
    html = await response.text();
  } catch {
    clearTimeout(timer);
    return undefined;
  }

  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? "";
  const description = extractMeta(html, "description");
  const themeColor = extractMeta(html, "theme-color");
  const colors = extractColors(html);
  const bodyText = htmlToText(html);

  const parts: string[] = [`Website: ${url.hostname}`];
  if (title) parts.push(`Title: ${title}`);
  if (description) parts.push(`Description: ${description}`);
  if (themeColor) parts.push(`Theme color: ${themeColor}`);
  if (colors.length > 0) parts.push(`Brand colors (from CSS): ${colors.join(", ")}`);
  if (bodyText) parts.push(`Page content:\n${bodyText}`);

  return parts.join("\n");
}

/**
 * Normalises a raw user-typed URL: trims whitespace, prepends https:// when
 * no protocol is present, and returns undefined for anything that doesn't
 * resolve to a valid http/https URL.
 */
export function normalizeWebsiteUrl(raw: string): string | undefined {
  const url = normalizeUrl(raw);
  if (!url || (url.protocol !== "http:" && url.protocol !== "https:")) return undefined;
  return url.toString();
}
