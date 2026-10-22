# OLA visitor and click analytics

The public build injects the shared `analytics.js` into every HTML entrypoint, excluding redirects, the report and the privacy page. Reports: `/ola-hq/analytics/`, using the existing Jon/Bri La Plática host password. Raw events and the reporting RPC have no anon/authenticated access; report requests authenticate against active host token hashes. Codex can query the same table and `ola_analytics_report` through the connected Supabase project.

Apply `scripts/supabase/migrations/ola_analytics.sql`, then deploy `scripts/supabase/ola-analytics/index.ts` as `ola-analytics` with JWT verification enabled. Browser requests use the existing public anon JWT. Server credentials stay in Edge environment variables.

Counts begin when this release is live. Visitor = anonymous browser ID; visit = 30-minute inactivity session. App visitors use the Festival Guide / OLA HQ app routes. Installed app visits use standalone display mode. `appinstalled` is observed only where the browser supports it, so it is not an exact installation total. Reports use server-validated event timestamps; daily buckets use America/Mexico_City. The source page and link targets omit query strings. Button labels use static IDs/data attributes, never form values or user text. Stored referrers contain hostnames only. IP addresses become daily server-keyed digests for rate limiting, not raw stored addresses. Known bot user agents are ignored.

Browser choices: `olaAnalyticsDisabled=true` opts out. Do Not Track and Global Privacy Control also disable collection. The report and privacy pages are never tracked. Analytics failure never blocks navigation. Offline event queues are bounded to 100 records and seven days and replay with idempotent event UUIDs. Test events use `is_test=true` and are excluded from every report. No wedding-week data is backfilled.

Validation: `node --test scripts/analytics.test.mjs`; run the repository release checks before publishing. Verify a live page view/click in the database and the private report, confirm unauthenticated report and direct public table access are rejected, then delete verification events.
