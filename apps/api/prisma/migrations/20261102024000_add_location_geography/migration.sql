CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE "location_observations"
  ADD COLUMN "location_point" geography(Point, 4326);

UPDATE "location_observations"
SET "location_point" = ST_SetSRID(ST_MakePoint("longitude"::double precision, "latitude"::double precision), 4326)::geography;

CREATE INDEX "location_observations_location_point_gist_idx"
  ON "location_observations" USING GIST ("location_point");
