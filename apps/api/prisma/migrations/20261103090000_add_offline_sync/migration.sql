CREATE TYPE "sync_event_status" AS ENUM ('PROCESSED', 'CONFLICT', 'FAILED');

ALTER TABLE "surveys"
  ADD COLUMN "client_survey_id" UUID,
  ADD COLUMN "server_version" INTEGER NOT NULL DEFAULT 1;
CREATE UNIQUE INDEX "surveys_client_survey_id_key" ON "surveys"("client_survey_id");

ALTER TABLE "survey_attachments"
  ADD COLUMN "client_attachment_id" UUID;
CREATE UNIQUE INDEX "survey_attachments_client_attachment_id_key" ON "survey_attachments"("client_attachment_id");

CREATE TABLE "sync_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "client_event_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "entity_type" VARCHAR(40) NOT NULL,
  "entity_id" VARCHAR(80) NOT NULL,
  "operation" VARCHAR(40) NOT NULL,
  "payload_hash" VARCHAR(128) NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "sync_event_status" NOT NULL,
  "server_timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sync_events_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "sync_events_client_event_id_key" ON "sync_events"("client_event_id");
CREATE INDEX "sync_events_employee_id_created_at_idx" ON "sync_events"("employee_id", "created_at");
CREATE INDEX "sync_events_employee_id_status_idx" ON "sync_events"("employee_id", "status");

CREATE TABLE "sync_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "employee_id" UUID NOT NULL,
  "entity_type" VARCHAR(40) NOT NULL,
  "entity_id" VARCHAR(80) NOT NULL,
  "operation" VARCHAR(40) NOT NULL,
  "attempt_number" INTEGER NOT NULL,
  "started_at" TIMESTAMP(3) NOT NULL,
  "completed_at" TIMESTAMP(3),
  "result" VARCHAR(40),
  "error_message" VARCHAR(1000),
  "server_response" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sync_history_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "sync_history_employee_id_created_at_idx" ON "sync_history"("employee_id", "created_at");
CREATE INDEX "sync_history_employee_id_result_idx" ON "sync_history"("employee_id", "result");

ALTER TABLE "sync_events" ADD CONSTRAINT "sync_events_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sync_history" ADD CONSTRAINT "sync_history_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
