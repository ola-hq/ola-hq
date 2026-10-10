import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildSnapshot, syncFPL } from './fpl-sync.mjs';
import { validateFPL } from './validate-fpl.mjs';

const saved = JSON.parse(await readFile('data/fpl/league-18767.json', 'utf8'));
const now = new Date(Math.max(Date.now(), Date.parse(saved.meta.fetched_at)) + 60000);
const responses = () => [structuredClone(saved.details), structuredClone(saved.element_status), {elements:structuredClone(saved.players), teams:structuredClone(saved.teams), element_types:structuredClone(saved.element_types)}];
const fixtureFetch = (values, failed = -1) => async url => {
  const i = url.endsWith('/details') ? 0 : url.endsWith('/element-status') ? 1 : 2;
  return {ok:i !== failed, status:i === failed ? 503 : 200, json:async () => values[i]};
};

test('known complete snapshot validates and ownership uses entry_id', () => { assert.equal(validateFPL(saved, now), saved); });
test('sanitizer preserves scores, IDs and display fields without copying private/unknown API fields', () => {
  const raw = responses();
  raw[0].league.join_code = 'PRIVATE'; raw[0].league.admin_email = 'PRIVATE';
  raw[0].league_entries[0].player_first_name = 'PRIVATE';
  const candidate = buildSnapshot(...raw, now);
  assert.deepEqual(candidate.details.matches, saved.details.matches);
  assert.deepEqual(candidate.players, saved.players);
  assert(!JSON.stringify(candidate).includes('PRIVATE'));
  assert.equal(candidate.meta.fetched_at, now.toISOString());
});
for (const [label, mutate] of [
  ['wrong league', v => v[0].league.id = 9],
  ['empty standings', v => v[0].standings = []],
  ['empty entries', v => v[0].league_entries = []],
  ['duplicate entry', v => v[0].league_entries[1].id = v[0].league_entries[0].id],
  ['invalid score', v => v[0].matches[0].league_entry_1_points = null],
  ['empty player feed', v => v[2].elements = []],
  ['unknown owner', v => v[1].element_status[0].owner = -1],
  ['incomplete ownership', v => v[1].element_status.pop()],
]) test('rejects ' + label, () => { const raw=responses(); mutate(raw); assert.throws(() => buildSnapshot(...raw, now)); });
test('atomic sync updates isolated output; HTTP and malformed-response failures preserve last good bytes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ola-fpl-test-'));
  const output = join(dir, 'snapshot.json');
  try {
    await writeFile(output, 'previous verified bytes');
    for (let i=0; i<3; i++) {
      await assert.rejects(syncFPL({output, now, fetchImpl:fixtureFetch(responses(), i)}), /503/);
      assert.equal(await readFile(output, 'utf8'), 'previous verified bytes');
    }
    const bad=responses(); bad[2].elements=[];
    await assert.rejects(syncFPL({output, now, fetchImpl:fixtureFetch(bad)}));
    assert.equal(await readFile(output, 'utf8'), 'previous verified bytes');
    await syncFPL({output, now, fetchImpl:fixtureFetch(responses())});
    assert.equal(JSON.parse(await readFile(output, 'utf8')).meta.fetched_at, now.toISOString());
  } finally { await rm(dir, {recursive:true, force:true}); }
});
