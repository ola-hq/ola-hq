/* GDBU Campus Passport — local, optional, no account and no network requests. */
(() => {
  'use strict';
  const KEY = 'gdbu-campus-passport-v1';
  const MAJORS = {
    undecided: 'DECIDE AT THE DROP',
    les: 'LOW END STUDIES',
    dfp: 'DANCEFLOOR PHYSICS',
    cls: 'CLUB SCIENCE',
    rve: 'RAVE ETHICS'
  };
  const STAMPS = ['bass', 'pocket', 'circle', 'last'];
  const $ = id => document.getElementById(id);
  let storage = null;
  try {
    const probe = '__gdbu_local_check__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    storage = window.localStorage;
  } catch (_) {
    // Private browsing or blocked storage: still works until this page closes.
  }
  const blank = () => ({ alias: '', major: 'undecided', marks: [], issued: false });
  let state = blank();
  try {
    const raw = storage && storage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        state = {
          alias: typeof parsed.alias === 'string' ? parsed.alias.slice(0, 24) : '',
          major: Object.prototype.hasOwnProperty.call(MAJORS, parsed.major) ? parsed.major : 'undecided',
          marks: Array.isArray(parsed.marks) ? STAMPS.filter(mark => parsed.marks.includes(mark)) : [],
          issued: Boolean(parsed.issued)
        };
      }
    }
  } catch (_) { state = blank(); }

  const editor = document.querySelector('[data-gdb-passport]');
  const home = $('gdb-passport-home-status');
  if (!editor && !home) return;
  const displayAlias = () => (state.alias.trim() || 'NIGHT SCHOLAR').toLocaleUpperCase();

  const render = () => {
    const total = state.marks.length;
    if (home) {
      home.hidden = !state.issued;
      const label = $('gdb-passport-home-summary');
      if (label) label.textContent = total
        ? 'Your campus passport: ' + total + ' of 4 marks. Continue stamping →'
        : 'Your campus passport remembers you. Leave a mark →';
    }
    if (!editor) return;
    const previewAlias = $('gdb-passport-preview-alias');
    const previewMajor = $('gdb-passport-preview-major');
    const count = $('gdb-passport-count');
    const idMajor = $('gdb-campus-id-major');
    const idAlias = $('gdb-campus-id-alias');
    if (previewAlias) previewAlias.textContent = displayAlias();
    if (previewMajor) previewMajor.textContent = MAJORS[state.major];
    if (count) count.textContent = total + ' / 4';
    if (idMajor) idMajor.textContent = MAJORS[state.major];
    if (idAlias) {
      idAlias.hidden = !state.alias.trim();
      idAlias.textContent = state.alias.trim() ? 'ISSUED TO: ' + displayAlias() : '';
    }
    editor.querySelectorAll('[data-passport-stamp]').forEach(button => {
      button.setAttribute('aria-pressed', String(state.marks.includes(button.dataset.passportStamp)));
    });
    editor.querySelectorAll('[data-passport-mark]').forEach(mark => {
      mark.classList.toggle('is-stamped', state.marks.includes(mark.dataset.passportMark));
    });
  };

  const save = message => {
    let saved = false;
    if (storage) {
      try {
        if (state.issued) storage.setItem(KEY, JSON.stringify(state));
        else storage.removeItem(KEY);
        saved = true;
      } catch (_) { /* blocked or full browser storage */ }
    }
    const status = $('gdb-passport-save-status');
    if (status) status.textContent = saved
      ? (message || 'Saved on this browser only. No account or public visitor log.')
      : 'Local storage is unavailable. Your marks will last only for this visit; no account or public log.';
    render();
  };

  if (editor) {
    const alias = $('gdb-passport-alias');
    const major = $('gdb-passport-major');
    if (alias) {
      alias.value = state.alias;
      alias.addEventListener('input', () => {
        state.alias = alias.value.slice(0, 24);
        state.issued = true;
        save();
      });
    }
    if (major) {
      major.value = state.major;
      major.addEventListener('change', () => {
        state.major = Object.prototype.hasOwnProperty.call(MAJORS, major.value) ? major.value : 'undecided';
        state.issued = true;
        save();
      });
    }
    editor.querySelectorAll('[data-passport-stamp]').forEach(button => {
      button.addEventListener('click', () => {
        const mark = button.dataset.passportStamp;
        if (!STAMPS.includes(mark)) return;
        state.marks = state.marks.includes(mark)
          ? state.marks.filter(item => item !== mark)
          : STAMPS.filter(item => state.marks.includes(item) || item === mark);
        state.issued = true;
        save();
      });
    });
    const reset = $('gdb-passport-clear');
    reset?.addEventListener('click', () => {
      state = blank();
      if (alias) alias.value = '';
      if (major) major.value = 'undecided';
      save('Cleared from this browser. No personal marks remain.');
    });
    if (!storage) {
      const status = $('gdb-passport-save-status');
      if (status) status.textContent = 'Local storage is unavailable. Marks will last only for this visit; no account or public log.';
    }
  }
  render();
})();
