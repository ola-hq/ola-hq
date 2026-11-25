import {CardViewer} from '../assets/ola-worlds/card-viewer.js?v=20261125-physical38';
import {PaperSound} from './paper-sound.js?v=20261125-polaroid38';

// Reuse every shared gesture; only Polaroid's sound backend differs from Cinema.
export class PolaroidCardViewer extends CardViewer {
  constructor(options) { super(options); this.loopPhotos = options.loop !== false; }
  show() {
    super.show();
    if (!this.loopPhotos) {
      this.prev.disabled = this.index === 0;
      this.next.disabled = this.index === this.items.length - 1;
    }
  }
  async toss(delta, options) {
    if (!this.loopPhotos && (this.index + delta < 0 || this.index + delta >= this.items.length)) return;
    return super.toss(delta, options);
  }
  unlockAudio() { if (this.sound) (this.projector || (this.projector = new PaperSound())).unlock(); }
  reelSound() { if (this.sound) (this.projector || (this.projector = new PaperSound())).burst(); }
}

// Public photographs only. Album membership is supplied by its approved renderer.
export function publicMemoryTitle(photo, position, collection = '') {
  const alt = typeof photo.alt === 'string' ? photo.alt.trim() : '';
  const filename = /^(?:img|dsc|pxl)[-_]?\d[\w.-]*$/i.test(alt);
  return !alt || alt === 'Instant film photograph' || filename
    ? `${collection || photo.collection || 'Our Polaroid Wave'} · Frame ${position + 1}` : alt;
}

export function publicMemoryItems(photos, context = {}) {
  return photos.flatMap((photo, position) => {
    if (!photo?.src) return [];
    const fields = {};
    // Read only published, explicit photo fields. Never infer dates from a scan name.
    for (const key of ['date', 'location', 'story']) {
      if (typeof photo[key] === 'string' && photo[key].trim()) fields[key] = photo[key];
    }
    const title = publicMemoryTitle(photo, position, context.collection);
    return [{id:photo.sourceId || photo.src, src:photo.src, title, alt:title,
      position, collection:context.collection || photo.collection || '',
      description:context.description || '', fields,
      download:photo.download || photo.src, filename:photo.filename || '',
      downloadLabel:photo.downloadLabel || 'Open image to save',
      inline:photo.inline || '', inlineLabel:photo.inlineLabel || 'Open original to save',
      downloadNote:photo.downloadNote || '', downloadAvailable:photo.downloadAvailable !== false}];
  });
}

const element = (tag, className, text) => {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined) n.textContent = text;
  return n;
};

function renderPublicMemory(target, item) {
  target.append(element('p', 'memory-eyebrow', item.collection || 'Our Polaroid Wave'));
  target.append(element('h2', '', item.title));
  let recorded = false;
  for (const [key, label] of [['date', 'Date'], ['location', 'Location'], ['story', 'Story']]) {
    if (!item.fields[key]) continue;
    const section = element('section', 'memory-field');
    section.append(element('h3', '', label), element('p', '', item.fields[key]));
    target.append(section); recorded = true;
  }
  if (!recorded) target.append(element('p', 'memory-unrecorded',
    'No additional memory details are published for this photograph.'));
  if (item.description) {
    const section = element('details', 'memory-collection-context');
    section.append(element('summary', '', 'About this collection'), element('p', '', item.description));
    target.append(section);
  }
}

function stylesheetReady(link) {
  if (link.sheet) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const done = (error) => {
      clearTimeout(timer);
      link.removeEventListener('load', loaded); link.removeEventListener('error', failed);
      error ? reject(error) : resolve();
    };
    const loaded = () => done();
    const failed = () => done(new Error('Photograph viewer stylesheet unavailable'));
    const timer = setTimeout(failed, 5000);
    link.addEventListener('load', loaded, {once:true});
    link.addEventListener('error', failed, {once:true});
    if (link.sheet) loaded();
  });
}

