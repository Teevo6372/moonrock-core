-- Onboarding state columns for the authenticated client portal.
-- onboarding_status lifecycle: pending → in_progress → complete.
-- onboarding_conversation stores the full turn history as a JSONB array.
-- onboarding_answers stores the key setup fields Nova has collected.
ALTER TABLE nova_clients
  ADD COLUMN IF NOT EXISTS onboarding_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS onboarding_conversation JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS onboarding_answers JSONB NOT NULL DEFAULT '{}'::JSONB;

CREATE INDEX IF NOT EXISTS nova_clients_onboarding_status_idx
  ON nova_clients (onboarding_status)
  WHERE onboarding_status != 'pending';
