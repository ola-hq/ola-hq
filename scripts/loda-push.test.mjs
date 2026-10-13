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

test('festival and guestbook category controls are distinct, guestbook starts OFF', () => {
  assert.match(page, /id="guide-push-festival" type="checkbox" checked/);
  assert.match(page, /id="guide-push-platica" type="checkbox"/);
  assert.doesNotMatch(page, /id="guide-push-platica" type="checkbox" checked/);
  assert.match(client, /choices = \{ festival: true, platica: false \}/);
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
