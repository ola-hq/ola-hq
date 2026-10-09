'use strict';
/*
 * OLA HQ App Prototype 01: additive, public-world-only launcher.
 * No root service worker and no writes to the Festival Guide.
 * "OLA HQ" always returns to the global launcher; contextual "Up" follows hierarchy.
 */
const ROOT = new URL('../', location.href);
const worlds = {
  'la-ola': { name: 'La Ola de Amor', path: 'la-ola-de-amor/', parent: null },
  wave26: { name: 'Wave 26', path: 'wave-26.html', parent: null },
  polaroid: { name: 'Polaroid Wave', path: 'our-polaroid-project/', parent: null },
  blockbuster: { name: 'Blockbuster Wave', path: 'blockbuster-wave/blockbuster-wave-complete-gallery.html', parent: null },
  fpl: { name: 'La Ola FC', path: 'fpl-wave.html', parent: null },
  simulation: { name: 'Simulation Wave', path: 'simulation-wave/', parent: null },
  gdb: { name: 'GDB Wave', path: 'gdb-university/', parent: null },
  arsenal: { name: 'Arsenal Wave', path: 'arsenal-wave.html', parent: 'fpl' },
  'wu-wei': { name: 'Wu Wei Wave', path: 'wu-wei-wave.html', parent: null },
  willpwr: { name: 'Willpwr Wave', path: 'willpwr-wave.html', parent: null },
  offbrand: { name: 'Offbrand Wave', path: 'offbrand-wave.html', parent: null },
  capybara: { name: 'Capybara Wave', path: 'capybara-wave.html', parent: null },
  moving: { name: 'The Open Current', path: 'what-moves-you/', parent: null }
};
const rootPath = ROOT.pathname;
const universe = document.querySelector('#universe');
const experience = document.querySelector('#experience');
const frame = document.querySelector('#world-frame');
const up = document.querySelector('#up');
const upLabel = document.querySelector('#up-label');
const label = document.querySelector('#world-label');
const openAlone = document.querySelector('#open-alone');
const home = document.querySelector('#hq-home');
const heroWorldJump = document.querySelector('#hero-world-jump');
let current = null;
let deferredInstall = null;
let frameTimer = null;

