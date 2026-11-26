# OLA HQ interior portals — November 25, 2026

Jon approved the artwork, desktop effect and physical Safari preview in LIVE: Consolidate Update Threads, then explicitly authorized production integration and publication. This continues the existing website and installable HQ app. The two OLD Update Waves conversations remain reference. The separate private online preview is a demonstration, not the production destination.

## Final behavior

- Existing rectangular cards, order, descriptions and real routes remain intact: six main and eight Deeper website worlds, the same fourteen app entrances, and the separate What's Your Wave? community card.
- Cursor movement reveals a full-size interior fixed behind the artwork. The aperture does not carry a miniature scene or magnify the cover. Warm sparks form around it. Desktop aperture is 190px; touch/narrow-screen aperture is 136px, offset above the finger.
- Touch holds for 220ms to peek. Moving after the hold explores in both dimensions without scrolling. Swiping before the hold scrolls normally; multitouch cancels and permits native pinch zoom. Releasing closes the peek without navigating. A separate quick tap enters. The Safari implementation uses native Touch Events to avoid pointer cancellation during a held drag.
- Full effects is the explicitly approved default. Cinematic pace is fixed at the reviewed 2000ms; Cinema uses a 750ms handoff into its own existing intro to avoid stacking two long introductions. Gentle provides a 180ms fade and static ring; Device setting follows reduced motion. A saved selection is retained across HQ and app on the same origin.
- Entry ends at the existing real world, not a mock landing room. Cinema retains ownership of its video, once-per-session entrance, skip control, audio and background playback. No Cinema, Polaroid, film viewer or other world interior source is modified.
- Academy and HOME BASE remain distinct external doors with their current target behavior; new-tab links stay synchronous to preserve browser gesture authorization. They receive the peek but retain native new-tab entry rather than a delayed animation. HOME BASE's pass/private-beta/unofficial boundary is unchanged.
- Escape, page visibility, width changes and back/forward restore cancel active effects safely. Safari browser-chrome height changes do not cancel entry. Rapid repeat taps cannot navigate twice. A failed/slow interior falls back to the cover and still reaches the real destination.

## Assets and ownership

`assets/portal-interiors-20261125/` contains WebP display derivatives of three approved generated images (about 1.65MB combined). The original PNGs remain in the persistent private preview source. No cover art or official branding file is overwritten.

`interior-atlas.webp` (4×4) supplies retained interiors: La Ola FC 2/1, GDB 2/3, Academy 3/1, Offbrand 3/2, Willpwr 3/3, Wu Wei 3/4, HOME BASE 4/1, Capybara 4/2. `interior-refinements.webp` (3×2) supplies plaza 1/1, Polaroid 1/3, Wave26 2/1, Simulation 2/2, Arsenal 2/3. `cinema-interior.webp` is the corrected standalone navy/brass screening room informed by the existing Brain + Heart film-reel identity. Superseded cells remain provenance, not competing active versions. Original atlas OS/ocean-library reserve cells are unused and define no new routes.

Artwork is an illustrative peek, not real personal photographs or a rebuilt interactive interior. Exact IMG_9183.mp4 motion/audio reproduction remains unverified. The existing Brand System owns design decisions; Command Center's HQ tab remains the sole task queue. This file is a source receipt, not a duplicate tracker.

## Verification and limits

Local release guard passes. Twenty-five portal/input tests cover route and asset preservation, fixed-scene sampling, approved defaults and duration, repeat tap protection, native Safari touch/scroll/pinch, keyboard availability, missing-asset fallback and external doors. Existing Cinema suites and repository-wide publisher checks are required by CI. New gesture/navigation tests are added to that publisher.

Browser preview verified six mapped website cards, eight mapped Deeper cards, fourteen mapped app cards with consistent geometry and no measured horizontal overflow, website Cinema arrival, app Cinema iframe arrival and app return. User tested the separate preview on physical Safari and approved Full effects/Cinematic/smaller size. Physical installed-app acceptance and final all-world hardware checks remain follow-up checks; a full device lab pass is not claimed.

Release starts from current public main, preserving later Cinema/Polaroid shared viewer work and other agents' changes. Publication is complete only after the PR checks, merge and single public Pages publisher succeed; final commit/run references belong in the existing project records.
