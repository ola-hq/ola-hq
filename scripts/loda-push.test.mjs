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


test('14-event showflow matches protected server exactly and drafts are never scheduled', () => {
  const program = JSON.parse(read('scripts/content/loda-push-program.json'));
  assert.equal(program.timeZone, 'America/Mexico_City');
  assert.equal(program.events.length, 14);
  assert(program.drafts.every(item => !('at' in item)));
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
