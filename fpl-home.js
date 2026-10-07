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
})();