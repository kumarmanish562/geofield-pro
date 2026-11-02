-- CreateEnum
CREATE TYPE "tracking_session_status" AS ENUM ('ACTIVE', 'ENDED');

-- CreateTable
CREATE TABLE "tracking_sessions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "started_by_id" UUID NOT NULL,
    "status" "tracking_session_status" NOT NULL DEFAULT 'ACTIVE',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tracking_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_observations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "event_id" VARCHAR(160) NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "accuracy_meters" DECIMAL(8,2),
    "captured_at" TIMESTAMP(3) NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "location_observations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tracking_sessions_organization_id_status_employee_id_idx" ON "tracking_sessions"("organization_id", "status", "employee_id");

-- CreateIndex
CREATE INDEX "tracking_sessions_employee_id_started_at_idx" ON "tracking_sessions"("employee_id", "started_at");

-- CreateIndex
CREATE INDEX "location_observations_organization_id_received_at_idx" ON "location_observations"("organization_id", "received_at");

-- CreateIndex
CREATE INDEX "location_observations_employee_id_captured_at_idx" ON "location_observations"("employee_id", "captured_at");

-- CreateIndex
CREATE INDEX "location_observations_session_id_captured_at_idx" ON "location_observations"("session_id", "captured_at");

-- CreateIndex
CREATE UNIQUE INDEX "location_observations_employee_id_event_id_key" ON "location_observations"("employee_id", "event_id");

-- AddForeignKey
ALTER TABLE "tracking_sessions" ADD CONSTRAINT "tracking_sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_sessions" ADD CONSTRAINT "tracking_sessions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_sessions" ADD CONSTRAINT "tracking_sessions_started_by_id_fkey" FOREIGN KEY ("started_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_observations" ADD CONSTRAINT "location_observations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_observations" ADD CONSTRAINT "location_observations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_observations" ADD CONSTRAINT "location_observations_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "tracking_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
