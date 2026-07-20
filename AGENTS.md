# AGENTS.md

## Project Context

This is a standard React and Vite application repository. Treat it as user-owned application code, keep changes focused on the user's request, and preserve existing project conventions.

Start with `README.md` for local setup, environment variables, and publish workflow.

## Key Files

- `src/`: frontend application source.
- `src/api/appClient.js`: browser-local data, file, email-queue, and authentication service.
- `vite.config.js`: native Vite configuration and source alias setup.
- `base44/entities/`: retained JSONC data-model reference for a future server migration.

## Working Notes

- Use `npm run dev` for local development.
- Keep browser-local persistence behind `src/api/appClient.js` so a future hosted backend can replace it without changing UI modules.
- Never commit secrets from `.env.local`.
- Run the relevant checks from `package.json` before finishing code changes.
