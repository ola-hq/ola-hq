import { mkdir, writeFile, rename, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateFPL } from './validate-fpl.mjs';

const LEAGUE_ID = 18767;
const BASE = 'https://draft.premierleague.com/api/';
const headers = {'User-Agent':'Mozilla/5.0 (compatible; OLA-HQ-FPL-Snapshot/1.0)', Accept:'application/json', Referer:'https://draft.premierleague.com/'};
const pick = (value, keys) => Object.fromEntries(keys.filter(k => value[k] !== undefined).map(k => [k, value[k]]));

export function buildSnapshot(rawDetails, elementStatus, bootstrap, now = new Date()) {
  const leagueKeys = ['id','name','closed','draft_dt','draft_pick_time_limit','draft_status','draft_tz_show','ko_rounds','max_entries','min_entries','scoring','start_event','stop_event','trades','transaction_mode','variety','is_renewed'];
  const snapshot = {
    meta: {schema:'ola-fpl-draft-v1', league_id:LEAGUE_ID, fetched_at:now.toISOString(), source:'draft.premierleague.com', renewal_hints: rawDetails.league?.is_renewed === undefined ? [] : ['is_renewed=' + rawDetails.league.is_renewed]},
    details: {
      league: pick(rawDetails.league || {}, leagueKeys),
      league_entries: (rawDetails.league_entries || []).map(e => pick(e, ['id','entry_id','entry_name','short_name','waiver_pick'])),
      standings: (rawDetails.standings || []).map(e => pick(e, ['last_rank','league_entry','matches_drawn','matches_lost','matches_played','matches_won','points_against','points_for','rank','rank_sort','total'])),
      matches: (rawDetails.matches || []).map(e => pick(e, ['event','finished','league_entry_1','league_entry_1_points','league_entry_2','league_entry_2_points','started','winning_league_entry','winning_method'])),
    },
    element_status: {element_status:(elementStatus.element_status || []).map(e => pick(e, ['element','in_accepted_trade','owner','status']))},
    players: (bootstrap.elements || []).map(p => pick(p, ['id','first_name','second_name','web_name','element_type','team','total_points','event_points','status'])),
    teams: (bootstrap.teams || []).map(t => pick(t, ['id','code','name','pulse_id','short_name'])),
    element_types: (bootstrap.element_types || []).map(t => pick(t, ['id','singular_name','singular_name_short','plural_name','plural_name_short']))
  };
  validateFPL(snapshot, now);
  return snapshot;
}

export async function syncFPL({output = 'data/fpl/league-18767.json', fetchImpl = fetch, now = new Date()} = {}) {
  async function get(path) {
    const response = await fetchImpl(BASE + path, {headers, signal:AbortSignal.timeout(30000)});
    if (!response.ok) throw new Error(path + ' -> HTTP ' + response.status);
    return response.json();
  }
  const [details, status, bootstrap] = await Promise.all([get('league/' + LEAGUE_ID + '/details'), get('league/' + LEAGUE_ID + '/element-status'), get('bootstrap-static')]);
  const snapshot = buildSnapshot(details, status, bootstrap, now);
  await mkdir(dirname(output), {recursive:true});
  const temporary = output + '.tmp-' + process.pid;
  try {
    await writeFile(temporary, JSON.stringify(snapshot, null, 2) + '\n');
    await rename(temporary, output);
  } finally { await rm(temporary, {force:true}); }
  console.log('Verified FPL snapshot', snapshot.meta.fetched_at, 'entries', snapshot.details.league_entries.length, 'matches', snapshot.details.matches.length, 'players', snapshot.players.length);
  return snapshot;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.length && !(args.length === 2 && args[0] === '--output')) throw new Error('Usage: node scripts/fpl-sync.mjs [--output PATH]');
  await syncFPL(args.length ? {output:args[1]} : {});
}
