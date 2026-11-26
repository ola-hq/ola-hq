import {createPolaroidMemoryViewer} from '../memory-viewer.js?v=20261125-polaroid43';

// The three static curated albums keep their own original links and modal fallback.
let viewerPromise, sequence = 0, fallback = false;
const getViewer = () => viewerPromise || (viewerPromise = createPolaroidMemoryViewer({loop:false})
  .catch(error => { viewerPromise = null; throw error; }));
document.addEventListener('click', async event => {
  const link = event.target.closest('a[data-photo][data-group]');
  if (!link || fallback || event.defaultPrevented || event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const frames = [...document.querySelectorAll('a[data-photo][data-group]')]
    .filter(frame => frame.dataset.group === link.dataset.group);
  const photos = frames.map(frame => ({sourceId:frame.dataset.photo,
    src:frame.querySelector('img').src, alt:'Frame ' + frame.dataset.photo,
    download:frame.querySelector('img').src, filename:frame.dataset.photo + '.jpg', downloadLabel:'Download JPEG'}));
  const request = ++sequence;
  event.preventDefault(); event.stopImmediatePropagation();
  try {
    const viewer = await getViewer();
    if (request !== sequence || !link.isConnected) return;
    viewer.open(photos, frames.indexOf(link), link, {collection:document.querySelector('h1')?.textContent || 'Our Polaroid Wave'});
  } catch {
    fallback = true; try { link.click(); } finally { fallback = false; }
  }
}, true);
addEventListener('pagehide', () => { sequence++; viewerPromise?.then(viewer => viewer.destroy()); viewerPromise = null; });
