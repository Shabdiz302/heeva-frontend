-- Draft-only teacher marketplace onboarding. Never publishes existing static teacher directory entries.
CREATE TABLE IF NOT EXISTS marketplace_teacher_profiles (
  id UUID PRIMARY KEY,
  staff_user_id UUID NOT NULL UNIQUE REFERENCES staff_users(id) ON DELETE CASCADE,
  display_name VARCHAR(120) NOT NULL,
  headline VARCHAR(160) NOT NULL DEFAULT '',
  biography TEXT NOT NULL DEFAULT '' CHECK (length(biography)<=4000),
  subjects TEXT[] NOT NULL DEFAULT '{}',
  languages TEXT[] NOT NULL DEFAULT '{}',
  qualifications_summary TEXT NOT NULL DEFAULT '' CHECK (length(qualifications_summary)<=2500),
  teaching_experience TEXT NOT NULL DEFAULT '' CHECK (length(teaching_experience)<=2500),
  currency CHAR(3) NOT NULL DEFAULT 'GBP' CHECK (currency='GBP'),
  proposed_rate_pence INTEGER CHECK (proposed_rate_pence BETWEEN 100 AND 100000),
  lesson_duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (lesson_duration_minutes IN (30,45,60,90)),
  review_status VARCHAR(24) NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft','pending_review','changes_requested','approved')),
  admin_feedback VARCHAR(1200) NOT NULL DEFAULT '',
  photo_storage_key VARCHAR(100),
  photo_mime_type VARCHAR(30),
  photo_size_bytes INTEGER CHECK (photo_size_bytes IS NULL OR photo_size_bytes BETWEEN 1 AND 5242880),
  photo_uploaded_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS marketplace_teacher_review_idx ON marketplace_teacher_profiles(review_status,updated_at DESC);
