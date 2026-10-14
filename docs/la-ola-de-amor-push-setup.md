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

## Oct 13 — Match push language to the guest's EN/ES guide setting

Both official festival pushes and automatic La Plática guestbook alert templates already include English (`en`) and Spanish (`es`) titles and bodies. Previously, OneSignal defaulted its profile language from the phone/browser, which can differ from the guide's explicit language switch. The Festival Guide now invokes OneSignal Web SDK v16 `OneSignal.User.setLanguage('en'|'es')` after initialization, again when a guest changes the guide language, and when a new subscription is created/opted in. This does not override OS notification permission or re-enable opted-out alert categories.

The guide's language choice is persisted in `laOlaGuideLang` and reused when a notification deep-link opens the app. Festival Updates continues displaying the bilingual announcement title/body under the selected language; a guest can always use the existing EN/ES language selector to switch after opening. OneSignal defaults to English if its user language does not match the available translations, per OneSignal's documented fallback.

**Scope:** This automatically localizes official Festival push templates and **generic** La Plática new-message alert copy. It does **not** translate free-form notes written by guests. OneSignal sends do not retroactively change a notification that was already delivered. Guests must open the updated installed guide at least once online after the release so that OneSignal can receive the app-language override before their next push.

**Testing:** On an opted-in test device set the phone/browser language to English but set the guide to Spanish, then verify the OneSignal profile language changes to `es`; repeat in reverse, send a future authorized test, and confirm lock-screen text plus deep-linked announcement. Avoid triggering another group beta or scheduling the 14 wedding alerts simply to test language.

## Oct 13 — V3 approved: 31 timed festival push notices + 12 contingent activation drafts

**Supersedes earlier 14-alert preview/scheduling count and the earlier Thursday 7 PM reminder.** The couple authorized an expanded high-frequency bilingual festival experience and publication, with a report of confirmed provider scheduling. Source of truth: `scripts/content/loda-push-program.json` (schema 2). This release embeds the identical 31 IDs, UTC instants and EN/ES title/body text in `scripts/supabase/loda-festival-push/index.ts`. The host-only preview/scheduling panel refers to **31** and the date window Thursday Oct 15–Saturday Oct 17, Guadalajara `America/Mexico_City` (-06:00). Host authentication, device test, one-per-day group beta, opt-in tags, language overrides, explicit schedule confirmation, idempotency/receipt records and the two-entry Festival Updates feed are unchanged.

**Thursday:** The sole scheduled Thursday candidate is **12:00 PM**, announcing the **3:00 PM festival setup pre-party at La Tijera**. All attendees, locals and Casa Sol/Casa Luna guests are welcome to stop by, help or hang out. Guests who prefer to preserve the surprise should come Friday. The earlier Thursday 7 PM teaser is removed.

**Additional intimate moments:** Fri 5:30 PM public love note for Bri; Fri 6:30 PM public love note for Jon; Fri 11:15 PM “Hey you” love note to every guest; Sat 2:15 PM shared note for Bri + Jon and the community. All are general broadcast notices (not private individually addressed push sends).

**31 operator-reviewed dated broadcast candidates (full bilingual messages in canonical JSON):**

