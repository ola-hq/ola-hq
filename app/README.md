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

## 2026-10-08 — Featured-world card hierarchy
Large, full-width world art: La Ola de Amor, Polaroid Wave, Blockbuster Wave. All remaining worlds, including the former text-only More Worlds list, now have the same standard portal-card footprint as Wave 26 and La Ola FC. Reuse existing world images when available and use nonliteral decorative fallback for Willpwr/Offbrand until their source-authoritative banner assets are ready. Scope is app/ only. The unchanged printed Festival Guide QR is the hard lock; review mobile rendering before treating this as a final approved visual pass.

## 2026-10-08 — Public website entry point, installed-mode CTA and update behavior
User-approved: the original OLA HQ website homepage globe/wordmark now links to /ola-hq/app/; top navigation has App ↗, and the existing Around the home area has a new OLA HQ App card. The existing Home link remains the conventional root-site homepage. These are additive/reversible changes to the public root index.html. In the app, hide "Get the app" when standalone via CSS display-mode and navigator.standalone runtime fallback; if opened as an ordinary browser tab, the install instructions still show because web browsers cannot reliably detect whether an app was installed elsewhere. No automatic install, no alternative US iPhone marketplace download. The PWA is website-backed and fetches changes as deployed/cache permits; re-open to see fresh versions, no reinstall. Increment CSS+JS cache-busting query parameters in app/index.html. Scope: root index.html, app/index.html, app/app.js, app/style.css, app/README.md. Festival Guide URL and offline/manifest files untouched.

## 2026-10-08 — Logo-only world-card refinements (user-review notes)
- GDB University no longer displays its orientation sticker screenshot on the app portal. It now uses the primary crest already used on its public campus website: `assets/job2/gdb-primary-crest.png` (source-verified).
- Willpwr Wave and Offbrand Wave no longer display arbitrary placeholder W/star. App-specific SVG logo lockup studies are added in `app/art/`; they draw from current brand-source descriptions. **These two are provisional and are NOT claimed as previously approved official logos.** Locate/import each original logo/avatar master and replace only app preview lockup after comparison and approval.
- No other app world card, world interior, Festival Guide, printed QR, app routes, scripts or offline systems changed in this logo-only pass. Stylesheet URL increments to v4 to address cached installed views.

## 2026-10-08 — App entrance micro-polish 05
Based on user screenshot of the mobile entrance, keep the main “Our Waves. One Home.” title and world-card grid but replace the oversized cream “Explore the worlds” CTA with a quiet, accessible down-arrow scroll cue (still an anchor to `#worlds`, with an accessible name). Change opening eyebrow to “WELCOME TO OUR WORLD”, hero tagline to “One wave. Distinct worlds. Follow whatever pulls you in.”, and section title to “The Waves”. The design intent is art-first discovery and a smooth transition into the cards without a competing primary button. No hero asset, world card, routing, global website, manifest, Guide, printed QR, or service worker changed. Stylesheet query updated v5 to help installed PWA reload.

## POLISH PASS 06 — bounded, source-first app portals and arrow normalization
- Reviewed public GDB exterior on `more-waves.html` (cream/maroon campus crest `assets/deeper/gdb-08.jpg`), verified the exact campus crest source `assets/job2/gdb-primary-crest.png`. New GDB **Wave** portal uses that crest on cream, with GDB University portal untouched.
- Reviewed live Offbrand and Willpwr world sites and documented brand system/Drive source inventory. `10_WILLPWR_Wave.png` and `11_Offbrand_Wave.png` in Drive `Showcase Generations — 2026-10-06` are GENERATED exhibition art, not confirmed official logos. Canva searches did not identify authoritative Offbrand/Willpwr designs. Public Instagram profiles were not reliably fetchable.
- Replaced the two v1 SVG studies with new **app-only, explicitly provisional, source-led** portal treatments. Offbrand v2 uses its established paper/ink/yellow anti-brand collage + lowercase wordmark + wave; Willpwr v2 uses its *actual public-site* light paper / forest green + check-in + SHOW UP system, rather than a generic dark-gold logo. Do not represent these v2 assets as verified original logo masters. Preserve user's separately supplied Offbrand reference as review authority when directly mountable.
- Scanned all rendered OLA HQ app markup and contextual navigation code. Replaced all Unicode arrow glyphs used as UI controls (up-right, down and left) with CSS-styled inline, stroke-only SVG arrow geometry. This prevents iOS presenting up-right arrows as emoji. Deliberately did **not** change other individual world-site arrows or protected Festival Guide code; those are outside this app-only strict scope.
- Updated app CSS v6 and JS v3 URLs for installed PWA refresh. No app manifest, service worker, original HQ homepage, public world interiors, navigation hierarchy, original Festival Guide QR destination, or wedding code was changed.
- Release evidence: source and functional smoke checks in connected GitHub only. Device screenshot QA must still be user-verified.

## 2026-10-08 — Website ↔ app two-way gateway correction
The earlier intent is now explicit in the large homepage hero, not only the small top wordmark: clicking/tapping the floating OLA HQ globe/world on public `index.html` opens `app/`. The ordinary website Home link still stays on the website. The OLA HQ app already had a website return; its bottom-of-app footer is refined to a subtle text treatment: “Prefer the website? Visit OLA HQ.” with only the destination underlined. This is the app-home footer only and does not touch Festival Guide files. Added homepage focus styling in `hq.css`; app stylesheet query bumped to v7. No redirect, manifest, service worker, world interior, or wedding QR changes.

## 2026-10-08 — Gateway clarification: header home vs hero app
Corrected the website ↔ app gateway after user clarification. The small globe + OLA HQ wordmark in the persistent public website header is a **website Home control** and now points to `index.html`. The **large floating globe/world in the OLA HQ homepage hero** remains the intentional visual gateway into `app/`. The explicit top-nav App link also remains. The app's subtle bottom “Visit OLA HQ” return link remains. This creates a clear contract: persistent header identity = website home; giant homepage world = enter app. No Festival Guide, world interiors, app manifest, service worker, QR route, or app navigation hierarchy changed.

## 2026-10-08 — Hero globe jump behavior
The large OLA HQ globe inside the installed app home is now an interaction target: tapping it performs the same quick smooth in-page move as the down cue, landing the first wave (La Ola de Amor) directly under the sticky app bar so the user can continue scrolling through the rest of the worlds. The persistent small OLA HQ header globe retains its existing app-home behavior and is not repurposed. CSS bumped to v8. No world routes, iframe behavior, Festival Guide files, manifests or service workers changed.
