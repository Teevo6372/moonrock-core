-- Idempotency table for Stripe webhook events. A unique constraint on event_id
-- means the first INSERT wins and replays are caught before any work starts.
CREATE TABLE IF NOT EXISTS nova_processed_stripe_events (
  event_id   TEXT        PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One row per paying client, written the moment a Launch Plan payment lands.
-- Status lifecycle: paid → invited → active (or invite_failed on Clerk error).
CREATE TABLE IF NOT EXISTS nova_clients (
  id                     TEXT        PRIMARY KEY,
  email                  TEXT        NOT NULL,
  stripe_customer_id     TEXT        NOT NULL,
  stripe_subscription_id TEXT,
  flight_plan_id         TEXT        NOT NULL,
  tier                   TEXT        NOT NULL,
  status                 TEXT        NOT NULL DEFAULT 'paid',
  clerk_user_id          TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS nova_clients_email_idx
  ON nova_clients (email);

CREATE UNIQUE INDEX IF NOT EXISTS nova_clients_stripe_customer_id_idx
  ON nova_clients (stripe_customer_id);

CREATE INDEX IF NOT EXISTS nova_clients_clerk_user_id_idx
  ON nova_clients (clerk_user_id)
  WHERE clerk_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS nova_clients_status_idx
  ON nova_clients (status);
