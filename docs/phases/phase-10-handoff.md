# Phase 10 Handoff — GIS Village and Boundary Management

## Status

Implemented on `phase-10-gis-village-boundaries`.

## Delivered

- Organization-scoped village metadata CRUD with role enforcement for `ADMIN` and `GIS_ANALYST`.
- PostGIS `geometry(MultiPolygon, 4326)` boundary storage and GiST index.
- GeoJSON `Feature` and `FeatureCollection` import for `Polygon` and `MultiPolygon`.
- WGS84 longitude/latitude validation, ring/geometry validation through PostGIS, duplicate-code detection, and persisted import history.
- GeoJSON single-village and collection export.
- PostGIS point-in-polygon queries using `ST_Covers`, including boundary-edge points.
- Admin village list, search, import action, and boundary status display.
- Employee village endpoint restricted by assignment work-area code/name.

## API

- `GET/POST /api/v1/villages`
- `GET/PATCH /api/v1/villages/:id`
- `GET /api/v1/villages/:id/export`
- `GET /api/v1/villages/export`
- `POST /api/v1/villages/imports/geojson`
- `GET /api/v1/villages/imports`
- `GET /api/v1/villages/spatial/point?longitude=&latitude=`

GeoJSON is RFC 7946 WGS84 only and coordinates are always `[longitude, latitude]`. Boundary points are included with `ST_Covers`. Employee access is limited to villages whose code or name matches a published assignment work area; no client-supplied organization ID is accepted.

## Migration

- `20261102030000_add_village_gis_management`

The migration creates village/import tables, PostGIS geometry storage, metadata indexes, and the boundary GiST index. Shapefile ZIP import is intentionally not implemented because no vetted archive/CRS processing dependency is currently part of the deployment; GeoJSON is the supported import format.

## Verification

- Prisma client generation and migration deployment verified against local PostgreSQL/PostGIS.
- API, admin web, and employee mobile tests/builds run.
- ESLint and Prettier checks run.

## Known limitations

- The employee mobile screen lists authorized villages but does not yet render polygon overlays because the repository has no existing React Native map renderer. Add a vetted Expo-compatible map dependency and platform configuration before enabling native polygon rendering.
- Imports are bounded to 1,000 features and report feature-level metadata/geometry errors. A future large-file workflow should move processing to a background job.
