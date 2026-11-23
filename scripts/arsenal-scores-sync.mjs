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

export {officialMatchEvents,normalizeScores,safeLink,matchESPN,enrichWithESPN,attachVerifiedArsenalLink,preserveDetails,buildScores} from '../shared/football-models.mjs';
import {normalizeScores,matchESPN,buildScores,preserveDetails} from '../shared/football-models.mjs';

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
export async function run(){
 const now=new Date();
 const [bootstrap,fixtures]=await Promise.all([get(PL_BOOTSTRAP),get(PL_FIXTURES)]);
 const bare=normalizeScores(bootstrap.teams,fixtures,bootstrap.elements);
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
