import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const page = read('la-ola-de-amor/scan/guide/index.html');
const client = read('la-ola-de-amor/scan/guide/push.js');
const host = read('la-ola-de-amor/scan/guide/la-platica-host.js');
const admin = read('scripts/supabase/loda-festival-push/index.ts');
const wall = read('scripts/supabase/loda-guest-wall/index.ts');
const schedule = read('scripts/festival-push-schedule.mjs');
const sw = read('la-ola-de-amor/scan/sw.js');

test('both notification topics start ON after explicit OS push opt-in; later choices persist', () => {
  assert.match(page, /id="guide-push-festival" type="checkbox" checked/);
  assert.match(page, /id="guide-push-platica" type="checkbox"/);
  assert.match(client, /choices = \{ festival: true, platica: true \}/);
  assert.match(client, /localStorage\.getItem\(preferenceKey\)/);
  assert.match(client, /localStorage\.setItem\(preferenceKey/);
  assert.doesNotMatch(client, /choices = \{ festival: tags\.loda_festival/);
  assert.match(client, /loda_festival/);
  assert.match(client, /loda_platica/);
  assert.match(client, /signal\.User\.addTags/);
  assert.match(client, /window\.LA_OLA_PUSH/);
});
test('host-only test and schedule calls never expose OneSignal REST key', () => {
  assert.match(page, /id="platica-host-push-test"/);
  assert.match(page, /id="platica-host-push-schedule"/);
  assert.match(host, /sendPush\('test'/);
  assert.match(host, /sendPush\('schedule'/);
  assert.match(host, /x-loda-moderator-token/);
  assert.match(admin, /await validHost\(req\)/);
  assert.match(admin, /include_subscription_ids/);
  assert.match(admin, /loda_push_schedule/);
  assert.match(admin, /ONESIGNAL_REST_API_KEY/);
  assert.doesNotMatch(page+client+host, /ONESIGNAL_REST_API_KEY/);
});
test('automatic guestbook push is targeted, generic, throttled and optional', () => {
  assert.match(wall, /notifyNewGuestNote/);
  assert.match(wall, /loda_claim_push_slot/);
  assert.match(wall, /cooldown_seconds:300/);
  assert.match(wall, /loda_platica/);
  assert.match(wall, /Someone left a little love/);
  assert.doesNotMatch(wall.slice(wall.indexOf('async function notifyNewGuestNote'),wall.indexOf('Deno.serve(async(req)=>{')), /guest_name|guest_name:\s*name|body\.message/); // No guest-identifying content in push payload.
  assert.match(wall, /if\(!key\)return/);
  assert.match(admin, /key:"loda_festival"/);
  assert.match(schedule, /key: 'loda_festival'/);
});
test('separate push service worker and offline worker are preserved', () => {
  assert.match(sw, /guide\/push\.js/);
  assert.match(sw, /guide\/push-config\.js/);
  assert.match(page, /src="push\.js"/);
  assert.match(page, /src="push-config\.js"/);
  assert.match(read('la-ola-de-amor/scan/onesignal/OneSignalSDKWorker.js'), /OneSignalSDK\.sw\.js/);
});


test('31-event showflow matches protected server exactly and drafts are never scheduled', () => {
  const program = JSON.parse(read('scripts/content/loda-push-program.json'));
  assert.equal(program.timeZone, 'America/Mexico_City');
  assert.equal(program.events.length, 31);
  assert(program.drafts.every(item => !('at' in item)));
  assert.equal(program.drafts.length, 12);
  assert.equal(program.events[0].id, 'thursday-setup-party');
  assert.equal(program.events[0].at, '2026-10-15T12:00:00-06:00');
  assert.deepEqual(program.events.filter(item=>item.id.startsWith('love-')).map(item=>item.id),
    ['love-bri','love-jon','love-our-people','love-together']);
  assert(program.events.every(item=>item.title.en && item.title.es && item.body.en && item.body.es));
  assert(program.drafts.every(item=>item.status==='manual_cue_only' && item.title.en && item.title.es && item.body.en && item.body.es));
  assert.match(host, /Schedule 31 festival alerts/);
  assert.match(host, /Programar 31 avisos/);
  assert.match(host, /data.results\?\.length===31/);

  const begin = admin.indexOf('const scheduled=');
  const end = admin.indexOf(' as const;', begin);
  assert(begin >= 0 && end > begin);
  const embedded = JSON.parse(admin.slice(begin + 'const scheduled='.length, end));
  assert.deepEqual(embedded.map(x => x.id), program.events.map(x => x.id));
  assert.deepEqual(embedded.map(x => x.at), program.events.map(x => new Date(x.at).toISOString()));
  assert.deepEqual(embedded.map(x => x.heading), program.events.map(x => x.title));
  assert.deepEqual(embedded.map(x => x.body), program.events.map(x => x.body));
  assert.deepEqual(embedded.filter(e => e.id === 'midnight-last-call' || e.id === 'afters-self-serve')
    .map(x => x.at), ['2026-10-17T06:00:00.000Z', '2026-10-17T07:00:00.000Z']);
  assert.match(page, /id="platica-host-push-preview"/);
  assert.match(host, /sendPush\('preview'\)/);
  assert.match(admin, /body.action==="preview"/);
  assert.match(admin, /loda_festival/);
  assert.doesNotMatch(page + client + host, /Authorization.+Key /);
});


test('beta broadcast is host-only, one per date, tag-filtered and independent of wedding scheduling', () => {
  assert.doesNotMatch(page, /id="platica-host-push-beta"/);
  assert.match(page, /id="platica-host-push-stress"/);
  assert.doesNotMatch(host, /sendPush\('beta'\)/);
  assert.match(host, /sendPush\('stress_report'\)/);
  assert.match(host, /confirm\(t\('stressConfirm'\)\)/);
  assert.match(admin, /await validHost\(req\)/);
  assert.match(admin, /body.action==="beta"/);
  assert.match(admin, /loda_push_beta_runs/);
  assert.match(admin, /idempotency_key:await eventKey\("beta-"/);
  assert.match(admin, /key:"loda_festival"/);
  assert.match(admin, /ONE.*SIGNAL_REST_API_KEY/);
  assert.match(admin, /if\(existing\)return reply\(\{ok:true,alreadySent:true/);
  assert.doesNotMatch(host+page, /Authorization:.?Key |ONESIGNAL_REST_API_KEY/);
});

test('beta failures expose safe diagnostics without leaking OneSignal credentials', () => {
  assert.match(admin, /providerCode=res\.ok && !payload\?\.id \? "NO_MATCHING_SUBSCRIPTIONS"/);
  assert.match(admin, /res\.status===401 \|\| res\.status===403 \? "KEY_REJECTED"/);
  assert.match(admin, /providerStatus:res\.status/);
  assert.match(host, /error\.providerCode=data\.providerCode/);
  assert.match(host, /function pushError\(error\)/);
  assert.match(client, /await signal\.User\.addTags/);
  assert.match(client, /PushSubscription\.addEventListener\('change'/);
  assert.doesNotMatch(host + page + client, /ONESIGNAL_REST_API_KEY/);
});

test('official festival pushes are saved in the read-only two-plus-history feed', () => {
  const guide = read('la-ola-de-amor/scan/guide/guide.js');
  const migration = read('scripts/supabase/migrations/loda_festival_notification_history_feed.sql');
  const backfill = read('scripts/supabase/migrations/loda_backfill_oct13_beta_feed.sql');
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /published_at <= now\(\)/);
  assert.match(migration, /grant select on public\.loda_festival_notification_history to anon, authenticated/i);
  assert.doesNotMatch(migration, /grant (insert|update|delete) .*to anon/i);
  assert.match(admin, /function rememberFestivalPush\(/);
  assert.match(admin, /rememberFestivalPush\(feedId,heading,message/);
  assert.match(admin, /rememberFestivalPush\(event\.id,event\.heading,event\.body/);
  assert.match(admin, /GUIDE\.replace\("#updates","#updates\/"/);
  assert.match(backfill, /from public\.loda_push_beta_runs/);
  assert.match(guide, /allFestivalUpdates\(\)/);
  assert.match(guide, /live\.slice\(0,2\)/);
  assert.match(guide, /data-route="\$\{showAll\?'updates':'updates\/all'\}"/);
  assert.match(guide, /localStorage\.setItem\(pushHistoryStorageKey/);
  assert.match(guide, /\?select=id,title_en,title_es,body_en,body_es,published_at,kind/);
  assert.match(sw, /v19-20261013-stress-report-beta/);
});

test('OneSignal uses the guest-selected guide language rather than the phone default', () => {
  const guide = read('la-ola-de-amor/scan/guide/guide.js');
  assert.match(client, /signal\.User\.setLanguage\(language\(\)\)/);
  assert.match(client, /syncNotificationLanguage\(\)/);
  assert.match(client, /MutationObserver\(\(\) => \{ render\(\); syncNotificationLanguage\(\); \}\)/);
  assert.match(client, /await OneSignal\.init\(/);
  assert.match(guide, /localStorage\.getItem\('laOlaGuideLang'\)/);
  assert.match(guide, /localStorage\.setItem\('laOlaGuideLang',lang\)/);
  assert.match(guide, /document\.documentElement\.lang=lang==='en'\?'en':'es-MX'/);
  assert.match(admin, /headings:\{en:/);
  assert.match(admin, /contents:\{en:/);
  assert.match(wall, /headings:\{en:.*es:/);
  assert.match(wall, /contents:\{en:.*es:/);
  assert.match(sw, /v19-20261013-stress-report-beta/);
});

test('Stress Report beta is separate, bilingual, host-protected, one time, and never schedules the wedding', () => {
  const report = JSON.parse(read('scripts/content/loda-stress-report-beta.json'));
  const migration = read('scripts/supabase/migrations/loda_independent_stress_report_beta_runs.sql');
  const guide = read('la-ola-de-amor/scan/guide/guide.js');
  assert.equal(report.id, 'beta-stress-report-2026-10-13');
  assert.match(report.heading.en, /Beta Test — The Stress Report/);
  assert.match(report.heading.es, /Prueba Beta/);
  assert(report.body.en.includes('ALRIGHT BITCHES'));
  assert(report.body.es.includes('A VER, CABRONES'));
  assert.match(admin, /body.action==="stress_report"/);
  assert(admin.includes('const feedId='+JSON.stringify(report.id)));
  assert(admin.includes('const heading='+JSON.stringify(report.heading)));
  assert(admin.includes('const message='+JSON.stringify(report.body)));
  assert.match(admin, /loda_push_special_beta_runs/);
  assert.match(admin, /idempotency_key:await eventKey\(feedId\)/);
  assert.match(admin, /rememberFestivalPush\(feedId,heading,message,new Date\(\)\.toISOString\(\),result.id,"beta"\)/);
  assert.match(admin, /key:"loda_festival"/);
  assert.match(host, /confirm\(t\('stressConfirm'\)\)/);
  assert.match(host, /sendPush\('stress_report'\)/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all .* from anon, authenticated/);
  assert.doesNotMatch(migration, /grant .* to anon, authenticated/);
  assert.match(guide, /retiredPushHistoryIds=new Set\(\['beta-2026-10-13'\]\)/);
  assert.match(guide, /pushHistory=rows\.filter\(row=>!retiredPushHistoryIds\.has\(row\?\.id\)\)/);
  assert(!JSON.parse(read('scripts/content/loda-push-program.json')).events.some(x=>x.id===report.id));
});
