import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

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


test('current showflow matches protected server exactly and drafts are never scheduled', () => {
  const program = JSON.parse(read('scripts/content/loda-push-program.json'));
  assert.equal(program.timeZone, 'America/Mexico_City');
  assert.equal(program.events.length, 38);
  assert(program.drafts.every(item => !('at' in item)));
  assert.equal(program.drafts.length, 12);
  assert.equal(program.events.find(e=>e.id==='thursday-setup-party').at, '2026-10-15T12:00:00-06:00');
  assert.deepEqual(program.events.filter(item=>item.id.startsWith('love-')).map(item=>item.id),
    ['love-bri','love-jon','love-our-people','love-together']);
  assert(program.events.every(item=>item.title.en && item.title.es && item.body.en && item.body.es));
  assert(program.drafts.every(item=>item.status==='manual_cue_only' && item.title.en && item.title.es && item.body.en && item.body.es));
  assert.match(host, /Schedule festival alerts/);
  assert.match(host, /Programar avisos del festival/);
  assert.match(host, /for\(let attempt=0;attempt<8;attempt\+\+\)/);

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
  assert.match(sw, /v23-20261015-set-heads-up/);
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
  assert.match(sw, /v23-20261015-set-heads-up/);
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
  assert.match(guide, /retiredPushHistoryIds=new Set\(\['beta-2026-10-13','beta-stress-report-2026-10-13'\]\)/);
  assert.match(guide, /pushHistory=rows\.filter\(row=>!retiredPushHistoryIds\.has\(row\?\.id\)\)/);
  assert(!JSON.parse(read('scripts/content/loda-push-program.json')).events.some(x=>x.id===report.id));
});

test('host controls parse before registering login and preview includes complete message', () => {
  assert.doesNotThrow(() => new Script(host));
  assert.match(host, /item\.body\[lang\(\)\]/);
});
test('special notes use irregular frozen times and stage directions stay in existing set cues', () => {
  const program = JSON.parse(read('scripts/content/loda-push-program.json'));
  const special = program.events.filter(e => e.id.startsWith('love-'));
  assert.equal(special.length, 4);
  assert(special.every(e => new Date(e.at).getUTCMinutes() % 5 !== 0));
  assert.equal(new Set(program.events.map(e => e.at)).size, program.events.length);
  for (const id of ['love-bri', 'love-jon']) {
    const e = special.find(e => e.id === id);
    assert(e.title.en.startsWith('SHUG,'));
    assert(e.title.es.startsWith('SHUG,'));
    assert(e.title.en.includes('🤍') && e.title.es.includes('🤍'));
    assert(e.body.en.startsWith('Shug,') && e.body.es.startsWith('Shug,'));
  }
  for (const id of ['sunset','time-machine','midnight-last-call','afters-self-serve']) {
    const e = program.events.find(e => e.id === id);
    assert(e.body.en.includes('Sol y Luna Main Stage'));
    assert(e.body.es.includes('escenario principal Sol y Luna'));
  }
});

test('host shows current program controls and verifies provider receipts after scheduling', () => {
  assert.match(page, /Review the current bilingual festival alerts/);
  assert.match(page, /Review festival alerts ↗/);
  assert.match(page, /Schedule festival alerts 🪩/);
  assert.doesNotMatch(page, /schedule 14 moments|Review the 14 alerts|Schedule 14 festival alerts/);
  assert.match(page, /id="guide-push-festival" type="checkbox" checked/);
  assert.match(page, /id="guide-push-platica" type="checkbox" checked/);
  assert.match(host, /function updateHostCopy\(\)/);
  assert.match(host, /updateHostCopy\(\);/);
  assert.match(host, /state=await confirmedScheduleState\(\)/);
  assert.match(host, /sendPush\('status'\)/);
  assert.match(host, /item\.provider_notification_id/);
  assert.match(host, /state\.count>=state\.total/);
  assert.match(host, /schedulePartial/);
  assert.match(host, /await sendPush\('schedule'\)/);
  assert.doesNotThrow(() => new Script(host));
});

test('all current event IDs are allowed in the production DB constraint',()=>{
 const ids=JSON.parse(read('scripts/content/loda-push-program.json')).events.map(x=>x.id);
 const migration=read('scripts/supabase/migrations/loda_add_set_heads_up_and_setup_start.sql');
 assert.equal(ids.length,38);
 for(const id of ids)assert(migration.includes("'"+id+"'"),"DB constraint missing "+id);
 assert.match(migration,/drop constraint loda_push_schedule_event_id_check/);
 assert.match(migration,/add constraint loda_push_schedule_event_id_check/);
});
test('protected scheduling sends in small batches and verifies the current program',()=>{
 assert.match(admin,/const MAX_NEW_PER_REQUEST=5/);
 assert.match(admin,/acceptedThisPass>=MAX_NEW_PER_REQUEST/);
 assert.match(admin,/status:"pending"/);
 assert.match(admin,/idempotency_key:await eventKey\(event.id\)/);
 assert.match(admin,/SCHEDULED_BUT_RECEIPT_FAILED/);
 assert.match(host,/attempt<8/);
 assert.match(host,/const next=await confirmedScheduleState\(\)/);
 assert.match(host,/next\.count<=state\.count/);
 assert.match(host,/sendPush\('status'\)/);
 assert.doesNotThrow(() => new Script(host));
});


