# La Ola de Amor · real push alerts (operator handoff)

**Status:** Public OneSignal App ID configured in the integration branch (7a08d6ee-1181-4925-bd3f-1a7a7439aaee). Push delivery is NOT verified, no users are subscribed via this new feature, and no notifications have been scheduled. Finish release and real-device testing before relying on it.

## How the setup works

- The Festival Guide is an existing installable PWA with its own **offline** service worker under `la-ola-de-amor/scan/sw.js`.
- This change adds an opt-in card inside Festival Updates, a **separate-scope** OneSignal service worker under `la-ola-de-amor/scan/onesignal/`, and bilingual scripts. The existing offline worker remains intact.
- The in-guide notices from PR #58 are scheduled by local time when the guide is open; true push messages need OneSignal's servers.
- Guests never see a permission prompt automatically. Tapping "Enable festival alerts" is voluntary. The screen supports opt-out.
- iPhone and iPad: guests must install the guide to their Home Screen (iOS 16.4+), then launch the saved web app and opt in. Safari tabs cannot receive iOS Web Push directly.
- Push requires internet and OS notification permission. Offline guide content still works without it. Browser/OS Focus or notification restrictions may delay or hide messages.

## 1. Provision provider — organizer action

1. Create a OneSignal **Web Push** app named `La Ola de Amor`, on the **Free** plan.
2. Under OneSignal Web settings, use the **actual production HTTPS site origin** where the OLA HQ site is deployed. Do not use a pull request preview or a local hostname.
3. Choose custom service worker settings:
   - Worker path: the live guide's `/la-ola-de-amor/scan/onesignal/OneSignalSDKWorker.js` (including any repository/project prefix).
   - Scope: same folder, ending `/la-ola-de-amor/scan/onesignal/`. This must NOT take over the offline `/scan/` scope.
   - The client `push-config.js` derives both paths from its own served URL, handling GitHub Pages prefix automatically.
4. **Completed:** The public App ID from OneSignal > Settings > Keys & IDs has been added to `la-ola-de-amor/scan/guide/push-config.js`. No secret keys are in the repository.
5. **NEVER** commit or put OneSignal REST API keys, tokens, app credentials, or a send endpoint in public client-side files, HTML, JavaScript, screenshots or PR comments. Keep REST key in a local environment for scheduling only. Don't share it in chat.

## 2. Merge/release and test before messaging

- This release branch starts from **PR #58 already merged to main** (timed in-app notices). PR #37 also touches Festival Guide; do not overwrite its unreviewed edits.
- Merge only after the provider App ID is configured and the branch passes release verification; publishing remains an organizer/release decision.
- Check the public worker URL returns JavaScript, not HTML or a 404, and check the site uses HTTPS.
- iPhone test: in Safari use Share > Add to Home Screen, launch the installed `La Ola de Amor` icon, open Festival Updates, tap "Enable festival alerts 🔔", accept notification permission.
- In OneSignal > Audience > Subscriptions confirm an actual subscribed web-push device.
- Send a **test-only push** from the OneSignal dashboard to that one test subscription; verify banner / notification and `#updates` deep link. Also test ES/EN label toggle and pausing alerts.
- Verify offline shell still works and installed guide still updates, including after service worker cache refresh.
- Until a real device has received a test push, do not tell guests push is operational.

## 3. Schedule final two notifications

Use the OneSignal dashboard's **Send Later / Specific Time** option (not Intelligent Delivery / timezone-local delivery) and use Guadalajara time `America/Mexico_City` (UTC-06:00). Dates are **Saturday, October 17**, because midnight after the Friday reception falls on Saturday:

| When in Guadalajara | OneSignal UTC time | English title | English text |
| --- | --- | --- | --- |
| Oct 17 **12:00 AM** | `2026-10-17T06:00:00Z` | `LAST CALL · 1:00 AM 🍹` | `La Ola, your one-hour warning: our staffed bar closes at 1:00 AM. Grab your last bartender-made drink, raise a glass, and keep the music going. 🌊` |
| Oct 17 **1:00 AM** | `2026-10-17T07:00:00Z` | `YOU REALLY THOUGHT THAT WAS LAST CALL? 😂` | `You really thought that was last call? Our bartenders are off the clock, but the afters just started. Want another drink? Head to the bar and serve yourself. In fact… serve us all one. 🌊` |

