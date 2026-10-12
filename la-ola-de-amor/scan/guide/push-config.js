'use strict';
// Public OneSignal App ID only. Never put the provider REST API key in this file.
// Derive worker paths from the deployed app URL, including GitHub Pages project prefixes.
(() => {
  const scriptUrl = new URL(document.currentScript.src);
  const scanBase = new URL('../', scriptUrl);
  const pushWorker = new URL('onesignal/OneSignalSDKWorker.js', scanBase);
  const pushScope = new URL('onesignal/', scanBase);
  window.LA_OLA_PUSH_CONFIG = Object.freeze({
    appId: '7a08d6ee-1181-4925-bd3f-1a7a7439aaee',
    serviceWorkerPath: pushWorker.pathname,
    serviceWorkerScope: pushScope.pathname
  });
})();
