CREATE TABLE IF NOT EXISTS nova_launch_plan_signups (
  signup_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  stripe_checkout_session_id TEXT NOT NULL UNIQUE,
  used_founding_price BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS nova_launch_plan_signups_founding_idx
  ON nova_launch_plan_signups (used_founding_price)
  WHERE used_founding_price = TRUE;
