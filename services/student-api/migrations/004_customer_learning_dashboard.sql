-- Confirmed course enrolments, lesson tracking and private downloadable resources.
-- This migration is for the separate Heeva PostgreSQL student-platform database.

CREATE TABLE IF NOT EXISTS student_course_enrolments (
  id UUID PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  learner_id UUID NOT NULL,
  enrolment_request_id UUID NOT NULL UNIQUE
    REFERENCES student_enrolment_requests(id) ON DELETE RESTRICT,
  course_slug VARCHAR(120) NOT NULL,
  course_title_snapshot VARCHAR(180) NOT NULL,
  total_lessons INTEGER NOT NULL CHECK (total_lessons > 0 AND total_lessons <= 500),
  teacher_slug VARCHAR(120),
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id, student_id),
  FOREIGN KEY (learner_id, student_id)
    REFERENCES learner_profiles(id, account_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS student_course_enrolments_learner_idx
  ON student_course_enrolments(learner_id, status, started_at DESC);

CREATE TABLE IF NOT EXISTS student_course_lessons (
  id UUID PRIMARY KEY,
  course_enrolment_id UUID NOT NULL
    REFERENCES student_course_enrolments(id) ON DELETE CASCADE,
  lesson_number INTEGER NOT NULL CHECK (lesson_number > 0),
  title VARCHAR(180) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'completed', 'cancelled', 'missed')),
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  tutor_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (course_enrolment_id, lesson_number),
  CHECK (
    (status = 'completed' AND completed_at IS NOT NULL)
    OR status <> 'completed'
  )
);

CREATE INDEX IF NOT EXISTS student_course_lessons_schedule_idx
  ON student_course_lessons(course_enrolment_id, scheduled_at);

CREATE TABLE IF NOT EXISTS student_course_resources (
  id UUID PRIMARY KEY,
  course_enrolment_id UUID NOT NULL
    REFERENCES student_course_enrolments(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES student_course_lessons(id) ON DELETE SET NULL,
  title VARCHAR(180) NOT NULL,
  description VARCHAR(500),
  original_filename VARCHAR(240) NOT NULL,
  storage_key VARCHAR(240) NOT NULL UNIQUE,
  mime_type VARCHAR(120) NOT NULL
    CHECK (mime_type IN (
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    )),
  file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 20971520),
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  CHECK (lesson_id IS NULL OR course_enrolment_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS student_course_resources_enrolment_idx
  ON student_course_resources(course_enrolment_id, status, created_at DESC);
