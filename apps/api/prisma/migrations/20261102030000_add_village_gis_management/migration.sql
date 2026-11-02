CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TYPE "village_status" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "village_import_status" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE "villages" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "code" VARCHAR(80) NOT NULL,
  "state" VARCHAR(120),
  "district" VARCHAR(120),
  "taluka" VARCHAR(120),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "status" "village_status" NOT NULL DEFAULT 'ACTIVE',
  "created_by_id" UUID NOT NULL,
  "updated_by_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "villages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "village_imports" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "initiated_by_id" UUID NOT NULL,
  "filename" VARCHAR(255) NOT NULL,
  "format" VARCHAR(30) NOT NULL,
  "status" "village_import_status" NOT NULL DEFAULT 'PROCESSING',
  "total_features" INTEGER NOT NULL DEFAULT 0,
  "accepted_features" INTEGER NOT NULL DEFAULT 0,
  "rejected_features" INTEGER NOT NULL DEFAULT 0,
  "error_summary" JSONB NOT NULL DEFAULT '[]',
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  CONSTRAINT "village_imports_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "villages" ADD COLUMN "boundary" geometry(MultiPolygon, 4326);
ALTER TABLE "villages" ADD CONSTRAINT "villages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "villages" ADD CONSTRAINT "villages_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "villages" ADD CONSTRAINT "villages_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "village_imports" ADD CONSTRAINT "village_imports_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "village_imports" ADD CONSTRAINT "village_imports_initiated_by_id_fkey" FOREIGN KEY ("initiated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "villages_organization_id_code_key" ON "villages"("organization_id", "code");
CREATE INDEX "villages_organization_id_status_idx" ON "villages"("organization_id", "status");
CREATE INDEX "villages_organization_id_district_taluka_idx" ON "villages"("organization_id", "district", "taluka");
CREATE INDEX "village_imports_organization_id_started_at_idx" ON "village_imports"("organization_id", "started_at");
CREATE INDEX "village_imports_organization_id_status_idx" ON "village_imports"("organization_id", "status");
CREATE INDEX "villages_boundary_gist_idx" ON "villages" USING GIST ("boundary");
