import type { Pool } from "pg";

export interface LaunchPlanSignup {
  signupId: string;
  sessionId: string;
  stripeCheckoutSessionId: string;
  usedFoundingPrice: boolean;
}

/**
 * A dedicated table rather than counting per-session conversationSalesClosed
 * JSON blobs (discovery-session.ts) - the founding-offer count needs to run fast
 * across every session, not just the one currently in memory. Only ever written
 * once a Stripe payment is actually confirmed (see the webhook handler), matching
 * Stephen's answer that the founding-slot count should reflect real signups, not
 * Flight Plan saves.
 */
export class PostgresLaunchPlanRepository {
  constructor(private readonly pool: Pool) {}

  async countFoundingSignups(): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      "SELECT COUNT(*) FROM nova_launch_plan_signups WHERE used_founding_price = TRUE",
    );
    return Number(result.rows[0]?.count ?? "0");
  }

  /** Idempotent on stripeCheckoutSessionId, so a retried/duplicated webhook delivery never double-counts a signup. */
  async recordSignup(input: LaunchPlanSignup): Promise<void> {
    await this.pool.query(
      `INSERT INTO nova_launch_plan_signups (signup_id, session_id, stripe_checkout_session_id, used_founding_price)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (stripe_checkout_session_id) DO NOTHING`,
      [input.signupId, input.sessionId, input.stripeCheckoutSessionId, input.usedFoundingPrice],
    );
  }
}
