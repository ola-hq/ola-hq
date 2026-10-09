#!/usr/bin/env node
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const OUT = new URL('../data/arsenal-scores.json',import.meta.url);
const PL_BOOTSTRAP='https://fantasy.premierleague.com/api/bootstrap-static/';
const PL_FIXTURES='https://fantasy.premierleague.com/api/fixtures/';
const ESPN='https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1';
const OFFICIAL='https://www.premierleague.com/en/fixtures';
const duration=15;

export function normalizeScores(teams,fixtures) {
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
   competition:'Premier League',match_url:null,stats:[],events:[],lineups:null
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
  events,
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
async function get(url){
 const response=await fetch(url,{headers:{Accept:'application/json','User-Agent':'OLA-HQ-Score-Snapshot/1.0'},signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error(url+' HTTP '+response.status);
 return response.json();
}
const ymd=iso=>new Date(iso).toISOString().slice(0,10).replace(/-/g,'');
export function enrichmentDates(matches,now){
 const completed=matches.filter(m=>m.status==='post'&&Date.parse(m.kickoff)<now).sort((a,b)=>Date.parse(b.kickoff)-Date.parse(a.kickoff));
 const upcoming=matches.filter(m=>Date.parse(m.kickoff)>=now-24*3600000&&Date.parse(m.kickoff)<=now+10*86400000).sort((a,b)=>Date.parse(a.kickoff)-Date.parse(b.kickoff));
 const lastDays=[...new Set(completed.map(m=>ymd(m.kickoff)))].slice(0,5);
 const nextDays=[...new Set(upcoming.map(m=>ymd(m.kickoff)))].slice(0,5);
 return [...new Set([...nextDays,...lastDays])].slice(0,10);
}
async function espnEvents(matches,now){
 const dates=enrichmentDates(matches,now);
 const groups=await Promise.all(dates.map(async date=>{
  try{const r=await get(ESPN+'/scoreboard?dates='+date);return Array.isArray(r.events)?r.events:[]}catch(e){console.warn('ESPN day '+date+' unavailable:',e.message);return[]}
 }));
 return groups.flat();
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
 const matches=normalizeScores(bootstrap.teams,fixtures);
 const scoreEvents=new Map();
 for(const match of matches){
  const ev=matchESPN(match,events);if(ev)scoreEvents.set(match.id,ev);
 }
 let enriched=matches.map(m=>scoreEvents.has(m.id)?enrichWithESPN(m,scoreEvents.get(m.id),summaries.get(String(scoreEvents.get(m.id).id))):m);
 enriched=attachVerifiedArsenalLink(enriched,arsenalCache);
 return {meta:{
   schema:'arsenal-wave-scores-v1',
   fetched_at:now.toISOString(),
   refresh_strategy:'scheduled',
   refresh_target_minutes:duration,
   primary_source:PL_FIXTURES,
   secondary_source:ESPN+'/scoreboard',
   coverage:'Premier League 2026/27; event stats where published by the source',
   note:'In-play status is based on the feed; snapshot is not guaranteed real-time.'
  },matches:enriched};
}
export async function run(){
 const now=new Date();
 const [bootstrap,fixtures]=await Promise.all([get(PL_BOOTSTRAP),get(PL_FIXTURES)]);
 const bare=normalizeScores(bootstrap.teams,fixtures);
 let arsenalCache=null,existing=null;
 try{arsenalCache=JSON.parse(await readFile(new URL('../data/arsenal-2026.json',import.meta.url),'utf8'))}catch{}
 try{existing=JSON.parse(await readFile(OUT,'utf8'))}catch{}
 const events=await espnEvents(bare,now.getTime());
 const summaries=new Map();
 const live=bare.filter(m=>m.status==='in');
 const recentFinished=bare.filter(m=>m.status==='post').sort((a,b)=>Date.parse(b.kickoff)-Date.parse(a.kickoff)).slice(0,10);
 const existingSummaryTime=Date.parse(existing?.meta?.details_checked_at||'');
 const shouldRefreshDetails=live.length>0||!Number.isFinite(existingSummaryTime)||now-existingSummaryTime>12*3600000;
 const candidates=shouldRefreshDetails?[...live,...recentFinished]:[];
 const eventIds=[...new Map(candidates.map(m=>matchESPN(m,events)).filter(Boolean).map(e=>[String(e.id),e])).values()].slice(0,8);
 await Promise.all(eventIds.map(async event=>{
  try{summaries.set(String(event.id),await get(ESPN+'/summary?event='+event.id))}
  catch(e){console.warn('Summary '+event.id+' unavailable:',e.message)}
 }));
 const snap=await buildScores(bootstrap,fixtures,events,summaries,arsenalCache,now);
 snap.matches=preserveDetails(snap.matches,existing);
 snap.meta.details_checked_at=shouldRefreshDetails?now.toISOString():existing?.meta?.details_checked_at||null;
 const matchesChanged=JSON.stringify(existing?.matches||[])!==JSON.stringify(snap.matches);
 const someLive=snap.matches.some(m=>m.status==='in');
 const elapsed=now-Date.parse(existing?.meta?.fetched_at||'');
 const heartbeat=someLive?duration*60000:3*3600000;
 if(!existing||matchesChanged||shouldRefreshDetails||!Number.isFinite(elapsed)||elapsed>heartbeat){
  await mkdir(new URL('../data/',import.meta.url),{recursive:true});
  await writeFile(OUT,JSON.stringify(snap,null,2)+'\n');
  const statCount=snap.matches.filter(m=>m.stats?.length).length;
  console.log('Updated score snapshot',snap.matches.length,'matches',events.length,'ESPN events',statCount,'stat-rich matches','details fetched',eventIds.length);
 }else console.log('Scores unchanged; retaining previous accurate snapshot timestamp');
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 run().catch(e=>{console.error('Scores refresh failed; existing cache preserved:',e.message);process.exitCode=1});
}
