'use strict';
(() => {
  const panel = document.getElementById('guide-push');
  const button = document.getElementById('guide-push-toggle');
  const status = document.getElementById('guide-push-status');
  const instructions = document.getElementById('guide-push-instructions');
  const preferences = document.getElementById('guide-push-preferences');
  const festival = document.getElementById('guide-push-festival');
  const platica = document.getElementById('guide-push-platica');
  const preferenceKey = 'laOlaPushPreferenceV1';
  // Both alert topics start ON after the guest explicitly enables OS push permission.
// Persist any guest's later OFF choices; never override deliberate opt-outs.
  let choices = { festival: true, platica: true };
  try {
    const stored = JSON.parse(localStorage.getItem(preferenceKey) || 'null');
    if (stored && typeof stored.festival === 'boolean' && typeof stored.platica === 'boolean') choices = stored;
  } catch {}
  if (!panel || !button || !status || !instructions) return;

  const config = window.LA_OLA_PUSH_CONFIG || {};
  const enabled = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(config.appId || '');
  // Configuration is intentionally optional until the OneSignal Web app is created.
  if (!enabled) return;

  const copy = {
    en: {
      button: 'Enable festival alerts 🔔',
      subscribed: 'Festival alerts are ON. See you in the wave! 🌊',
      off: 'Festival alerts are OFF. Tap to enable.',
      disable: 'Pause alerts',
      retry: 'Try again',
      loading: 'Preparing notifications…',
      processing: 'Updating notification preference…',
      fail: 'Notifications could not connect. Check your connection and try again.',
      denied: 'Notifications are blocked. Enable them in your device or browser settings.',
      unsupported: 'Push notifications are not supported on this device or browser. Festival Updates still works.',
      ios: 'iPhone: open this guide in Safari, Share → Add to Home Screen, then launch the saved app and return to this section to enable alerts.',
      help: 'Once you enable notifications, both Festival and La Plática alerts start ON. Uncheck either one or pause all alerts at any time.',
      installing: 'Install the guide first to receive iPhone notifications.',
      legend: 'Choose what you receive',
      festival: '🌊 Festival announcements',
      platica: '💌 New La Plática messages',
      platicaNote: 'Both alert types start ON when you subscribe. Turn either one OFF whenever you like. Guestbook notifications are grouped to avoid spam.'
    },
    es: {
      button: 'Activar alertas del festival 🔔',
      subscribed: '¡Las alertas del festival están ACTIVADAS! 🌊',
      off: 'Las alertas están DESACTIVADAS. Toca para activarlas.',
      disable: 'Pausar alertas',
      retry: 'Intentar de nuevo',
      loading: 'Preparando las notificaciones…',
      processing: 'Actualizando preferencia de avisos…',
      fail: 'No se pudo conectar el servicio. Revisa tu conexión e inténtalo de nuevo.',
      denied: 'Las notificaciones están bloqueadas. Actívalas en los ajustes del dispositivo o navegador.',
      unsupported: 'Este dispositivo o navegador no admite notificaciones. Las actualizaciones siguen disponibles.',
      ios: 'iPhone: abre la guía en Safari, Compartir → Añadir a pantalla de inicio. Después abre la app instalada y regresa aquí para activar avisos.',
      help: 'Al activar notificaciones, tanto las alertas del festival como las de La Plática estarán ACTIVADAS. Desmarca cualquiera o pausa todos los avisos cuando quieras.',
      installing: 'Primero instala la guía para recibir avisos en iPhone.',
      legend: 'Elige qué quieres recibir',
      festival: '🌊 Anuncios del festival',
      platica: '💌 Mensajes nuevos de La Plática',
      platicaNote: 'Ambos tipos de avisos se activan al suscribirte. Puedes desactivar cualquiera cuando quieras. Agrupamos avisos de La Plática para evitar spam.'
    }
  };
  let signal = null, busy = false, initFailed = false;
  // Host-only controls validate a moderator password server-side; this exposes only an ID, not credentials.
  window.LA_OLA_PUSH = Object.freeze({
    subscriptionId: () => signal?.User?.PushSubscription?.id || null,
    subscribed: () => Boolean(signal?.Notifications?.permission && signal?.User?.PushSubscription?.optedIn)
  });
  async function syncTags() {
    if (!signal || !subscribed()) return;
    await signal.User.addTags({
      loda_festival: String(choices.festival),
      loda_platica: String(choices.platica)
    });
  }
  function savePreferences() {
    try { localStorage.setItem(preferenceKey, JSON.stringify(choices)); } catch {}
    syncTags().catch(error => console.warn('[Festival Guide] Could not sync alert categories:', error));
    render();
  }

  const language = () => document.documentElement.lang.toLowerCase().startsWith('es') ? 'es' : 'en';
  const t = key => copy[language()][key];
  // OneSignal initially detects the browser/device language. Override it with
  // the actual EN/ES selection in this guide, including after guests switch.
  // Existing bilingual push payloads then use OneSignal's user.language value.
  function syncNotificationLanguage() {
    if (!signal || typeof signal.User?.setLanguage !== 'function') return;
    try {
      Promise.resolve(signal.User.setLanguage(language())).catch(error =>
        console.warn('[Festival Guide] Push language preference could not sync:', error));
    } catch (error) {
      console.warn('[Festival Guide] Push language preference could not sync:', error);
    }
  }
  const titleEn = panel.querySelector('[data-push-en]');
  const titleEs = panel.querySelector('[data-push-es]');
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const ios = () => /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const supported = () => window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const permission = () => typeof Notification === 'undefined' ? 'default' : Notification.permission;
  const subscribed = () => Boolean(signal && signal.Notifications.permission && signal.User.PushSubscription.optedIn);

  function render() {
    if (titleEn) titleEn.hidden = language() !== 'en';
    if (titleEs) titleEs.hidden = language() !== 'es';
    const needsInstall = ios() && !standalone();
    const denied = permission() === 'denied';
    const unavailable = !supported();
    const on = subscribed();
    instructions.textContent = needsInstall ? t('ios') : t('help');
    if (preferences && festival && platica) {
      preferences.disabled = !signal || busy || !subscribed();
      festival.checked = choices.festival;
      platica.checked = choices.platica;
      preferences.querySelector('[data-push-legend]').textContent = t('legend');
      preferences.querySelector('[data-push-festival]').textContent = t('festival');
      preferences.querySelector('[data-push-platica]').textContent = t('platica');
      preferences.querySelector('[data-push-platica-note]').textContent = t('platicaNote');
    }
    button.hidden = needsInstall || unavailable || denied;
    button.disabled = busy || !signal;
    button.textContent = on ? t('disable') : t('button');
    if (needsInstall) status.textContent = t('installing');
    else if (denied) status.textContent = t('denied');
    else if (unavailable) status.textContent = t('unsupported');
    else if (busy) status.textContent = t('processing');
    else if (initFailed) status.textContent = t('fail');
    else if (!signal) status.textContent = t('loading');
    else status.textContent = on ? t('subscribed') : t('off');
  }

  panel.hidden = false;
  render();

  if (!supported() || (ios() && !standalone())) return;
  // Load and initialize once configured. Native permission is NOT requested on page load.
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async OneSignal => {
    try {
      await OneSignal.init({
        appId: config.appId,
        serviceWorkerPath: config.serviceWorkerPath,
        serviceWorkerParam: { scope: config.serviceWorkerScope },
        notifyButton: { enable: false },
        // Do not let dashboard default prompts interrupt guests: explicit button only.
        promptOptions: { autoPrompt: false, slidedown: { prompts: [{ type: 'push', autoPrompt: false }] } },
        welcomeNotification: { disable: true }
      });
      signal = OneSignal;
      initFailed = false;
      syncNotificationLanguage();
      // Keep user-selected choices in localStorage. Earlier versions auto-tagged
      // Plática OFF without an explicit choice; adopt the new ON default ONLY
      // when the guest never saved their own preferences. On a later visit,
      // sync both topics to OneSignal without overriding deliberate opt-outs.
      try {
        if (subscribed()) await syncTags();
      } catch (error) { console.warn('[Festival Guide] Preference sync unavailable:', error); }
      OneSignal.Notifications.addEventListener('permissionChange', render);
      OneSignal.User.PushSubscription.addEventListener('change', () => {
        render();
        syncNotificationLanguage();
        // A newly-created subscription may appear after the permission event.
        // Ensure the initial ON-by-default category tags reach OneSignal.
        if (subscribed()) syncTags().catch(error => console.warn('[Festival Guide] Could not sync subscribed topics:', error));
      });
      render();
    } catch (error) {
      initFailed = true;
      console.warn('[Festival Guide] Push SDK setup failed:', error);
      render();
    }
  });
  const sdk = document.createElement('script');
  sdk.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
  sdk.defer = true;
  sdk.onerror = () => { initFailed = true; render(); };
  document.head.appendChild(sdk);

  button.addEventListener('click', async () => {
    if (!signal || busy) return;
    busy = true;
    render();
    try {
      if (subscribed()) {
        await signal.User.PushSubscription.optOut();
      } else {
        // Permission request is ONLY made in response to an explicit guest tap.
        if (!signal.Notifications.permission) await signal.Notifications.requestPermission();
        if (signal.Notifications.permission) {
          await signal.User.PushSubscription.optIn();
          syncNotificationLanguage();
          await syncTags();
        }
      }
      initFailed = false;
    } catch (error) {
      initFailed = true;
      console.warn('[Festival Guide] Push preference update failed:', error);
    } finally {
      busy = false;
      render();
    }
  });
  festival?.addEventListener('change', () => { choices.festival = festival.checked; savePreferences(); });
  platica?.addEventListener('change', () => { choices.platica = platica.checked; savePreferences(); });
  // Guide.js changes html[lang] on the EN/ES switch: update both the local
  // control labels and the OneSignal user language for future notifications.
  new MutationObserver(() => { render(); syncNotificationLanguage(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
})();
