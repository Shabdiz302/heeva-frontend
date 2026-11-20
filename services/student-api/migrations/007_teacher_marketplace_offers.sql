-- Marketplace tutor course proposals and controlled approval of customer prices.
-- No payment/payout records and no public listing are created by this migration.
CREATE TABLE IF NOT EXISTS marketplace_teacher_offers (
  id UUID PRIMARY KEY,
  staff_user_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES marketplace_teacher_profiles(id) ON DELETE CASCADE,
  course_slug VARCHAR(150) NOT NULL,
  offer_title VARCHAR(180) NOT NULL,
  offer_description VARCHAR(2500) NOT NULL DEFAULT '',
  lesson_duration_minutes INTEGER NOT NULL CHECK (lesson_duration_minutes IN (30,45,60,90)),
  proposed_tutor_rate_pence INTEGER NOT NULL CHECK (proposed_tutor_rate_pence BETWEEN 100 AND 100000),
  currency CHAR(3) NOT NULL DEFAULT 'GBP' CHECK (currency='GBP'),
  review_status VARCHAR(24) NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft','pending_review','changes_requested','approved')),
  admin_feedback VARCHAR(1200) NOT NULL DEFAULT '',
  approved_tutor_rate_pence INTEGER CHECK (approved_tutor_rate_pence BETWEEN 100 AND 100000),
  approved_customer_price_pence INTEGER CHECK (approved_customer_price_pence BETWEEN 100 AND 200000),
  approved_margin_basis_points INTEGER CHECK (approved_margin_basis_points BETWEEN 0 AND 5000),
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((review_status='approved') =
    (approved_tutor_rate_pence IS NOT NULL AND approved_customer_price_pence IS NOT NULL AND approved_margin_basis_points IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS marketplace_offers_teacher_idx ON marketplace_teacher_offers(staff_user_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS marketplace_offers_review_idx ON marketplace_teacher_offers(review_status,submitted_at DESC);
