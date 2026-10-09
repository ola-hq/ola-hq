# La Ola de Amor — Tornaboda Talavera Recovery (isolated review)

**Status:** PARTIAL IMPLEMENTATION; NOT MERGED OR DEPLOYED.
**Branch:** `review/tornaboda-talavera-recovery-20261009` (on public-source GitHub repository; branch contents are visible, but Pages production is unchanged).
**Recovery source:** live two-day Festival Guide on `main`, with existing original artwork, wordmark and `la-ola-de-amor/assets/tile.svg`.
**Business-account interrupted worker:** private `work/talavera` prototype, worker reported 10 location dots and matching directory plus some tests; unpublished/untransferred source and coordinates have NOT been recovered.

## Implemented in this branch
- Existing Saturday map illustration stays inline, and its image button remains the enlargement trigger. The extra visible caption is visually hidden, but kept screen-reader accessible in both languages.
- Saturday-only Talavera framing uses the actual existing navy/blue/cream/gold brand tile. Friday's structural HTML is untouched.
- Accessible Saturday-only enlarged map zoom controls (+ / − / reset) and a keyboard-focusable scroll region; preserve existing dialog focus/ESC.
- Previously approved Today text #012 is reconciled in English and Spanish. Do **not** remove older official Friday game-area identities/maps indiscriminately.
- New source: `la-ola-de-amor/scan/guide/guide.css`, `guide.js` only. No change to `index.html`, original PNG, Friday map, festival-updates.js, printed QR path, or service worker.

## Verification performed
13/13 isolated source/invariant checks passed: JavaScript parse; code scaffolding for zoom/accessibility; original map preserved; #012 English/Spanish; existing Friday map record still present; authored original tile usage; only two changed files versus `main`; no production merge/push.
These are NOT full browser end-to-end QA, NOT physical iPhone QA, and NOT offline/privacy test results. CSS visual polish is a candidate until inspected in a real browser.

## Critical remaining work / release blockers
1. Locate the original private `work/talavera` project or complete `TORNABODA_EMERGENCY_RECOVERY.txt`; it contains the workers' source-checked 10-marker layout. This file was not available from connected Google Drive or GitHub when checked. Do not fabricate point coordinates, mistake racquetball direction arrow for an actual court pin, or mistake the illustrated fountain for the swimming pool.
2. Restore ten precise on-artwork interactive hotspot dots AND paired accessible directory cards in the enlarged Saturday map from actual documented anchors. Recheck right-edge marker visibility and scrollbars.
3. Review real Talavera desktop/mobile visuals and before/after screenshots. Finish Spanish (360/400/1440px), English width checks, keyboard/focus/zoom, offline/service worker cache revision and privacy checks.
4. Reconcile other concurrent website review changes before final release. Approve merge/publish only after Jon visually reviews.

**Never present this partial branch as the final 10-marker prototype. Never merge or publish without explicit approval.**
