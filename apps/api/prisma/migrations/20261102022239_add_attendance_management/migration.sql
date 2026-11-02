-- CreateEnum
CREATE TYPE "attendance_status" AS ENUM ('WORKING', 'ON_BREAK', 'COMPLETED');

-- CreateEnum
CREATE TYPE "attendance_event_type" AS ENUM ('CHECK_IN', 'BREAK_START', 'BREAK_END', 'CHECK_OUT', 'CORRECTION_APPLIED');

-- CreateEnum
CREATE TYPE "attendance_event_status" AS ENUM ('PENDING', 'PROCESSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "attendance_correction_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "attendances" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "attendance_date" DATE NOT NULL,
    "status" "attendance_status" NOT NULL,
    "checked_in_at" TIMESTAMP(3),
    "checked_out_at" TIMESTAMP(3),
    "total_break_seconds" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_breaks" (
    "id" UUID NOT NULL,
    "attendance_id" UUID NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "duration_seconds" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_breaks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_events" (
    "id" UUID NOT NULL,
    "attendance_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "event_type" "attendance_event_type" NOT NULL,
    "server_occurred_at" TIMESTAMP(3) NOT NULL,
    "client_occurred_at" TIMESTAMP(3),
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processing_status" "attendance_event_status" NOT NULL DEFAULT 'PROCESSED',
    "idempotency_key" VARCHAR(160),
    "client_event_id" VARCHAR(160),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_correction_requests" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "attendance_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "requested_check_in_at" TIMESTAMP(3),
    "requested_check_out_at" TIMESTAMP(3),
    "reason" VARCHAR(1000) NOT NULL,
    "status" "attendance_correction_status" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "review_comment" VARCHAR(1000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_correction_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_audit_logs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "attendance_id" UUID NOT NULL,
    "actor_id" UUID,
    "action" VARCHAR(80) NOT NULL,
    "before_state" JSONB,
    "after_state" JSONB,
    "reason" VARCHAR(1000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendances_organization_id_attendance_date_status_idx" ON "attendances"("organization_id", "attendance_date", "status");

-- CreateIndex
CREATE INDEX "attendances_employee_id_attendance_date_idx" ON "attendances"("employee_id", "attendance_date");

-- CreateIndex
CREATE UNIQUE INDEX "attendances_employee_id_attendance_date_key" ON "attendances"("employee_id", "attendance_date");

-- CreateIndex
CREATE INDEX "attendance_breaks_attendance_id_started_at_idx" ON "attendance_breaks"("attendance_id", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_events_idempotency_key_key" ON "attendance_events"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_events_client_event_id_key" ON "attendance_events"("client_event_id");

-- CreateIndex
CREATE INDEX "attendance_events_employee_id_created_at_idx" ON "attendance_events"("employee_id", "created_at");

-- CreateIndex
CREATE INDEX "attendance_events_attendance_id_created_at_idx" ON "attendance_events"("attendance_id", "created_at");

-- CreateIndex
CREATE INDEX "attendance_correction_requests_organization_id_status_creat_idx" ON "attendance_correction_requests"("organization_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "attendance_correction_requests_employee_id_created_at_idx" ON "attendance_correction_requests"("employee_id", "created_at");

-- CreateIndex
CREATE INDEX "attendance_audit_logs_organization_id_created_at_idx" ON "attendance_audit_logs"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "attendance_audit_logs_attendance_id_created_at_idx" ON "attendance_audit_logs"("attendance_id", "created_at");

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_breaks" ADD CONSTRAINT "attendance_breaks_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "attendances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_events" ADD CONSTRAINT "attendance_events_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "attendances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_events" ADD CONSTRAINT "attendance_events_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_correction_requests" ADD CONSTRAINT "attendance_correction_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_correction_requests" ADD CONSTRAINT "attendance_correction_requests_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "attendances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_correction_requests" ADD CONSTRAINT "attendance_correction_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_correction_requests" ADD CONSTRAINT "attendance_correction_requests_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_audit_logs" ADD CONSTRAINT "attendance_audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_audit_logs" ADD CONSTRAINT "attendance_audit_logs_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "attendances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_audit_logs" ADD CONSTRAINT "attendance_audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
