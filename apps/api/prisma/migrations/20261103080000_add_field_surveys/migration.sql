CREATE TYPE "survey_status" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');
CREATE TYPE "survey_upload_status" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');
CREATE TYPE "survey_review_status" AS ENUM ('APPROVED', 'REJECTED');

CREATE TABLE "surveys" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "survey_number" VARCHAR(40) NOT NULL,
  "employee_id" UUID NOT NULL,
  "assignment_id" UUID NOT NULL,
  "village_id" UUID NOT NULL,
  "gat_number" VARCHAR(80) NOT NULL,
  "plot_number" VARCHAR(80),
  "latitude" DECIMAL(9,6) NOT NULL,
  "longitude" DECIMAL(9,6) NOT NULL,
  "gps_accuracy" DECIMAL(8,2) NOT NULL,
  "captured_at" TIMESTAMP(3) NOT NULL,
  "notes" VARCHAR(4000),
  "status" "survey_status" NOT NULL DEFAULT 'DRAFT',
  "submitted_at" TIMESTAMP(3),
  "submission_key" VARCHAR(160),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "surveys_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "survey_attachments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "survey_id" UUID NOT NULL,
  "uploaded_by" UUID NOT NULL,
  "original_file_name" VARCHAR(255) NOT NULL,
  "object_key" VARCHAR(512) NOT NULL,
  "bucket" VARCHAR(120) NOT NULL,
  "mime_type" VARCHAR(100) NOT NULL,
  "file_size" INTEGER NOT NULL,
  "checksum" VARCHAR(128),
  "upload_status" "survey_upload_status" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "survey_attachments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "survey_reviews" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "survey_id" UUID NOT NULL,
  "reviewed_by" UUID NOT NULL,
  "review_status" "survey_review_status" NOT NULL,
  "review_notes" VARCHAR(2000),
  "reviewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "survey_reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "surveys_survey_number_key" ON "surveys"("survey_number");
CREATE UNIQUE INDEX "surveys_submission_key_key" ON "surveys"("submission_key");
CREATE UNIQUE INDEX "survey_attachments_object_key_key" ON "survey_attachments"("object_key");
CREATE INDEX "surveys_organization_id_status_created_at_idx" ON "surveys"("organization_id", "status", "created_at");
CREATE INDEX "surveys_employee_id_status_created_at_idx" ON "surveys"("employee_id", "status", "created_at");
CREATE INDEX "surveys_assignment_id_village_id_idx" ON "surveys"("assignment_id", "village_id");
CREATE INDEX "survey_attachments_survey_id_upload_status_idx" ON "survey_attachments"("survey_id", "upload_status");
CREATE INDEX "survey_reviews_survey_id_reviewed_at_idx" ON "survey_reviews"("survey_id", "reviewed_at");
CREATE INDEX "survey_reviews_review_status_reviewed_at_idx" ON "survey_reviews"("review_status", "reviewed_at");

ALTER TABLE "surveys" ADD CONSTRAINT "surveys_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_village_id_fkey" FOREIGN KEY ("village_id") REFERENCES "villages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "survey_attachments" ADD CONSTRAINT "survey_attachments_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "survey_attachments" ADD CONSTRAINT "survey_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "survey_reviews" ADD CONSTRAINT "survey_reviews_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "survey_reviews" ADD CONSTRAINT "survey_reviews_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
