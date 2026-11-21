-- Private teacher CV metadata; files are never publicly served.
ALTER TABLE marketplace_teacher_profiles
  ADD COLUMN IF NOT EXISTS cv_storage_key VARCHAR(100),
  ADD COLUMN IF NOT EXISTS cv_original_filename VARCHAR(160),
  ADD COLUMN IF NOT EXISTS cv_size_bytes INTEGER CHECK (cv_size_bytes IS NULL OR cv_size_bytes BETWEEN 1 AND 5242880),
  ADD COLUMN IF NOT EXISTS cv_uploaded_at TIMESTAMPTZ;
