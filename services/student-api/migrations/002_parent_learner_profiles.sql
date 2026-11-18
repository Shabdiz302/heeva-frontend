-- Parent / guardian accounts and separate learner profiles.
-- This migration affects only the fresh Heeva PostgreSQL staging database.

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS account_type VARCHAR(24) NOT NULL DEFAULT 'adult_learner';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'students_account_type_check'
  ) THEN
    ALTER TABLE students
      ADD CONSTRAINT students_account_type_check
      CHECK (account_type IN ('parent_guardian', 'adult_learner'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS learner_profiles (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  display_name VARCHAR(80) NOT NULL,
  age_band VARCHAR(20) NOT NULL
    CHECK (age_band IN ('under_8', '8_12', '13_17', 'adult')),
  relationship_type VARCHAR(12) NOT NULL
    CHECK (relationship_type IN ('self', 'child')),
  preferred_language VARCHAR(5) NOT NULL DEFAULT 'en'
    CHECK (preferred_language IN ('en', 'fa')),
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  guardian_authority_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id, account_id),
  CHECK (
    (relationship_type = 'self' AND age_band = 'adult')
    OR
    (relationship_type = 'child' AND age_band IN ('under_8', '8_12', '13_17')
      AND guardian_authority_confirmed_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS learner_profiles_one_self_per_account
  ON learner_profiles(account_id)
  WHERE relationship_type = 'self' AND status = 'active';

CREATE INDEX IF NOT EXISTS learner_profiles_account_idx
  ON learner_profiles(account_id, created_at);

-- Keep current staging accounts working: existing adult account holders become
-- their own learner profile. No data is read from the legacy MariaDB database.
INSERT INTO learner_profiles (
  id, account_id, display_name, age_band, relationship_type, preferred_language
)
SELECT
  gen_random_uuid(), s.id, s.first_name, 'adult', 'self', s.preferred_language
FROM students s
WHERE s.account_type = 'adult_learner'
  AND NOT EXISTS (
    SELECT 1 FROM learner_profiles lp
    WHERE lp.account_id = s.id AND lp.relationship_type = 'self'
  );

ALTER TABLE student_enrolment_requests
  ADD COLUMN IF NOT EXISTS learner_id UUID;

UPDATE student_enrolment_requests e
SET learner_id = lp.id
FROM learner_profiles lp
WHERE lp.account_id = e.student_id
  AND lp.relationship_type = 'self'
  AND e.learner_id IS NULL;

ALTER TABLE student_enrolment_requests
  ALTER COLUMN learner_id SET NOT NULL;

ALTER TABLE student_enrolment_requests
  DROP CONSTRAINT IF EXISTS student_enrolment_requests_student_id_course_slug_key;

ALTER TABLE student_enrolment_requests
  ADD CONSTRAINT student_enrolment_requests_learner_account_fk
  FOREIGN KEY (learner_id, student_id)
  REFERENCES learner_profiles(id, account_id) ON DELETE CASCADE;

ALTER TABLE student_enrolment_requests
  ADD CONSTRAINT student_enrolment_requests_learner_course_key
  UNIQUE (learner_id, course_slug);

CREATE INDEX IF NOT EXISTS student_enrolment_learner_idx
  ON student_enrolment_requests(learner_id, created_at DESC);

-- One introductory lesson is enforced per learner, allowing a parent account
-- with more than one learner to request one for each learner.
ALTER TABLE student_trial_lesson_requests
  ADD COLUMN IF NOT EXISTS learner_id UUID;

UPDATE student_trial_lesson_requests t
SET learner_id = lp.id
FROM learner_profiles lp
WHERE lp.account_id = t.student_id
  AND lp.relationship_type = 'self'
  AND t.learner_id IS NULL;

ALTER TABLE student_trial_lesson_requests
  ALTER COLUMN learner_id SET NOT NULL;

ALTER TABLE student_trial_lesson_requests
  DROP CONSTRAINT IF EXISTS student_trial_lesson_requests_pkey;

ALTER TABLE student_trial_lesson_requests
  ADD CONSTRAINT student_trial_lesson_requests_pkey PRIMARY KEY (learner_id);

ALTER TABLE student_trial_lesson_requests
  ADD CONSTRAINT student_trial_learner_account_fk
  FOREIGN KEY (learner_id, student_id)
  REFERENCES learner_profiles(id, account_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS student_trial_account_idx
  ON student_trial_lesson_requests(student_id, requested_at DESC);
