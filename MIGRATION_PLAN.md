# Base44 to React + Vite migration plan

## Audit summary

The application is already a React 18/Vite single-page application. Base44 is
used only through `src/api/base44Client.js`, the Base44 Vite plugin, app
parameter handling, and the frontend calls that use that client. No Base44
backend functions or agents are present in the repository. Thirteen entity
schemas define the persisted data model.

The retained application features are project, vendor, risk, BOQ, progress,
dashboard, reporting, company profile, team management, exports, routing,
and the existing authentication screens.

## Migration steps

1. Capture a successful baseline Vite production build.
2. Remove the Base44 Vite plugin and Base44 package dependencies.
3. Replace the SDK gateway with a local, persistent browser data service that
   maintains the existing client contract:
   - entity CRUD, `filter`, sorting, and bulk create/update;
   - local file upload as data URLs;
   - local CSV extraction for BOQ imports;
   - local email/invitation records;
   - local registration, OTP verification, passwords, reset tokens, and
     session management.
4. Replace Base44-specific authentication state and URL parameters with the
   local service while preserving protected routes and screens.
5. Update branding, scripts, README, and configuration for a standard Vite
   workflow. Retain schema files as data-model documentation until a server
   migration is selected.
6. After every implementation step run `npm run build`; finish with lint and
   type checking, addressing all reported application errors.

## Data and deployment note

This repository contains no Base44 data export, server implementation, or
credentials for a replacement hosted backend. The migration therefore keeps
the app fully functional in a standard static React/Vite deployment using
browser-local persistence. Migrating existing hosted Base44 records and
accounts requires a separately supplied data export and a chosen backend.
