# La Ola de Amor — Tornaboda Talavera + Interactive Map — Recovery Review

**Status:** IMPLEMENTED AS AN ISOLATED GITHUB REVIEW CANDIDATE. **NOT MERGED OR DEPLOYED.** Browser-integration and real-device release QA remain open.
**GitHub branch:** `review/tornaboda-talavera-recovery-20261009` (public-source branch, visible to people who can view the public repo; does NOT change the deployed site).
**Starting baseline:** existing approved two-day Festival Guide from public `main`; printed QR destination unchanged.

## Major recovery breakthrough — original illustrated map verified

The native Library image **La Tornaboda: Fiesta Garden Map.png** is 1086×1448 and has **Git blob hash `b789b100508d93c9b9ad429760dd44dc0b134e53`**, exactly matching the current published `la-ola-de-amor/scan/guide/art/tornaboda-map-corrected-draft.png` blob in GitHub. Therefore no stand-in map was used; the source image underlying the website is independently recovered. This is a byte-for-byte proof, not just an artwork resemblance.

The interrupted Business worker’s private `work/talavera` code and coordinates were NOT retrieved, but the equivalent ten marker placements were recreated by locating each icon/feature directly on this now-verified exact artwork. It would be inaccurate to call them an exact copy of the interrupted worker's coordinates.

## Current implementation (review branch only)

- **Saturday-only Talavera identity:** canonical pre-existing `la-ola-de-amor/assets/tile.svg` blue/white decorative borders, cream/navy/gold framing, typography hierarchy; Friday visual HTML unchanged.
- **Inline map:** original corrected artwork remains in the page as a tappable button. The redundant visible “Open the Saturday map” caption is hidden visually but preserved as a screen-reader label. No markers intrude on the default inline artwork.
- **Interactive map viewer:** same exact image with ten numbered selectable markers and below-map directory. Marker selection and directory selection stay synchronized. Scrollable zoom (+, −, reset) and keyboard-accessible controls; number and descriptions in English and Spanish.
- **Ten real visual anchors:** Inflagol, Taquería, central fountain (NOT a pool), Casa Sol, garden tables, garden lounge chairs, Baños, Súper Farmacia Domingo, Camino de Entrada, and right-pointing racquetball direction arrow (NOT a court pin). These are **illustrated references**, never confirmations of operational vendors, available facilities, access or safety routes.
- **Approved #012 copy reconciliation:** removed unsupported “Fair games” / “Juegos de feria” from the Today overview's experiences line; preserved historical official map/identity records elsewhere.
- **Offline preflight:** advanced `la-ola-de-amor/scan/sw.js` cache revision and included the existing `../assets/tile.svg` resource; no printed QR/URL changes; no privacy rule or content permission change.

## Verification receipts

- 15/15 source-level/invariant checks passed on the 10-marker branch before cache update: valid JavaScript parse, ten unique markers within artwork dimensions, matching registry and directory, both languages, source SHA, preserved inline map, Friday content and branch isolation.
- Headless Chromium **isolated QA fixture** using the exact recovered 1086×1448 image: at **1440, 400, and 360 px**, ten dots and directory rendered, both direction selections worked, zoom/reset, Escape and return focus, Spanish text, and zero JS page errors passed.
- Additional physical browser click test: **10/10 on-image dots were clickable at each of 360, 400, and 1440 px**, including far-right racquetball marker. This specifically addresses prior overflow/scrollbar blocking.
- The isolated preview and screenshots are **not the full live Festival Guide runtime**. Full guide-integrated browser QA, the service worker’s actual offline replay, privacy checks, iPhone Safari pinch zoom, and final Talavera visual user approval have NOT been completed. Do not call them passed based on this fixture.

## Outstanding before release

1. Review the real staged visual candidate against the user-approved appearance. QA fixture: `/mnt/data/tornaboda-review/Tornaboda_Talavera_Interactive_Review.html` (self-contained), with desktop/mobile screenshots in that generated artifact directory. The fixture is a *visual and interaction companion*; GitHub branch is authoritative code.
2. Run full integrated EN/ES browser QA and iPhone Safari check, especially opening/closing the real hash-route dialog, the complete scrollable ten-marker map, zoom/focus, mobile width and legend, current Friday content, URL/QR, and all four tabs' top Updates shortcut.
3. Test actual PWA install/update/offline cache behavior with the new version and tile asset, and all privacy exclusions.
4. Confirm no conflicting OLA HQ website correction changes were overwritten. Compare to active `main` and worker branch before integration.
5. Show source-backed 10-spot overlay and Talavera before/after to Jonathan. **Explicit approval is required before any merge or deploy.**

The prior Business worker's original private prototype may still be a useful comparison if it resurfaces, but **is not required to rebuild the released Guide**; this review branch already uses the exact published map artwork and a documented, reconstructable hotspot registry.
