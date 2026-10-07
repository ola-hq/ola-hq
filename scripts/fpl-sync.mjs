import { mkdir, writeFile, readFile } from 'node:fs/promises';\nimport { createHash } from 'node:crypto';

const LEAGUE_ID=18767;
const BASE='https://draft.premierleague.com/api/';
const headers={'User-Agent':'Mozilla/5.0 (compatible; OLA-HQ-FPL-Snapshot/1.0)','Accept':'application/json','Referer':'https://draft.premierleague.com/'};

async function get(path){
  const r=await fetch(BASE+path,{headers});
  if(!r.ok) throw new Error(path+' -> HTTP '+r.status);
  return r.json();
}
function renewalHints(obj){
  const out=[];
  function walk(v,path=''){
    if(!v||typeof v!=='object')return;
    for(const [k,val] of Object.entries(v)){
      const p=path?path+'.'+k:k;
      if(/renew|previous|predecessor|parent/i.test(k)&&['string','number','boolean'].includes(typeof val))out.push(p+'='+val);
      if(typeof val==='object')walk(val,p);
    }
  }
  walk(obj?.league||{});
  return out.slice(0,20);
}
const [rawDetails,elementStatus,bootstrap]=await Promise.all([
  get('league/'+LEAGUE_ID+'/details'),
  get('league/'+LEAGUE_ID+'/element-status'),
  get('bootstrap-static')
]);
const details={
  league:rawDetails.league,
  league_entries:(rawDetails.league_entries||[]).map(e=>({id:e.id,entry_id:e.entry_id,entry_name:e.entry_name,short_name:e.short_name,waiver_pick:e.waiver_pick})),
  standings:rawDetails.standings||[],
  matches:rawDetails.matches||[]
};
const players=(bootstrap.elements||[]).map(p=>({id:p.id,first_name:p.first_name,second_name:p.second_name,web_name:p.web_name,element_type:p.element_type,team:p.team,total_points:p.total_points,event_points:p.event_points,status:p.status}));
const snapshot={meta:{schema:'ola-fpl-draft-v1',league_id:LEAGUE_ID,fetched_at:new Date().toISOString(),source:'draft.premierleague.com',renewal_hints:renewalHints(rawDetails)},details,element_status:elementStatus,players,teams:bootstrap.teams||[],element_types:bootstrap.element_types||[]};
await mkdir('data/fpl',{recursive:true});
await writeFile('data/fpl/league-18767.json',JSON.stringify(snapshot,null,2)+'\n');
console.log('Wrote FPL snapshot',snapshot.meta.fetched_at,'entries',details.league_entries.length,'matches',details.matches.length,'players',players.length);
