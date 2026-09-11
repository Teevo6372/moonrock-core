export interface OptInGhlConfig {
  enabled: boolean;
  writesEnabled: boolean;
  locationId: string;
  accessToken: string;
  baseUrl?: string;
}

export interface OptInSubmission {
  phone: string;
  optedIn: boolean;
  firstName?: string;
  lastName?: string;
  email?: string;
  sourcePath?: string;
}

export interface OptInResult {
  status: "dry_run" | "confirmed";
  contactId?: string;
  tagsApplied: string[];
}

export class OptInBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OptInBlockedError";
  }
}

const SMS_DISCLOSURE_TEXT =
  "If you provide contact information, Moonrock may contact you by email, phone, or SMS text message regarding lead follow-up, appointment reminders, and marketing offers. Message and data rates may apply, and you may opt out of SMS at any time by replying STOP.";

export async function submitSmsOptIn(
  input: OptInSubmission,
  config: OptInGhlConfig,
  options: { apply?: boolean; fetchImpl?: typeof fetch } = {},
): Promise<OptInResult> {
  if (!config.enabled) throw new OptInBlockedError("SMS opt-in capture is disabled");
  if (!config.locationId.trim() || !config.accessToken.trim()) throw new OptInBlockedError("GHL connection details are required");
  if (!input.phone.trim()) throw new OptInBlockedError("A phone number is required");

  const tags = [input.optedIn ? "sms-opt-in" : "sms-opt-out"];
  if (!options.apply) return { status: "dry_run", tagsApplied: tags };

  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = (config.baseUrl ?? "https://services.leadconnectorhq.com").replace(/\/$/, "");
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.accessToken}`,
    Version: "v3",
  };

  const contactPayload = await postJson<{ contact?: { id?: string }; id?: string }>(
    fetchImpl,
    `${baseUrl}/contacts/upsert`,
    headers,
    {
      locationId: config.locationId,
      phone: input.phone.trim(),
      ...(input.email ? { email: input.email.trim() } : {}),
      ...(input.firstName ? { firstName: input.firstName } : {}),
      ...(input.lastName ? { lastName: input.lastName } : {}),
      source: "Moonrock Website — Standalone SMS Opt-In Page",
    },
    "sms opt-in contact upsert",
  );
  const contactId = contactPayload.contact?.id ?? contactPayload.id;
  if (!contactId) throw new Error("HighLevel contact upsert succeeded without returning a contact ID");

  await postJson<unknown>(fetchImpl, `${baseUrl}/contacts/${encodeURIComponent(contactId)}/tags`, headers, { tags }, "sms opt-in tag write");

  const note = [
    input.optedIn ? "SMS OPT-IN RECORDED" : "SMS OPT-OUT RECORDED",
    `Recorded: ${new Date().toISOString()}`,
    `Source page: ${input.sourcePath ?? "/opt-in"}`,
    `Disclosure shown to visitor: ${SMS_DISCLOSURE_TEXT}`,
  ].join("\n");
  await postJson<unknown>(fetchImpl, `${baseUrl}/contacts/${encodeURIComponent(contactId)}/notes`, headers, { body: note }, "sms opt-in note write");

  return { status: "confirmed", contactId, tagsApplied: tags };
}

async function postJson<T>(fetchImpl: typeof fetch, url: string, headers: Record<string, string>, body: unknown, label: string): Promise<T> {
  const response = await fetchImpl(url, { method: "POST", headers, body: JSON.stringify(body) });
  const text = await response.text();
  if (!response.ok) throw new Error(`HighLevel ${label} failed (${response.status}): ${text}`);
  return text ? (JSON.parse(text) as T) : ({} as T);
}
