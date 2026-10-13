import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildPushJobs } from './festival-push-schedule.mjs';

const source = JSON.parse(readFileSync('scripts/content/festival-updates.json','utf8'));
const appId = '12345678-1234-4123-a123-123456789012';
const url = 'https://example.com/la-ola-de-amor/scan/guide/';

test('builds exactly two bilingual push notices at Guadalajara midnight and 1 AM', () => {
  const jobs = buildPushJobs(source, appId, url);
  assert.equal(jobs.length, 2);
  assert.deepEqual(jobs.map(j => j.send_after), ['2026-10-17T06:00:00.000Z','2026-10-17T07:00:00.000Z']);
  assert.deepEqual(jobs.map(j => j.filters), [
    [{ field: 'tag', key: 'loda_festival', relation: '=', value: 'true' }],
    [{ field: 'tag', key: 'loda_festival', relation: '=', value: 'true' }]
  ]);
  assert.deepEqual(jobs.map(j => j.target_channel), ['push','push']);
  assert(jobs.every(j => j.web_url === url + '#updates'));
  assert(jobs.every(j => j.headings.en && j.headings.es && j.contents.en && j.contents.es));
  assert(jobs[0].headings.en.includes('LAST CALL'));
  assert(jobs[1].headings.en.includes('REALLY THOUGHT'));
  assert.notEqual(jobs[0].idempotency_key,jobs[1].idempotency_key);
  assert.deepEqual(buildPushJobs(source,appId,url),jobs);
});
test('blocks bad configuration and arbitrary unsanctioned announcement sets', () => {
  assert.throws(() => buildPushJobs(source,'not-an-id',url), /UUID/);
  assert.throws(() => buildPushJobs(source,appId,'http://example.com/la-ola-de-amor/scan/guide/'), /HTTPS/);
  assert.throws(() => buildPushJobs(source,appId,'https://example.com/other/'), /guide/);
  assert.throws(() => buildPushJobs({schema:1,announcements:[]},appId,url), /two verified/);
});
