-- Public snapshots are deliberately separate from editable private marketplace profiles.
-- No private CV, email, rates, original photo, documents or child details are copied.
CREATE TABLE IF NOT EXISTS marketplace_public_educators (
  profile_id UUID PRIMARY KEY REFERENCES marketplace_teacher_profiles(id) ON DELETE CASCADE,
  slug VARCHAR(90) UNIQUE NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  headline VARCHAR(160) NOT NULL,
  biography TEXT NOT NULL CHECK (length(biography) <= 4000),
  subjects TEXT[] NOT NULL DEFAULT '{}',
  languages TEXT[] NOT NULL DEFAULT '{}',
  published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS marketplace_public_educators_visible_idx
  ON marketplace_public_educators(published, updated_at DESC);
