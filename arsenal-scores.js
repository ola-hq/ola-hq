
(() => {
'use strict';
const $=id=>document.getElementById(id);
const board=$('ars-scores-list');if(!board)return;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link=v=>{try{const u=new URL(v);return u.protocol==='https:'&&/(^|\.)(espn|premierleague|arsenal)\.com$/.test(u.hostname)?u.href:null}catch{return null}};
const day=iso=>{const d=new Date(iso);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const dated=iso=>new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric'}).format(new Date(iso));
const clock=iso=>new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(iso));
const arsenal=m=>/arsenal/i.test(m.home?.name||'')||/arsenal/i.test(m.away?.name||'');
const abbr=name=>name==='Arsenal'?'ARS':String(name||'—').split(/\s+/).map(x=>x[0]).join('').slice(0,3).toUpperCase();
const withScore=m=>Number.isInteger(m.home_score)&&Number.isInteger(m.away_score);
const score=m=>withScore(m)&&m.status!=='pre'?m.home_score+' – '+m.away_score:'VS';
const detailURL=m=>link(m?.match_url)||'https://www.premierleague.com/en/fixtures';
const when=m=>m.status==='post'?'FULL TIME':m.status==='in'?(Number.isInteger(m.minute)?m.minute+'′ · IN PLAY':'IN PLAY'):clock(m.kickoff);
const state={matches:[],meta:null,filter:'all',selected:null,date:null,detail:'stats',ok:false};
const matchdays=()=>[...new Set(state.matches.map(m=>day(m.kickoff)))].sort();
function selectedGames(){
 const ms=[...state.matches],now=Date.now();
 if(state.filter==='live')return ms.filter(m=>m.status==='in').sort((a,b)=>Number(arsenal(b))-Number(arsenal(a)));
 if(state.filter==='upcoming')return ms.filter(m=>m.status==='pre'&&Date.parse(m.kickoff)>now-3600000).sort((a,b)=>Date.parse(a.kickoff)-Date.parse(b.kickoff)).slice(0,12);
 if(state.filter==='results')return ms.filter(m=>m.status==='post').sort((a,b)=>Date.parse(b.kickoff)-Date.parse(a.kickoff)).slice(0,12);
 return ms.filter(m=>day(m.kickoff)===state.date).sort((a,b)=>Number(arsenal(b))-Number(arsenal(a))||Date.parse(a.kickoff)-Date.parse(b.kickoff));
}
function freshness(){
 const ts=state.meta?.fetched_at,age=Date.now()-Date.parse(ts),recent=Number.isFinite(age)&&age>=-300000&&age<25*60000;
 const live=recent&&state.matches.some(m=>m.status==='in'),dot=document.querySelector('.ars-score-sync-dot');
 $('ars-scores-freshness').textContent=!state.ok?'SCORE FEED OFFLINE':live?'IN PLAY · SOURCE-SYNCED':recent?'RECENT SCORE SNAPSHOT':'CACHED SCORE SNAPSHOT';
 const ageText=!Number.isFinite(age)?'unknown':age<60000?'just now':age<3600000?Math.floor(age/60000)+' min ago':age<86400000?Math.floor(age/3600000)+' hr ago':dated(ts);
 $('ars-scores-update').textContent=state.ok?'Last checked '+ageText+' · '+(state.meta?.refresh_target_minutes||15)+' min sync target':'Official fixtures linked below';
 dot?.classList.toggle('is-current',recent&&!live);dot?.classList.toggle('is-live',live);
 const n=state.matches.filter(m=>m.status==='in').length;
 $('ars-live-count').hidden=!n;$('ars-live-count').textContent=String(n);
}
function render(){
 const ms=selectedGames(),days=matchdays(),i=days.indexOf(state.date);
 $('ars-scores-count').textContent=ms.length+' matches · Premier League';
 $('ars-date-label').textContent=state.filter==='all'&&state.date?dated(state.date+'T12:00:00'):state.filter==='live'?'In-play matches':state.filter==='upcoming'?'Next fixtures':state.filter==='results'?'Latest results':'Matchday';
 $('ars-date-prev').disabled=state.filter!=='all'||i<=0;
 $('ars-date-next').disabled=state.filter!=='all'||i<0||i>=days.length-1;
 document.querySelectorAll('[data-ars-filter]').forEach(b=>{const a=b.dataset.arsFilter===state.filter;b.classList.toggle('is-selected',a);b.setAttribute('aria-pressed',String(a))});
 if(!state.ok||!state.matches.length){board.innerHTML='<p class="ars-scores-empty">Match data is temporarily unavailable. <a href="https://www.premierleague.com/en/fixtures">Official fixtures ↗</a></p>';details();return}
 if(!ms.length){board.innerHTML='<p class="ars-scores-empty">'+(state.filter==='live'?'No Premier League games currently reported in play.':'No games in this view.')+'<br>Try another date or filter.</p>';details();return}
 if(!state.selected||!state.matches.some(x=>x.id===state.selected))state.selected=(ms.find(arsenal)||ms[0]).id;
 board.innerHTML=ms.map(m=>{
 const active=m.id===state.selected,ars=arsenal(m),home=abbr(m.home?.name),away=abbr(m.away?.name);
 return '<button type="button" class="ars-scores-item'+(ars?' is-arsenal':'')+(active?' is-active':'')+'" data-match-id="'+esc(m.id)+'" aria-pressed="'+active+'" aria-label="'+esc(m.home.name+' against '+m.away.name+', '+when(m))+'">'+
 '<span class="ars-match-home"><span class="ars-match-emblem'+(m.home?.name==='Arsenal'?' ars-arsenal-emblem':'')+'">'+esc(home)+'</span><span class="ars-match-name">'+esc(m.home.name)+'</span></span>'+
 '<span class="ars-match-central"><span class="ars-match-result'+(m.status==='pre'?' is-upcoming':'')+'">'+esc(score(m))+'</span><span class="ars-match-status'+(m.status==='in'?' is-live':'')+'">'+esc(when(m))+'</span></span>'+
 '<span class="ars-match-away"><span class="ars-match-emblem'+(m.away?.name==='Arsenal'?' ars-arsenal-emblem':'')+'">'+esc(away)+'</span><span class="ars-match-name">'+esc(m.away.name)+'</span></span><span class="ars-scores-chevron">›</span></button>';
 }).join('');
 details();
}
function details(){
 const m=state.matches.find(x=>x.id===state.selected);
 if(!m){$('ars-details-heading').textContent='Choose a fixture.';$('ars-details-subtitle').textContent='Select any game to open its details.';$('ars-details-score').textContent='ARSENAL WAVE ✦';$('ars-details-content').textContent='Match information will appear here.';return}
 $('ars-details-heading').textContent=m.home.name+' vs '+m.away.name;
 $('ars-details-subtitle').textContent=dated(m.kickoff)+' · '+clock(m.kickoff)+' · '+(m.venue||'Premier League');
 $('ars-details-score').innerHTML='<span class="ars-details-team">'+esc(m.home.name)+'</span><strong>'+esc(score(m))+'</strong><span class="ars-details-team">'+esc(m.away.name)+'</span>';
 $('ars-details-source').textContent=m.stats?.length?'Verified statistics':'Official fixture feed';
 $('ars-details-link').href=detailURL(m);
 $('ars-details-link').textContent=link(m.match_url)?'Open full match centre ↗':'See official fixtures ↗';
 document.querySelectorAll('[data-detail-tab]').forEach(b=>{const a=b.dataset.detailTab===state.detail;b.classList.toggle('is-active',a);b.setAttribute('aria-pressed',String(a))});
 const panel=$('ars-details-content');
 if(state.detail==='stats'){
  const statNames={foulsCommitted:'Fouls',wonCorners:'Corner kicks',goalAssists:'Assists',possessionPct:'Possession',shotAssists:'Chances created',shotsOnTarget:'Shots on target',totalGoals:'Goals',totalShots:'Total shots',SHOTS:'Total shots','ON GOAL':'Shots on target'};
  const stats=Array.isArray(m.stats)?m.stats.filter(x=>x&&x.label&&x.home!=null&&x.away!=null&&!['appearances'].includes(x.label)):[];
  panel.innerHTML=stats.length?stats.slice(0,12).map(s=>{
   const a=Number(String(s.home).replace('%','')),b=Number(String(s.away).replace('%',''));
   const okay=Number.isFinite(a)&&Number.isFinite(b)&&a>=0&&b>=0&&a+b>0;
   const pct=okay?Math.max(0,Math.min(100,a/(a+b)*100)):50;
   const label=statNames[s.label]||s.label;
   const value=x=>(s.label==='possessionPct'||s.label==='Possession')?String(x).replace(/%$/,'')+'%':s.label==='On Target %'&&Number(x)<=1?Math.round(Number(x)*100)+'%':String(x);
   return '<div class="ars-stat-row"><div class="ars-stat-label"><strong>'+esc(value(s.home))+'</strong><span>'+esc(label)+'</span><strong>'+esc(value(s.away))+'</strong></div><div class="ars-stat-bars"><i style="width:'+pct.toFixed(1)+'%"></i><i style="width:'+(100-pct).toFixed(1)+'%"></i></div></div>';
  }).join(''):'<p>Detailed statistics have not been provided for this match yet. Scores and kickoff are still available.</p>';
 }else if(state.detail==='events'){
  panel.innerHTML=Array.isArray(m.events)&&m.events.length?m.events.slice(0,30).map(e=>'<div class="ars-event-row"><strong>'+esc(e.minute!=null?String(e.minute)+'′':'✦')+'</strong><span>'+esc(e.description||e.type||'Event')+'</span></div>').join(''):'<p>Goals, cards and substitutions appear when the source provides verified events.</p>';
 }else{
  panel.innerHTML=m.lineups&&(Array.isArray(m.lineups.home)||Array.isArray(m.lineups.away))?'<div class="ars-lineup-side"><strong>'+esc(m.home.name)+'</strong><p>'+esc((m.lineups.home||[]).join(' · ')||'Pending')+'</p></div><div class="ars-lineup-side"><strong>'+esc(m.away.name)+'</strong><p>'+esc((m.lineups.away||[]).join(' · ')||'Pending')+'</p></div>':'<p>Starting XI information is not available in the source for this fixture.</p>';
 }
}
async function refresh(){
 try{const r=await fetch('data/arsenal-scores.json',{cache:'no-store'});if(!r.ok)throw Error('Score feed '+r.status);const d=await r.json();if(!Array.isArray(d.matches)||!d.meta?.fetched_at)throw Error('Invalid snapshot');
 state.matches=d.matches.filter(m=>m&&typeof m.id==='string'&&m.home?.name&&m.away?.name&&Number.isFinite(Date.parse(m.kickoff))).sort((a,b)=>Date.parse(a.kickoff)-Date.parse(b.kickoff));
 state.meta=d.meta;state.ok=true;
 const days=matchdays();if(!state.date){const today=day(new Date().toISOString());state.date=days.find(x=>x>=today)||days[days.length-1]||today}
 }catch{if(!state.matches.length)state.ok=false}
 freshness();render();
}
document.querySelectorAll('[data-ars-filter]').forEach(b=>b.addEventListener('click',()=>{state.filter=b.dataset.arsFilter;state.selected=null;render()}));
document.querySelectorAll('[data-detail-tab]').forEach(b=>b.addEventListener('click',()=>{state.detail=b.dataset.detailTab;details()}));
board.addEventListener('click',e=>{const b=e.target.closest('[data-match-id]');if(b){state.selected=b.dataset.matchId;render()}});
$('ars-date-prev')?.addEventListener('click',()=>{const ds=matchdays(),i=ds.indexOf(state.date);if(i>0){state.date=ds[i-1];state.selected=null;render()}});
$('ars-date-next')?.addEventListener('click',()=>{const ds=matchdays(),i=ds.indexOf(state.date);if(i>=0&&i<ds.length-1){state.date=ds[i+1];state.selected=null;render()}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
window.setInterval(()=>{if(!document.hidden)refresh()},2*60*1000);
refresh();
})();