test('set heads-ups are five minutes before planned starts across midnight',()=>{
 const events=JSON.parse(read('scripts/content/loda-push-program.json')).events;
 for(const [id,start] of [
 ['sunset-five-minutes','2026-10-16T19:00:00-06:00'],
 ['perreo-five-minutes','2026-10-16T21:00:00-06:00'],
 ['time-machine-five-minutes','2026-10-16T22:45:00-06:00'],
 ['night-frequency-five-minutes','2026-10-17T00:00:00-06:00'],
 ['neon-five-minutes','2026-10-17T01:00:00-06:00']]){
  assert.equal(Date.parse(start)-Date.parse(events.find(e=>e.id===id).at),300000);
 }
 assert.match(events.find(e=>e.id==='perreo-five-minutes').body.en,/group photo/);
 assert.equal(new Date(events.find(e=>e.id==='thursday-setup-begins').at).toISOString(),'2026-10-15T22:00:00.000Z');
});
test('host schedules additions in batches beyond the original31 and confirms all receipts',async()=>{
 const section=host.slice(host.indexOf('async function confirmedScheduleState'),host.indexOf("by('platica-host-push-preview')"));
 async function scenario(counts,fail=false){
  let i=0,calls=0,notice='';const button={disabled:false};
  const context={sendPush:async action=>{
   if(action==='schedule'){calls++;if(fail)throw Error('FAIL');return {results:[{status:'scheduled'}]};}
   const count=counts[Math.min(i++,counts.length-1)];
   return {scheduled:Array.from({length:count-1},(_,n)=>({event_id:'e'+n,provider_notification_id:'p'+n})),additionalScheduled:[{event_id:'extra',provider_notification_id:'extra-id'}],total:38};
  },confirm:()=>true,by:id=>id==='platica-host-push-result'?{textContent:notice}:button,
  t:k=>({schedulePartial:'%COUNT% of %TOTAL%',scheduleDone:'DONE',scheduleAlready:'ALREADY'})[k]||k,
  displayPushResult:s=>{notice=s},pushError:()=>{notice='ERROR'}};
  new Script(section+';globalThis.run=schedulePush;').runInNewContext(context);
  await context.run();return {calls,notice,button};
 }
 let result=await scenario([32,37,38]);assert.equal(result.calls,2);assert.equal(result.notice,'DONE');assert.equal(result.button.disabled,false);
 result=await scenario([38]);assert.equal(result.calls,0);assert.equal(result.notice,'ALREADY');
 result=await scenario([32,32],true);assert.match(result.notice,/ERROR 32 of 38/);
});

test('festival copy uses wave and ola consistently in both languages', () => {
  const events = JSON.parse(admin.slice(admin.indexOf('const scheduled=')+16,admin.indexOf('] as const;')+1));
  assert.equal(events.length,38);
  for (const e of events) assert.doesNotMatch(JSON.stringify([e.heading,e.body]), /chapter|capítulo/i);
  const sunset=events.find(e=>e.id==='sunset-five-minutes');
  assert.match(sunset.body.en,/next wave starts at 7 PM/);
  assert.match(sunset.body.es,/siguiente ola empieza a las 7 PM/);
});
test('brand replacement targets only verified obsolete receipts and preserves retry keys', async () => {
  const helper=admin.slice(admin.indexOf('function replacementRevision'),admin.indexOf('Deno.serve'));
  const js=helper.replace('eventId:string,providerId:string):string|null','eventId,providerId)').replace('event:typeof scheduled[number], oldId:string, revision:string','event,oldId,revision');
  async function scenario({canceled=false,delivered=false,cancelFails=false}={}) {
    const calls=[], updates=[], eqs=[];
    const chain={error:null,eq:(key,value)=>{eqs.push([key,value]);return chain;}};
    const scope={
      Deno:{env:{get:()=> 'test-key'}},APP_ID:'test-app',GUIDE:'https://example.test/#updates',AbortSignal,
      fetch:async (_url,opts)=>{calls.push(opts.method||'GET');return {ok:!cancelFails||opts.method!=='DELETE',json:async()=>opts.method==='DELETE'?{success:!cancelFails}:{id:'old',successful:delivered?1:0,canceled}};},
      deliver:async payload=>{calls.push('deliver');updates.push(payload);return {id:'new'};},
      db:{from:()=>({update:value=>{calls.push('save');updates.push(value);return chain;}})},
      rememberFestivalPush:async()=>{calls.push('feed');return true;},eventKey:async id=>'key:'+id
    };
    new Script(js+';globalThis.branding={replacementRevision,replaceQueuedEvent};').runInNewContext(scope);
    const api=scope.branding;
    assert.equal(api.replacementRevision('water-and-bar','3cd403fd-f20c-4523-af59-5a40e58f0fa8'),'wave-brand-v1');
    assert.equal(api.replacementRevision('water-and-bar','new'),null);
    assert.equal(api.replacementRevision('sunset-five-minutes','anything'),null);
    const result=await api.replaceQueuedEvent({id:'water-and-bar',at:'2026-10-17T06:30:00.000Z',heading:{en:'title'},body:{en:'wave'}},'old','wave-brand-v1');
    return {result,calls,updates,eqs};
  }
  let r=await scenario();
  assert.deepEqual(r.calls,['GET','DELETE','deliver','save','feed']);
  assert.equal(r.updates[0].idempotency_key,'key:water-and-bar:wave-brand-v1');
  assert.equal(r.updates[0].send_after,'2026-10-17T06:30:00.000Z');
  assert.deepEqual(r.eqs,[['event_id','water-and-bar'],['provider_notification_id','old']]);
  r=await scenario({canceled:true});
  assert.deepEqual(r.calls,['GET','deliver','save','feed']);
  assert.equal(r.updates[0].idempotency_key,'key:water-and-bar:wave-brand-v1');
  r=await scenario({delivered:true});assert.equal(r.result.status,409);assert.deepEqual(r.calls,['GET']);
  r=await scenario({cancelFails:true});assert.equal(r.result.status,503);assert.deepEqual(r.calls,['GET','DELETE']);
});
