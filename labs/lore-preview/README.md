# OLA HQ — Hidden currents (unreleased study)

Current revision: **seamless4**. This is the existing unlinked preview at /labs/lore-preview/, not the main website/app entrance. Homepage/app activation remains pending Jon's acceptance. Do not replace the production globe, input, model, momentum, mileage or board modules from this study.

## Current direction

The earlier framed-room presentation is superseded. Entering the vessel now fills the viewport with the cabin panorama. Rooms dissolve into the same viewport instead of appearing in bordered panels. Copy appears briefly as a lower-third subtitle, without caption cards, header bars or visible action menus. Small corner controls retain Back, Return, Pause and manual takeover with accessible names. Native dialog focus management remains an implementation detail; there is no visible dialog frame.

Chair opens the pool deck, bar opens the vinyl listening room, and window opens the celestial map. Natural room objects contain the onward world links; there is no visible Follow this current button. The 26th-star message appears within the scene rather than opening another message window. World visits retain the existing guarded sample wrapper, now filling the viewport.

The cabin image is fitted without distortion and pans horizontally on phones, using native touch scrolling or desktop drag. Hidden targets remain positioned on the original artboard; keyboard focus can reach them. Panorama-fitting tests cover portrait/landscape coverage, original aspect ratio and focus positions. The selected ship image remains unchanged: a rendered-dimension audit found it stretched to 110×724px despite a natural 2172×724px size. Explicit auto height and a 3:1 aspect ratio repair that code defect. The guided ship approaches the center before the cabin opens.

Watch the walkthrough is explicit and preview-only. Pause/resume, manual exploration and Escape stop or interrupt it. Hidden tabs retain their place. The sequence never starts on arrival, never visits a world by itself and awards no progress. Reduced Motion bypasses decorative transitions and automated camera panning.

## Rendering and limits

These are generated 2D illustrations with crossfades and camera motion, not a rigged 3D ship or physical furniture opening. The same two approved PNG assets are reused. The reveal atlas contains three square rooms; a square cover plane preserves its cell proportions while cropping to the viewport. No whole-panel blur or animated clipping is used. Vessel translation runs independently of the lighter sky's phase-preserving 30Hz paint clock. Actual device FPS is not implied by that implementation target.

Current code changes stay under labs/lore-preview. Root globe/input/model/motion, public worlds, audio, access controls, notifications and backend are untouched. The sample writes no mileage, identity, leaderboard or browser-storage state. Hosted HTML inherits the existing shared collector from the publication pipeline; its settings are unchanged. Deliberately visited world pages keep their own behavior/analytics.

Return greetings still require an exact allowlisted origin/path, successful credential-omitting HEAD response, frame load, dwell and explicit return. Blocked or failed verification earns no greeting. This remains sample navigation, not production entrance/return integration.

## Build and validation

Run: node --test labs/lore-preview/lore-core.test.cjs
Build: node labs/lore-preview/build-preview.cjs

The standalone artifact bundles sample scripts/styles and both cabin images. Internet is required for the accepted HD globe, existing sky art and deliberately visited worlds. The builder pins shared globe/sky source at 83484897d7e4373947891296fc6a526e3d95c1ab; it does not fork their implementation. The standalone artifact omits homepage tracking.

PR188 is the first study; PR190/191 introduced the framed walkthrough; PR193 repaired its measurable layout jumps and update cadence. Those geometric checks do not establish acceptance of the new full-view composition. Record current browser QA and publication evidence once in the existing CommandCenter lore-study item. Physical Safari/installed-app acceptance, source-image optimization and real homepage/app integration remain open. The separate archive-access issue was resolved in its owning lane; this study does not touch it.
