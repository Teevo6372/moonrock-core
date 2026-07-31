BEGIN;

CREATE TABLE nova_sessions (
  session_id TEXT PRIMARY KEY,
  correlation_id TEXT NOT NULL UNIQUE,
  lifecycle_state TEXT NOT NULL,
  state_version BIGINT NOT NULL DEFAULT 1 CHECK (state_version > 0),
  message_sequence INTEGER NOT NULL DEFAULT 0 CHECK (message_sequence >= 0),
  disclosure_version TEXT NOT NULL,
  disclosure_presented BOOLEAN NOT NULL,
  primary_intent TEXT,
  secondary_intents JSONB NOT NULL DEFAULT '[]'::jsonb,
  pending_action TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX nova_sessions_expiry_idx ON nova_sessions (expires_at);

CREATE TABLE nova_consent_evidence (
  consent_evidence_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  action_id TEXT NOT NULL UNIQUE,
  session_id TEXT NOT NULL REFERENCES nova_sessions(session_id),
  category TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('granted', 'withdrawn')),
  disclosure_version TEXT NOT NULL,
  affirmative_control_id TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX nova_consent_session_idx
  ON nova_consent_evidence (session_id, category, occurred_at DESC);

CREATE TABLE nova_idempotency (
  scope TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('claimed', 'confirmed', 'outcome_unknown')),
  receipt_id TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (scope, idempotency_key),
  CHECK (
    (state = 'confirmed' AND receipt_id IS NOT NULL)
    OR (state <> 'confirmed')
  )
);

CREATE TABLE nova_runtime_events (
  event_id UUID PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES nova_sessions(session_id),
  correlation_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  lifecycle_state TEXT NOT NULL,
  outcome TEXT NOT NULL,
  severity TEXT NOT NULL,
  reason_code TEXT NOT NULL,
  release_metadata JSONB NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX nova_events_session_time_idx
  ON nova_runtime_events (session_id, occurred_at);
CREATE INDEX nova_events_correlation_idx
  ON nova_runtime_events (correlation_id);

CREATE TABLE nova_release_evidence (
  release_id TEXT PRIMARY KEY,
  environment TEXT NOT NULL CHECK (environment = 'staging'),
  runtime_version TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  knowledge_version TEXT NOT NULL,
  knowledge_hash TEXT NOT NULL,
  model_id TEXT NOT NULL,
  configuration_hash TEXT NOT NULL,
  rollback_release_id TEXT,
  approval_evidence_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL
);

-- Raw visitor messages, transcripts, secrets, authorization headers, and
-- chain-of-thought are intentionally absent from this schema.

COMMIT;
