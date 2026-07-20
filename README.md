# SHKJ Project Management

A standard React 18 and Vite single-page application.

## Requirements

- Node.js 20 or later
- npm

## Local development

```bash
npm install
npm run dev
```

## Validation and production build

```bash
npm run lint
npm run typecheck
npm run build
npm run preview
```

## Persistence and authentication

The application is self-contained and uses browser `localStorage` for its
records, uploaded file data, local session, and development authentication.
New registrations use the verification code `000000`. Project-schedule emails
are recorded in the local outbox instead of being sent by a hosted service.

The `base44/entities` JSONC files remain as the source data-model reference for
a future server migration. They are not required to run or build the app.
