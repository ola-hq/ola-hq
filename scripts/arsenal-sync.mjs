#!/usr/bin/env node
/**
 * Arsenal Wave standalone scheduled refresh.
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
  const opponentKey = name => String(name || '').toLowerCase().replace(/\b(fc|united|city|football club)\b/g,'').replace(/[^a-z]/g,'').trim();
  const sameKickoff = upcoming && Date.parse(existingNext.kickoff_utc) === Date.parse(upcoming.date);
  const sameEvent = upcoming && (
    (upcoming.id && existingNext.event_id === upcoming.id) ||
    (sameKickoff && existingNext.venue === upcoming.venue && opponentKey(existingNext.opponent) === opponentKey(upcoming.opponent))
  );
  const retainedUpcoming = !upcoming && prior.next_match && Number.isFinite(Date.parse(prior.next_match.kickoff_utc)) && Date.parse(prior.next_match.kickoff_utc) >= nowMs - 3*60*60*1000;
  const fixtureSource = upcoming ? 'automated' : retainedUpcoming ? 'verified_cache' : 'unavailable';
  const next_match = upcoming ? {
    event_id: upcoming.id,
    opponent: sameEvent && existingNext.opponent?.length > upcoming.opponent.length ? existingNext.opponent : upcoming.opponent,
    venue: upcoming.venue,
    when: new Intl.DateTimeFormat('en-US', {timeZone:'Europe/London',weekday:'short',month:'short',day:'numeric'}).format(new Date(upcoming.date)),
    kickoff_utc: upcoming.date,
    competition: upcoming.competition,
    venue_name: upcoming.venue_name,
    status: upcoming.status,
    match_center_url: upcoming.match_center_url || (sameEvent ? existingNext.match_center_url : null)
  } : retainedUpcoming ? {...prior.next_match, status:'pre'} : null;
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
    fixture_source: fixtureSource,
    fixture_updated_at: upcoming ? now.toISOString() : retainedUpcoming ? (original.meta?.fixture_updated_at || original.meta?.updated_at || null) : null,
    schedule_source: ESPN_BASE + '/teams/' + TEAM_ID + '/schedule?season=' + (now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1),
    league_source: league ? STANDINGS_URL : null,
    official_fixture_feed:PL_FIXTURES,
    league_updated_at: league ? now.toISOString() : null,
    sources: [
      ...(original.meta?.sources || []).filter(x => !/ESPN/.test(x.label || '')),
      {label:'Premier League official fixture feed',url:PL_FIXTURES},
      {label:'ESPN Arsenal schedule (automated, unofficial)',url:ESPN_BASE + '/teams/' + TEAM_ID + '/schedule'},
      ...(league ? [{label:'ESPN Premier League standings (automated, unofficial)',url:STANDINGS_URL}] : [])
    ]
  };
  return {...original,meta,snapshot:{...prior,next_match,latest_result,recent_form,league}};
}

/** Convert official PL fixtures into our existing, independently tested fixture schema. */
export function parsePremierLeagueFixtures(bootstrap, fixtures) {
  if (!Array.isArray(bootstrap?.teams) || !Array.isArray(fixtures)) return [];
  const teams = new Map(bootstrap.teams.map(t => [Number(t.id),t]));
  const arsenal = bootstrap.teams.find(t => t.short_name === 'ARS' || t.name === 'Arsenal');
  if (!arsenal) return [];
  return fixtures.filter(f => (Number(f.team_h) === Number(arsenal.id) || Number(f.team_a) === Number(arsenal.id)) && f.kickoff_time && Number.isFinite(Date.parse(f.kickoff_time))).map(f => {
    const home=teams.get(Number(f.team_h));
    const away=teams.get(Number(f.team_a));
    if (!home || !away) return null;
    const status = f.finished ? 'post' : f.started ? 'in' : 'pre';
    return {
      id:'pl-' + f.id,date:f.kickoff_time,status:{type:{state:status}},
      competitions:[{
        venue:{fullName:Number(f.team_h) === Number(arsenal.id) ? 'Emirates Stadium' : 'Away venue · check official match centre'},
        competitors:[
          {team:{id:Number(f.team_h) === Number(arsenal.id) ? TEAM_ID : String(f.team_h),displayName:home.name,abbreviation:home.short_name},homeAway:'home',score:f.team_h_score},
          {team:{id:Number(f.team_a) === Number(arsenal.id) ? TEAM_ID : String(f.team_a),displayName:away.name,abbreviation:away.short_name},homeAway:'away',score:f.team_a_score}
        ]
      }]
    };
  }).filter(Boolean);
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
