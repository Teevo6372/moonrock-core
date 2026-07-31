BEGIN;

CREATE TABLE IF NOT EXISTS nova_sessions (
  session_id text PRIMARY KEY,
  version integer NOT NULL CHECK (version > 0),
  sequence integer NOT NULL CHECK (sequence >= 0),
  session_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nova_consent_actions (
  action_id text PRIMARY KEY,
  session_id text NOT NULL REFERENCES nova_sessions(session_id) ON DELETE CASCADE,
  category text NOT NULL,
  status text NOT NULL CHECK (status IN ('granted', 'withdrawn')),
  occurred_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS nova_idempotency (
  scope text NOT NULL,
  key text NOT NULL,
  state text NOT NULL CHECK (state IN ('claimed', 'confirmed', 'outcome_unknown')),
  correlation_id text NOT NULL,
  receipt_id text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (scope, key)
);

CREATE TABLE IF NOT EXISTS nova_schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO nova_schema_migrations(version)
VALUES ('001_staging_state')
ON CONFLICT (version) DO NOTHING;

COMMIT;