| Guadalajara time | Event ID | English heading | Spanish heading |
|---|---|---|---|
| Thu 12:00 PM | `thursday-setup-party` | TODAY: SETUP PRE-PARTY! 🛠️🌊 | ¡HOY: PRE-FIESTA DE MONTAJE! 🛠️🌊 |
| Fri 11:00 AM | `wedding-day` | TODAY IS THE DAY! 🌞 | ¡HOY ES EL GRAN DÍA! 🌞 |
| Fri 2:30 PM | `on-the-way` | THE WAVE IS WAITING 🚗🌊 | ¡LA OLA LOS ESPERA! 🚗🌊 |
| Fri 3:00 PM | `welcome` | WELCOME TO LA OLA! 🌊 | ¡BIENVENIDOS A LA OLA! 🌊 |
| Fri 4:00 PM | `seating` | CEREMONY SEATING 💍 | ASIENTOS PARA LA CEREMONIA 💍 |
| Fri 4:15 PM | `seating-final` | ONE LAST NUDGE 🤍 | ÚLTIMO AVISO 🤍 |
| Fri 5:00 PM | `gates` | LET THE CELEBRATION BEGIN! 🎺 | ¡QUE EMPIECE LA FIESTA! 🎺 |
| Fri 5:26 PM | `love-bri` | SHUG, LOOK WHAT LOVE BUILT 🤍 | SHUG, MIRA LO QUE CREÓ EL AMOR 🤍 |
| Fri 5:45 PM | `explore-plaza` | EXPLORE YOUR PLAZA 🏘️ | ¡RECORRAN SU PLAZA! 🏘️ |
| Fri 6:15 PM | `mirror` | FOUND THE MAGIC MIRROR? 📸 | ¿YA VISTE EL ESPEJO MÁGICO? 📸 |
| Fri 6:32 PM | `love-jon` | SHUG, DON'T MISS THIS MOMENT 🤍 | SHUG, NO TE PIERDAS ESTE MOMENTO 🤍 |
| Fri 6:45 PM | `memory-walls` | THESE ARE OUR PEOPLE ❤️ | ESTA ES NUESTRA GENTE ❤️ |
| Fri 7:00 PM | `sunset` | SUNSET SELECTORS ☀️ | SUNSET SELECTORS ☀️ |
| Fri 7:40 PM | `formal-soon` | SOMETHING SPECIAL IS COMING 🤍 | SE VIENE ALGO ESPECIAL 🤍 |
| Fri 8:00 PM | `entrance` | A MOMENT FOR BRI + JON 🤍 | UN MOMENTO PARA BRI + JON 🤍 |
| Fri 9:35 PM | `desserts` | SOMETHING SWEET! 🍰 | ¡ALGO DULCECITO! 🍰 |
| Fri 9:55 PM | `mirror-again` | ROUND TWO AT THE MIRROR! 📸 | ¡SEGUNDA VUELTA AL ESPEJO! 📸 |
| Fri 10:15 PM | `couple-photo` | MAKE A MEMORY 📷 | VAMOS A HACER UN RECUERDO 📷 |
| Fri 10:45 PM | `time-machine` | LA MÁQUINA DEL TIEMPO ⏳ | LA MÁQUINA DEL TIEMPO ⏳ |
| Fri 11:08 PM | `love-our-people` | HEY YOU. YES, YOU. 🫵❤️ | OYE, TÚ. SÍ, TÚ. 🫵❤️ |
| Fri 11:30 PM | `keep-dancing` | YOU KNOW THIS ONE! 🎶 | ¡ESTA TE LA SABES! 🎶 |
| Sat 12:00 AM | `midnight-last-call` | LAST CALL · 1 AM 🍹 | ÚLTIMA RONDA · 1 AM 🍹 |
| Sat 12:30 AM | `water-and-bar` | 30 MINUTES LEFT! ⏰ | ¡QUEDAN 30 MINUTOS! ⏰ |
| Sat 1:00 AM | `afters-self-serve` | YOU REALLY THOUGHT THAT WAS LAST CALL? 😂 | ¿DE VERDAD CREÍSTE QUE ERA LA ÚLTIMA? 😂 |
| Sat 1:30 AM | `neon-last-wave` | ONE LAST WAVE 🌙 | UNA ÚLTIMA OLA 🌙 |
| Sat 10:30 AM | `wake-up` | Y'ALL STILL ALIVE? 😂 | ¿SIGUEN VIVOS? 😂 |
| Sat 11:45 AM | `tornaboda` | ONE MORE WAVE TODAY 🌮 | ¡HOY NOS QUEDA OTRA OLA! 🌮 |
| Sat 12:30 PM | `afterglow` | THE AFTERGLOW ☀️ | LA OLA CONTINÚA ☀️ |
| Sat 2:32 PM | `love-together` | BRI + JON, LOOK AROUND AGAIN 🤍 | BRI + JON, VUELVAN A MIRAR 🤍 |
| Sat 3:30 PM | `tornaboda-photo` | ONE MORE PICTURE? 📸 | ¿OTRA FOTITO? 📸 |
| Sat 4:45 PM | `thank-you` | THANK YOU FOR BEING OUR WAVE ❤️ | GRACIAS POR SER PARTE DE NUESTRA OLA ❤️ |

**12 manual-cue-only drafts:** `elotes`, `group-photo-perreo`, `perreo`, `dancers`, `cabezones`, `zanqueros`, `robots`, `late-night-carts`, `crepes`, `cocina-oculta`, `taquiza`, `inflagol`. These have natural full EN/ES title and body in the canonical JSON and **no send time**. They are NOT part of the 31 and are not scheduled. The existing host panel has no general “Send specific surprise draft now” action; implement explicit guarded operator dispatch separately before claiming they can be broadcast from the app. Trigger only when the vendor/performer is actually operating. The big group photo and Perreo Paraíso are production-cued, never clock-cued; let DJ/photographer authorize each.

