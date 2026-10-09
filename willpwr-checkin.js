/* Willpwr's device-local check-in. No requests, analytics or remote storage. */
(() => {
  const form = document.querySelector('#willpwr-checkin');
  if (!form) return;
  const key = 'ola-hq-willpwr-checkin-v1';
  const status = document.querySelector('#checkin-status');
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '{}');
    for (const [name, value] of Object.entries(saved)) {
      const field = form.elements.namedItem(name);
      if (field) field.value = value;
    }
  } catch {
    status.textContent = 'Saved notes are unavailable in this browser.';
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    try {
      localStorage.setItem(key, JSON.stringify(Object.fromEntries(new FormData(form))));
      status.textContent = 'Saved on this device only.';
    } catch {
      status.textContent = 'This browser could not save your notes. They are still here until you leave.';
    }
  });
  document.querySelector('#clear-checkin').addEventListener('click', () => {
    try {
      localStorage.removeItem(key);
      // The existing field named "reset" shadows form.reset; retain saved-note compatibility.
      HTMLFormElement.prototype.reset.call(form);
      status.textContent = 'Saved notes cleared from this device.';
    } catch {
      status.textContent = 'This browser could not clear saved notes.';
    }
  });
})();
