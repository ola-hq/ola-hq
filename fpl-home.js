(() => {
  'use strict';
  const SNAP='data/fpl/league-18767.json';
  const OLA=95304;
  const $=id=>document.getElementById(id);
  const put=(id,v)=>{const el=$(id); if(el) el.textContent=v};
  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  const result=(pf,pa)=>pf>pa?'W':pf<pa?'L':'D';
  fetch(SNAP,{cache:'no-store'}).then(r=>r.json()).then(d=>{
    const entries=new Map((d?.details?.league_entries||[]).map(e=>[num(e.id),e]));
    const st=(d?.details?.standings||[]).find(s=>num(s.league_entry)===OLA);
    if(st){
      const rec=`${num(st.matches_won)}–${num(st.matches_lost)}`;
      put('home-rank',`#${num(st.rank)} · LA OLA FC`);
      put('home-record',rec);
      put('home-pf',num(st.points_for));
      put('home-lp',num(st.total));
      put('league-home-rank',`#${num(st.rank)}`);
      put('league-home-record',rec);
      put('league-home-pf',num(st.points_for));
    }
    const mine=(d?.details?.matches||[]).filter(m=>num(m.league_entry_1)===OLA||num(m.league_entry_2)===OLA);
    const done=mine.filter(m=>m.finished===true||m.finished===1).sort((a,b)=>num(a.event)-num(b.event));
    const latest=done.at(-1);
    if(latest){
      const left=num(latest.league_entry_1)===OLA;
      const pf=num(latest[left?'league_entry_1_points':'league_entry_2_points']);
      const pa=num(latest[left?'league_entry_2_points':'league_entry_1_points']);
      const oppId=num(latest[left?'league_entry_2':'league_entry_1']);
      const opp=entries.get(oppId)?.entry_name||'Opponent';
      const res=result(pf,pa);
      put('league-home-latest',`GW${num(latest.event)} · ${res}`);
      put('league-home-matchup',`GW${num(latest.event)} · ${opp} ${pa} — ${pf} La Ola FC`);
    }
  }).catch(()=>{});
})();