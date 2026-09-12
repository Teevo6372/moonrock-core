CREATE TABLE IF NOT EXISTS nova_accounts (
  account_id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'client')),
  client_ghl_location_id TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS nova_accounts_role_idx
  ON nova_accounts (role);

CREATE INDEX IF NOT EXISTS nova_accounts_client_location_idx
  ON nova_accounts (client_ghl_location_id)
  WHERE client_ghl_location_id IS NOT NULL;
