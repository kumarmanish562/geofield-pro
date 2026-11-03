# Isolated PostgreSQL/PostGIS backup and restore

This procedure is for a disposable development or CI database only. Never run
the `DROP DATABASE` or restore commands against production. Production backup
retention, encryption keys, access controls, and recovery objectives must be
configured by the deployment owner.

## Local procedure

1. Start an isolated GeoField database with `pnpm db:up` and apply migrations
   with `pnpm db:deploy`.
2. Set `DATABASE_URL` to that disposable database and make sure it contains no
   production data or credentials.
3. Write a custom-format backup with `pg_dump --format=custom --no-owner
   --no-privileges --file=geofield-test.dump "$DATABASE_URL"`.
4. Create a separate empty restore database, for example
   `geofield_restore_test`, on the same disposable PostgreSQL instance.
5. Restore using `pg_restore --no-owner --no-privileges --dbname
   "$RESTORE_DATABASE_URL" geofield-test.dump`.
6. Verify `PostGIS_Full_Version()`, migration/table integrity, counts for
   `organizations`, `users`, `villages`, and `location_observations`, and
   geometry preservation (count and EWKB checksums for non-null village
   boundaries).
7. Remove only the disposable restore database after recording results.

Store backups outside the repository, protect them as sensitive data, and
remove temporary backup artifacts after verification. Production deployments
must encrypt backup files and restrict their storage and restore credentials.

## CI procedure

The API workflow creates a custom-format dump of its isolated PostGIS service,
restores it to a separate ephemeral database, and compares basic table counts,
boundary geometry count/checksum, and PostGIS availability. The job never
connects to production.

## Evidence status

Local restoration could not be executed during this audit because the Docker
daemon/PostgreSQL service was unavailable. The CI step is the repeatable
verification path; its first successful run must be reviewed before closing
the operational finding.
