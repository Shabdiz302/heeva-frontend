-- Staff authentication and audit trail for the isolated student platform.
-- Staff accounts are provisioned using the private create-staff-user.js CLI.

CREATE TABLE IF NOT EXISTS staff_users (
  id UUID PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE CHECK (email = lower(email)),
  display_name VARCHAR(120) NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin','teacher')),
  teacher_slug VARCHAR(120),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  CHECK ((role='admin' AND teacher_slug IS NULL) OR role='teacher')
);

CREATE TABLE IF NOT EXISTS staff_sessions (
  id UUID PRIMARY KEY,
  staff_user_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS staff_sessions_user_idx ON staff_sessions(staff_user_id);
CREATE INDEX IF NOT EXISTS staff_sessions_expiry_idx ON staff_sessions(expires_at);

CREATE TABLE IF NOT EXISTS staff_audit_log (
  id UUID PRIMARY KEY,
  staff_user_id UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id UUID,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS staff_audit_log_created_idx ON staff_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS staff_audit_log_staff_idx ON staff_audit_log(staff_user_id, created_at DESC);