export async function createPolaroidMemoryViewer({mountFeedback, onNavigate, onClose, onShare, loop = true} = {}) {
  let items = [], index = 0, opener = null, pendingMemory = null, reopen = false, destroyed = false;
  const details = element('dialog', 'polaroid-memory-dialog');
  details.setAttribute('aria-labelledby', 'polaroid-memory-title');
  const top = element('div', 'memory-toolbar');
  const back = element('button', '', 'Back to photograph'); back.type = 'button';
  const close = element('button', '', 'Back to collection'); close.type = 'button';
  top.append(back, close);
  const title = element('h1', '', 'Memory details'); title.id = 'polaroid-memory-title';
  const body = element('div', 'memory-body');
  const browse = element('div', 'memory-browse');
  const previous = element('button', '', 'Previous memory'); previous.type = 'button';
  const next = element('button', '', 'Next memory'); next.type = 'button';
  const position = element('span', 'memory-position'); position.setAttribute('role', 'status');
  browse.append(previous, position, next);
  const feedback = element('section', 'memory-feedback');
  feedback.setAttribute('aria-label', 'Photograph likes and notes');
  const original = element('a', 'memory-original', 'Open image to save');
  original.target = '_blank'; original.rel = 'noopener';
  const inline = element('a', 'memory-inline'); inline.target = '_blank'; inline.rel = 'noopener';
  const share = element('button', 'memory-share', 'Share photograph'); share.type = 'button'; share.hidden = !onShare;
  const status = element('p', 'memory-status'); status.setAttribute('role', 'status');
  const downloadNote = element('p', 'memory-download-note');
  details.append(top, title, body, original, inline, share, downloadNote, status, browse, feedback); document.body.append(details);

  const viewer = new PolaroidCardViewer({theme:'polaroid', immersive:true, physicalCard:true, intensity:18, loop,
    onDismiss:() => { pendingMemory = null; onClose?.(); },
    label:'Polaroid Wave photograph viewer', renderBack:renderPublicMemory,
    onNavigate:item => { index = items.indexOf(item); onNavigate?.(item); },
    // A photograph tap opens real public memory details. Physical flip is plain paper;
    // Escape and deliberate bottom-release return to the collection.
    onActivate:item => { pendingMemory = item; }
  });
  viewer.closeButton.textContent = 'Memory details';
  viewer.stage.setAttribute('aria-label', 'Photograph. Drag to move and tilt. Pinch and twist with two fingers; sweep both fingers sideways to turn the card over. Flick sideways to browse, up to toss and return, or pull all the way down and release to leave. Tap the photograph for memory details or empty space for controls. Tab reveals controls. F flips, R rotates, Shift R rotates left, Up tosses, arrows browse, Escape returns to collection.');

  const toGrid = viewer.button('Back to collection', () => { pendingMemory = null; viewer.close(); onClose?.(); });
  toGrid.className = 'polaroid-stage-return';
  const controls = viewer.button('Photo controls', () => {
    const expanded = viewer.dialog.dataset.controls !== 'true';
    viewer.setControls(expanded);
    controls.setAttribute('aria-expanded', String(expanded));
    if (expanded) viewer.closeButton.focus();
  });
  controls.className = 'polaroid-stage-controls'; controls.setAttribute('aria-expanded', 'false');
  viewer.dialog.append(toGrid, controls);
  const controlsObserver = new MutationObserver(() => controls.setAttribute('aria-expanded', viewer.dialog.dataset.controls));
  controlsObserver.observe(viewer.dialog, {attributes:true, attributeFilter:['data-controls']});
  const audioLabel = () => {
    viewer.soundButton.textContent = viewer.sound ? 'Paper sound on' : 'Paper sound off';
    viewer.soundButton.title = 'Soft paper-flip sound. Turn off for silent browsing.';
    viewer.soundButton.dataset.audioStatus = 'paper-flip';
  };
  audioLabel(); viewer.soundButton.addEventListener('click', audioLabel);

  const focusGrid = () => {
    const target = opener?.isConnected ? opener : document.querySelector('main');
    target?.focus({preventScroll:true});
  };
  const renderDetails = item => {
    index = items.indexOf(item);
    details.dataset.photoId = item.id;
    title.textContent = item.title; body.replaceChildren(); renderPublicMemory(body, item);
    original.href = item.download; original.hidden = !item.downloadAvailable;
    original.textContent = item.downloadLabel;
    if (item.filename) original.download = item.filename; else original.removeAttribute('download');
    inline.hidden = !item.inline || !item.downloadAvailable; inline.href = item.inline; inline.textContent = item.inlineLabel;
    downloadNote.textContent = item.downloadNote; status.textContent = '';
    position.textContent = `${index + 1} of ${items.length}`;
    previous.disabled = items.length < 2 || (!loop && index === 0);
    next.disabled = items.length < 2 || (!loop && index === items.length - 1);
    // Retain the exact existing feedback identity and its device-local drafts.
    feedback.hidden = !mountFeedback;
    mountFeedback?.(feedback, {id:'photo:' + item.src, title:item.title, url:location.href});
  };
  const moveDetails = delta => {
    if (items.length < 2 || (!loop && (index + delta < 0 || index + delta >= items.length))) return;
    renderDetails(items[(index + delta + items.length) % items.length]); onNavigate?.(items[index]);
  };
  share.addEventListener('click', () => onShare?.(items[index], status));
  previous.addEventListener('click', () => moveDetails(-1));
  next.addEventListener('click', () => moveDetails(1));
  viewer.dialog.addEventListener('close', () => {
    if (!pendingMemory || destroyed) return;
    const item = pendingMemory; pendingMemory = null;
    renderDetails(item);
    details.showModal(); back.focus();
  });
  back.addEventListener('click', () => { reopen = true; details.close(); });
  close.addEventListener('click', () => { reopen = false; details.close(); });
  details.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); reopen = false; details.close(); }
    if (!e.target.matches('input,textarea,select') && ['ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault(); e.stopPropagation(); moveDetails(e.key === 'ArrowRight' ? 1 : -1);
    }
    if (e.key === 'Tab') {
      const list = [...details.querySelectorAll('button:not(:disabled),a[href],textarea,input,[tabindex="0"]')]
        .filter(n => n.getClientRects().length);
      if (e.shiftKey && document.activeElement === list[0]) { e.preventDefault(); list.at(-1)?.focus(); }
      else if (!e.shiftKey && document.activeElement === list.at(-1)) { e.preventDefault(); list[0]?.focus(); }
    }
  });
  details.addEventListener('cancel', e => { e.preventDefault(); e.stopPropagation(); reopen = false; details.close(); });
  details.addEventListener('close', () => {
    if (reopen && !destroyed) { reopen = false; viewer.open(items, index, opener); }
    else { focusGrid(); onClose?.(); }
  });

  let css = document.querySelector('link[data-polaroid-memory]');
  if (!css) {
    css = element('link'); css.rel = 'stylesheet';
    css.href = new URL('./memory-viewer.css?v=20261125-polaroid38', import.meta.url);
    css.dataset.polaroidMemory = ''; document.head.append(css);
  }
  try { await Promise.all([stylesheetReady(css), stylesheetReady(document.querySelector('link[data-ola-viewer]'))]); }
  catch (error) { controlsObserver.disconnect(); viewer.destroy(); details.remove(); throw error; }

  return {
    open(photos, position, sourceOpener, context) {
      if (destroyed) return;
      pendingMemory = null; reopen = false;
      if (details.open) details.close();
      items = publicMemoryItems(photos, context); index = items.findIndex(item => item.position === position);
      if (index < 0) return;
      opener = sourceOpener; controls.setAttribute('aria-expanded', 'false');
      viewer.dialog.dataset.controls = 'false';
      viewer.open(items, index, opener); return true;
    },
    close() { pendingMemory = null; reopen = false; if (details.open) details.close(); viewer.close(); },
    destroy() { destroyed = true; pendingMemory = null; reopen = false;
      controlsObserver.disconnect(); viewer.soundButton.removeEventListener('click', audioLabel); viewer.destroy(); details.remove(); }
  };
}
