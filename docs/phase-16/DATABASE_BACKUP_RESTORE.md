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
boundary geometry count and EWKB digest, and PostGIS availability. Restore
commands are verbose and emit stage markers to make a failed CI run
diagnosable. The job never connects to production.

## Evidence status

Local restoration could not be executed during this audit because the Docker
daemon/PostgreSQL service was unavailable. The isolated CI backup and restore
passed after pinning the API job to Ubuntu 24.04 so its PostgreSQL 16 client
matches the PostgreSQL 16 PostGIS service. Verified on commit `87a8590` by
both the [push run](https://github.com/kumarmanish562/geofield-pro/actions/runs/41676806191)
and [pull request run](https://github.com/kumarmanish562/geofield-pro/actions/runs/41676817157).
Production backup encryption, retention, and recovery objectives remain
deployment-owner responsibilities and were not verified by this CI drill.
