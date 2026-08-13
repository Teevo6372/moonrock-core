CREATE TABLE IF NOT EXISTS nova_discovery_state (
  session_id TEXT PRIMARY KEY,
  state JSONB NOT NULL,
  state_version BIGINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS nova_discovery_state_updated_at_idx
  ON nova_discovery_state (updated_at DESC);
