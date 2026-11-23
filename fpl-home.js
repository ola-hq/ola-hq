(() => {
 'use strict';
 const root=document.getElementById('home-mini-standings');if(!root)return;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const num=v=>Number.isFinite(Number(v))?Number(v):0;
 const status=document.getElementById('home-football-status');
 async function get(url){const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Snapshot unavailable');return r.json();}
 async function load(){
  try{
   const snapshot=await get('data/fpl/league-18767.json?v='+Date.now()),d=snapshot?.details;
   if(!Array.isArray(d?.standings)||!Array.isArray(d?.league_entries))throw Error('Invalid saved standings');
   const names=new Map(d.league_entries.map(e=>[num(e.id),e.entry_name]));
   root.innerHTML=[...d.standings].sort((a,b)=>num(a.rank)-num(b.rank)).slice(0,5).map(s=>{const id=num(s.league_entry);return '<div class="'+(id===95304?'is-laola':'')+'"><b>'+num(s.rank)+'</b><span>'+esc(names.get(id)||'Unknown club')+'</span><small>'+num(s.matches_won)+'–'+num(s.matches_lost)+'</small><strong>'+num(s.total)+'</strong></div>';}).join('');
   if(status)status.textContent='Saved results · '+new Date(snapshot.meta.fetched_at).toLocaleString()+' · updates run only when requested.';
   const roster=document.getElementById('arsenal-laola-players');
   if(roster){
    const club=d.league_entries.find(e=>e.entry_name==='La Ola FC'),team=snapshot.teams?.find(t=>t.short_name==='ARS');
    const owners=new Map((snapshot.element_status?.element_status||[]).map(x=>[Number(x.element),Number(x.owner)]));
    const players=(snapshot.players||[]).filter(p=>Number(p.team)===Number(team?.id)&&owners.get(Number(p.id))===Number(club?.entry_id));
    roster.innerHTML=players.length?players.map(p=>'<div><strong>'+esc(p.web_name)+'</strong><span>'+num(p.total_points)+' pts</span><small>'+((p.status&&p.status!=='a')?'Flagged · ':'')+'Arsenal</small></div>').join(''):'<p>No Arsenal players are currently rostered by La Ola FC.</p>';
   }
  }catch{if(status)status.textContent='Unable to reload saved results · keeping the information already on screen.';}
  const context=document.getElementById('arsenal-context');
  if(context)try{
   const data=await get('data/arsenal-2026.json'),a=data.snapshot||{};
   context.innerHTML='<div><span>NEXT</span><strong>'+esc(a.next_match?.opponent||'—')+'</strong><small>'+esc(a.next_match?.when||'')+'</small></div><div><span>LATEST</span><strong>'+esc(a.latest_result?.score||'—')+'</strong><small>'+esc(a.latest_result?.opponent||'')+'</small></div><div><span>TABLE</span><strong>#'+esc(a.league?.position||'—')+'</strong><small>'+esc(a.league?.points??'—')+' pts</small></div><p class="football-refresh-note">Saved Arsenal context · '+esc(new Date(data.meta?.updated_at).toLocaleString())+'. Open Arsenal for its on-demand refresh.</p>';
  }catch{context.innerHTML='<p>Saved Arsenal context is unavailable. Open Arsenal to check the source.</p>';}
 }
 document.getElementById('fpl-reload-snapshot')?.addEventListener('click',async event=>{const b=event.currentTarget;b.disabled=true;b.textContent='Reloading…';try{await load();}finally{b.disabled=false;b.textContent='Reload results';}});
 load();
})();
