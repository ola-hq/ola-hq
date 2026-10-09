#!/usr/bin/env node
/**
 * Arsenal Wave standalone scheduled refresh.
 * Source: ESPN's public soccer schedule and standings endpoints (unofficial, subject to availability).
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
const FIXTURES_LINK = 'https://www.premierleague.com/en/clubs/3/arsenal/fixtures';
const VALID_DIRECT = /^https:\/\/(?:www\.)?(?:espn\.com|premierleague\.com|arsenal\.com)\//i;

export function parseMatch(event) {
  const competition = event?.competitions?.[0];
  const sides = competition?.competitors || [];
  const arsenal = sides.find(x => String(x?.team?.id) === TEAM_ID || x?.team?.abbreviation === 'ARS');
  const other = sides.find(x => x !== arsenal);
  const date = event?.date || competition?.date;
  if (!arsenal || !other || !date || !Number.isFinite(Date.parse(date))) return null;
  const rawState = event?.status?.type?.state || competition?.status?.type?.state || 'pre';
  const status = ['pre','in','post'].includes(rawState) ? rawState : 'pre';
  const opponent = other.team?.displayName || other.team?.name;
  if (!opponent || opponent.length > 100) return null;
  const rawLinks = [...(event?.links || []), ...(competition?.links || [])];
  const matchLink = rawLinks.map(x => x?.href).find(href => typeof href === 'string' && VALID_DIRECT.test(href) && /\/(soccer\/match|match\/)/.test(href)) || null;
  const getScore = side => {
    const n = typeof side?.score === 'object' ? side.score?.value : side?.score;
    return Number.isFinite(Number(n)) && n !== undefined && n !== null && n !== '' ? Number(n) : null;
  };
  const ourScore = getScore(arsenal);
  const theirScore = getScore(other);
  const venue = arsenal.homeAway === 'away' ? 'Away' : 'Home';
  return {
    id: String(event.id || ''), opponent, venue, date: new Date(date).toISOString(), status,
    venue_name: competition?.venue?.fullName || (venue === 'Home' ? 'Emirates Stadium' : 'Venue to be confirmed'),
    competition: 'Premier League', match_center_url: matchLink,
    ourScore, theirScore
  };
}

export function buildSnapshot(original, schedule, standings, now = new Date()) {
  const raw = Array.isArray(schedule?.events) ? schedule.events : [];
  const matches = raw.map(parseMatch).filter(Boolean).sort((a,b) => a.date.localeCompare(b.date));
  if (!matches.length) throw new Error('No valid Arsenal fixtures; keeping existing cache');
  const nowMs = now.valueOf();
  const live = matches.find(x => x.status === 'in');
  const upcoming = live || matches.find(x => x.status === 'pre' && Date.parse(x.date) >= nowMs - 3*60*60*1000);
  const previous = [...matches].reverse().find(x => x.status === 'post' && x.ourScore !== null && x.theirScore !== null);
  const prior = original.snapshot || {};
  const existingNext = prior.next_match || {};
  const sameEvent = upcoming && (
    (upcoming.id && existingNext.event_id === upcoming.id) ||
    (existingNext.opponent === upcoming.opponent && existingNext.kickoff_utc === upcoming.date)
  );
  const next_match = upcoming ? {
    event_id: upcoming.id,
    opponent: upcoming.opponent,
    venue: upcoming.venue,
    when: new Intl.DateTimeFormat('en-US', {timeZone:'Europe/London',weekday:'short',month:'short',day:'numeric'}).format(new Date(upcoming.date)),
    kickoff_utc: upcoming.date,
    competition: upcoming.competition,
    venue_name: upcoming.venue_name,
    status: upcoming.status,
    match_center_url: upcoming.match_center_url || (sameEvent ? existingNext.match_center_url : null)
  } : null;
  const latest_result = previous ? {
    opponent: previous.opponent, venue:previous.venue,
    score: previous.ourScore + '–' + previous.theirScore,
    result: previous.ourScore > previous.theirScore ? 'W' : previous.ourScore < previous.theirScore ? 'L' : 'D'
  } : prior.latest_result || null;
  const final = matches.filter(m => m.status === 'post' && m.ourScore !== null && m.theirScore !== null);
  const recent_form = final.length ? final.slice(-5).map(m => m.ourScore > m.theirScore ? 'W' : m.ourScore < m.theirScore ? 'L' : 'D') : prior.recent_form || [];
  const league = parseLeague(standings);
  const meta = {
    ...original.meta,
    mode: 'Auto-refreshed ESPN schedule',
    refresh_strategy: 'scheduled',
    updated_at: now.toISOString(),
    schedule_source: ESPN_BASE + '/teams/' + TEAM_ID + '/schedule?season=' + now.getUTCFullYear(),
    league_source: league ? STANDINGS_URL : null,
    league_updated_at: league ? now.toISOString() : null,
    sources: [
      ...(original.meta?.sources || []).filter(x => !/ESPN/.test(x.label || '')),
      {label:'ESPN Arsenal schedule (automated, unofficial)',url:ESPN_BASE + '/teams/' + TEAM_ID + '/schedule'},
      ...(league ? [{label:'ESPN Premier League standings (automated, unofficial)',url:STANDINGS_URL}] : [])
    ]
  };
  return {...original,meta,snapshot:{...prior,next_match,latest_result,recent_form,league}};
}

export function parseLeague(data) {
  const entries = [];
  function walk(node, depth = 0) {
    if (!node || typeof node !== 'object' || depth > 6) return;
    if (Array.isArray(node?.entries)) entries.push(...node.entries);
    if (Array.isArray(node?.children)) node.children.forEach(x => walk(x,depth+1));
    if (node?.standings) walk(node.standings,depth+1);
  }
  walk(data);
  const e = entries.find(e => String(e?.team?.id) === TEAM_ID || e?.team?.abbreviation === 'ARS');
  if (!e) return null;
  const num = (...names) => {
    const stat = (e.stats || []).find(x => names.includes(x.name) || names.includes(x.abbreviation));
    if (!stat) return null;
    const value = Number(stat.value ?? stat.displayValue);
    return Number.isFinite(value) ? value : null;
  };
  const position = num('rank','RANK','position');
  const points = num('points','PTS');
  if (!position || points === null) return null;
  return {
    competition:'Premier League', position, points,
    played:num('gamesPlayed','GP','played'),wins:num('wins','W'),draws:num('ties','draws','D'),
    losses:num('losses','L'),gf:num('pointsFor','GF'),ga:num('pointsAgainst','GA'),gd:num('pointDifferential','GD')
  };
}

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
  const season = new Date().getUTCFullYear();
  const schedule = await fetchJson(ESPN_BASE + '/teams/' + TEAM_ID + '/schedule?season=' + season);
  let standings = null;
  try {
    standings = await fetchJson(STANDINGS_URL);
  } catch (error) {
    console.warn('Standings unavailable, hiding stale league position:',error.message);
  }
  const snapshot = buildSnapshot(original,schedule,standings);
  await writeFile(FILE,JSON.stringify(snapshot,null,2)+'\n');
  console.log('Refreshed Arsenal snapshot at',snapshot.meta.updated_at,
    'next',snapshot.snapshot.next_match?.opponent || 'none',
    'league',snapshot.snapshot.league?.position || 'unavailable');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch(error => {
    console.error('Arsenal refresh failed; existing snapshot preserved:',error.message);
    process.exitCode = 1;
  });
}
