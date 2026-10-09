# Website tab icon audit — 2026-10-09

Scope: public `ola-hq/ola-hq` main tree.

## Audit coverage

52 public HTML files were inspected for explicit browser-tab icon declarations.

## Existing icon families already present

- OLA HQ parent pages / app: globe-only favicon.
- La Ola de Amor main site / guide: heart mark.
- La Ola FC / FPL pages: club crest.
- GDB University pages: GDB crest/favicon family.
- Simulation Wave interior: Simulation favicon.
- Arsenal Wave: embedded Arsenal favicon.
- Willpwr / Wu Wei currently inherit the OLA HQ globe favicon.

## Safe source-led fixes added in this pass

- AIOS: six `ai/*.html` pages now use the existing `ai/aios-wave.svg`.
- GDB Wave redirect now uses the existing GDB University favicon.
- La Ola de Amor scan redirect now uses the existing heart favicon.
- Simulation Wave root redirect now uses the existing Simulation favicon.
- What's Your Wave? now uses the OLA HQ globe favicon.
- Arsenal's existing embedded WebP favicon MIME declaration was corrected from `image/svg+xml` to `image/webp`.

## Pages still waiting for a dedicated small mark

These pages intentionally remain unchanged until favicon candidates are visually approved:

### Blockbuster Wave
- `blockbuster-wave/index.html`
- `blockbuster-wave/blockbuster-wave-complete-gallery.html`

### Capybara Wave
- `capybara-wave.html`

### Offbrand Wave
- `offbrand-wave.html`

### Our Polaroid Wave
- `our-polaroid-project/index.html`
- `our-polaroid-project/about.html`
- `our-polaroid-project/after-dark.html`
- `our-polaroid-project/framed-faces.html`
- `our-polaroid-project/our-favorite-polaroids.html`
- `our-polaroid-project/through-my-lens.html`

### Wave 26
- `wave-26.html`
- `wave-26-preview-v4.html`
- `wave-26-preview-v5.html`
- `wave-26-preview-v6.html`

Reason: these worlds do not currently expose a clean, clearly canonical favicon-sized mark in the public tree. Do not force a wide banner, album cover, photograph, or provisional identity study into a browser tab merely to eliminate the blank state. Generate/review a dedicated square mark first.

## Preservation rule

Favicon work should not redesign any world. Reuse established identity where it exists; generate only a compact mark derived from the current world language where no suitable source mark exists.


## Follow-up — globe fallback approved

Jonathan approved using the existing OLA HQ globe favicon anywhere a dedicated canonical world mark is not yet available.

Applied to:
- Blockbuster Wave (entry + complete gallery)
- Our Polaroid Wave (all six public pages)
- Wave 26 (main page + preview v4/v5/v6)
- Offbrand Wave
- Capybara Wave

These are intentional fallback icons, not claims that the globe is the final world-specific identity. If a verified dedicated favicon is recovered later, it may replace the globe without changing page design.
