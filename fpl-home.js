(() => {
  'use strict';
  const ROOT=document.getElementById('home-mini-standings');
  if(!ROOT) return;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  fetch('data/fpl/league-18767.json',{cache:'no-store'})
    .then(r=>{if(!r.ok) throw new Error('snapshot'); return r.json();})
    .then(snapshot=>{
      const d=snapshot?.details;
      if(!d?.standings||!d?.league_entries) return;
      const names=new Map(d.league_entries.map(e=>[num(e.id),e.entry_name]));
      const rows=[...d.standings].sort((a,b)=>num(a.rank)-num(b.rank)).slice(0,5);
      ROOT.innerHTML=rows.map(s=>{
        const id=num(s.league_entry), name=names.get(id)||'Unknown club';
        const wl=`${num(s.matches_won)}–${num(s.matches_lost)}`;
        return `<div class="${id===95304?'is-laola':''}"><b>${num(s.rank)}</b><span>${esc(name)}</span><small>${wl}</small><strong>${num(s.total)}</strong></div>`;
      }).join('');
    })
    .catch(()=>{});
  const arsenalPlayers=document.getElementById('arsenal-laola-players'),arsenalContext=document.getElementById('arsenal-context');
  if(arsenalPlayers||arsenalContext){Promise.all([fetch('data/fpl/league-18767.json',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()),fetch('data/arsenal-2026.json',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject())]).then(([snapshot,arsenal])=>{const laOla=(snapshot?.details?.league_entries||[]).find(e=>e.entry_name==='La Ola FC'),arsenalTeam=(snapshot?.teams||[]).find(t=>t.short_name==='ARS'),owners=new Map((snapshot?.element_status?.element_status||[]).map(x=>[Number(x.element),Number(x.owner)])),players=(snapshot?.players||[]).filter(p=>Number(p.team)===Number(arsenalTeam?.id)&&owners.get(Number(p.id))===Number(laOla?.entry_id));if(arsenalPlayers)arsenalPlayers.innerHTML=players.length?players.map(p=>'<div><strong>'+esc(p.web_name)+'</strong><span>'+num(p.total_points)+' pts</span><small>'+((p.status&&p.status!=='a')?'Flagged · ':'')+'Arsenal</small></div>').join(''):'<p>No Arsenal players are currently rostered by La Ola FC.</p>';if(arsenalContext){const a=arsenal.snapshot||arsenal;arsenalContext.innerHTML='<div><span>NEXT</span><strong>'+esc(a.next_match?.opponent||'—')+'</strong><small>'+esc(a.next_match?.when||'')+'</small></div><div><span>LATEST</span><strong>'+esc(a.latest_result?.score||'—')+'</strong><small>'+esc(a.latest_result?.opponent||'')+'</small></div><div><span>TABLE</span><strong>#'+esc(a.league?.position||'—')+'</strong><small>'+esc(a.league?.points||'—')+' pts</small></div>';}}).catch(()=>{if(arsenalPlayers)arsenalPlayers.innerHTML='<p>Roster crossover is temporarily unavailable.</p>';if(arsenalContext)arsenalContext.innerHTML='<p>Arsenal snapshot is temporarily unavailable.</p>';});}
})();