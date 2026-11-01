# GeoField Pro Employee Mobile

## Prerequisites

- Node.js 22+
- pnpm 10+
- Expo Go or an Android emulator
- A reachable GeoField Pro API instance

## Configuration

Set `EXPO_PUBLIC_API_BASE_URL` to the API URL including `/api/v1`.

PowerShell example:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL = "http://10.0.2.2:3000/api/v1"
pnpm --filter @geofield/employee-mobile start
```

Use the host machine's LAN address for a physical device. `localhost` refers to
the device itself, and Android emulators generally use `10.0.2.2` to reach the
host machine.

## Commands

```powershell
pnpm install
pnpm --filter @geofield/employee-mobile start
pnpm --filter @geofield/employee-mobile android
pnpm --filter @geofield/employee-mobile build
```

The app uses the Phase 03 mobile authentication contract:

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/accept-invitation`

Refresh tokens are stored in Expo SecureStore and rotated through the API.
Access tokens remain in memory for the current process. Passwords and tokens are
never logged.

## Current limitations

The current backend exposes authentication, health and readiness endpoints only.
Assignments, attendance, map data, reports and surveys therefore show explicit
unavailable states rather than fabricated records or successful actions. Location
permission is not requested until a configured location-backed feature exists.
