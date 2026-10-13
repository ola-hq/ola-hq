// Prepare OneSignal push notifications from the canonical scheduled Festival Updates.
// Dry-run by default. Runs only on the event organizer's machine with environment-held secrets.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const DATA_PATH = 'scripts/content/festival-updates.json';

export function buildPushJobs(source, appId, guideUrl) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(appId)) throw new Error('OneSignal App ID must be a UUID');
  let origin;
  try { origin = new URL(guideUrl); } catch { throw new Error('GUIDE_URL must be a valid absolute URL'); }
  if (origin.protocol !== 'https:' || !origin.pathname.endsWith('/la-ola-de-amor/scan/guide/')) throw new Error('GUIDE_URL must be HTTPS and end with /la-ola-de-amor/scan/guide/');
  if (source.schema !== 1 || !Array.isArray(source.announcements)) throw new Error('Unrecognized announcement source');

  const scheduled = source.announcements.filter(e => e.status === 'scheduled');
  if (scheduled.length !== 2 || !['midnight-last-call','afters-self-serve'].every(id => scheduled.some(e => e.id === id))) {
    throw new Error('Expected exactly the two verified midnight/afters announcements');
  }
  return scheduled.map(entry => {
    if (!/2026-10-17T0[01]:00:00-06:00/.test(entry.releaseAt)) throw new Error('Unexpected release time');
    const event = entry.id === 'midnight-last-call' ? 'midnight' : 'afters';
    const heading = entry.title;
    const body = entry.body;
    const keyHex = createHash('sha256').update(appId + ':festival-push:' + entry.id + ':' + entry.releaseAt + ':' + entry.revision).digest('hex');
    // Stable UUID-shaped idempotency key prevents accidental repeat scheduling when rerun.
    const uuid = keyHex.slice(0,8)+'-'+keyHex.slice(8,12)+'-4'+keyHex.slice(13,16)+'-a'+keyHex.slice(17,20)+'-'+keyHex.slice(20,32);
    return {
      name: 'La Ola de Amor · ' + event + ' · ' + entry.releaseAt,
      app_id: appId,
      target_channel: 'push',
      filters: [{ field: 'tag', key: 'loda_festival', relation: '=', value: 'true' }],
      headings: { en: heading.en, es: heading.es },
      contents: { en: body.en, es: body.es },
      send_after: new Date(entry.releaseAt).toISOString(),
      web_url: origin.href + '#updates',
      idempotency_key: uuid
    };
  }).sort((a,b)=>a.send_after.localeCompare(b.send_after));
}

async function main() {
  const appId = process.env.ONESIGNAL_APP_ID || '';
  const guideUrl = process.env.GUIDE_URL || '';
  const jobs = buildPushJobs(JSON.parse(readFileSync(DATA_PATH, 'utf8')), appId, guideUrl);
  const send = process.argv.includes('--send');
  if (process.argv.some(a=>a!=='--send')) throw new Error('Usage: node scripts/festival-push-schedule.mjs [--send]');
  if (!send) {
    console.log('DRY RUN — no notifications were scheduled. Run with --send only after a live device test and coordinator approval.');
    console.log(JSON.stringify(jobs, null, 2));
    return;
  }
  const key = process.env.ONESIGNAL_REST_API_KEY;
  if (!key) throw new Error('Set ONESIGNAL_REST_API_KEY in the local environment (never in repository code)');
  for (const job of jobs) {
    if (Date.parse(job.send_after) <= Date.now()) throw new Error('Refusing to schedule past notification: '+job.name);
  }
  for (const job of jobs) {
    const response = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {'Content-Type':'application/json','Authorization':'Key '+key},
      body: JSON.stringify(job)
    });
    const result = await response.json();
    if (!response.ok || result.errors) {
      console.error('Failed to schedule '+job.name+'; do not retry blindly or create duplicates.',JSON.stringify(result));
      process.exitCode = 1;
      return;
    }
    console.log('Scheduled:',job.name,'UTC:',job.send_after,'notification ID:',result.id);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode=1; });
}
