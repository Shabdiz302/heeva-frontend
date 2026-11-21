-- Atomic per-educator monthly budget for optional AI profile writing.
CREATE TABLE IF NOT EXISTS marketplace_ai_write_usage (
  staff_user_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  month_key CHAR(7) NOT NULL CHECK (month_key ~ '^[0-9]{4}-[0-9]{2}$'),
  request_count INTEGER NOT NULL DEFAULT 0 CHECK(request_count >= 0),
  PRIMARY KEY(staff_user_id,month_key)
);