**Operational risks / final timing signoffs:** The 4 PM and 4:15 PM ceremony-seat reminders match the current family briefing, but production sources disagree about the actual ceremony start; confirm with ceremony coordinators. The 8 PM formal segment has flexible duration; no timed broadcast for speeches or photo. Magic Mirror has documented 5–7 PM and 9–11 PM windows. The midnight bar notice assumes staffed service ends at 1 AM; the 1 AM self-serve reveal assumes safe bar provisions are prepared. DJ/VJ ends at 2 AM; no invitation to unapproved post-2 AM amplified music. Early-afternoon Saturday food and activities must not be promised as confirmed until vendor readiness. Do not add fixed clock alerts for elotes/crepes/Maruchan/robots/Cocina Oculta while operational facts conflict.

**Release states must be separated:**
- A merged GitHub PR and a passing Pages deploy mean the **app interface and proposed copy are live**.
- A successful Supabase Edge Function deploy means the **protected API is ready to accept scheduling requests**.
- Only **actual OneSignal API acceptance + a `public.loda_push_schedule` receipt per event** means a push is **scheduled**. The count can be read with `SELECT count(*) FROM public.loda_push_schedule`; expected 31.
- The `schedule` action still requires Jon/Bri’s private host credentials via La Plática → Hosts only → Unlock → Review 31 alerts → Schedule 31 festival alerts + confirmation. Never fake host authentication, access secrets in chat, or bypass its authentication for publication. Run the action at least a few minutes before Thursday noon. If the provider rejects a message partway through, log accepted IDs and retry the protected schedule action; idempotent receipts skip already-accepted messages.
- Proof of device receipt remains separate from a scheduling receipt. Spanish/English language choice will synchronize when guests open the updated installed guide online.

**Do not use the older 2-event `scripts/festival-push-schedule.mjs` manual script** in addition to the 31-event host schedule—it risks duplicate or incomplete sends. Two midnight in-app release notices remain a previously published fallback; official remote push announcements, once scheduled, will appear in the saved unified Festival Updates history at their release time. 

## Oct 13 — Owner-approved Stress Report beta and retired 4:36 PM GIF announcement

The owner requested two **distinct actions**:

1. Remove the original October 13, 2026 **4:36 PM Guadalajara** beta titled **LA OLA DE AMOR 🌊🔔** from **public Festival Updates**. The exact `beta-2026-10-13` row, provider ID `fac2f9b8-d828-4ca4-a92c-ec8c09cd3d35`, was deleted and a separate readback showed the public feed empty. The existing row in `public.loda_push_beta_runs` **must remain untouched** as the audit receipt and as protection against a duplicate send on the same day. OneSignal sends and OS notifications already received cannot be recalled; this deletion removes the announcement only from the app's public feed. Guide `guide.js` excludes the retired ID from **both locally cached and online** feed rows to avoid old offline copies resurrecting it after a client update. Original history feed links should no longer show the removed entry after the updated app refreshes.
2. Name and offer a **new, distinct one-time beta** called **Beta Test — The Stress Report**. Canonical complete EN/ES title and body: `scripts/content/loda-stress-report-beta.json`; includes Jon's joking stress report, his love for Bri, how the guests will soon outnumber him, and invitation to post a 🌊 in the chat. The private host interface **replaces the previous daily GIF beta button** with **Beta Test — The Stress Report 🌊🔔**. The ordinary daily beta server action remains for historical receipt behavior but is no longer exposed in the host UI.

**Sending safeguards:** `loda-festival-push` handles distinct `action: "stress_report"` only after existing origin/JWT/private-host verification. It uses the Festival Alerts opted-in tag, bilingual OneSignal payload, deterministic one-time idempotency key `beta-stress-report-2026-10-13`, and the new private `public.loda_push_special_beta_runs` table (RLS enabled, no anon/authenticated rights, service-role access only). If OneSignal accepted it, the protected handler records its unique provider receipt and then writes the corresponding public bilingual Festival Updates history. Repeating the host button returns `alreadySent` without broadcasting again. The old beta's one-per-day quota, wedding `loda_push_schedule` receipts, and the **31 timed wedding alerts** are untouched.

