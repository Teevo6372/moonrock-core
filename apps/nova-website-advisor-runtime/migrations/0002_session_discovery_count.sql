ALTER TABLE nova_sessions
  ADD COLUMN discovery_question_count INTEGER NOT NULL DEFAULT 0
  CHECK (discovery_question_count >= 0);
