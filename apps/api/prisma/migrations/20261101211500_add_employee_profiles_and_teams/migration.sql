CREATE TYPE "team_status" AS ENUM ('ACTIVE', 'ARCHIVED');

CREATE TABLE "employee_profiles" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "employee_code" VARCHAR(50),
    "job_title" VARCHAR(120),
    "phone" VARCHAR(30),
    "supervisor_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "employee_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "teams" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "supervisor_id" UUID,
    "status" "team_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "team_memberships" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "team_memberships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "employee_profiles_user_id_key" ON "employee_profiles"("user_id");
CREATE UNIQUE INDEX "employee_profiles_organization_id_employee_code_key" ON "employee_profiles"("organization_id", "employee_code");
CREATE INDEX "employee_profiles_organization_id_supervisor_id_idx" ON "employee_profiles"("organization_id", "supervisor_id");
CREATE UNIQUE INDEX "teams_organization_id_name_key" ON "teams"("organization_id", "name");
CREATE INDEX "teams_organization_id_status_idx" ON "teams"("organization_id", "status");
CREATE INDEX "teams_organization_id_supervisor_id_idx" ON "teams"("organization_id", "supervisor_id");
CREATE UNIQUE INDEX "team_memberships_team_id_user_id_key" ON "team_memberships"("team_id", "user_id");
CREATE INDEX "team_memberships_user_id_idx" ON "team_memberships"("user_id");

ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_supervisor_id_fkey"
  FOREIGN KEY ("supervisor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "teams" ADD CONSTRAINT "teams_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "teams" ADD CONSTRAINT "teams_supervisor_id_fkey"
  FOREIGN KEY ("supervisor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_team_id_fkey"
  FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
