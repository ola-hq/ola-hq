import {buildSnapshot,parseMatch,matchESPN,enrichWithESPN} from './shared/football-models.mjs?v=manual-football-1';
const ESPN='https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1';
export const dayKey=iso=>new Date(iso).toISOString().slice(0,10).replaceAll('-','');
export async function getJSON(url){
 const response=await fetch(url,{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw new Error('Football source unavailable');
 return response.json();
}
const boardURL=date=>ESPN+'/scoreboard?dates='+date;
export function scoreEvent(event){
 const c=event?.competitions?.[0],s=c?.competitors||[],h=s.find(x=>x.homeAway==='home'),a=s.find(x=>x.homeAway==='away');
 const kickoff=event?.date||c?.date;
 if(!event?.id||!h?.team?.displayName||!a?.team?.displayName||!Number.isFinite(Date.parse(kickoff)))return null;
 const state=event.status?.type?.state||c.status?.type?.state;
 if(!['pre','in','post'].includes(state))return null;
 return {...enrichWithESPN({id:'espn-'+event.id,kickoff:new Date(kickoff).toISOString(),home:{name:h.team.displayName,short:h.team.abbreviation},away:{name:a.team.displayName,short:a.team.abbreviation},status:state,home_score:null,away_score:null,minute:null,competition:'Premier League',venue:c.venue?.fullName||null,match_url:null,stats:[],events:[],lineups:null},event,null),source:'espn'};
}
export async function refreshScores(original,date){
 const selected=dayKey(date+'T12:00:00Z');
 const data=await getJSON(boardURL(selected));
 if(!Array.isArray(data.events))throw new Error('Invalid score feed');
 const updates=data.events.map(scoreEvent).filter(Boolean);
 if(updates.length!==data.events.length)throw new Error('Invalid match records');
 const previous=original?.matches||[];
 // Replace this explicitly selected day only. Other dates retain their saved provenance.
 const matches=previous.filter(m=>dayKey(m.kickoff)!==selected);
 for(const event of data.events){
  const fresh=scoreEvent(event);if(!fresh)continue;
  const old=previous.find(m=>matchESPN(m,[event]));
  const unchangedFinal=old?.status==='post'&&fresh.status==='post'&&old.home_score===fresh.home_score&&old.away_score===fresh.away_score;
  matches.push(old?{...fresh,id:old.id,stats:fresh.stats.length?fresh.stats:unchangedFinal?old.stats||[]:[],events:unchangedFinal?old.events||[]:[],lineups:unchangedFinal?old.lineups||null:null}:fresh);
 }
 return {meta:{...original?.meta,refresh_strategy:'manual',direct_checked_at:new Date().toISOString(),checked_date:date,checked_matches:updates.length},matches};
}
export async function refreshMatchday(original,scores,now=new Date()){
 const next=(scores?.matches||[]).filter(m=>[m.home?.name,m.away?.name].includes('Arsenal')&&Date.parse(m.kickoff)>=now-3*3600000).sort((a,b)=>Date.parse(a.kickoff)-Date.parse(b.kickoff))[0];
 const dates=[...new Set([dayKey(now.toISOString()),...(next?[dayKey(next.kickoff)]:[])])];
 const season=now.getUTCMonth()>=6?now.getUTCFullYear():now.getUTCFullYear()-1;
 const requests=[getJSON(ESPN+'/teams/359/schedule?season='+season),getJSON('https://site.api.espn.com/apis/v2/sports/soccer/eng.1/standings'),...dates.map(date=>getJSON(boardURL(date)))];
 const results=await Promise.allSettled(requests);
 const schedule=results[0].status==='fulfilled'?results[0].value:null;
 const standings=results[1].status==='fulfilled'?results[1].value:null;
 const boards=results.slice(2).filter(x=>x.status==='fulfilled').flatMap(x=>x.value.events||[]);
 const events=[...(schedule?.events||[]),...boards];
 if(!events.some(parseMatch))throw new Error('Arsenal source unavailable');
 return buildSnapshot(original||{meta:{},snapshot:{}},{events},standings,now);
}
