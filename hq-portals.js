/* One shared atmosphere for the website and installable HQ app. */
(() => {
  'use strict';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const canvas = document.createElement('canvas');
  canvas.className = 'portal-stars';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');
  let width = 0, height = 0, stars = [], raf = 0, last = 0;
  const pointer = {x: -1000, y: -1000};
  function resize() {
    width = innerWidth; height = innerHeight;
    const header = document.querySelector('.home-topbar');
    if (header) document.documentElement.style.setProperty('--portal-header-height', header.getBoundingClientRect().height + 'px');
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = width * dpr; canvas.height = height * dpr;
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({length: Math.min(width < 600 ? 95 : 230, Math.round(width * height / 5000))}, () => ({
      x: Math.random() * width, y: Math.random() * height,
      dx: 0, dy: 0, r: .4 + Math.random() * 1.2,
      phase: Math.random() * Math.PI * 2, depth: .2 + Math.random() * .8
    }));
    draw(0, true);
  }
  function draw(now, once = false) {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    for (const star of stars) {
      const distX = star.x - pointer.x, distY = star.y - pointer.y;
      const dist = Math.hypot(distX, distY) || 1;
      const force = !motion.matches && dist < 150 ? (1 - dist / 150) * 42 * star.depth : 0;
      star.dx += ((distX / dist * force) - star.dx) * .065;
      star.dy += ((distY / dist * force) - star.dy) * .065;
      const drift = motion.matches ? 0 : Math.sin(now / 18000 + star.phase) * 5 * star.depth;
      const twinkle = motion.matches ? .65 : .5 + Math.sin(now / 1800 + star.phase) * .22;
      ctx.fillStyle = `rgba(${star.depth > .7 ? '245,216,159' : '198,222,249'},${twinkle})`;
      ctx.beginPath(); ctx.arc(star.x + star.dx + drift, star.y + star.dy, star.r, 0, Math.PI * 2); ctx.fill();
    }
    if (!once) raf = requestAnimationFrame(tick);
  }
  function tick(now) {
    raf = 0;
    if (document.hidden || motion.matches) return;
    if (now - last < 32) { raf = requestAnimationFrame(tick); return; }
    last = now;
    const universe = document.getElementById('universe');
    if (universe?.hidden) { raf = requestAnimationFrame(tick); return; }
    draw(now);
  }
  function resume() { if (raf) cancelAnimationFrame(raf); raf = 0; if (motion.matches) draw(0, true); else if (!document.hidden) raf = requestAnimationFrame(tick); }
  if (ctx) { resize(); resume(); }
  addEventListener('resize', resize, {passive:true});
  document.addEventListener('visibilitychange', resume);
  motion.addEventListener('change', resume);
  addEventListener('pointermove', e => { if (fine.matches) { pointer.x = e.clientX; pointer.y = e.clientY; } }, {passive:true});
  document.addEventListener('pointerleave', () => { pointer.x = pointer.y = -1000; });

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
