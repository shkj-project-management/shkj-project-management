# Email deployment checklist

- [ ] Confirm the `resend` dependency is installed (`npm ci` installs it from `package-lock.json`).
- [ ] In Resend, verify the domain used by the sender identity.
- [ ] In Vercel → Project → Settings → Environment Variables, add `RESEND_API_KEY` with a Resend API key. Enable it for Production, Preview, and Development as appropriate.
- [ ] Add `EMAIL_FROM` with a verified Resend sender identity, for example `SHKJ Project Management <notifications@example.com>`.
- [ ] Optionally add `VITE_API_URL` only when the browser app is hosted separately from its Vercel API. Set it to the deployed app origin without a trailing slash.
- [ ] Redeploy after changing server-side environment variables.
- [ ] Send a registration OTP, password-reset request, and project notification. Confirm each request receives HTTP 200 with `{ "status": "sent", "id": "..." }` and confirm delivery in Resend logs.

`RESEND_API_KEY` and `EMAIL_FROM` are the two required Vercel variables. Do not prefix either with `VITE_`, because that would expose the API key to the browser.

For local-only UI work, add `VITE_DISABLE_EMAIL_CONFIRMATION=true` to `.env.local`. This flag is honored only by Vite development builds and cannot disable production email confirmation.
