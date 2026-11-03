# GeoField Pro Employee Mobile

## Prerequisites

- Node.js 22+
- pnpm 10+
- Expo Go or an Android emulator
- A reachable GeoField Pro API instance

## Configuration

Copy `.env.example` to `.env` and keep `EXPO_PUBLIC_API_BASE_URL` pointed at
the API URL including `/api/v1`.

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

For an Android emulator, use `http://10.0.2.2:3000/api/v1`. For a physical
phone, use the computer's LAN IP address instead of `localhost` or
`10.0.2.2`. Survey photos upload to the local API and are stored in
`apps/api/uploads` during development.
