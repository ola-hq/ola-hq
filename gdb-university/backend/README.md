# Signed In After Midnight — GDB University

Live campus route: `gdb-university/campus-life.html#signed-in-after-midnight`

## Additive feature

This is a **separate, shared nightclub-yearbook wall**. The local Campus Passport, its 12 optional fieldwork stamps, four selected marks and PDF export remain unchanged. No automatic sync between Passport and the signature wall.

## Backend

Supabase project: `Ola HQ` (`fgtowzonkmirmugnzlsf`).
Database migration: `gdb_signed_in_after_midnight_v1`.
Table: `public.gdb_midnight_checkins`.
Edge Function: `gdb-midnight-wall`, deployed with JWT verification enabled; source is in `backend/gdb-midnight-wall.ts`.

The browser includes a publicly publishable legacy anonymous JWT solely to invoke the Edge Function; it does **not** contain any database server credentials.

Access: the table has RLS enabled and no public policies, and anonymous and authenticated direct table access is revoked. Only the Edge Function's server credentials read/write through Supabase. Its GET returns approved messages only; its POST creates *pending* signatures.

## Moderating submissions

Open the Supabase project dashboard → Table Editor → `public.gdb_midnight_checkins`.

- `pending`: newly submitted, invisible to visitors
- `approved`: visible on the public wall after refreshing
- `rejected`: hidden from visitors

Review nickname and optional message, change `status` to `approved` or `rejected`, then save. Do not publish messages containing private personal information, threats, harassment or spam. No admin credentials should be placed in the public website.

The `ip_hash` value is a keyed HMAC used for basic submission throttling, not a plaintext IP address. Submissions are limited to one per 60 seconds and five per 24 hours per visitor IP, with a honeypot field. These are basic protections, not complete bot prevention; add a CAPTCHA if abuse grows.

## Frontend files

- `gdbu-midnight.css`: isolated styling
- `gdbu-midnight.js`: modal, display, API and pending submission UX
- `campus-life.html`: additive button and accessible modal
- `index.html`: second link on the existing Campus Life card

No personal passport script or existing stamp markup should be changed during follow-up maintenance.

## QA limits

Server migration and database cooldown behavior were tested using a temporary submission that was deleted. The deployed Supabase function and website files can be inspected using project tools. External browser HTTP smoke tests and client-device interactions must be checked after publication because this runtime cannot reach the GitHub Pages / Supabase public host from the container.
