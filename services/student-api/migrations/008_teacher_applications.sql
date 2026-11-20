-- Self-service teacher applications require email verification AND human approval.
-- Staff accounts created through this flow are SUSPENDED until an administrator approves them.
CREATE TABLE IF NOT EXISTS marketplace_teacher_applications (
  staff_user_id UUID PRIMARY KEY REFERENCES staff_users(id) ON DELETE CASCADE,
  status VARCHAR(24) NOT NULL DEFAULT 'pending_email'
    CHECK (status IN ('pending_email','pending_admin','approved','rejected')),
  terms_accepted_at TIMESTAMPTZ NOT NULL,
  privacy_accepted_at TIMESTAMPTZ NOT NULL,
  adult_confirmed_at TIMESTAMPTZ NOT NULL,
  email_verified_at TIMESTAMPTZ,
  code_salt VARCHAR(120) NOT NULL,
  code_hash VARCHAR(120) NOT NULL,
  code_expires_at TIMESTAMPTZ NOT NULL,
  code_attempts INTEGER NOT NULL DEFAULT 0 CHECK(code_attempts BETWEEN 0 AND 5),
  last_code_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  reviewer_feedback VARCHAR(1200) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS marketplace_teacher_applications_status_idx
  ON marketplace_teacher_applications(status,created_at DESC);
