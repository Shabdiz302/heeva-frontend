-- Email verification for the separate student-platform database.
-- Existing accounts remain unverified until their mailbox is verified.
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS student_email_verification_codes (
  student_id UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  code_salt CHAR(32) NOT NULL,
  code_hash CHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  sent_count INTEGER NOT NULL DEFAULT 1 CHECK (sent_count BETWEEN 1 AND 5),
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS student_email_verification_expiry_idx
  ON student_email_verification_codes(expires_at);