Spanish translations already live in the canonical `scripts/content/festival-updates.json`; use the same titles/bodies. Point clicks to the live Festival Guide's `#updates` screen.

**Alternative scripted scheduling** (optional, only once, only after live device verification):

```sh
export ONESIGNAL_APP_ID='<public app uuid>'
export GUIDE_URL='https://<live-site-domain>/<optional-prefix>/la-ola-de-amor/scan/guide/'
node scripts/festival-push-schedule.mjs                  # dry run: inspect local date/UTC payloads
export ONESIGNAL_REST_API_KEY='<secret only in local terminal environment>'
node scripts/festival-push-schedule.mjs --send           # makes two scheduled API requests
```

The script refuses past dates, validates the exact two planned announcements, and uses stable idempotency keys. After running, confirm **both** scheduled notifications in the OneSignal dashboard and keep returned notification IDs in the organizer's private records. Do **not** schedule via both dashboard and script; that would duplicate them.

## 4. Staffed-bar rule

- Waiter team: six people, **1 PM–1 AM requested** (12 hours); $7,500 MXN is a working budget, originally quoted for only ten hours. Confirm pricing with Claudia.
- 12:00 AM notification says "last call" for **staffed** bar service at 1:00 AM.
- 1:00 AM notification announces the self-serve afters (1–2 AM). The afters announcement is a playful invitation; make the self-serve setup safe and leave water, mixers, cups and ice.

## Troubleshooting / boundaries

- **No visible card:** public App ID is missing/invalid, page is an old offline edition, or this branch is not deployed.
- **No native prompt on iPhone:** open the installed Home Screen web app rather than Safari. Also ensure iOS 16.4+ and notifications aren't blocked in Settings.
- **Offline worker replaced:** wrong custom OneSignal worker scope; isolate under `scan/onesignal/`.
- **Push did not arrive:** verify subscriber exists, provider delivery, device connection and OS notification settings.
- **No account / App ID / provider setup yet:** source code cannot actually send push notifications. In-app timed notices remain the fallback.
- **No server secrets in the web app.** The provider API key may be used on the organizer machine only.

