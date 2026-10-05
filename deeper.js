(() => {
  const dialog = document.querySelector('.gallery-reader');
  let current = 0, opener, entries = [];
  const show = index => {
    current = (index + entries.length) % entries.length;
    const entry = entries[current];
    const caption = entry.dataset.caption || entry.querySelector('img')?.alt || 'Archive image';
    dialog.querySelector('#reader-image').src = entry.href;
    dialog.querySelector('#reader-image').alt = caption;
    dialog.querySelector('#reader-caption').textContent = caption;
    dialog.querySelector('#reader-count').textContent = `${current + 1} / ${entries.length}`;
    dialog.querySelector('#reader-original').href = entry.href;
  };
  if (dialog && typeof dialog.showModal === 'function') {
    document.querySelectorAll('.gallery-open').forEach(entry => entry.addEventListener('click', event => {
      event.preventDefault(); opener = entry;
      entries = [...document.querySelectorAll('.gallery-open')].filter(e => !e.closest('[hidden]'));
      show(entries.indexOf(entry)); dialog.showModal();
    }));
    dialog.querySelectorAll('[data-reader]').forEach(button => button.addEventListener('click', () => {
      if (button.dataset.reader === 'close') dialog.close();
      else show(current + (button.dataset.reader === 'next' ? 1 : -1));
    }));
    dialog.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault(); show(current + (event.key === 'ArrowRight' ? 1 : -1));
      }
    });
    dialog.addEventListener('close', () => opener?.focus());
  }
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    document.querySelectorAll('.collection-section').forEach(section => {
      section.hidden = button.dataset.filter !== 'all' && section.dataset.collection !== button.dataset.filter;
    });
  }));
  const form = document.querySelector('#willpwr-checkin');
  if (form) {
    const key = 'ola-hq-willpwr-checkin-v1', status = document.querySelector('#checkin-status');
    try {
      const saved = JSON.parse(localStorage.getItem(key) || '{}');
      for (const [name, value] of Object.entries(saved)) if (form.elements.namedItem(name)) form.elements.namedItem(name).value = value;
    } catch { status.textContent = 'Saved notes are unavailable in this browser.'; }
    form.addEventListener('submit', event => {
      event.preventDefault();
      try { localStorage.setItem(key, JSON.stringify(Object.fromEntries(new FormData(form)))); status.textContent = 'Saved on this device only.'; }
      catch { status.textContent = 'This browser could not save your notes. They are still here until you leave.'; }
    });
    document.querySelector('#clear-checkin').addEventListener('click', () => {
      try { localStorage.removeItem(key); form.reset(); status.textContent = 'Saved notes cleared from this device.'; }
      catch { status.textContent = 'This browser could not clear saved notes.'; }
    });
  }
})();
