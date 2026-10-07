(() => {
  'use strict';
  const CFG={leagueId:18767,entryId:95049,leagueEntryId:95304,preseasonRank:1,snapshot:'data/fpl/league-18767.json'};
  const FALLBACK={meta:{mode:'validation',fetched_at:null},validation:{rank:4,wins:3,draws:0,losses:2,points_for:218,league_points:9,event:5,event_points:36,matches:[
    {event:1,opponent:'Saka mis chichis',for:54,against:46,result:'W'},
    {event:2,opponent:'Crack FC',for:35,against:37,result:'L'},
    {event:3,opponent:'Futbol Not Saka',for:42,against:31,result:'W'},
    {event:4,opponent:'Micky & Friends',for:51,against:32,result:'W'},
    {event:5,opponent:'Red Devils of SD',for:36,against:40,result:'L'}
  ]}};
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  const entryMap=d=>new Map((d?.league_entries||[]).map(e=>[num(e.id),e]));
  const teamName=(map,id)=>map.get(num(id))?.entry_name||'Unknown club';
  const managerName=e=>e?.short_name||e?.player_first_name||'—';
  const matchScore=(m,side)=>num(m['league_entry_'+side+'_points']);
  const finished=m=>m?.finished===true||m?.finished===1;
  function computeRecords(details){
    const matches=(details?.matches||[]).filter(finished), em=entryMap(details), byId=new Map();
    for(const e of details?.league_entries||[])byId.set(num(e.id),{w:0,d:0,l:0,pf:0,pa:0,streak:0,maxStreak:0});
    let high=null,low=null,big=null,close=null;
    for(const m of matches){
      const a=num(m.league_entry_1),b=num(m.league_entry_2),ap=matchScore(m,1),bp=matchScore(m,2),margin=Math.abs(ap-bp);
      for(const [id,pf,pa] of [[a,ap,bp],[b,bp,ap]]){const s=byId.get(id)||{w:0,d:0,l:0,pf:0,pa:0,streak:0,maxStreak:0};s.pf+=pf;s.pa+=pa;if(pf>pa){s.w++;s.streak++;s.maxStreak=Math.max(s.maxStreak,s.streak)}else if(pf===pa){s.d++;s.streak=0}else{s.l++;s.streak=0}byId.set(id,s);if(!high||pf>high.score)high={id,score:pf,event:m.event};if(!low||pf<low.score)low={id,score:pf,event:m.event}}
      if(!big||margin>big.margin)big={margin,event:m.event,a,b,ap,bp};
      if(!close||margin<close.margin)close={margin,event:m.event,a,b,ap,bp};
    }
    let streak=null;for(const [id,s] of byId)if(!streak||s.maxStreak>streak.count)streak={id,count:s.maxStreak};
    return{matches,em,byId,high,low,big,close,streak};
  }
  function currentEvent(details){
    const ms=details?.matches||[];const active=ms.filter(m=>m.started||finished(m));if(active.length)return Math.max(...active.map(m=>num(m.event)));
    const future=ms.filter(m=>!finished(m));return future.length?Math.min(...future.map(m=>num(m.event))):1;
  }
  function setStatus(mode,stamp){
    const el=$('fpl-data-status');if(!el)return;el.classList.remove('live','fallback');
    if(mode==='direct'){el.classList.add('live');el.innerHTML='<span></span>LIVE · DIRECT FPL DRAFT DATA';}
    else if(mode==='cached'){el.classList.add('live');el.innerHTML='<span></span>AUTO-UPDATED · '+esc(stamp?new Date(stamp).toLocaleString(): 'CACHED SNAPSHOT');}
    else{el.classList.add('fallback');el.innerHTML='<span></span>VALIDATION SNAPSHOT · LIVE FEED RETRYING';}
  }
  function renderFallback(){
    const v=FALLBACK.validation;$('ola-rank').textContent='#'+v.rank;$('forecast-live-rank').textContent='#'+v.rank;$('forecast-gap').textContent=(v.rank-CFG.preseasonRank)+' places off';$('ola-record').textContent=v.wins+'–'+v.losses;$('ola-pf').textContent=v.points_for;$('ola-league-points').textContent=v.league_points;$('ola-gw-points').textContent=v.event_points;
    const last=v.matches[v.matches.length-1];$('ola-matchup').textContent='GW'+last.event+' · '+(last.result==='W'?'WIN':last.result==='L'?'LOSS':'DRAW')+' · La Ola FC '+last.for+' — '+last.against+' '+last.opponent;
    $('forecast-copy').textContent='Fantasy Reimagined put La Ola FC #1 before GW1. The captured five-week validation state has the club #'+v.rank+' at '+v.wins+'–'+v.losses+'. Live data will replace this automatically.';
    $('matchup-list').innerHTML=v.matches.map(m=>'<div class="matchup is-laola"><strong>GW'+m.event+'<small>'+esc(m.result)+'</small></strong><span class="score">'+m.for+'–'+m.against+'</span><strong class="away">'+esc(m.opponent)+'</strong></div>').join('');
    $('gw-title').textContent='First five';setStatus('fallback');
  }
  function render(snapshot,mode){
    const d=snapshot.details;if(!d||!Array.isArray(d.league_entries)||!Array.isArray(d.standings)){renderFallback();return}
    const em=entryMap(d), rec=computeRecords(d), standings=[...d.standings].sort((a,b)=>num(a.rank)-num(b.rank)), ola=standings.find(s=>num(s.league_entry)===CFG.leagueEntryId), olaStats=rec.byId.get(CFG.leagueEntryId)||{w:0,d:0,l:0,pf:num(ola?.points_for),pa:0};
    const gw=currentEvent(d), gwMatches=(d.matches||[]).filter(m=>num(m.event)===gw), olaMatch=gwMatches.find(m=>num(m.league_entry_1)===CFG.leagueEntryId||num(m.league_entry_2)===CFG.leagueEntryId), nextOlaMatch=(d.matches||[]).filter(m=>num(m.event)>gw&&(num(m.league_entry_1)===CFG.leagueEntryId||num(m.league_entry_2)===CFG.leagueEntryId)).sort((a,b)=>num(a.event)-num(b.event))[0];
    const rank=num(ola?.rank)||0,lastRank=num(ola?.last_rank)||rank,move=lastRank-rank;
    $('ola-rank').textContent=rank?'#'+rank:'—';$('forecast-live-rank').textContent=rank?'#'+rank:'—';$('forecast-gap').textContent=rank?(rank===1?'on the forecast':Math.abs(rank-CFG.preseasonRank)+' place'+(Math.abs(rank-CFG.preseasonRank)===1?'':'s')+' off'):'waiting';
    $('ola-movement').textContent=move>0?'▲ '+move:move<0?'▼ '+Math.abs(move):'—';$('ola-record').textContent=olaStats.w+'–'+olaStats.d+'–'+olaStats.l;$('ola-pf').textContent=num(ola?.points_for)||olaStats.pf;$('ola-league-points').textContent=num(ola?.total);const olaSide=olaMatch?(num(olaMatch.league_entry_1)===CFG.leagueEntryId?1:2):null;$('ola-gw-points').textContent=olaSide?matchScore(olaMatch,olaSide):num(ola?.event_total);
    $('forecast-copy').textContent=rank===1?'The magazine called La Ola FC #1 before GW1 — and the live table currently agrees.':'The magazine called La Ola FC #1 before GW1. The live table has the club #'+rank+', so every gameweek now becomes a running test of the preseason call.';
    if(olaMatch){const side=olaSide,opp=side===1?2:1,of=matchScore(olaMatch,side),oa=matchScore(olaMatch,opp);let line='GW'+gw+' · '+esc(teamName(em,olaMatch['league_entry_'+opp]))+' · '+of+' — '+oa+(finished(olaMatch)?' · FINAL':' · LIVE / UPCOMING');if(nextOlaMatch){const ns=num(nextOlaMatch.league_entry_1)===CFG.leagueEntryId?1:2,no=ns===1?2:1;line+=' · NEXT GW'+num(nextOlaMatch.event)+': '+esc(teamName(em,nextOlaMatch['league_entry_'+no]));}$('ola-matchup').innerHTML=line;}
    const rows=standings.map(s=>{const id=num(s.league_entry),e=em.get(id),rs=rec.byId.get(id)||{w:0,d:0,l:0,pf:num(s.points_for),pa:0},delta=num(s.last_rank)-num(s.rank),mv=delta>0?'<span class="up">▲'+delta+'</span>':delta<0?'<span class="down">▼'+Math.abs(delta)+'</span>':'—';return '<tr'+(id===CFG.leagueEntryId?' class="is-laola"':'')+'><td>'+num(s.rank)+'</td><td><strong>'+esc(e?.entry_name||'Unknown')+'</strong></td><td>'+esc(managerName(e))+'</td><td>'+rs.w+'–'+rs.d+'–'+rs.l+'</td><td>'+num(s.total)+'</td><td>'+(num(s.points_for)||rs.pf)+'</td><td>'+(num(s.points_against)||rs.pa)+'</td><td>'+mv+'</td></tr>'}).join('');
    $('league-table-body').innerHTML=rows||'<tr><td colspan="8">Standings unavailable.</td></tr>';
    setupGW(d,em,gw);
    renderRecords(rec);
    renderRoster(snapshot,em);
    const renewed=d.league?.is_renewed===true;const hints=snapshot.meta?.renewal_hints||[];$('archive-renewal').textContent=renewed?(hints.length?'Renewed league · predecessor hint found: '+hints.join(', '):'Renewed league confirmed · predecessor ID not yet verified'):'Recurring archive ready · only verified seasons will be added';
    setStatus(mode,snapshot.meta?.fetched_at);
  }
  function setupGW(d,em,initial){
    const sel=$('gw-select');sel.innerHTML='';for(let i=1;i<=38;i++){const o=document.createElement('option');o.value=i;o.textContent='GW '+i;if(i===initial)o.selected=true;sel.appendChild(o)}
    const draw=gw=>{const ms=(d.matches||[]).filter(m=>num(m.event)===gw);$('gw-title').textContent='GW'+gw;$('matchup-list').innerHTML=ms.length?ms.map(m=>{const a=num(m.league_entry_1),b=num(m.league_entry_2),ap=matchScore(m,1),bp=matchScore(m,2),state=finished(m)?'FINAL':m.started?'LIVE':'UPCOMING';return '<div class="matchup'+(a===CFG.leagueEntryId||b===CFG.leagueEntryId?' is-laola':'')+'"><strong>'+esc(teamName(em,a))+'<small>'+state+'</small></strong><span class="score">'+(m.started||finished(m)?ap+'–'+bp:'vs')+'</span><strong class="away">'+esc(teamName(em,b))+'</strong></div>'}).join(''):'<p class="loading-copy">No matchup data for GW'+gw+'.</p>'};
    sel.onchange=()=>draw(num(sel.value));$('gw-prev').onclick=()=>{sel.value=Math.max(1,num(sel.value)-1);draw(num(sel.value))};$('gw-next').onclick=()=>{sel.value=Math.min(38,num(sel.value)+1);draw(num(sel.value))};draw(initial);
  }
  function renderRecords(rec){
    const name=id=>teamName(rec.em,id);const fmtMatch=x=>x?name(x.a)+' '+x.ap+'–'+x.bp+' '+name(x.b):'—';
    const cards=[
      ['HIGH SCORE',rec.high?rec.high.score:'—',rec.high?name(rec.high.id)+' · GW'+rec.high.event:'Waiting'],
      ['BIGGEST WIN',rec.big?rec.big.margin+' pts':'—',rec.big?fmtMatch(rec.big)+' · GW'+rec.big.event:'Waiting'],
      ['CLOSEST',rec.close?rec.close.margin+' pt'+(rec.close.margin===1?'':'s'):'—',rec.close?fmtMatch(rec.close)+' · GW'+rec.close.event:'Waiting'],
      ['WIN STREAK',rec.streak?rec.streak.count+' W':'—',rec.streak?name(rec.streak.id):'Waiting']
    ];$('record-grid').innerHTML=cards.map(c=>'<div><span>'+c[0]+'</span><strong>'+esc(c[1])+'</strong><small>'+esc(c[2])+'</small></div>').join('');
  }
  function renderRoster(snapshot,em){
    const raw=snapshot.element_status?.element_status||snapshot.element_status||[], players=new Map((snapshot.players||[]).map(p=>[num(p.id),p]));
    const owned=Array.isArray(raw)?raw.filter(x=>num(x.owner)===CFG.entryId||num(x.owner)===CFG.leagueEntryId):[];
    if(!owned.length){$('roster-list').innerHTML='<p class="loading-copy">Ownership feed is available to the ingestion layer; no La Ola roster rows were returned in this snapshot.</p>';return}
    const rows=owned.map(x=>players.get(num(x.element))||{id:x.element,web_name:'Player '+x.element}).sort((a,b)=>num(b.total_points)-num(a.total_points));
    $('roster-count').textContent=rows.length+' owned players';$('roster-list').innerHTML=rows.map(p=>'<div class="roster-player"><span>'+esc(p.web_name||[p.first_name,p.second_name].filter(Boolean).join(' '))+'</span><span>'+num(p.total_points)+' pts</span></div>').join('');
  }
  async function getJSON(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(r.status+' '+url);return r.json()}
  async function cached(){return getJSON(CFG.snapshot+'?v='+Date.now())}
  async function direct(){const base='https://draft.premierleague.com/api/';const [details,element_status,boot]=await Promise.all([getJSON(base+'league/'+CFG.leagueId+'/details'),getJSON(base+'league/'+CFG.leagueId+'/element-status'),getJSON(base+'bootstrap-static')]);const els=boot.elements||[];return{meta:{mode:'direct',fetched_at:new Date().toISOString()},details,element_status,players:els.map(p=>({id:p.id,first_name:p.first_name,second_name:p.second_name,web_name:p.web_name,element_type:p.element_type,team:p.team,total_points:p.total_points,event_points:p.event_points,status:p.status}))}}
  async function init(){
    let snap=null;try{snap=await cached();render(snap,'cached')}catch(e){renderFallback()}
    try{const fresh=await direct();render(fresh,'direct')}catch(e){if(!snap)console.info('FPL direct feed unavailable; using fallback/cached layer.')}
  }
  init();
})();