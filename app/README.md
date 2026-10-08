# OLA HQ — Universal App Shell Prototype 01
Date: 2026-10-08
Owner: OLA HQ
Code route: /ola-hq/app/
Public app source: ola-hq/ola-hq/app/
Private source authority: ola-hq/ola-hq-master/
Related projects: La Ola de Amor Festival Guide; OLA HQ public home; GDB, La Ola FC, Arsenal, Wave 26, Polaroid, Simulation, Blockbuster and deeper waves.

## Locked creative direction
"Simple but explosive. Easy to navigate, expansive to explore."
An art-forward globe/wave entrance that becomes a navigable universe. Do not flatten each world into generic HQ styling. A mobile-first, responsive gallery of distinct public-world portals is the v0.1 choice; free-pan infinite canvas is deferred until a usable accessible baseline is established.

## Hierarchical navigation contract
OLA HQ logo = global home, always.
Contextual Up button = nearest meaningful ancestor, explicitly labeled by destination.
Examples:
- GDB Wave interior -> GDB Wave home -> OLA HQ launcher.
- GDB University home -> GDB Wave home -> OLA HQ.
- Arsenal Wave home -> La Ola FC home -> OLA HQ.
- La Ola de Amor Festival Guide -> La Ola de Amor -> OLA HQ.
The contextual control is NEVER ambiguously labeled "Home" when it actually means a parent. Existing world navigation remains intact; the app shell is the enclosing layer.

## Implementation boundary
Additive static PWA shell at public /app/. Uses iframe to keep the parent/navigation layer visible while loading existing same-origin public worlds; frame compatibility and history handling need device review. Open ↗ exits frame when necessary. The first install uses a standalone manifest and the existing official globe image; no root service worker is added and no site-wide scripts/CSS or existing canonical world code is modified.
The public /app/ standalone manifest uses distinct stable id /ola-hq/app/ and scope /ola-hq/. This does not overwrite the La Ola de Amor Guide's own manifest (id ./guide/) or its own service worker scope.

## Wedding protection — HARD LOCK
Do not change the existing printed QR destination:
https://ola-hq.github.io/ola-hq/la-ola-de-amor/scan/guide/
Do not move/rename Guide, mutate its manifest, rewrite its service worker, rewrite the existing QR, or rewrite public Linkie/Zola endpoints in this initial prototype.
Festival Guide installation and existing QR independently remain valid. Integration is by a new inside-app navigation link into the unchanged path. Any future "Get OLA HQ" footer CTA in Guide requires separate QA and a scoped approval.
No backend, accounts, content ingestion or private file links are exposed in v0.1.

## Technical decisions and constraints
- Web install via iPhone Safari Share > Add to Home Screen; Android via browser install. No App Store cost or approval.
- Install CTA is instructional; on supported Chromium browsers, the deferred install prompt can open.
- Do not claim automatic installation, offline HQ capability, native app functionality, push notifications, or production QA.
- Most worlds remain online-only. Guide preserves its own offline caching.
- New app route should have 0 modifications outside public /app/.
- Existing world navigation may escape the wrapper via target=_top or external link. Prototype supports opening independently.
- PWA icon uses official existing globe image; proper icon size/format and safe-area verification are future QA items.
- Validate 360px, 390px and 400px iPhone layouts; keyboard, focus, contrast; older iOS and Android install; all URLs; route hierarchy; back behavior; service-worker separation; privacy; no broken art; and existing QR loading.
- If a subworld refuses iframe or navigation breaks, switch to direct linking for that world instead of altering its original experience.

## Release protocol
1. Capture current public and private heads and confirm existing wedding URL.
2. Publish additive app route only.
3. Verify 200 responses for HTML/CSS/JS/manifest/logo. Verify no existing path changed.
4. Exercise on-device world browsing, contextual parent/OLA HQ buttons, the entire Festival Guide, install and returns.
5. Only after device QA, decide whether to add a "Get OLA HQ" CTA from the Guide — no QR change.
6. Document test results and known limitations.

## Canonical documentation links
This README is the public implementation note. A Google Drive handoff document should hold the full current decision record.
Related existing: OLA HQ WORLD ROLLOUT + APPLICATION BOARD — CURRENT; OLA HQ BRAND SYSTEM + WORLD DESIGN LANGUAGES — CURRENT; OLA HQ / HTML + GitHub Publishing project packet; Festival Guide APP PLAN; WAVE_PORTAL_BUILD.
Historical plan claims that the Festival Guide alone is the starting architecture are superseded for HQ PWA scope, but the Festival Guide remains a preserved standalone release.
