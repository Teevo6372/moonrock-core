import { randomUUID } from "node:crypto";
import type { Pool } from "pg";

export type ClientStatus = "paid" | "invited" | "invite_failed" | "active";
export type OnboardingStatus = "pending" | "in_progress" | "complete";

export interface OnboardingTurn {
  role: "nova" | "client";
  text: string;
  ts: string;
}

export interface OnboardingAnswers {
  businessPhone?: string;
  businessHours?: string;
  escalationContact?: string;
  servicesList?: string;
  commonCustomerQuestions?: string;
  preferredGreeting?: string;
}

export interface OnboardingState {
  status: OnboardingStatus;
  conversation: OnboardingTurn[];
  answers: OnboardingAnswers;
}

export interface NovaClient {
  id: string;
  email: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  flightPlanId: string;
  tier: string;
  status: ClientStatus;
  clerkUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ClientRow {
  id: string;
  email: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  flight_plan_id: string;
  tier: string;
  status: string;
  clerk_user_id: string | null;
  created_at: Date;
  updated_at: Date;
  onboarding_status?: string;
  onboarding_conversation?: unknown;
  onboarding_answers?: unknown;
}

function mapRow(row: ClientRow): NovaClient {
  return {
    id: row.id,
    email: row.email,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    flightPlanId: row.flight_plan_id,
    tier: row.tier,
    status: row.status as ClientStatus,
    clerkUserId: row.clerk_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface CreateClientInput {
  email: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  flightPlanId: string;
  tier: string;
}

export class PostgresClientRepository {
  constructor(private readonly pool: Pool) {}

  /**
   * Returns true when the event is new (first time seen), false when it is a
   * replay. The unique constraint on event_id makes the INSERT a no-op on a
   * duplicate rather than throwing, so callers get a clean boolean signal.
   */
  async recordProcessedEvent(eventId: string): Promise<boolean> {
    const result = await this.pool.query(
      `INSERT INTO nova_processed_stripe_events (event_id) VALUES ($1) ON CONFLICT (event_id) DO NOTHING`,
      [eventId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Inserts a new client row with status 'paid'. If the same email already
   * has a row (e.g. a rare double-purchase), the Stripe IDs and flight plan
   * are refreshed but status is intentionally left unchanged so an already-
   * invited or active client is not rolled back.
   */
  async createClient(input: CreateClientInput): Promise<NovaClient> {
    const id = randomUUID();
    const result = await this.pool.query<ClientRow>(
      `INSERT INTO nova_clients (id, email, stripe_customer_id, stripe_subscription_id, flight_plan_id, tier, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'paid')
       ON CONFLICT (email) DO UPDATE SET
         stripe_customer_id     = EXCLUDED.stripe_customer_id,
         stripe_subscription_id = EXCLUDED.stripe_subscription_id,
         flight_plan_id         = EXCLUDED.flight_plan_id,
         updated_at             = NOW()
       RETURNING *`,
      [id, input.email, input.stripeCustomerId, input.stripeSubscriptionId, input.flightPlanId, input.tier],
    );
    return mapRow(result.rows[0]!);
  }

  /**
   * Records Launch add-ons bought at checkout. Idempotent per (client, add-on):
   * a replay or a repeat purchase leaves the existing row, and its status, alone.
   */
  async recordPurchasedAddons(clientId: string, itemIds: readonly string[], stripeCheckoutSessionId: string): Promise<void> {
    for (const itemId of itemIds) {
      await this.pool.query(
        `INSERT INTO nova_client_addons (client_id, item_id, stripe_checkout_session_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (client_id, item_id) DO NOTHING`,
        [clientId, itemId, stripeCheckoutSessionId],
      );
    }
  }

  async listAddons(clientId: string): Promise<Array<{ itemId: string; status: string }>> {
    const result = await this.pool.query<{ item_id: string; status: string }>(
      `SELECT item_id, status FROM nova_client_addons WHERE client_id = $1 ORDER BY created_at, item_id`,
      [clientId],
    );
    return result.rows.map((row) => ({ itemId: row.item_id, status: row.status }));
  }

  async setInvited(clientId: string): Promise<void> {
    await this.pool.query(
      `UPDATE nova_clients SET status = 'invited', updated_at = NOW() WHERE id = $1`,
      [clientId],
    );
  }

  async setInviteFailed(clientId: string): Promise<void> {
    await this.pool.query(
      `UPDATE nova_clients SET status = 'invite_failed', updated_at = NOW() WHERE id = $1`,
      [clientId],
    );
  }

  /** Sets clerk_user_id and transitions status to active. Idempotent - skips rows already active. */
  async activateClient(clientId: string, clerkUserId: string): Promise<void> {
    await this.pool.query(
      `UPDATE nova_clients
       SET status = 'active', clerk_user_id = $2, updated_at = NOW()
       WHERE id = $1 AND status != 'active'`,
      [clientId, clerkUserId],
    );
  }

  async findByClerkUserId(clerkUserId: string): Promise<NovaClient | null> {
    const result = await this.pool.query<ClientRow>(
      `SELECT * FROM nova_clients WHERE clerk_user_id = $1 LIMIT 1`,
      [clerkUserId],
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async findById(clientId: string): Promise<NovaClient | null> {
    const result = await this.pool.query<ClientRow>(
      `SELECT * FROM nova_clients WHERE id = $1 LIMIT 1`,
      [clientId],
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async getOnboardingState(clientId: string): Promise<OnboardingState | null> {
    const result = await this.pool.query<ClientRow>(
      `SELECT onboarding_status, onboarding_conversation, onboarding_answers FROM nova_clients WHERE id = $1 LIMIT 1`,
      [clientId],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      status: (row.onboarding_status ?? "pending") as OnboardingStatus,
      conversation: (row.onboarding_conversation as OnboardingTurn[] | null) ?? [],
      answers: (row.onboarding_answers as OnboardingAnswers | null) ?? {},
    };
  }

  async appendOnboardingTurn(clientId: string, turn: OnboardingTurn): Promise<void> {
    await this.pool.query(
      `UPDATE nova_clients
       SET onboarding_conversation = COALESCE(onboarding_conversation, '[]'::JSONB) || $2::JSONB,
           onboarding_status = CASE WHEN onboarding_status = 'pending' THEN 'in_progress' ELSE onboarding_status END,
           updated_at = NOW()
       WHERE id = $1`,
      [clientId, JSON.stringify([turn])],
    );
  }

  async updateOnboardingAnswers(clientId: string, answers: OnboardingAnswers): Promise<void> {
    await this.pool.query(
      `UPDATE nova_clients
       SET onboarding_answers = COALESCE(onboarding_answers, '{}'::JSONB) || $2::JSONB,
           updated_at = NOW()
       WHERE id = $1`,
      [clientId, JSON.stringify(answers)],
    );
  }

  async completeOnboarding(clientId: string): Promise<void> {
    await this.pool.query(
      `UPDATE nova_clients SET onboarding_status = 'complete', updated_at = NOW() WHERE id = $1`,
      [clientId],
    );
  }
}
