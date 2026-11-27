# OLA HQ — Hidden currents (unreleased study)

This sample belongs to the existing OLA HQ project. It is intentionally separate from the live website/app. This change may publish the unlinked study at /labs/lore-preview/ for review. Do not route homepage/app traffic to it or replace production entrances until Jon reviews the sample. Production index.html, app/index.html, globe/controller, mileage, board, world pages and existing publication workflow are unchanged by this branch.

Base source: 83484897d7e4373947891296fc6a526e3d95c1ab (includes the later Cinema review release). Build uses the accepted globe/input/model/motion and breathing-sky source from that exact commit, with only its asset-base expression pointed at existing public OLA assets. It does not fork the globe implementation.

## Review order

1. The 26th star: a discreet teal star opens “Some numbers keep bringing us home.” The same light appears inside the secret map.
2. The small passing vessel: two-second passes at randomly chosen 10–40 active-second start intervals. Hover/focus/contact holds it to avoid a disappearing touch target. Clicking opens a quiet cabin through a short portal transition.
3. Natural cabin discoveries: **chair → pool deck; bar → vinyl space; window → celestial map.** Ordinary regions have no visible markers, collectible lists or instructions. Keyboard focus outlines and descriptive accessible names remain. The Polaroid, Wave26 sleeve and Cinema ticket live inside the discoveries. The original front-and-center object display is superseded.
4. Intentional return greetings: existing public main-world pages open inside a bounded dialog. A successful HEAD response with the exact allowed origin/path, frame-load event, minimum dwell and explicit return are all required. Failed/blocked verification produces no greeting. Each world's copy appears once per sample session. This is a sample wrapper, not production website/app navigation wiring.
5. Layered sky: three star depths with slight cursor parallax, independent slow constellation fade cycles, and the existing breathing star art. No extra movement under Reduced Motion. Hidden tabs, offscreen sky and open dialogs pause the visual loop and ship clock.

A visible **Watch the walkthrough** button runs one review-only passage through ship, cabin, chair/pool, bar/vinyl, window/map and the 26th star. Pause/resume and Explore on my own remain available within each scene. The sequence never starts on arrival; it pauses its clock in hidden tabs, can be stopped with Escape or ordinary manual scene controls, and can be replayed. It does not visit worlds or earn mileage. Remaining shortcuts stay in the collapsed Preview controls and notes section. They are not proposed production controls.

## Art

Built-in generated PNG assets:
- assets/cabin.png: quiet petrol-blue/gold observation cabin with natural chair, bar and panoramic window. Earlier foreground objects removed.
- assets/secret-rooms.png: three equal square reveal cells, pool / vinyl listening room / celestial navigation.

Generation direction: preserve the selected ship's teal/gold material language; secrets concealed in ordinary architecture; no hotspot dots, object menus, readable fake glyphs or claimed historical Maya symbols. Rooms are original fantasy lore, not approved future product promises. Original image outputs remain separate; these selected assets are sample-only and need production optimization before integration.

## Validation and use

Run: node --test labs/lore-preview/lore-core.test.cjs
Build: node labs/lore-preview/build-preview.cjs

The Actions artifact contains one standalone HTML plus READ-ME.txt. Open the HTML in a desktop browser with internet access. Sample JS/CSS/cabin artwork are bundled; the HD globe model and existing celestial assets load from the public OLA site. The source folder can also be served from a checkout.

The sample source never loads the production mileage companion or pilot board and its own code writes no browser storage. The standalone artifact also omits homepage analytics; the hosted HTML inherits the normal shared collector inserted by the existing publication pipeline. The collector and its settings are not modified. Deliberately opened public-world pages retain their own existing behavior/analytics. HEAD checks use omitted credentials and read no bodies. No authentication, database, notification or access-control changes are involved.

Passage2 refines the study: decoded-image preflight and retry messages prevent blank room reveals; circular reveals originate at the chair/bar/window, with a brief depth settle and light sweep. These are layered 2D illustrations and CSS effects, not physically rigged 3D furniture or fluid simulation. Reduced Motion bypasses decorative transitions. Scene navigation remains sticky, room art fits viewport height, and hidden targets keep their original geometry. The vessel shortcut now brings the ship into the middle of its pass before holding focus, instead of freezing it at a clipped entry edge.

The selected execution workspace was unavailable during preparation. Automated GitHub state/build/source checks can run, but visual browser QA and physical Safari/installed-app acceptance are **not claimed**. Publish only the unlinked sample folder after automated checks pass. Homepage/app activation remains pending Jon's sample review. Record any later live browser QA separately; physical phone acceptance is not implied. Production integration still needs the actual website/app entrance/return wiring, touch/Back navigation, font/scene-fit, image-load failure and performance checks.

The separate archive-access issue was resolved in root's authorized lane; this sample does not reopen or touch it. CommandCenter remains the sole production acceptance queue.


## Smooth3 repair — November 27

The passage2 visual audit reproduced panel movement with decoded artwork: 36.88px upward on desktop and 176.35px at 390px width. Smooth3 gives the cabin and rooms a fixed-height dialog and overlaid scene layers, so hiding the underlying cabin does not change layout. The artboard is fitted to the actual scene bounds; hidden object targets remain aligned with the displayed image. Short-screen room content can scroll inside the stable frame.

The preview no longer blurs and clips the entire dialog during entry. Transitions use opacity/transform and a smaller composited ring. The ship advances on every animation callback using translate3d, independently of the lighter sky's phase-preserving 30Hz paint clock; this replaces the former >=40ms gate that quantized to roughly 20Hz on 60Hz screens. Pausing the walkthrough cancels its own idle animation callback until resumed. These are implementation targets, not measured device FPS claims.

Regression checks cover the 30Hz cadence at simulated 60/120Hz callbacks, invalid/reset times, stable-frame structure, independent vessel motion, existing walkthrough cancellation and bundled syntax. Browser geometry, full-tour behavior and physical-device limits are recorded in the existing CommandCenter acceptance item after validation. Main entrances and globe/input/model/motion remain untouched.
