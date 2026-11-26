/* One shared atmosphere for the website and installable HQ app. */
(() => {
  'use strict';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const canvas = document.createElement('canvas');
  canvas.className = 'portal-stars';
  canvas.setAttribute('aria-hidden', 'true');
  const waveSection = document.querySelector('.home-six-waves,.deeper-entrances') || document.getElementById?.('worlds');
  const universe = document.getElementById?.('universe');
  const wave = waveSection ? document.createElement('div') : null;
  if (wave) {
    wave.className = 'portal-wave-backdrop'; wave.setAttribute('aria-hidden', 'true');
    document.body.prepend(wave, canvas);
  } else document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');
  let width = 0, height = 0, stars = [], raf = 0, last = 0, wavePresence = 0;
  const pointer = {x: -1000, y: -1000, vx: 0, vy: 0, active: false};
  const clamp = (v, low = 0, high = 1) => Math.max(low, Math.min(high, v));
  function updateWave() {
    if (!wave) return;
    const box = waveSection.getBoundingClientRect();
    const enter = clamp((height * .95 - box.top) / (height * .55));
    const leave = clamp(box.bottom / (height * .5));
    wavePresence = universe?.hidden ? 0 : Math.min(enter, leave) * .82;
    wave.style.setProperty('--wave-presence', wavePresence.toFixed(3));
    if (motion.matches) { wave.style.setProperty('--wave-x','0.00px'); wave.style.setProperty('--wave-y','0.00px'); }
  }
  function resize() {
    width = innerWidth; height = innerHeight;
    const header = document.querySelector('.home-topbar');
    if (header) document.documentElement.style.setProperty('--portal-header-height', header.getBoundingClientRect().height + 'px');
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = width * dpr; canvas.height = height * dpr;
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Three times the previous desktop ceiling, with a separate touch budget.
    const limit = fine.matches ? 720 : 180;
    const count = Math.min(limit, Math.round(width * height / (fine.matches ? 1800 : 2600)));
    stars = Array.from({length: count}, () => ({
      x: Math.random() * width, y: Math.random() * height,
      dx: 0, dy: 0, r: .3 + Math.random() * 1.45,
      phase: Math.random() * Math.PI * 2, depth: .15 + Math.random() * .85
    }));
    updateWave(); draw(0, true);
  }
  function draw(now, once = false) {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    const active = pointer.active && !motion.matches && fine.matches;
    const parallaxX = active ? (pointer.x / width - .5) * 30 : 0;
    const parallaxY = active ? (pointer.y / height - .5) * 24 : 0;
    for (const star of stars) {
      const distX = star.x - pointer.x, distY = star.y - pointer.y;
      const dist = Math.hypot(distX, distY) || 1;
      const influence = active ? clamp(1 - dist / 250) : 0;
      const force = influence * influence * 110 * star.depth;
      const targetX = distX / dist * force + parallaxX * star.depth;
      const targetY = distY / dist * force + parallaxY * star.depth;
      star.dx = motion.matches ? 0 : star.dx + (targetX - star.dx) * .085;
      star.dy = motion.matches ? 0 : star.dy + (targetY - star.dy) * .085;
      const drift = motion.matches ? 0 : Math.sin(now / 18000 + star.phase) * 7 * star.depth;
      const twinkle = motion.matches ? .65 : .53 + Math.sin(now / 1800 + star.phase) * .23;
      const x = star.x + star.dx + drift, y = star.y + star.dy;
      const color = star.depth > .7 ? '245,216,159' : '198,222,249';
      ctx.fillStyle = `rgba(${color},${twinkle})`;
      ctx.beginPath(); ctx.arc(x, y, star.r, 0, Math.PI * 2); ctx.fill();
      // Bright nearby stars leave a small wake while the cursor moves through them.
      const speed = Math.hypot(pointer.vx, pointer.vy);
      if (influence > .15 && speed > .8 && star.depth > .5) {
        ctx.strokeStyle = `rgba(${color},${influence * .24})`; ctx.lineWidth = .7;
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.lineTo(x - pointer.vx * influence * .9, y - pointer.vy * influence * .9); ctx.stroke();
      }
    }
    if (wave && wavePresence > 0) {
      wave.style.setProperty('--wave-x', (motion.matches ? 0 : parallaxX * .65).toFixed(2) + 'px');
      wave.style.setProperty('--wave-y', (motion.matches ? 0 : parallaxY * .65).toFixed(2) + 'px');
    }
    pointer.vx *= .78; pointer.vy *= .78;
    if (!once) raf = requestAnimationFrame(tick);
  }
  function tick(now) {
    raf = 0;
    if (document.hidden || motion.matches) return;
    if (now - last < 32) { raf = requestAnimationFrame(tick); return; }
    last = now;
    if (universe?.hidden) { raf = requestAnimationFrame(tick); return; }
    draw(now);
  }
  function resume() {
    if (raf) cancelAnimationFrame(raf); raf = 0;
    updateWave();
    if (motion.matches) draw(0, true);
    else if (!document.hidden) raf = requestAnimationFrame(tick);
  }
  if (ctx) { resize(); resume(); }
  else { width=innerWidth; height=innerHeight; updateWave(); }
  addEventListener('resize', resize, {passive:true});
  addEventListener('scroll', updateWave, {passive:true});
  addEventListener('pageshow', updateWave);
  if (wave && universe && typeof MutationObserver !== 'undefined') {
    new MutationObserver(updateWave).observe(universe, {attributes:true,attributeFilter:['hidden']});
  }
  document.addEventListener('visibilitychange', resume);
  motion.addEventListener('change', resume);
  addEventListener('pointermove', e => {
    if (!fine.matches || e.pointerType === 'touch') return;
    pointer.vx = pointer.active ? clamp(e.clientX - pointer.x, -35, 35) : 0;
    pointer.vy = pointer.active ? clamp(e.clientY - pointer.y, -35, 35) : 0;
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
  }, {passive:true});
  document.addEventListener('pointerleave', () => { pointer.active = false; pointer.vx = pointer.vy = 0; });

  document.querySelectorAll('.world-entrances .room, .world-card').forEach(card => {
    card.addEventListener('pointermove', e => {
      if (!fine.matches || motion.matches) return;
      const box = card.getBoundingClientRect(), x = (e.clientX - box.left) / box.width, y = (e.clientY - box.top) / box.height;
      card.style.setProperty('--portal-x', x * 100 + '%'); card.style.setProperty('--portal-y', y * 100 + '%');
      card.style.setProperty('--portal-rx', (y - .5) * -3 + 'deg'); card.style.setProperty('--portal-ry', (x - .5) * 3 + 'deg');
    }, {passive:true});
    card.addEventListener('pointerleave', () => { card.style.setProperty('--portal-rx','0deg'); card.style.setProperty('--portal-ry','0deg'); });
  });
  let busy = false, overlay = null, timer = 0;
  function reset() { clearTimeout(timer); overlay?.remove(); overlay = null; busy = false; }
  function enter(card, navigate) {
    if (window.OLAPortals && window.OLAPortals.enter !== enter) return window.OLAPortals.enter(card, navigate);
    if (busy) return;
    if (motion.matches) { navigate(); return; }
    busy = true;
    overlay = document.createElement('div'); overlay.className = 'portal-transition'; overlay.setAttribute('aria-hidden','true');
    const source = card.querySelector('img');
    if (source) { const image = document.createElement('img'); image.src = source.currentSrc || source.src; image.alt = ''; overlay.append(image); }
    const name = document.createElement('span'); name.className = 'portal-transition-name'; name.textContent = card.querySelector('h2, .world-card-copy strong')?.textContent || ''; overlay.append(name);
    document.body.append(overlay);
    requestAnimationFrame(() => overlay?.classList.add('is-visible'));
    timer = setTimeout(() => { try { navigate(); } finally { reset(); } }, 420);
  }
  window.OLAPortals = Object.freeze({enter});
  document.querySelectorAll('.world-entrances a.room, .academy-card-door').forEach(card => card.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || card.target === '_blank' || card.hasAttribute('download')) return;
    e.preventDefault(); enter(card, () => location.assign(card.href));
  }));
  document.querySelectorAll('.portal-globe-door, #hero-world-jump').forEach(globe => globe.addEventListener('click', () => {
    globe.classList.add('is-entering'); setTimeout(() => globe.classList.remove('is-entering'), 700);
  }));
  document.querySelector('.portal-globe-door')?.addEventListener('click', e => {
    const waves = document.getElementById('waves'); if (!waves) return;
    e.preventDefault(); waves.scrollIntoView({behavior:motion.matches ? 'instant' : 'smooth', block:'start'});
    waves.focus({preventScroll:true}); history.replaceState(null, '', '#waves');
  });
  addEventListener('pageshow', reset);
})();
