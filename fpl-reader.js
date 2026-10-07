(() => {
  'use strict';
  const publications = window.FPL_PUBLICATIONS;
  const key = new URLSearchParams(location.search).get('issue') || 'fantasy2026';
  const issue = publications && Object.hasOwn(publications, key) ? publications[key] : null;
  if (!issue) {
    document.querySelector('#publication-note').textContent = 'This publication could not be found. Choose an original below or return to La Ola FC.';
    return;
  }
  const byId = id => document.getElementById(id);
  const image = byId('publication-image'), stage = byId('page-stage'), select = byId('page-select');
  const previous = byId('page-previous'), next = byId('page-next'), zoom = byId('page-zoom');
  let current = 0;
  document.title = `${issue.title} · ${issue.season} · La Ola FC`;
  byId('publication-season').textContent = `${issue.season} · ${issue.role}`;
  byId('publication-title').textContent = issue.title;
  byId('publication-subtitle').textContent = issue.subtitle;
  byId('publication-note').textContent = issue.note;
  for (const id of ['publication-return', 'end-return']) byId(id).href = `fpl-wave.html#${issue.return_anchor}`;
  if (issue.pdf_path) byId('publication-pdf').href = issue.pdf_path;
  else byId('publication-pdf').hidden = true;
  else byId('publication-pdf').hidden = true;
  issue.pages.forEach((page, index) => {
    const option = document.createElement('option');
    option.value = String(index); option.textContent = `${index + 1} — ${page.title}`; select.append(option);
  });
  const readHash = () => {
    const raw = new URLSearchParams(location.hash.slice(1)).get('page');
    const page = Number(raw);
    return Number.isInteger(page) && page >= 1 && page <= issue.pages.length ? page - 1 : 0;
  };
  const show = index => {
    current = Math.max(0, Math.min(issue.pages.length - 1, index));
    const page = issue.pages[current];
    image.src = page.image;
    image.alt = `${issue.title}, ${issue.season}. Page ${current + 1} of ${issue.pages.length}: ${page.title}.`;
    select.value = String(current);
    previous.disabled = current === 0; next.disabled = current === issue.pages.length - 1;
    byId('page-status').textContent = `Page ${current + 1} of ${issue.pages.length} · ${page.title}`;
    byId('page-original').href = page.image;
    byId('page-summary').textContent = current === issue.pages.length - 1 ? 'End of this publication. Return to the season to explore its supporting work.' : 'One publication, in its original page order. Use the arrows or page menu to continue reading.';
    stage.scrollTop = 0; stage.scrollLeft = 0;
  };
  const turn = index => {
    const bounded = Math.max(0, Math.min(issue.pages.length - 1, index));
    location.hash = `page=${bounded + 1}`;
    show(bounded);
  };
  previous.addEventListener('click', () => turn(current - 1));
  next.addEventListener('click', () => turn(current + 1));
  select.addEventListener('change', () => turn(Number(select.value)));
  zoom.addEventListener('click', () => {
    const enlarged = stage.classList.toggle('enlarged');
    zoom.setAttribute('aria-pressed', String(enlarged)); zoom.textContent = enlarged ? 'Fit page' : 'Enlarge page';
    stage.scrollTop = 0; stage.scrollLeft = 0;
  });
  window.addEventListener('hashchange', () => show(readHash()));
  document.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || event.target.closest('select, input, textarea, button, a')) return;
    const target = event.key === 'ArrowRight' ? current + 1 : event.key === 'ArrowLeft' ? current - 1 : event.key === 'Home' ? 0 : event.key === 'End' ? issue.pages.length - 1 : null;
    if (target !== null) { event.preventDefault(); turn(target); }
  });
  image.addEventListener('error', () => { byId('page-summary').textContent = 'The page image could not load. Open the original PDF or return to the season.'; });
  byId('publication-fallback').hidden = true;
  byId('publication-reader').hidden = false;
  show(readHash());
})();
