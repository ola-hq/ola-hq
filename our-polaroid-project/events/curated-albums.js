(() => {
const shelf = document.querySelector('#curated-albums');
if (!shelf) return;
(() => {
  const dialog = shelf.querySelector('#curated-photo-viewer');
  if (typeof dialog?.showModal !== 'function') return;

  const photo = dialog.querySelector('img');
  const title = dialog.querySelector('#curated-viewer-title');
  const details = dialog.querySelector('#curated-viewer-details');
  const previous = dialog.querySelector('[data-previous]');
  const next = dialog.querySelector('[data-next]');
  const close = dialog.querySelector('[data-close]');
  let frames = [];
  let position = 0;
  let opener;

  function showFrame(index) {
    if (index < 0 || index >= frames.length) return;
    position = index;
    const frame = frames[index];
    photo.src = frame.querySelector('img').src;
    photo.alt = `Frame ${frame.dataset.photo}`;
    const download = dialog.querySelector('[data-download]');
    download.href = photo.src;
    download.download = `${frame.dataset.photo}.jpg`;
    title.textContent = frame.dataset.photo;
    details.textContent = `${index + 1} / ${frames.length}`;
    previous.disabled = index === 0;
    next.disabled = index === frames.length - 1;
  }

  shelf.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-photo]');
    if (!link || event.defaultPrevented || event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const group = link.dataset.group;
    frames = Array.from(shelf.querySelectorAll('a[data-photo]')).filter((frame) => frame.dataset.group === group);
    event.preventDefault();
    opener = link;
    showFrame(frames.indexOf(link));
    dialog.showModal();
    close.focus();
  });

  previous.addEventListener('click', () => showFrame(position - 1));
  next.addEventListener('click', () => showFrame(position + 1));
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    showFrame(position + (event.key === 'ArrowLeft' ? -1 : 1));
  });
  dialog.addEventListener('close', () => opener?.focus());
})();

function revealAlbumAnchor() {
  const id = location.hash.slice(1);
  const target = document.getElementById(id);
  if (!target || !shelf.contains(target)) return;
  const album = target.closest('details.album-details');
  if (album) album.open = true;
  target.scrollIntoView();
}
shelf.addEventListener('click', (event) => {
  const link = event.target.closest('a[href^="#album-"]');
  if (link) document.getElementById(link.hash.slice(1)).open = true;
});
addEventListener('hashchange', revealAlbumAnchor);
revealAlbumAnchor();

})();
