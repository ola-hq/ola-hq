import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { reconcileAnnouncements, currentAnnouncements, restoreAnnouncement, publicScript, syncAnnouncements, sourcePath, publicPath } from './festival-updates.mjs';

const source = JSON.parse(readFileSync(sourcePath, 'utf8'));
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
  const restored = restoreAnnouncement(source.announcements, 'day-two');
  assert.equal(currentAnnouncements(restored).length, 2);
  assert.deepEqual(restored.find(e => e.id === 'day-two'), {...source.announcements.find(e => e.id === 'day-two'), status: 'current'});
  assert.throws(() => restoreAnnouncement([entry('a', '2026-10-09'), entry('b', '2026-10-10'), entry('old', '2026-10-08', 'archived')], 'old'), /Two newer/);
  assert.throws(() => restoreAnnouncement(source.announcements, 'missing'), /Unknown/);
});
test('invalid IDs, duplicate IDs, status and impossible dates fail closed', () => {
  assert.throws(() => reconcileAnnouncements([entry('a', '2026-02-30')]), /date/);
  assert.throws(() => reconcileAnnouncements([entry('bad/id', '2026-10-08')]), /ID/);
  assert.throws(() => reconcileAnnouncements([entry('a', '2026-10-08'), entry('a', '2026-10-09')]), /ID/);
  assert.throws(() => reconcileAnnouncements([entry('a', '2026-10-08', 'scheduled')]), /status/);
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
test('current inventory preserves the October 9 record and all three October 8 records', () => {
  assert.deepEqual(currentAnnouncements(source.announcements).map(e => e.id), ['one-week']);
  assert.deepEqual(source.announcements.filter(e => e.status === 'archived').map(e => e.id), ['day-two', 'tacos', 'pool-play']);
  assert(source.announcements.filter(e => e.status === 'archived').every(e => e.publishedAt === '2026-10-08'));
  syncAnnouncements('.', {check: true});
});