const urlFor = key => new URL(worlds[key].path, ROOT);
function isAllowed(href) {
  try {
    const u = new URL(href, ROOT);
    return u.origin === ROOT.origin && u.pathname.startsWith(rootPath) && !u.pathname.startsWith(rootPath + 'app/');
  } catch { return false; }
}
function matchWorld(url) {
  if (!url || !isAllowed(url)) return null;
  const u = new URL(url, ROOT);
  const path = u.pathname.substring(rootPath.length);
  if (/^la-ola-de-amor\/scan\//.test(path)) return 'la-ola';
  if (/^la-ola-de-amor\//.test(path)) return 'la-ola';
  if (/^blockbuster-wave\//.test(path)) return 'blockbuster';
  if (/^our-polaroid-project\//.test(path)) return 'polaroid';
  if (/^simulation-wave\//.test(path) || path === 'simulation-wave.html') return 'simulation';
  if (/^gdb-university\//.test(path) || path === 'gdb-wave.html') return 'gdb';
  if (path.startsWith('arsenal')) return 'arsenal';
  for (const [key, item] of Object.entries(worlds)) {
    if (path === item.path || path === item.path.replace(/\/$/, '')) return key;
  }
  if (path.includes('fpl-') || path.includes('football-')) return 'fpl';
  return current?.world ?? null;
}
function isWorldHome(url, world) {
  if (!world || !url) return false;
  const u = new URL(url, ROOT), canonical = urlFor(world);
  return u.pathname.replace(/\/$/, '') === canonical.pathname.replace(/\/$/, '') && !u.search && !u.hash;
}
function upTarget() {
  if (!current) return null;
  if (!isWorldHome(current.url, current.world)) return current.world;
  return worlds[current.world]?.parent || null;
}
function renderNav() {
  const world = current?.world;
  if (!world) return;
  const target = upTarget();
  upLabel.textContent = target ? worlds[target].name : 'OLA HQ';
  up.setAttribute('aria-label', target ? 'Return to ' + worlds[target].name + ' home' : 'Return to OLA HQ app home');
  label.textContent = worlds[world].name;
  frame.title = worlds[world].name + ' inside OLA HQ';
  openAlone.href = current.url;
}
function syncAddress(push = false) {
  const u = new URL(location.href);
  if (current) u.searchParams.set('path', new URL(current.url).href.replace(ROOT.href, ''));
  else u.searchParams.delete('path');
  u.hash = current ? '' : u.hash;
  if (push) history.pushState({}, '', u);
  else history.replaceState({}, '', u);
}
function showHome(push = true) {
  current = null;
  experience.hidden = true;
  universe.hidden = false;
  frame.removeAttribute('src');
  if (push) syncAddress(true);
  document.title = 'OLA HQ · Our Waves, One Home';
  scrollTo({top:0,behavior:'instant'});
}
function openWorld(world, href = urlFor(world).href, push = true) {
  if (!worlds[world] || !isAllowed(href)) return;
  const absolute = new URL(href, ROOT).href;
  current = {world, url:absolute};
  universe.hidden = true;
  experience.hidden = false;
  renderNav();
  frame.src = absolute;
  if (push) syncAddress(true);
  else syncAddress(false);
  document.title = worlds[world].name + ' · OLA HQ';
  scrollTo({top:0,behavior:'instant'});
}
function readFrame() {
  if (!current) return;
  try {
    const href = frame.contentWindow.location.href;
    if (!isAllowed(href)) return;
    const world = matchWorld(href) || current.world;
    if (href === current.url && world === current.world) return;
    current = {world, url:href};
    renderNav();
    syncAddress(false);
  } catch {
    // An external domain may open in-frame. The Open link remains available.
  }
}
frame.addEventListener('load', () => {
  if (frameTimer) clearInterval(frameTimer);
  readFrame();
  // Hash-only navigation in some existing worlds does not fire iframe load.
  frameTimer = setInterval(readFrame, 500);
  try {
    frame.contentWindow.addEventListener('hashchange', readFrame);
    frame.contentWindow.addEventListener('popstate', readFrame);
  } catch {}
});
document.querySelectorAll('[data-world]').forEach(button => button.addEventListener('click', () => openWorld(button.dataset.world)));
home.addEventListener('click', () => showHome());
// The OLA HQ /app/ globe is a native anchor first, with an optional quick-glide enhancement.
let globeJumpAnimation = 0;
function quickScrollToWaves(event) {
  const target = document.querySelector('#worlds');
  if (!target) return; // Keep the native anchor fallback.
  event.preventDefault();
  const appbar = document.querySelector('.appbar');
  const offset = (appbar?.getBoundingClientRect().height || 67) + 10;
  const start = window.scrollY;
  const end = Math.max(0, target.getBoundingClientRect().top + start - offset);
  if (globeJumpAnimation) cancelAnimationFrame(globeJumpAnimation);

  // The site's html scroll-behavior:smooth previously fought each tween frame.
  // Temporarily disable it so iOS can actually complete the quick jump.
  const root = document.documentElement;
  const previousBehavior = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto';
  const restore = () => { root.style.scrollBehavior = previousBehavior; globeJumpAnimation = 0; };
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.scrollTo({top:end, behavior:'instant'});
    restore();
    return;
  }
  const started = performance.now();
  const duration = 220;
  const easeOut = t => 1 - (1 - t) ** 3;
  const step = now => {
    const t = Math.min(1, (now - started) / duration);
    window.scrollTo({top:start + (end - start) * easeOut(t), behavior:'instant'});
    if (t < 1) globeJumpAnimation = requestAnimationFrame(step);
    else restore();
  };
  globeJumpAnimation = requestAnimationFrame(step);
}
heroWorldJump?.addEventListener('click', quickScrollToWaves);
up.addEventListener('click', () => {
  const target = upTarget();
  if (target) openWorld(target);
  else showHome();
});
window.addEventListener('popstate', () => {
  const path = new URL(location.href).searchParams.get('path');
  if (!path) return showHome(false);
  const resolved = new URL(path, ROOT).href;
  if (!isAllowed(resolved)) return showHome(false);
  const world = matchWorld(resolved);
  if (world) openWorld(world, resolved, false);
  else showHome(false);
});
const requested = new URL(location.href).searchParams.get('path');
if (requested && isAllowed(new URL(requested, ROOT).href)) {
  const href = new URL(requested, ROOT).href;
  const world = matchWorld(href);
  if (world) openWorld(world, href, false);
}
// Safari Home Screen web apps and installed PWAs should not show "Get the app".
const installMode = window.matchMedia('(display-mode: standalone)');
const getAppButton = document.querySelector('#install');
const isAppWindow = () => installMode.matches || window.navigator.standalone === true;
const syncInstallPresentation = () => {
  const installedWindow = isAppWindow();
  document.documentElement.classList.toggle('is-installed', installedWindow);
  getAppButton.hidden = installedWindow;
};
syncInstallPresentation();
if (installMode.addEventListener) installMode.addEventListener('change', syncInstallPresentation);
else if (installMode.addListener) installMode.addListener(syncInstallPresentation);
window.addEventListener('appinstalled', () => { getAppButton.hidden = true; });

const installDialog = document.querySelector('#install-info');
const nativeInstall = document.querySelector('#native-install');
document.querySelector('#install').addEventListener('click', () => installDialog.showModal());
document.querySelector('.close-install').addEventListener('click', () => installDialog.close());
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstall = event;
  nativeInstall.hidden = false;
});
nativeInstall.addEventListener('click', async () => {
  if (!deferredInstall) return;
  deferredInstall.prompt();
  await deferredInstall.userChoice;
  deferredInstall = null;
  nativeInstall.hidden = true;
  installDialog.close();
});