References: [OneSignal Web SDK v16](https://github.com/OneSignal/OneSignal-Website-SDK/blob/main/MIGRATION_GUIDE.md), [OneSignal free-plan pricing](https://onesignal.com/pricing), [iOS Web Push](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).


## New: 2 distinct notification topics and in-app host delivery tools (Oct 12)

- Subscribed guests see two independent topic choices in **Festival Updates**:
  - **Festival announcements**: **ON by default** after explicit OS push opt-in; targets `loda_festival=true`.
  - **La Plática**: **ON by default** when the guest first opts in to OS push permission; targets `loda_platica=true`. Guests can uncheck either topic or pause all notifications; previously saved manual OFF choices remain OFF.
- These categories only operate while the overall push subscription is enabled. Turning off push at OS/app level stops all notifications. User tags are synced upon init and when preferences change.
- The **closed-app experience** uses OneSignal's remote Web Push. It works on supported iPhone Home Screen installations (iOS 16.4+) and supported desktop/Android browsers only if the recipient is opted in, has internet, and OS delivery is allowed. The page doesn't need to remain open. Delivery may be delayed by Focus mode, networking, OS limitations, or the push provider.
- **La Plática** writes remain public in the guestbook but push content is generic: it never includes the guest's name or submitted text. The protected server sends one optional alert at most every five minutes, only after a successful legitimate post, using a service-role-only throttle. Host moderation and posting rate limits are unchanged.
- **Host-only controls** appear after unlocking the existing La Plática host area with a valid private host password. They offer **Test this device** (targets ONLY the present subscribed device) and **Schedule midnight & 1 AM** (schedules the two festival-only messages once). Use Test before Schedule. Duplicate scheduling is guarded by server receipts and OneSignal idempotency keys.
- Server support: active protected Supabase Edge Functions `loda-festival-push` (host-only admin) and `loda-guest-wall` (existing guestbook plus optional push), in project `fgtowzonkmirmugnzlsf`. Both use the existing Supabase JWT middleware; the admin also verifies the existing private host token. Edge source and database migration are tracked under `scripts/supabase/`, intentionally excluded from the publicly deployed website.
- **Required private configuration:** In **Supabase Dashboard > Project Ola HQ > Edge Functions > Secrets**, create **ONESIGNAL_REST_API_KEY** with the private **OneSignal REST API Key**, obtained from **OneSignal > Settings > Keys & IDs**. This key must be typed directly into Supabase's private Secrets UI. **Never paste it in ChatGPT, GitHub, the browser console, any code file, or an issue/PR.** The OneSignal App ID is public and already configured.
- Until Supabase has that secret, all push sends return `PUSH_NOT_CONFIGURED` and **no remote push can be sent, scheduled, or delivered**. Guestbook entries remain functional and the pre-existing locally timed in-app notices remain functional.
- With secret configured, open the installed guide, enable push, use **Hosts only > Unlock** with Jon/Bri host credentials, then **Send test to this phone**. Lock phone and confirm banner/deep link. After success, use **Schedule midnight & 1 AM** once and verify successful scheduling in the host panel / OneSignal dashboard. No other audience receives the test.
- Two events: Guadalajara Saturday Oct 17 **00:00** (UTC 06:00), **01:00** (UTC 07:00). Neither message is sent immediately; OneSignal schedules remote delivery at the event time.
- For live device debugging, host panel errors identify missing secret vs unavailable provider. Guestbook automatic notices remain best-effort and cannot block note posting.
- **No all-audience blast:** the scheduled festival messages use `loda_festival=true` only, and guestbook uses `loda_platica=true` only. This protects guests' separate preferences.

### Oct 12 change: short-event topic defaults

Both notification categories are ON after a guest explicitly enables iOS/browser push notifications, because the festival runs for only one or two days. Users can uncheck either category or pause all. The iPhone/browser permission prompt remains required and never runs automatically. We deliberately preserve explicit choices in localStorage; legacy tags automatically set to `loda_platica=false` are overwritten on return **only when no saved personal choice exists**. A subscribed guest must load the updated guide before refreshed topic tags are synced to OneSignal.


## October 12 full-day notification showflow

The host-only scheduler has been expanded from the original two bar surprises to **14 bilingual, Guadalajara-local, dated festival moments**. The canonical source is `scripts/content/loda-push-program.json`. It covers arrival (3 PM), ceremony seating (4 PM and 4:15 PM), opening mariachi (5 PM), Magic Mirror (6:15 PM), Sunset Selectors (7 PM), entrances (8 PM), group photo and Perreo Paraíso (9 PM), desserts (9:35 PM), photos with the couple if available (10:15 PM), La Máquina del Tiempo (10:45 PM), midnight Night Frequency + last staffed-bar call, 1 AM Neon Mirage + surprise self-service afters, and Saturday Tornaboda reminder (11:45 AM).

In the installed Festival Guide, use **La Plática → Hosts only → Unlock**, then:
- **Review the 14 alerts** to preview bilingual copy and whether each event is already scheduled. Preview is authenticated and works even if OneSignal's private REST secret is not configured.
- **Send test to this phone** to test one subscribed iPhone (needs the private Supabase secret).
- **Schedule 14 festival alerts** to queue timed pushes on OneSignal (needs the private Supabase secret). This is a bulk action with a confirmation and idempotent per-event schedule receipts. Scheduling doesn't deliver messages early.
- Device closed is supported by remote push only if guests added the Festival Guide to their iPhone Home Screen, granted notifications and have connectivity. Merely visiting in Safari does not subscribe the guest.

**Surprise dancers/roaming activations stay DRAFT ONLY** until the DJ supplies actual activation start times; these are intentionally not included among the 14. At that point, schedule the follow-up about 15 minutes into a confirmed activation; don't claim performers are in a particular spot without confirmation.

**Ops risk:** 14 pushes in approximately 21 hours may feel like a lot, especially with separate La Plática alerts. Keep categories user-controlled, avoid repeat reminders, and don't send drafts until activation timings are known. Consider reducing the schedule after host preview if the experience feels too busy.

**Beta tester request:** Before relying on the program, ask two or three guests to install the guide, enable notifications, lock their phones, and confirm a directed test push. Do not report closed-app delivery as tested just because the opt-in toggle says ON. The private `ONESIGNAL_REST_API_KEY` stays only in Supabase Edge Functions → Secrets and must never appear in GitHub or chat.

## Oct 12 — Beta broadcast button

There is a dedicated **Send beta test to subscribed friends** button in the protected Jon/Bri La Plática host panel, separate from the single-device test and from the **Schedule 14 festival alerts** action. It sends immediately only to current OneSignal push devices tagged `loda_festival=true`, and only after confirmation from the authenticated host. It never sends future ceremony or wedding announcements early.

OneSignal's provider acceptance is **not** proof of successful lock-screen delivery: ask recipients to post their secret GIF in the group chat. No GIF is not definitive proof of failed delivery; confirm device subscriptions separately. A service-role-only `loda_push_beta_runs` table and stable daily idempotency key prevent accidentally repeating the test within the same Mexico-local day. The source is tracked in `scripts/supabase/loda-festival-push/index.ts` and the new DB migration.

To run: open the installed guide while online → Festival Updates → La Plática → Hosts only → Unlock host tools → **Send beta test to subscribed friends 🧪** → Confirm. Verify with Bri and two friends, then separately choose when to schedule the 14 wedding pushes. No automatic remote push is sent just by deploying this feature.

## Oct 12, 11:21 PM — beta provider rejection triage

At 23:21 Guadalajara local time the protected `loda-festival-push` beta endpoint returned HTTP 502 (provider request not accepted / no message ID). The host app displayed a generic warning. The function was reached using a valid host session; it did **not** fail due to absent UI controls. As of the triage, no `loda_push_beta_runs` receipts and no `loda_push_schedule` receipts existed.

The function now safely differentiates the OneSignal HTTP result: `NO_MATCHING_SUBSCRIPTIONS` (provider accepted request but returned no ID, commonly zero eligible subscribers), `KEY_REJECTED` (401/403), `APP_ID_INVALID`, `AUDIENCE_INVALID`, `ACCOUNT_LIMIT`, `REQUEST_INVALID`, and `PROVIDER_ERROR`. Only code and HTTP status are shown to the authenticated host. Provider response bodies, credentials, and secrets are not exposed.

The guide now waits for OneSignal to finish setting both category tags and re-syncs them when a device subscription is created, to prevent the group tag filter from incorrectly missing newly subscribed guests.

Next: update installed Guide; unlock host tools; repeat **Send beta test to subscribed friends**. If it fails, capture the error code now shown. Check OneSignal Users & subscriptions to confirm at least one **Subscribed** device, and inspect the `loda_festival=true` tag. Do **not** schedule the 14 wedding alerts until provider acceptance and actual lock-screen delivery are verified.


## Oct 13 — Final group beta copy and GIF-confirmation follow-up (approved)

**Scope:** Replace only the bilingual `action=beta` copy in `scripts/supabase/loda-festival-push/index.ts`. Preserve the per-phone `action=test`, audience `loda_festival=true` tag, host credentials, one-per-local-day receipt guard, 14 wedding scheduling cues, and existing midnight in-app announcements. No test send or scheduled delivery is implied by this copy change. The beta action remains a **host-triggered immediate send**, with no booked time slot.

**Group beta title, EN/ES:** LA OLA DE AMOR 🌊🔔

**EN notification:**

> If you're reading this, IT WORKED! 😂 Just making sure a little festival magic is reaching you. So far, so good! 🤫 Don't mention this alert in the chat just yet. Instead, drop a GIF showing what you expect to look like by the end of La Ola de Amor. That's how we'll know you got it. The celebration is almost here! 🌊

**ES notification:**

> ¡Si estás leyendo esto, FUNCIONÓ! 😂 Solo queremos asegurarnos de que te esté llegando un poquito de magia del festival. ¡Hasta ahora, todo bien! 🤫 Todavía no menciones esta alerta en el chat. Mejor manda un GIF de cómo crees que vas a estar al final de La Ola de Amor. Así sabremos que te llegó. ¡La celebración ya casi está aquí! 🌊

**Follow-up — prepared for a manual message in the group chat AFTER GIFs start arriving; not an automatic push and not queued for a clock time.**

English:

> AHAHAHA okay, looks like it worked! 😂🔔
>
> And judging by these GIFs, we've got some absolute MENACES getting ready for this weekend. 💀🌊 Some of y'all are planning to go HARD.
>
> Alright, now that we know the festival alerts are working for some of us, you guys have one mission: help us get everybody connected. 🫡
>
> Help your people get La Ola de Amor installed on their phones and their Festival Alerts turned on.
>
> If anyone in the group is having trouble downloading the app, setting it up, or getting notifications, just let us know. We'll help them get everything working.
>
> Consider yourselves our official festival test crew. 😂🫶
>
> Three days. One wave. We're almost there! 🌊

Español:

> JAJAJA, ¡parece que sí funcionó! 😂🔔
>
> Y viendo estos GIFs, ya vimos que hay unos verdaderos DESCONTROLADOS listos para este fin de semana. 💀🌊 ¡Algunos vienen con todo!
>
> Ahora que sabemos que a varios sí les están llegando las alertas, tienen una misión: ayudarnos a conectar a todos. 🫡
>
> Ayuden a su gente a instalar La Ola de Amor en el teléfono y activar las Alertas del Festival.
>
> Si alguien del grupo tiene problemas para instalar la app, configurarla o recibir notificaciones, avísenos. ¡Le ayudamos a dejar todo listo!
>
> Ya son oficialmente nuestro equipo de pruebas del festival. 😂🫶
>
> Tres días. Una ola. ¡Ya casi llega! 🌊

**Operator checklist:** (1) Check subscribers and OneSignal credentials; (2) send beta only with explicit host confirmation through La Plática → Hosts only → Send beta test to subscribed friends; (3) verify real lock-screen arrivals and GIF replies; (4) post the follow-up to the group chat manually after replies appear; (5) do not confuse this beta test with scheduling the 14 wedding pushes. Long push text may be truncated by phone lock-screen display; the open notification should be checked on a real device.

## Oct 13 — Unified festival push history, top-two front page

**Official festival broadcast pushes and the Festival Updates screen now share a durable publication record** in `public.loda_festival_notification_history` (source migration: `scripts/supabase/migrations/loda_festival_notification_history_feed.sql`). This table is public **read-only** with a time-gated RLS SELECT policy. Only the host-protected Edge Function with service-role authorization can save a broadcast. No guest can publish or alter it through the app.

- Every **accepted group beta** broadcast is saved once, including its bilingual title/body and provider message ID. Today's accepted Oct 13 beta is backfilled exactly once from the authentic `loda_push_beta_runs` receipt.
- Every host-scheduled **festival showflow** push is saved with its send time. The public history remains hidden before that time, so surprises are not exposed.
- Each official push deep-links to its announcement under `#updates/{id}`; a guest opening Festival Updates sees the latest **two** notices and a **third “View all updates”** button when history contains more than two. “View all” reveals the complete released broadcast list. Older notices are retained, not destroyed. The legacy private archive of never-pushed, outdated drafts remains private and preserved; existing in-app midnight notices are kept.
- The guide refreshes the public history online and caches its last successful fetch for offline reading. The existing `Festival Updates` static source remains an offline fallback.
- This is an official **festival broadcast** inbox, not a capture of every operating-system notification: private one-device tests and automatic La Plática new-note alerts do **not** appear as public festival notices or clutter the latest two.
- Host workflow does not change: **Send beta test** is manual and one per Mexico-local day; **Schedule 14 festival alerts** remains separate and requires explicit host approval. Changes to this inbox **do not** schedule or send any pushes. Do not manually send equivalent OneSignal notices outside the protected function or they will not be recorded automatically.

**Operational verification:** The public history table, release-only RLS SELECT, and backfilled 2026-10-13 beta were checked. The guide's new release depends on the website's GitHub Pages deployment and offline service-worker update. A provider acceptance receipt is still not proof that recipients saw a lock-screen banner.
