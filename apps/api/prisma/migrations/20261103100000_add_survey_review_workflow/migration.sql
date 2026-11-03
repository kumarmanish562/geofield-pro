ALTER TYPE "survey_status" ADD VALUE IF NOT EXISTS 'CORRECTION_REQUIRED';
ALTER TYPE "survey_review_status" ADD VALUE IF NOT EXISTS 'CORRECTION_REQUIRED';

ALTER TABLE "survey_reviews"
  ADD COLUMN IF NOT EXISTS "action" VARCHAR(40) NOT NULL DEFAULT 'REVIEW',
  ADD COLUMN IF NOT EXISTS "previous_status" "survey_status",
  ADD COLUMN IF NOT EXISTS "new_status" "survey_status";

CREATE INDEX IF NOT EXISTS "survey_reviews_survey_id_reviewed_at_idx"
  ON "survey_reviews" ("survey_id", "reviewed_at");
