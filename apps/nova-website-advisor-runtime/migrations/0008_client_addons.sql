-- Launch add-ons a client bought at Launch checkout (order-bump). One row per
-- client per add-on. status starts as 'purchased'; later phases can move it to
-- 'active' once the add-on is set up. The composite key makes recording
-- idempotent, so a replayed webhook can never duplicate a purchase.
CREATE TABLE IF NOT EXISTS nova_client_addons (
  client_id                  TEXT        NOT NULL REFERENCES nova_clients (id) ON DELETE CASCADE,
  item_id                    TEXT        NOT NULL,
  stripe_checkout_session_id TEXT        NOT NULL,
  status                     TEXT        NOT NULL DEFAULT 'purchased',
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (client_id, item_id)
);
