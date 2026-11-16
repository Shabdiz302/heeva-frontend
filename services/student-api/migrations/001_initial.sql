CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  phone VARCHAR(40),
  preferred_language VARCHAR(5) NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'fa')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  terms_accepted_at TIMESTAMPTZ NOT NULL,
  privacy_accepted_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  CHECK (email = lower(email))
);

CREATE TABLE IF NOT EXISTS student_sessions (
  id UUID PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS student_sessions_student_idx ON student_sessions(student_id);
CREATE INDEX IF NOT EXISTS student_sessions_expiry_idx ON student_sessions(expires_at);

CREATE TABLE IF NOT EXISTS student_enrolment_requests (
  id UUID PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_slug VARCHAR(120) NOT NULL,
  course_title_snapshot VARCHAR(180) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'approved', 'payment_pending', 'active', 'declined', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, course_slug)
);
CREATE INDEX IF NOT EXISTS student_enrolment_student_idx ON student_enrolment_requests(student_id, created_at DESC);

CREATE TABLE IF NOT EXISTS student_trial_lesson_requests (
  student_id UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  course_slug VARCHAR(120) NOT NULL,
  course_title_snapshot VARCHAR(180) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'scheduled', 'completed', 'cancelled')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(120) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
