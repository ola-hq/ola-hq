// Pure football parsers, shared by manual browser reads and owner-run snapshot updates.
const TEAM_ID='359';
const ESPN_BASE='https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1';
const STANDINGS_URL='https://site.api.espn.com/apis/v2/sports/soccer/eng.1/standings';
const PL_FIXTURES='https://fantasy.premierleague.com/api/fixtures/';
const ESPN=ESPN_BASE;
const VALID_DIRECT=/^https:\/\/(?:www\.)?(?:espn\.com|premierleague\.com|arsenal\.com)\//i;
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
  const opponentKey = name => String(name || '').toLowerCase().replace(/\b(fc|united|football club)\b/g,'').replace(/[^a-z]/g,'').trim();
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
    mode: 'Manually refreshed football snapshot',
    refresh_strategy: 'manual',
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

export function officialMatchEvents(f,elements=[]){
 const players=new Map((elements||[]).filter(x=>Number.isInteger(x.id)).map(x=>[x.id,x.web_name||[x.first_name,x.second_name].filter(Boolean).join(' ')]));
 const kinds={goals_scored:'Goal',own_goals:'Own goal',yellow_cards:'Yellow card',red_cards:'Red card',penalties_missed:'Missed penalty',penalties_saved:'Penalty saved'};
 if(!f.started&&!f.finished&&!f.finished_provisional)return[];
 if(!Array.isArray(f.stats))return[];
 const result=[];
 for(const stat of f.stats){
  const eventType=kinds[stat?.identifier];
  if(!eventType)continue;
  for(const [team,rows] of [['Home',stat.h],['Away',stat.a]]){
   for(const row of Array.isArray(rows)?rows:[]){
    const n=Number(row.value),player=players.get(Number(row.element));
    if(!Number.isInteger(n)||n<=0||!player)continue;
    result.push({minute:null,type:eventType,description:eventType+' · '+player+(n>1?' ×'+n:'')+' ('+team+')'});
   }
  }
 }
 return result.slice(0,40);
}

