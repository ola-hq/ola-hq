'use strict';
// Public OneSignal App ID only. Do NOT add the REST API key or any provider secret.
// Configure after creating a OneSignal Web Push app for the production HTTPS origin.
window.LA_OLA_PUSH_CONFIG = Object.freeze({
  appId: '',
  serviceWorkerPath: '/la-ola-de-amor/scan/onesignal/OneSignalSDKWorker.js',
  serviceWorkerScope: '/la-ola-de-amor/scan/onesignal/'
});
