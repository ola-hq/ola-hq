'use strict';
// Public OneSignal App ID only. Never put the provider REST API key in this file.
// Derive worker paths from the deployed app URL, including GitHub Pages project prefixes.
(() => {
  const scriptUrl = new URL(document.currentScript.src);
  const scanBase = new URL('../', scriptUrl);
  const pushWorker = new URL('onesignal/OneSignalSDKWorker.js', scanBase);
  const pushScope = new URL('onesignal/', scanBase);
  window.LA_OLA_PUSH_CONFIG = Object.freeze({
    appId: '',
    serviceWorkerPath: pushWorker.pathname,
    serviceWorkerScope: pushScope.pathname
  });
})();
