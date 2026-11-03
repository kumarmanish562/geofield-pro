# GeoField Pro

### GIS-Powered Field Workforce Management Platform

GeoField Pro is a field workforce management platform designed to help organizations manage employees, field assignments, attendance, GIS village boundaries, GPS tracking, field surveys, and operational reporting.

The platform provides two separate applications:

- **Admin Web Application:** For administrators, supervisors, and GIS analysts.
- **Employee Mobile Application:** For field employees working in the field, including offline environments.

The system combines geospatial capabilities, workforce management, secure APIs, and offline-first mobile workflows in a single platform.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Project Objectives](#project-objectives)
- [Applications](#applications)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Repository Structure](#repository-structure)
- [User Roles](#user-roles)
- [Core Features](#core-features)
- [Database Design](#database-design)
- [Security and Privacy](#security-and-privacy)
- [Development Roadmap](#development-roadmap)
- [Getting Started](#getting-started)
- [Environment Configuration](#environment-configuration)
- [Development Guidelines](#development-guidelines)
- [Testing Strategy](#testing-strategy)
- [Documentation](#documentation)
- [Git Workflow](#git-workflow)
- [Project Status](#project-status)

---

## Project Overview

Field operations often involve employees working across different villages, geographic regions, and remote locations. Managing these activities using spreadsheets, manual attendance registers, and disconnected systems can make coordination and reporting difficult.

GeoField Pro aims to address these challenges through a centralized platform.

The platform will allow organizations to:

- Manage employees and teams.
- Allocate and monitor field assignments.
- Record attendance and breaks.
- View authorized employee location observations.
- Manage village boundaries using GIS.
- Collect field survey information.
- Upload survey photographs and attachments.
- Work without continuous internet connectivity.
- Synchronize offline records safely.
- Review survey submissions.
- Generate operational reports.
- Maintain auditable records of important activities.

**Current development stage:** Phase 01 — Monorepo and Development Environment.

The project is being developed incrementally through documented implementation phases.

---

## Project Objectives

### 1. Workforce Management

Provide centralized employee, organization, and team management.

### 2. Field Assignment Management

Allow administrators and supervisors to create assignments, allocate employees, define schedules, and monitor progress.

### 3. Attendance Management

Record employee check-in, check-out, and breaks through controlled workflows.

### 4. GIS Integration

Use PostgreSQL and PostGIS to manage village boundaries, geographic data, and spatial queries.

### 5. Authorized GPS Tracking

Support transparent, purpose-limited location tracking during approved work periods.

### 6. Field Survey Collection

Enable employees to collect survey responses, capture photographs, and submit field information.

### 7. Offline-First Mobile Experience

Allow supported field operations to continue when internet connectivity is unavailable.

### 8. Secure Data Management

Enforce authentication, authorization, organization-level isolation, and auditing.

### 9. Operational Analytics

Provide authorized summaries of attendance, assignments, survey completion, and field activities.

---

## Applications

GeoField Pro contains three primary applications or services.

### Admin Web Application

**Location:** `apps/admin-web`

**Technology:** React, Vite, JavaScript.

Intended users:

- SUPER_ADMIN
- ADMIN
- SUPERVISOR
- GIS_ANALYST

Planned capabilities:

- Administrative dashboard.
- Organization management.
- Employee management.
- Team management.
- Assignment creation and allocation.
- Attendance monitoring.
- GIS map visualization.
- Village boundary management.
- Survey review.
- Reports and analytics.
- Notifications.
- Audit information for authorized users.

### Employee Mobile Application

**Location:** `apps/employee-mobile`

**Technology:** React Native, Expo, JavaScript.

Intended users:

- EMPLOYEE

Planned capabilities:

- Secure login.
- Employee profile.
- Assigned work.
- Assignment details.
- Check-in and check-out.
- Break management.
- Tracking status and permission handling.
- Field survey forms.
- Photograph capture and attachment uploads.
- Offline data collection.
- Pending synchronization queue.
- Synchronization status.
- Notifications.
- Survey submission history.

### Backend API

**Location:** `apps/api`

**Technology:** Node.js, Express.js, JavaScript ES modules.

Responsibilities:

- Authentication and authorization.
- Organization and employee management.
- Team management.
- Assignment management.
- Attendance operations.
- GIS data management.
- Authorized location ingestion.
- Survey management.
- Attachment handling.
- Offline synchronization.
- Notifications.
- Audit logging.
- Reporting.
- OpenAPI documentation.

The backend is the authoritative source for business rules, permissions, and data integrity.

---

## Technology Stack

### Frontend — Admin Web

- React
- Vite
- JavaScript
- React Router
- A suitable mapping library
- API client integration
- Vitest and appropriate component testing tools

### Mobile Application

- React Native
- Expo
- JavaScript
- Secure platform storage for sensitive tokens
- Local persistence for supported offline operations
- Mobile testing tools

### Backend

- Node.js
- Express.js
- JavaScript ES modules
- Zod
- JWT access tokens
- Rotating refresh tokens
- Socket.IO
- OpenAPI
- Swagger UI
- Vitest
- Supertest

### Database and GIS

- PostgreSQL
- PostGIS
- Prisma
- Reviewed SQL migrations
- Spatial indexes
- Database constraints and transactions

### Development and Infrastructure

- pnpm workspaces
- Git and GitHub
- Docker
- Docker Compose
- Environment-based configuration
- Automated testing
- Continuous integration

**Technology constraint:** This project uses JavaScript. TypeScript and Spring Boot are not part of the selected architecture.

---

## System Architecture

The platform follows a modular, API-centered architecture.

```text
                    GeoField Pro
                         |
             +-----------+-----------+
             |                       |
             v                       v
      Admin Web App           Employee Mobile App
      React + Vite            React Native + Expo
             |                       |
             +-----------+-----------+
                         |
                         | HTTPS / JSON
                         v
                  Express.js API
                         |
       +-----------------+------------------+
       |                 |                  |
       v                 v                  v
 Authentication    Business Modules    GIS and Location
       |                 |                  |
       +-----------------+------------------+
                         |
                         v
                PostgreSQL + PostGIS
                         |
          +--------------+--------------+
          |                             |
          v                             v
    Relational Data              Spatial Data

Additional capabilities:
- Socket.IO for authorized real-time updates
- Private storage for survey attachments
- Offline-first mobile persistence
- Idempotent synchronization
- Audit logging
- OpenAPI documentation
```

## Getting Started

Requirements:

- Node.js 22 or newer
- pnpm 10
- Docker Desktop for PostgreSQL/PostGIS

Install dependencies and configure the API:

```powershell
pnpm install
Copy-Item .env.example apps/api/.env
```

Start PostgreSQL, apply migrations, and generate Prisma Client:

```powershell
pnpm db:up
pnpm db:status
pnpm db:deploy
pnpm db:generate
pnpm db:seed
```

`pnpm db:seed` requires `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in
`apps/api/.env` and is limited to non-production environments.

Run the applications in separate terminals:

```powershell
pnpm dev
pnpm dev:web
pnpm dev:mobile
```

The API is available at `http://localhost:3000/api/v1`, the admin web
application at the Vite URL shown in the terminal, and Expo provides a QR
code or device-specific command for the mobile shell.

## Quality Checks

```powershell
pnpm format:check
pnpm lint
pnpm build:all
pnpm test
```

The API health, readiness, and Swagger endpoints are:

- `GET /api/v1/health`
- `GET /api/v1/ready`
- `GET /api/v1/docs`

## Notifications

Phase 15 notifications are persisted in PostgreSQL. Assignment, survey,
attendance, and sync-intervention events create in-app records and durable
delivery rows in their business transaction. The API process runs the
database-backed delivery/reminder worker; multiple API instances coordinate
through PostgreSQL row locks. Expo push is optional and off by default. See
[`docs/phase-15-notifications/architecture.md`](docs/phase-15-notifications/architecture.md)
for deployment and retry behavior.

Set `NOTIFICATION_PUSH_ENABLED=true` and configure Expo credentials on the
server to enable push delivery. Configure `EXPO_PUBLIC_EAS_PROJECT_ID` in the
mobile build to register Expo push tokens. In-app history works without push.
Email preferences are stored, but email delivery is not available until a
provider is configured.

## Project Status

Phase 01 is complete. The repository contains API, admin web, and employee
mobile application shells, shared workspace packages, environment setup,
quality tooling, and CI validation. Product functionality is intentionally
implemented in later phases according to the roadmap.
