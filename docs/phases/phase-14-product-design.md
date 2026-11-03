# Phase 14 — Product Design Implementation

This phase translates the GeoField Pro product design specification into the
existing React/Vite admin application and Expo employee application.

## Shared design language

- Dark navy workspace navigation with blue primary actions.
- Light operational canvas with white cards, restrained borders, and accessible
  status colors.
- Reusable KPI, review-row, progress, quick-action, map, and status surfaces.
- Responsive layouts preserve the operational information hierarchy on smaller
  screens.

## Admin web

- The sidebar now reads as a role-oriented operations workspace.
- The dashboard uses live survey statistics, review queue data, report summary
  data, and GPS-enabled survey points.
- The GIS preview is interactive and links to the full live map.
- Dashboard cards distinguish pending review, approved, correction-required,
  and total survey states.
- Village coverage, review queue, quick actions, and system status are visible
  without placeholder production claims.

## Employee mobile

- Home shows employee context, current attendance state, GPS readiness, current
  assignment, target/completed/pending-sync values, and operational status.
- Offline synchronization remains explicit through the pending queue count.
- Existing attendance, assignment, map, survey, and profile navigation is
  preserved.

## Validation

```powershell
pnpm --filter @geofield/admin-web build
pnpm --filter @geofield/employee-mobile build
pnpm lint
pnpm format:check
```

The map uses the existing Leaflet integration and only renders actual
GPS-enabled survey points returned by the API.
