#!/usr/bin/env node
/**
 * Arsenal Wave owner-requested snapshot refresh.
 * Sources: official Premier League fixture feed plus ESPN schedule/standings fallback.
 * Safety: never overwrite the last validated snapshot if fixture data is empty or malformed.
 * FPL Draft data is intentionally not touched.
 */
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const FILE = new URL('../data/arsenal-2026.json', import.meta.url);
const TEAM_ID = '359';
const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1';
const STANDINGS_URL = 'https://site.api.espn.com/apis/v2/sports/soccer/eng.1/standings';
const PL_FIXTURES = 'https://fantasy.premierleague.com/api/fixtures/';
const PL_TEAMS = 'https://fantasy.premierleague.com/api/bootstrap-static/';
const FIXTURES_LINK = 'https://www.premierleague.com/en/clubs/3/arsenal/fixtures';
const VALID_DIRECT = /^https:\/\/(?:www\.)?(?:espn\.com|premierleague\.com|arsenal\.com)\//i;

export {parseMatch,buildSnapshot,parsePremierLeagueFixtures,parseLeague} from '../shared/football-models.mjs';
import {buildSnapshot,parsePremierLeagueFixtures} from '../shared/football-models.mjs';

async function fetchJson(url, timeout = 18000) {
  const response = await fetch(url, {
    headers:{'Accept':'application/json','User-Agent':'OLA-HQ-Arsenal-Snapshot/1.0'},
    signal:AbortSignal.timeout(timeout)
  });
  if (!response.ok) throw new Error(url + ': HTTP ' + response.status);
  return response.json();
}

export async function run() {
  const original = JSON.parse(await readFile(FILE,'utf8'));
  const now = new Date();
  const season = now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  let scheduleEvents = [];
  try {
    const schedule = await fetchJson(ESPN_BASE + '/teams/' + TEAM_ID + '/schedule?season=' + season);
    scheduleEvents = Array.isArray(schedule.events) ? schedule.events : [];
  } catch(error) { console.warn('ESPN schedule unavailable:',error.message); }
  let officialEvents = [];
  try {
    const [bootstrap,fixtures] = await Promise.all([fetchJson(PL_TEAMS),fetchJson(PL_FIXTURES)]);
    officialEvents = parsePremierLeagueFixtures(bootstrap,fixtures);
  } catch(error) { console.warn('Official PL fixtures unavailable:',error.message); }
  // Put official fixtures first when sources disagree; retain the validated cached fixture otherwise.
  const combinedSchedule = {events:[...officialEvents,...scheduleEvents]};
  let standings = null;
  try {
    standings = await fetchJson(STANDINGS_URL);
  } catch (error) {
    console.warn('Standings unavailable, hiding stale league position:',error.message);
  }
  const snapshot = buildSnapshot(original,combinedSchedule,standings);
  await writeFile(FILE,JSON.stringify(snapshot,null,2)+'\n');
  console.log('Refreshed Arsenal snapshot at',snapshot.meta.updated_at,
    'next',snapshot.snapshot.next_match?.opponent || 'none',
    'league',snapshot.snapshot.league?.position || 'unavailable',
    'fixture source',snapshot.meta.fixture_source,
    'official PL fixtures',officialEvents.length,
    'ESPN fixtures',scheduleEvents.length);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch(error => {
    console.error('Arsenal refresh failed; existing snapshot preserved:',error.message);
    process.exitCode = 1;
  });
}
