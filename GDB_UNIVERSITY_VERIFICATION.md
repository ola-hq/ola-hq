# GDB University — publication & polish receipt

Date: 2026-10-07  
Parent world: GDB Wave / OLA HQ  
Public repository: `ola-hq/ola-hq`

## Current state

GDB University is published as a real multi-page public campus under:

`https://ola-hq.github.io/ola-hq/gdb-university/`

The legacy `gdb-wave.html` entrance routes into the University.

## Published campus routes

- `gdb-university/index.html` — University home
- `gdb-university/orientation.html` — Orientation / Admissions
- `gdb-university/academics.html` — Academics / course catalog
- `gdb-university/faculty.html` — Faculty directory
- `gdb-university/campus-life.html` — Campus Life
- `gdb-university/media.html` — Campus Media
- `gdb-university/records.html` — GDB Records / GDB-000
- `gdb-university/store.html` — Campus Store artifact view
- `gdb-university/archives.html` — Records & Archives

### Department worlds

- `gdb-university/low-end-studies.html`
  - black / acid / industrial identity
  - existing LES artifacts remain the department archive
- `gdb-university/dancefloor-physics.html`
  - cobalt / coral / kinetic identity
  - bounce, movement and fieldwork language
- `gdb-university/club-science.html`
  - midnight / cyan / laboratory identity
  - systems, layering, tension and release language

## Source preservation

The published site reuses already-reviewed public GDB material rather than replacing it:

- 12 GDB Orientation assets
- 12 Low End Studies assets
- Orientation Short
- Orientation Film
- AYYBO Matrix fan edit
- GDB Portal Story

No new private source material was exposed in this pass.

## Faculty framing

Real artist identities are used inside clearly fictional GDB University appointments:

- AYYBO — fictional Dean / Chair of Low End Studies
- Chris Lorenzo — fictional Dancefloor Physics faculty
- Chris Lake — fictional Club Science faculty
- PAWSA — fictional Minimal Groove Studies faculty
- Cloonee — fictional Dancefloor Physics / crowd-control faculty

The academic appointments are campus-world fiction and are not claims of real employment, endorsement or credentials. Real outbound artist/music destinations are used where linked.

## Publication commits

Initial public launch merged through PR #10:

- merge commit: `0708af2f43d93f00062c38b2485dcb1b215fc845`

The launch contains the University shell, the three department worlds and the GDB Wave redirect.

## Loose polish pass

The follow-up pass intentionally preserves the approved design and content. It only tightens:

- keyboard focus visibility
- hover feedback
- reduced-motion behavior
- responsive spacing
- mobile navigation behavior
- navigation consistency on Orientation, Media, Records and Store
- minor card/table polish

No world concept, core copy, department identity, faculty roster or archive structure was redesigned.

## Live verification limitation

The repository state and public-main files are directly verified through GitHub. The execution environment used for this closeout cannot resolve the `ola-hq.github.io` hostname, so it cannot independently perform an HTTP render check of GitHub Pages from inside the tool runtime. The previous OLA HQ publication architecture uses GitHub Pages from this public repository; the published files are present on public `main`.

If a later worker can access the Pages hostname, the final browser QA should check:

1. University home loads.
2. Legacy `gdb-wave.html` redirects.
3. All three department worlds load and retain distinct visual identities.
4. Four campus videos play.
5. Faculty outbound links open in a new tab.
6. Mobile navigation works at narrow widths.
7. No horizontal overflow occurs.

## Sign-out / handoff

GDB University is now a published proof-of-world, not a mockup-only concept.

Do not collapse the department identities back into one generic GDB style.  
Do not replace the existing GDB/LES archive with invented substitute art.  
Future work should deepen individual campus buildings and departments additively.


## 2026-10-08 · Source-led depth pass 01

Direct Jonathan review from current live screenshots.

### Scope

Five GDB-only files changed:
- `gdb-university/index.html`
- `gdb-university/academics.html`
- `gdb-university/faculty.html`
- `gdb-university/campus-life.html`
- `gdb-university/gdbu.css`

### Corrections

**Orientation home card**
- Removed the photo crop that visibly cut through a person.
- Replaced it with a responsive source-led GDBU Orientation panel using the verified crest, GDB.000.26 and Hall Pass / Campus Open language.
- No historical artifact was retouched.

**Academics**
- Removed the LES-only hero treatment as the visual representative of all Academics.
- Added a four-program GDBU banner using the current canonical badge family:
  - LES-001
  - DFP-002
  - CLS-003
  - RVE-004
- The same four-program language is now used on the University home Academics card.

**Faculty**
- Replaced the AYYBO Matrix poster as the Faculty hero image with the already-published verified AYYBO public portrait.
- Kept AYYBO central as fictional Dean / Chair of Low End Studies.
- Existing individual faculty profiles and real artist links remain unchanged.

**Campus Life**
- Rewrote the page from source language in the GDB Orientation Guide and Community Preview rather than generic university filler.
- Restored the durable themes: community through sound/style/shared experience; everyday moments; coffee runs and hanging out; field labs; participation; widening the circle; honoring the floor; crediting builders; leaving the night better.
- Preserved established campus-world locations and expanded them into source-aligned meaning rather than removing them.

### Source authority used

- GDB WAVE — INTAKE + WEBSITE HANDOFF — 2026-10-05
- OLA HQ — Next Pass Work Brief — 2026-10-07 — CURRENT
- GDB University Orientation Guide — GDB.000
- GDB University Community Preview Deck
- GDB University Brand Bible
- Existing published four-program badge family and verified AYYBO faculty asset

### Preservation

No unrelated OLA HQ world files changed.
No private photo/video asset was newly exposed.
No historical GDB.000.91 artifact was modified.
No faculty role or external artist link was removed.