**Owner action:** After the website + edge function deploy, open installed Festival Guide → La Plática → Hosts only → Unlock → **Beta Test — The Stress Report** → confirm the ONE immediate broadcast. This does **not** automatically send now and does **not** schedule the 31 wedding alerts. A successful provider receipt confirms acceptance, **not** delivery/reading on every device; collect chat waves (🌊). The retired Oct 13 beta remains absent from public feed after refresh. Keep private audit receipt intact.

**Publishing checklist:** Merge code after automated tests pass, deploy website from main and edge function with JWT verification still ON, verify new private table/RLS, old beta feed absent, new beta count initially zero, 31 wedding notifications still unchanged, and record actual statuses. Do not claim that this new beta was **sent** unless the host button returns a provider acceptance receipt.


## Oct 13 — Shug notes, surprise minutes and host-login repair

Both personal note headings and opening salutations now use **Shug**, with white hearts. The four `love-*` notes use randomly selected irregular minutes, frozen in the canonical program for consistent review and provider idempotency. These times stay in their original cocktail, late-dance and Tornaboda windows; timed operational cues and all 12 manual-only drafts retain their timing model. Existing Sunset Selectors, La Máquina del Tiempo, Night Frequency and Neon Mirage alerts, plus the manual Perreo draft, point guests to **Sol y Luna Main Stage / escenario principal Sol y Luna**. Total remains 31.

The host confirmation contained an unescaped apostrophe in “Thursday's”, causing a JavaScript parse error before any login listener could run. Escaped it, added a syntax regression check, and rotated the offline cache. Host preview now shows the complete title and body in the selected language. Backend auth, audience filtering, schedule confirmation and receipts remain enforced. At revision time, `loda_push_schedule` had zero rows; publication does not send or queue these messages.

## Oct 13 — Final 31-alert host control audit (stale "14" label correction)

Problem reproduced from owner's iPhone screenshot: the actual `loda-festival-push` backend on Supabase version 13 has **31** protected dated showflow events and the approved canonical `scripts/content/loda-push-program.json` also has 31 (plus 12 unscheduled activation drafts). However, the pre-rendered HTML host panel still displayed **"schedule 14 moments"**, **"Review the 14 alerts"**, and **"Schedule 14 festival alerts"**. The runtime `la-platica-host.js` localization strings correctly showed 31, but it only refreshed `[data-host-copy]` after a guest tapped the language switch. This was a genuine misleading initial-render bug, not missing alerts.

Patch: correct all three initial HTML strings to 31/Thursday–Saturday, invoke `updateHostCopy()` during host-JS initialization and on language changes, and bump the separate offline app service-worker cache to `v21-20261013-verified-31-host-schedule`. Host scheduling retains the private password/JWT flow, requiring an explicit confirmation and targeting opted-in Festival Alerts subscriptions only. After the authenticated scheduler responds, the client requests a protected `status` readback and counts **only rows carrying a real `provider_notification_id`**. Only 31/31 provider receipts earns a success message; partial/failed runs show the actual count, with idempotent retry available. There is no new public scheduling endpoint and this patch **does not schedule any notifications**.

**Apple Web Push policy (unchanged):** iOS web-app notification permission requires the person to install the Home Screen web app and give explicit permission from a user gesture; we cannot automatically turn on iOS system push. After OS permission and OneSignal opt-in, the default Festival and La Plática topics are ON, with the guest's deliberate individual choices persisted via `laOlaPushPreferenceV1` in localStorage and synchronized to OneSignal tags. "Pause alerts" is the action offered **while opted in**, not the current status. Tapping it opts out and suppresses pushes. Never advise guests to turn Festival announcements OFF to reset their subscription. Preserve English/Spanish OneSignal language sync and a separate OneSignal push worker. Keep Festival topics checked for wedding messages, La Plática optional.

**Pre-activation check:** After successful PR tests/Pages deployment, reload/reopen installed app while online until host controls show **Review 31 alerts / Schedule 31 festival alerts** (English) or **Revisar 31 avisos / Programar 31 avisos** (Spanish). Confirm that Supabase status still has 0 scheduled entries until Jon explicitly schedules; do not treat publishing or provider beta delivery as scheduling the 31. Open Hosts only, unlock, review, tap Schedule 31, confirm; require app to report all 31 receipts, then query server `loda_push_schedule` to double-check. The first scheduled candidate is Thu Oct 15 at noon Guadalajara time. A OneSignal acceptance receipt guarantees a queued request, not per-device delivery.
