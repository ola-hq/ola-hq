'use strict';
(() => {
  const panel = document.getElementById('guide-push');
  const button = document.getElementById('guide-push-toggle');
  const status = document.getElementById('guide-push-status');
  const instructions = document.getElementById('guide-push-instructions');
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
      help: 'Optional alerts for important festival moments. You can pause them at any time. The guide and its updates work without notifications.',
      installing: 'Install the guide first to receive iPhone notifications.'
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
      help: 'Avisos opcionales para momentos importantes. Puedes pausarlos cuando quieras. La guía funciona sin notificaciones.',
      installing: 'Primero instala la guía para recibir avisos en iPhone.'
    }
  };
  let signal = null, busy = false, initFailed = false;

  const language = () => document.documentElement.lang.toLowerCase().startsWith('es') ? 'es' : 'en';
  const t = key => copy[language()][key];
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const ios = () => /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const supported = () => window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const permission = () => typeof Notification === 'undefined' ? 'default' : Notification.permission;
  const subscribed = () => Boolean(signal && signal.Notifications.permission && signal.User.PushSubscription.optedIn);

  function render() {
    const needsInstall = ios() && !standalone();
    const denied = permission() === 'denied';
    const unavailable = !supported();
    const on = subscribed();
    instructions.textContent = needsInstall ? t('ios') : t('help');
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
        welcomeNotification: { disable: true }
      });
      signal = OneSignal;
      initFailed = false;
      OneSignal.Notifications.addEventListener('permissionChange', render);
      OneSignal.User.PushSubscription.addEventListener('change', render);
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
        if (signal.Notifications.permission) await signal.User.PushSubscription.optIn();
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
  // Guide.js changes html[lang] when the guest switches ES/EN.
  new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
})();
