# SHKJ Project Management

A standard React 18 and Vite single-page application for construction project management.

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

## Super Admin Access

A default Super Admin account is automatically created on first application load:

- **Email:** `admin@shkj.co.id`
- **Password:** `Admin@12345`

This account has full access to all features including user management,
approval workflows, and audit logs. Change the password after first login.

## Roles

| Role | Access Level | Description |
|------|-------------|-------------|
| Super Admin | 5 | Full system access |
| Project Director | 5 | Full project oversight |
| Project Manager | 4 | Project management |
| Project Officer | 4 | Project support |
| Site Engineer | 3 | On-site engineering |
| Supervisor | 3 | Site supervision |
| HSE Officer | 3 | Health, safety, environment |
| Consultant MK | 3 | Management consultant |
| Procurement | 2 | Procurement & purchasing |
| Vendor | 2 | Vendor access |
| User Department | 1 | Department user |
| Management | 1 | Management view |
| Viewer | 1 | Read-only access |

## Deployment

The application is configured for Vercel deployment. See `vercel.json` for settings.