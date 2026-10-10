import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function validateFPL(s, now = new Date()) {
  assert.equal(s?.meta?.schema, 'ola-fpl-draft-v1', 'FPL schema mismatch');
  assert.equal(s.meta.league_id, 18767, 'Wrong FPL league');
  assert.equal(s.meta.source, 'draft.premierleague.com', 'Unverified FPL source');
  const stamp = Date.parse(s.meta.fetched_at);
  assert(Number.isFinite(stamp) && stamp <= now.getTime() + 300000, 'Invalid FPL fetched_at');
  assert.equal(s.details?.league?.id, 18767, 'Wrong league details');
  const unique = (rows, key, label) => {
    assert(Array.isArray(rows) && rows.length > 0, 'Empty ' + label);
    const ids = rows.map(r => r[key]);
    assert(ids.every(id => Number.isInteger(id) && id > 0), 'Invalid IDs in ' + label);
    assert.equal(new Set(ids).size, ids.length, 'Duplicate IDs in ' + label);
    return new Set(ids);
  };
  const entries = unique(s.details.league_entries, 'id', 'league entries');
  const ownerIDs = unique(s.details.league_entries, 'entry_id', 'entry IDs');
  assert(s.details.league_entries.every(e => typeof e.entry_name === 'string' && e.entry_name.trim()), 'Missing team names');
  if (Number.isInteger(s.details.league.min_entries)) assert(entries.size >= s.details.league.min_entries, 'Incomplete league entries');
  const standings = unique(s.details.standings, 'league_entry', 'standings');
  assert.equal(standings.size, entries.size, 'Incomplete standings');
  assert([...standings].every(id => entries.has(id)), 'Unknown standing entry');
  assert(Array.isArray(s.details.matches) && s.details.matches.length > 0, 'Empty matches');
  for (const m of s.details.matches) {
    assert(entries.has(m.league_entry_1) && entries.has(m.league_entry_2) && m.league_entry_1 !== m.league_entry_2, 'Invalid match entries');
    assert(Number.isInteger(m.event) && m.event > 0, 'Invalid match event');
    assert(typeof m.finished === 'boolean' && typeof m.started === 'boolean', 'Invalid match state');
    assert([m.league_entry_1_points, m.league_entry_2_points].every(Number.isFinite), 'Invalid match scores');
  }
  const teams = unique(s.teams, 'id', 'teams');
  assert.equal(teams.size, 20, 'Incomplete Premier League teams');
  const types = unique(s.element_types, 'id', 'positions');
  assert.equal(types.size, 4, 'Incomplete player positions');
  const players = unique(s.players, 'id', 'players');
  assert(players.size >= 200, 'Incomplete player feed');
  for (const p of s.players) assert(teams.has(p.team) && types.has(p.element_type) && typeof p.web_name === 'string' && Number.isFinite(p.total_points) && Number.isFinite(p.event_points), 'Invalid player');
  const statuses = unique(s.element_status?.element_status, 'element', 'player status');
  assert.equal(statuses.size, players.size, 'Incomplete player ownership');
  assert([...statuses].every(id => players.has(id)), 'Unknown player status');
  for (const p of s.element_status.element_status) assert(p.owner == null || ownerIDs.has(p.owner), 'Unknown player owner');
  return s;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const s = validateFPL(JSON.parse(readFileSync(process.argv[2] || 'data/fpl/league-18767.json', 'utf8')));
  console.log('FPL integrity PASS:', s.meta.fetched_at, s.details.league_entries.length, 'entries,', s.players.length, 'players');
}
