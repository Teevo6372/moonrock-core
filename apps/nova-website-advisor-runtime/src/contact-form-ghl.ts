export interface GeneralContactSubmission {
  name: string;
  email: string;
  message: string;
  phone?: string;
}

export interface GeneralContactGhlConfig {
  enabled: boolean;
  writesEnabled: boolean;
  locationId: string;
  accessToken: string;
  baseUrl?: string;
}

export interface GeneralContactResult {
  status: "dry_run" | "confirmed";
  contactId?: string;
}

export class GeneralContactBlockedError extends Error {
  constructor(message: string) { super(message); this.name = "GeneralContactBlockedError"; }
}

/**
 * Deliberately separate from handoffHumanRequestToGhl/handoffFlightPlanToGhl -
 * those both require a live DiscoverySessionState, which a standalone contact
 * form submission does not have. This is intentionally minimal: contact
 * upsert + one note, no custom fields, no pipeline/opportunity.
 */
export async function submitGeneralContactToGhl(
  input: GeneralContactSubmission,
  config: GeneralContactGhlConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<GeneralContactResult> {
  if (!config.enabled) throw new GeneralContactBlockedError("Contact form CRM handoff is disabled");
  if (!config.locationId.trim() || !config.accessToken.trim()) throw new GeneralContactBlockedError("GHL connection details are required");
  if (!config.writesEnabled) return { status: "dry_run" };

  const baseUrl = (config.baseUrl ?? "https://services.leadconnectorhq.com").replace(/\/$/, "");
  const headers = { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${config.accessToken}`, Version: "v3" };
  const [firstName, ...rest] = input.name.trim().split(/\s+/);
  const lastName = rest.join(" ") || undefined;

  const contactResponse = await fetchImpl(`${baseUrl}/contacts/upsert`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      locationId: config.locationId,
      email: input.email.trim(),
      firstName,
      ...(lastName ? { lastName } : {}),
      ...(input.phone ? { phone: input.phone } : {}),
      source: "Moonrock Website — Contact Form",
    }),
  });
  const contactText = await contactResponse.text();
  if (!contactResponse.ok) throw new GeneralContactBlockedError(`HighLevel contact upsert failed (${contactResponse.status}): ${contactText}`);
  const contactPayload = contactText ? JSON.parse(contactText) as { contact?: { id?: string }; id?: string } : {};
  const contactId = contactPayload.contact?.id ?? contactPayload.id;
  if (!contactId) throw new GeneralContactBlockedError("HighLevel contact upsert succeeded without returning a contact ID");

  const noteResponse = await fetchImpl(`${baseUrl}/contacts/${encodeURIComponent(contactId)}/notes`, {
    method: "POST",
    headers,
    body: JSON.stringify({ body: `CONTACT FORM SUBMISSION\n${input.message.trim()}` }),
  });
  if (!noteResponse.ok) throw new GeneralContactBlockedError(`HighLevel note write failed (${noteResponse.status}): ${await noteResponse.text()}`);

  return { status: "confirmed", contactId };
}
