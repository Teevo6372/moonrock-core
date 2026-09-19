import { createClerkClient } from "@clerk/backend";

export interface ClerkInvitationConfig {
  secretKey: string;
  inviteRedirectUrl: string;
}

export interface SendInvitationInput {
  email: string;
  clientId: string;
  tier: string;
}

/**
 * Sends a Clerk invitation to the client's email. Sets publicMetadata so that
 * when the user accepts the invite and signs in, their Clerk user object carries
 * { clientId, tier }, which /v1/client/me uses to link the Clerk identity to the
 * nova_clients row without a second webhook. ignoreExisting makes replays safe.
 */
export async function sendClerkInvitation(input: SendInvitationInput, config: ClerkInvitationConfig): Promise<void> {
  const clerk = createClerkClient({ secretKey: config.secretKey });
  await clerk.invitations.createInvitation({
    emailAddress: input.email,
    publicMetadata: { clientId: input.clientId, tier: input.tier },
    redirectUrl: config.inviteRedirectUrl,
    ignoreExisting: true,
  });
}

export interface ClerkUserPublicMetadata {
  clientId?: string;
  tier?: string;
}

/** Fetches the Clerk user's publicMetadata, which is set from the invitation on sign-up. */
export async function getClerkUserPublicMetadata(clerkUserId: string, secretKey: string): Promise<ClerkUserPublicMetadata> {
  const clerk = createClerkClient({ secretKey });
  const user = await clerk.users.getUser(clerkUserId);
  return (user.publicMetadata ?? {}) as ClerkUserPublicMetadata;
}