export function normalizeScores(teams,fixtures,elements=[]) {
 if(!Array.isArray(teams)||!Array.isArray(fixtures))throw Error('Fixture feed missing required arrays');
 const teamMap=new Map(teams.filter(t=>Number.isInteger(t.id)&&t.name).map(t=>[t.id,t]));
 if(teamMap.size<2)throw Error('Not enough official PL team records');
 const match=fixtures.filter(f=>f&&Number.isInteger(f.id)&&Date.parse(f.kickoff_time)&&teamMap.has(f.team_h)&&teamMap.has(f.team_a)).map(f=>{
  const home=teamMap.get(f.team_h),away=teamMap.get(f.team_a);
  const state=f.finished||f.finished_provisional?'post':f.started?'in':'pre';
  const validScore=v=>Number.isInteger(v)&&v>=0?v:null;
  return {
   id:'pl-'+f.id,
   kickoff:new Date(f.kickoff_time).toISOString(),
   home:{name:home.name,short:home.short_name},
   away:{name:away.name,short:away.short_name},
   home_score:validScore(f.team_h_score),
   away_score:validScore(f.team_a_score),
   status:state,
   minute:state==='in'&&Number.isInteger(f.minutes)&&f.minutes>=0?f.minutes:null,
   venue:f.team_h===1&&home.short_name==='ARS'?'Emirates Stadium':null,
   competition:'Premier League',match_url:null,stats:[],events:officialMatchEvents(f,elements),lineups:null
  };
 });
 if(match.length<10)throw Error('Official feed has too few validated fixtures; preserving cache');
 return match.sort((a,b)=>a.kickoff.localeCompare(b.kickoff));
}
export function safeLink(value){
 try{const u=new URL(value);return u.protocol==='https:'&&/(^|\.)(espn|premierleague|arsenal)\.com$/.test(u.hostname)?u.href:null}catch{return null}
}
const key=value=>String(value||'').toLowerCase().replace(/\b(football club|fc|united)\b/g,'').replace(/[^a-z]/g,'');
const sameTeam=(a,b)=>key(a)===key(b) || (a==='Wolves'&&/Wolverhampton/.test(b)) || (b==='Wolves'&&/Wolverhampton/.test(a));
const int=v=>{const n=typeof v==='object'?v?.value:v;return Number.isFinite(Number(n))&&n!==null&&n!==''?Number(n):null};
export function matchESPN(m,events){
 return (events||[]).find(ev=>{
  const comp=ev?.competitions?.[0],c=comp?.competitors||[];
  const h=c.find(x=>x.homeAway==='home'),a=c.find(x=>x.homeAway==='away');
  return h&&a&&sameTeam(m.home.name,h.team?.displayName||h.team?.name)&&sameTeam(m.away.name,a.team?.displayName||a.team?.name)
   && Math.abs(Date.parse(m.kickoff)-Date.parse(ev.date||comp.date))<6*3600000;
 })||null;
}
function statsFromSides(sides,home,away){
 if(!Array.isArray(sides))return [];
 const find = name => sides.find(s=>sameTeam(name,s.team?.displayName||s.team?.name));
 const h=find(home),a=find(away);if(!h||!a)return [];
 const normalize=side=>new Map((side.statistics||[]).filter(x=>x&&x.name||x?.label).map(s=>[s.name||s.label,{label:s.label||s.name,value:s.displayValue??s.value??s.summary}]));
 const l=normalize(h),r=normalize(a),result=[];
 for(const [id,v] of l){
  const w=r.get(id);
  if(!w||v.value==null||w.value==null||typeof v.value==='object'||typeof w.value==='object')continue;
  result.push({label:v.label,home:String(v.value),away:String(w.value)});
 }
 return result.slice(0,12);
}
export function enrichWithESPN(match,event,summary){
 if(!event)return match;
 const comp=event.competitions?.[0];
 const teams=comp?.competitors||[];
 const h=teams.find(x=>x.homeAway==='home'),a=teams.find(x=>x.homeAway==='away');
 const link=(event.links||[]).map(l=>safeLink(l.href)).find(u=>u&&/\/(soccer\/match|match\/)/.test(u));
 const status=event.status?.type?.state||comp?.status?.type?.state;
 const state=['pre','in','post'].includes(status)?status:match.status;
 const stats=statsFromSides(summary?.boxscore?.teams||teams,match.home.name,match.away.name);
 const plays=Array.isArray(summary?.plays)?summary.plays:Array.isArray(summary?.plays?.plays)?summary.plays.plays:[];
 const events=plays.filter(p=>p&&(p.type?.text||p.text||p.shortText)).slice(0,45).map(p=>({
  minute:Number.isFinite(Number(p.clock?.displayValue?.replace(/[^0-9]/g,'')))?Number(p.clock.displayValue.replace(/[^0-9]/g,'')):null,
  description:String(p.shortText||p.text||p.type?.text).slice(0,180)
 }));
 const rs=Array.isArray(summary?.rosters)?summary.rosters:[];
 const sideRoster=name=>{
  const team=rs.find(x=>sameTeam(name,x.team?.displayName||x.team?.name));
  if(!team?.roster?.length)return null;
  return team.roster.filter(x=>x.starter||x.didPlay&&x.position).slice(0,11).map(x=>x.athlete?.displayName).filter(Boolean);
 };
 const lineupHome=sideRoster(match.home.name),lineupAway=sideRoster(match.away.name);
 return {...match,
  status:state,
  minute:state==='in'?(Number.isFinite(Number(event.status?.displayClock?.replace(/[^\d]/g,'')))?Number(event.status.displayClock.replace(/[^\d]/g,'')):match.minute):null,
  home_score:state==='pre'?null:int(h?.score)??match.home_score,
  away_score:state==='pre'?null:int(a?.score)??match.away_score,
  venue:comp?.venue?.fullName||match.venue,
  match_url:link||match.match_url,
  stats,
  events:events.length?events:match.events,
  lineups:lineupHome||lineupAway?{home:lineupHome||[],away:lineupAway||[]}:null
 };
}
export function attachVerifiedArsenalLink(matches,cached){
 const existing=cached?.snapshot?.next_match;if(!existing?.match_center_url)return matches;
 const target=matches.find(m=>
  (sameTeam(m.home.name,'Arsenal')||sameTeam(m.away.name,'Arsenal'))&&
  Math.abs(Date.parse(m.kickoff)-Date.parse(existing.kickoff_utc))<=60000&&
  sameTeam(m.home.name==='Arsenal'?m.away.name:m.home.name,existing.opponent)
 );
 if(target&&!target.match_url)target.match_url=safeLink(existing.match_center_url);
 return matches;
}
export function preserveDetails(matches,previous){
 const past=new Map((previous?.matches||[]).map(m=>[m.id,m]));
 return matches.map(m=>{
  const old=past.get(m.id);
  if(!old||old.kickoff!==m.kickoff||old.home?.name!==m.home?.name||old.away?.name!==m.away?.name)return m;
  return {...m,
   match_url:m.match_url||old.match_url||null,
   stats:m.stats?.length?m.stats:old.stats||[],
   events:m.events?.length?m.events:old.events||[],
   lineups:m.lineups||old.lineups||null};
 });
}

export async function buildScores(bootstrap,fixtures,events=[],summaries=new Map(),arsenalCache=null,now=new Date()){
 const matches=normalizeScores(bootstrap.teams,fixtures,bootstrap.elements);
 const scoreEvents=new Map();
 for(const match of matches){
  const ev=matchESPN(match,events);if(ev)scoreEvents.set(match.id,ev);
 }
 let enriched=matches.map(m=>scoreEvents.has(m.id)?enrichWithESPN(m,scoreEvents.get(m.id),summaries.get(String(scoreEvents.get(m.id).id))):m);
 enriched=attachVerifiedArsenalLink(enriched,arsenalCache);
 return {meta:{
   schema:'arsenal-wave-scores-v1',
   fetched_at:now.toISOString(),
   refresh_strategy:'manual',
   refresh_on_demand:true,
   primary_source:PL_FIXTURES,
   secondary_source:ESPN+'/scoreboard',
   coverage:'Premier League 2026/27; event stats where published by the source',
   note:'In-play status is based on the feed; snapshot is not guaranteed real-time.'
  },matches:enriched};
}
