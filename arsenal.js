(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const text = (id, value) => { const el = byId(id); if (el) el.textContent = value ?? '—'; };
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = (iso, options) => {
    if (!iso || Number.isNaN(Date.parse(iso))) return null;
    return new Intl.DateTimeFormat('en-US', options).format(new Date(iso));
  };
  const safeUrl = value => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' ? url.href : null;
    } catch { return null; }
  };

  async function loadArsenal() {
    const status = byId('ars-status');
    try {
      const response = await fetch('data/arsenal-2026.json', {cache:'no-store'});
      if (!response.ok) throw new Error('Arsenal data unavailable');
      const data = await response.json();
      const s = data.snapshot || {};
      const next = s.next_match || {};
      const updated = data.meta?.updated_at;
      const age = updated ? Date.now() - Date.parse(updated) : Infinity;
      const fresh = Number.isFinite(age) && age >= -300000 && age < 3 * 60 * 60 * 1000;
      const recentLive = Number.isFinite(age) && age >= -300000 && age < 15 * 60 * 1000;
      const fixtureAutomaticallyUpdated = data.meta?.fixture_source === 'automated';
      const isLive = next.status === 'in' && recentLive && fixtureAutomaticallyUpdated;
      const auto = data.meta?.refresh_strategy === 'scheduled' && fresh && fixtureAutomaticallyUpdated;
      const state = isLive ? 'live' : auto ? 'auto' : 'cached';
      const label = isLive ? 'LIVE NOW' : auto ? 'AUTO-REFRESHED' : 'CACHED SNAPSHOT';
      if (status) {
        status.dataset.state = state;
        text('ars-status-label', label);
      }
      const localDate = fmt(next.kickoff_utc, {weekday:'short', month:'short', day:'numeric'});
      const localKickoff = fmt(next.kickoff_utc, {hour:'numeric', minute:'2-digit', timeZoneName:'short'});
      const ukKickoff = fmt(next.kickoff_utc, {hour:'numeric', minute:'2-digit', timeZone:'Europe/London', timeZoneName:'short'});
      text('ars-next', next.opponent || 'Fixture to be confirmed');
      text('ars-fixture-date', localDate || next.when || 'Date pending');
      text('ars-kickoff-local', localKickoff || 'Time pending');
      text('ars-kickoff-uk', ukKickoff ? ukKickoff + ' · UK' : 'Kickoff awaiting confirmation');
      text('ars-competition', next.competition || 'Competition pending');
      text('ars-venue', next.venue_name || (next.venue === 'Home' ? 'Emirates Stadium' : next.venue) || 'Venue pending');
      const homeName = next.venue === 'Away' ? next.opponent : 'Arsenal';
      const awayName = next.venue === 'Away' ? 'Arsenal' : next.opponent;
      const shortName = value => value === 'Arsenal' ? 'ARS' : (value || 'TBC').split(/\s+/).map(word => word[0] || '').join('').slice(0,3).toUpperCase();
      text('ars-home-name', homeName);
      text('ars-away-name', awayName);
      text('ars-home-code', shortName(homeName));
      text('ars-away-code', shortName(awayName));
      text('ars-last', s.latest_result?.score || '—');
      text('ars-last-opponent', s.latest_result?.opponent || 'Latest result pending');
      text('ars-position', s.league?.position ? '#' + s.league.position : '—');
      text('ars-points', s.league?.points != null ? s.league.points + ' pts' : 'Table pending');
      text('ars-form', Array.isArray(s.recent_form) ? s.recent_form.join(' ') || '—' : '—');
      const updatedAt = fmt(updated, {month:'short', day:'numeric', hour:'numeric', minute:'2-digit', timeZoneName:'short'});
      const fixtureAt = fmt(data.meta?.fixture_updated_at || updated, {month:'short', day:'numeric', hour:'numeric', minute:'2-digit', timeZoneName:'short'});
      const sourceChecked = updatedAt ? ' · feed checked ' + updatedAt : '';
      const freshnessCopy = data.meta?.fixture_source === 'verified_cache' ? 'Fixture verified ' + (fixtureAt || 'earlier') + sourceChecked : updatedAt ? 'Last checked ' + updatedAt + (auto ? ' · scheduled sync' : ' · last saved data') : 'Saved data · update time unknown';
      text('ars-data-status', freshnessCopy);
      const matchLink = byId('ars-match-centre');
      const direct = safeUrl(next.match_center_url);
      if (matchLink) {
        matchLink.href = direct || 'https://www.premierleague.com/en/clubs/3/arsenal/fixtures';
        matchLink.textContent = direct ? 'Open match centre ↗' : 'See Arsenal fixtures ↗';
      }
    } catch {
      if (status) { status.dataset.state = 'offline'; text('ars-status-label', 'OFFLINE FALLBACK'); }
      text('ars-next', 'Arsenal matchday');
      text('ars-fixture-date', 'Fixture currently unavailable');
      text('ars-kickoff-local', '—');
      text('ars-kickoff-uk', 'See official fixtures');
      text('ars-competition', 'Arsenal FC');
      text('ars-venue', 'Schedule unavailable');
      text('ars-home-name', 'Arsenal');
      text('ars-away-name', 'Next opponent');
      text('ars-data-status', 'Unable to read the saved snapshot · official fixtures linked below');
      const link = byId('ars-match-centre');
      if (link) { link.href = 'https://www.premierleague.com/en/clubs/3/arsenal/fixtures'; link.textContent = 'See official fixtures ↗'; }
    }
  }

  async function loadFpl() {
    const container = byId('ars-laola-roster');
    if (!container) return;
    try {
      const response = await fetch('data/fpl/league-18767.json', {cache:'no-store'});
      if (!response.ok) throw new Error('FPL snapshot unavailable');
      const f = await response.json();
      const la = (f.details?.league_entries || []).find(e => e.entry_name === 'La Ola FC');
      const ars = (f.teams || []).find(t => t.short_name === 'ARS');
      if (!la || !ars) throw new Error('Missing team mapping');
      const owners = new Map((f.element_status?.element_status || []).map(x => [Number(x.element), Number(x.owner)]));
      const players = (f.players || []).filter(p => Number(p.team) === Number(ars.id) && owners.get(Number(p.id)) === Number(la.entry_id));
      container.innerHTML = players.length ? players.map(p =>
        '<div><strong>' + esc(p.web_name) + '</strong><span>' + Number(p.total_points || 0) +
        ' pts</span><small>' + ((p.status && p.status !== 'a') ? 'Currently flagged · ' : '') +
        'Arsenal → La Ola FC</small></div>'
      ).join('') : '<p>No Arsenal players currently on the La Ola FC roster.</p>';
    } catch {
      container.innerHTML = '<p>La Ola FC roster is temporarily unavailable. Arsenal matchday is still open.</p>';
    }
  }

  const energyButton = byId('ars-energy-button');
  energyButton?.addEventListener('click', () => {
    const panel = byId('matchday');
    if (!panel || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    panel.classList.remove('is-energized');
    void panel.offsetWidth;
    panel.classList.add('is-energized');
    window.setTimeout(() => panel.classList.remove('is-energized'), 1200);
  });

  loadArsenal();
  loadFpl();
})();