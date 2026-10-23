import { test } from 'node:test';
// Keep push schedule checks in the existing CI test command without modifying workflows.
import './festival-push-schedule.test.mjs';
import './loda-push.test.mjs';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { reconcileAnnouncements, currentAnnouncements, restoreAnnouncement, publicScript, syncAnnouncements, sourcePath, publicPath } from './festival-updates.mjs';

const source = JSON.parse(readFileSync(sourcePath, 'utf8'));
const historical = source.announcements.filter(item => item.publishedAt < '2026-10-23');
const sample = source.announcements[0];
const entry = (id, publishedAt, status = 'current') => ({...sample, id, publishedAt, status});
test('zero, one and two current announcements produce exactly that many cards, newest first', () => {
  for (const entries of [[], [entry('a', '2026-10-08')], [entry('a', '2026-10-08'), entry('b', '2026-10-09')]]) {
    const visible = currentAnnouncements(entries);
    assert.equal(visible.length, entries.length);
    assert.equal(vm.runInNewContext(publicScript(entries) + '\nFESTIVAL_UPDATES.length'), entries.length);
  }
  assert.deepEqual(currentAnnouncements([entry('a', '2026-10-08'), entry('b', '2026-10-09')]).map(e => e.id), ['b', 'a']);
});
test('a third current entry archives the oldest without altering its original content or metadata', () => {
  const entries = [entry('oldest', '2026-10-07'), entry('middle', '2026-10-08'), entry('newest', '2026-10-09')];
  const reconciled = reconcileAnnouncements(entries);
  assert.deepEqual(reconciled[0], {...entries[0], status: 'archived'});
  assert.equal(entries[0].status, 'current');
  assert.deepEqual(currentAnnouncements(reconciled).map(e => e.id), ['newest', 'middle']);
});
test('same-date ordering is stable by immutable ID regardless of source array order', () => {
  const entries = ['c', 'b', 'a'].map(id => entry(id, '2026-10-08'));
  assert.deepEqual(reconcileAnnouncements(entries).filter(e => e.status === 'current').map(e => e.id).sort(), ['a', 'b']);
  assert.deepEqual(currentAnnouncements(entries).map(e => e.id), ['a', 'b']);
  assert.deepEqual(currentAnnouncements(entries.reverse()).map(e => e.id), ['a', 'b']);
});
test('archived entries stay archived even when the current feed empties; no archive state reaches guests', () => {
  const archived = source.announcements.filter(e => e.status === 'archived');
  assert.equal(archived.length, 3);
  assert.equal(currentAnnouncements(archived).length, 0);
  const script = publicScript(source.announcements);
  for (const e of archived) assert(!script.includes(e.title.en) && !script.includes(e.body.es));
  assert(!script.includes('sourceReference') && !script.includes('status'));
});
test('restoring an archived entry retains original dates and fields, and refuses an invisible restoration', () => {
  const restored = restoreAnnouncement(historical, 'day-two');
  assert.equal(currentAnnouncements(restored).length, 2);
  assert.deepEqual(restored.find(e => e.id === 'day-two'), {...source.announcements.find(e => e.id === 'day-two'), status: 'current'});
  assert.throws(() => restoreAnnouncement([entry('a', '2026-10-09'), entry('b', '2026-10-10'), entry('old', '2026-10-08', 'archived')], 'old'), /Two newer/);
  assert.throws(() => restoreAnnouncement(source.announcements, 'missing'), /Unknown/);
});
test('invalid IDs, duplicate IDs, status and impossible dates fail closed', () => {
  assert.throws(() => reconcileAnnouncements([entry('a', '2026-02-30')]), /date/);
  assert.throws(() => reconcileAnnouncements([entry('bad/id', '2026-10-08')]), /ID/);
  assert.throws(() => reconcileAnnouncements([entry('a', '2026-10-08'), entry('a', '2026-10-09')]), /ID/);
  assert.throws(() => reconcileAnnouncements([entry('a', '2026-10-08', 'unknown')]), /status/);
});
test('scheduled midnight and afters posts are hidden until their Guadalajara release times', () => {
  const announcements = historical;
  assert.deepEqual(announcements.filter(item => item.status === 'scheduled').map(item => item.id), ['midnight-last-call', 'afters-self-serve']);
  assert.deepEqual(currentAnnouncements(announcements).map(item => item.id), ['one-week']);
  const script = publicScript(announcements);
  assert(!script.includes('day-two') && !script.includes('pool-play'));
  assert(!script.includes('"status": "scheduled"'));
  const at = iso => Array.from(vm.runInNewContext(script + '\nactiveFestivalUpdates(Date.parse(' + JSON.stringify(iso) + ')).map(item => item.id)'));
  assert.deepEqual(at('2026-10-16T23:59:59-06:00'), ['one-week']);
  assert.deepEqual(at('2026-10-17T00:00:00-06:00'), ['midnight-last-call', 'one-week']);
  assert.deepEqual(at('2026-10-17T00:59:59-06:00'), ['midnight-last-call', 'one-week']);
  assert.deepEqual(at('2026-10-17T01:00:00-06:00'), ['afters-self-serve', 'one-week']);
  assert.deepEqual(at('2026-10-17T01:59:59-06:00'), ['afters-self-serve', 'one-week']);
  assert.deepEqual(at('2026-10-17T02:00:00-06:00'), ['one-week']);
  for (const iso of ['2026-10-17T00:00:00-06:00', '2026-10-17T01:00:00-06:00']) {
    assert(at(iso).length <= 2);
  }
});
test('scheduled notices require valid Mexico City times, dates and non-overlapping expiration', () => {
  const scheduled = source.announcements.find(item => item.id === 'midnight-last-call');
  assert.throws(() => reconcileAnnouncements([{...scheduled, releaseAt: undefined}]), /release time/);
  assert.throws(() => reconcileAnnouncements([{...scheduled, releaseAt: '2026-10-16T00:00:00-06:00'}]), /Release date/);
  assert.throws(() => reconcileAnnouncements([{...scheduled, releaseAt: '2026-10-17T00:00:00Z'}]), /Mexico City/);
  assert.throws(() => reconcileAnnouncements([{...scheduled, expiresAt: scheduled.releaseAt}]), /expiration/);
});
test('source sync durably archives overflow, remains idempotent and build validation rejects stale source/feed', () => {
  const root = mkdtempSync(join(tmpdir(), 'ola-announcements-'));
  try {
    mkdirSync(join(root, 'scripts/content'), {recursive: true});
    mkdirSync(join(root, 'la-ola-de-amor/scan/guide'), {recursive: true});
    writeFileSync(join(root, sourcePath), JSON.stringify({...source, announcements: [entry('a', '2026-10-07'), entry('b', '2026-10-08'), entry('c', '2026-10-09')]}));
    writeFileSync(join(root, publicPath), 'stale');
    assert.throws(() => syncAnnouncements(root, {check: true}), /stale/);
    syncAnnouncements(root);
    const first = readFileSync(join(root, sourcePath), 'utf8');
    assert.equal(JSON.parse(first).announcements[0].status, 'archived');
    syncAnnouncements(root, {check: true});
    syncAnnouncements(root);
    assert.equal(readFileSync(join(root, sourcePath), 'utf8'), first);
    assert.throws(() => syncAnnouncements(root, {restore: 'a'}), /Two newer/);
    assert.equal(readFileSync(join(root, sourcePath), 'utf8'), first);
  } finally { rmSync(root, {recursive: true, force: true}); }
});
test('current inventory includes the gallery announcement and preserves earlier records', () => {
  assert.deepEqual(currentAnnouncements(source.announcements).map(e => e.id), ['magic-mirror-photos-20261023', 'one-week']);
  assert.deepEqual(source.announcements.filter(e => e.status === 'archived').map(e => e.id), ['day-two', 'tacos', 'pool-play']);
  assert(source.announcements.filter(e => e.status === 'archived').every(e => e.publishedAt === '2026-10-08'));
  syncAnnouncements('.', {check: true});
});
test('gallery announcement appears at release, links to keepsakes and rejects unknown routes', () => {
  const post = source.announcements.find(item => item.id === 'magic-mirror-photos-20261023');
  assert.equal(post.route, 'magic-mirror');
  assert.match(post.body.en, /download.*share/);
  assert.match(post.body.es, /descarga.*compártelos/);
  const script = publicScript(source.announcements);
  const at = iso => Array.from(vm.runInNewContext(script + '\nactiveFestivalUpdates(Date.parse(' + JSON.stringify(iso) + ')).map(item => item.id)'));
  assert(!at('2026-10-23T11:59:59-06:00').includes(post.id));
  assert.equal(at('2026-10-23T12:00:00-06:00')[0], post.id);
  assert.throws(() => reconcileAnnouncements([{...post, route:'javascript:alert(1)'}]), /route/);
});
