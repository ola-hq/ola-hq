# OLA HQ interior portals — November 25, 2026

Jon approved the artwork, desktop effect and physical Safari preview in LIVE: Consolidate Update Threads, then explicitly authorized production integration and publication. This continues the existing website and installable HQ app. The two OLD Update Waves conversations remain reference. The separate private online preview is a demonstration, not the production destination.

## Final behavior

- Existing rectangular cards, order, descriptions and real routes remain intact: six main and eight Deeper website worlds, the same fourteen app entrances, and the separate What's Your Wave? community card.
- Cursor movement reveals a full-size destination scene fixed behind the artwork. The aperture does not carry a miniature scene or magnify the cover. Warm sparks form around it. Desktop aperture is 190px; touch/narrow-screen aperture is 136px, offset above the finger.
- Touch contact shows the peek immediately. A horizontal drag of more than 8px begins exploration without waiting; a stable 160ms hold enables movement in both dimensions. Small diagonal hand jitter keeps the preview active. A dominant vertical swipe before commitment scrolls normally; multitouch cancels and permits native pinch zoom. Releasing an explored/held peek closes it without navigating; a quick tap still enters. The Safari implementation uses native Touch Events to avoid pointer cancellation during a held drag.
- Full effects is the explicitly approved default. Cinematic pace is fixed at the reviewed 2000ms; Cinema uses a 750ms handoff into its own existing intro to avoid stacking two long introductions. The visible Full effects / Gentle / Device setting selector was removed at Jon’s request. Existing saved accessibility preferences are honored internally: Gentle provides a 180ms fade and static ring; a previously saved Device setting follows reduced motion. No new settings panel or competing control was added.
- Entry ends at the existing real world, not a mock landing room. Cinema retains ownership of its video, once-per-session entrance, skip control, audio and background playback. No Cinema, Polaroid, film viewer or other world interior source is modified.
- Academy and HOME BASE remain distinct external doors with their current target behavior; new-tab links stay synchronous to preserve browser gesture authorization. They receive the peek but retain native new-tab entry rather than a delayed animation. HOME BASE's pass/private-beta/unofficial boundary is unchanged.
- Escape, page visibility, width changes and back/forward restore cancel active effects safely. Safari browser-chrome height changes do not cancel entry. Rapid repeat taps cannot navigate twice. A failed/slow interior falls back to the cover and still reaches the real destination.

## Assets and ownership

`assets/portal-interiors-20261125/` contains WebP display derivatives of three approved generated images (about 1.65MB combined). The original PNGs remain in the persistent private preview source. No cover art or official branding file is overwritten.

`interior-atlas.webp` (4×4) supplies retained interiors: GDB 2/3, Academy 3/1, Offbrand 3/2, Willpwr 3/3, Wu Wei 3/4, HOME BASE 4/1, Capybara 4/2. `interior-refinements.webp` (3×2) supplies plaza 1/1, Wave26 2/1 and Arsenal 2/3. The older Polaroid and Simulation cells are superseded by the destination-page bridges below; the older La Ola FC atlas cell is also inactive. `cinema-interior.webp` is the corrected standalone navy/brass screening room informed by the existing Brain + Heart film-reel identity. Superseded cells remain provenance, not competing active versions. Original atlas OS/ocean-library reserve cells are unused and define no new routes.

The retained generated artwork is an illustrative peek, not a rebuilt interactive interior. The Polaroid page-derived bridge includes the same public personal photographs already displayed on its homepage; it does not introduce new photographs. Exact IMG_9183.mp4 motion/audio reproduction remains unverified. The existing Brand System owns design decisions; Command Center's HQ tab remains the sole task queue. This file is a source receipt, not a duplicate tracker.

## Verification and limits

Local release guard passes. Thirty-seven portal/input tests cover route and asset preservation, fixed-scene sampling, approved defaults and duration, repeat tap protection, native Safari touch/scroll/pinch, keyboard availability, missing-asset fallback and external doors. Existing Cinema suites and repository-wide publisher checks are required by CI. New gesture/navigation tests are added to that publisher.

Browser preview verified six mapped website cards, eight mapped Deeper cards, fourteen mapped app cards with consistent geometry and no measured horizontal overflow, website Cinema arrival, app Cinema iframe arrival and app return. User tested the separate preview on physical Safari and approved Full effects/Cinematic/smaller size. Physical installed-app acceptance and final all-world hardware checks remain follow-up checks; a full device lab pass is not claimed.

Release starts from current public main, preserving later Cinema/Polaroid shared viewer work and other agents' changes. Publication is complete only after the PR checks, merge and single public Pages publisher succeed; final commit/run references belong in the existing project records.

## Destination continuity and touch refinement — same-day follow-up

Jon requested that the portal lead visually into the destination rather than into scenery with a conflicting design. Polaroid, FPL and Simulation now use static captures of their actual public pages, stored as six display WebP derivatives (about 398KB combined). The images are visual bridges, not live embedded websites or new canonical artwork. No destination background, content, route or owner was changed.

| Doorway | Source and visual continuity | Display files |
| --- | --- | --- |
| Our Polaroid Wave | `https://ola-hq.github.io/ola-hq/our-polaroid-project/` — charcoal homepage, cream type and existing white instant-film frames | `polaroid-destination.webp`, `polaroid-destination-mobile.webp` |
| FPL Wave / La Ola FC | `https://ola-hq.github.io/ola-hq/fpl-wave.html` — existing Fantasy Reimagined cover and navy/gold club design; the mobile capture is framed around the magazine | `fpl-destination.webp`, `fpl-destination-mobile.webp` |
| Simulation Wave | `https://ola-hq.github.io/ola-hq/simulation-wave/` — existing dark gallery, pastel typography and glass-wave hero | `simulation-destination.webp`, `simulation-destination-mobile.webp` |

Captured November 25, 2026 in the browser: landscape derivatives are 1333×926 after excluding the browser scrollbar; portrait derivatives are 375×844. The card peek samples a fixed landscape page scene, so moving the aperture reveals another part of the same scene. Narrow-screen entry uses the corresponding portrait capture. Rendering preserves each scene’s aspect ratio and settles the page bridge at scale 1. Existing other worlds retain their approved interiors, portal size, sparks and cinematic timing. If a destination’s design changes later, refresh these derivatives in this same asset family rather than creating another portal system.

The 37 focused tests cover immediate touch feedback, quick-tap entry, early horizontal exploration, jitter tolerance, vertical scroll, hold/drag, pinch/cancel, keyboard activation, aspect ratios, responsive arrival selection, retained routes and fallback navigation. Browser QA and production check references are recorded in the existing project records. A new physical iPhone/installed-app pass is not claimed. Cinema’s own motion/save-data/paused-video preferences remain separate from the HQ portal and are not overridden by this change.
