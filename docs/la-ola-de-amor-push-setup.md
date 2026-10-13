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
  - **Festival announcements**: enabled by default on previously opted-in devices; targets the OneSignal user tag `loda_festival=true`.
  - **La Plática**: **OFF by default** and requires explicit opt-in; targets `loda_platica=true`.
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
