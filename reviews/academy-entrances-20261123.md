# Arsenal Academy entrances — 2026-11-23

Status: development branch `codex/academy-entrances`; not published. Browser review passed; scoped publication approval is pending.

The Academy remains the primary standalone destination:
https://ola-hq.github.io/arsenal-academy-worlds/

The optional secondary Presenter Guide is:
https://ola-hq.github.io/arsenal-academy-worlds/docs/host-script.html?v=editorial-15

## Change

- Arsenal world: add a photo entrance immediately below its section navigation, plus an Academy navigation link.
- Deeper Waves: retain the Arsenal world and add a separate Arsenal Academy Worlds card; update the visible total to seven.
- Both entrances use the existing Academy clubhouse artwork and put the host guide in a smaller secondary position.
- Shared styling is scoped to the new entrances. No Academy lesson, roster, activity, host cue, or presenter synchronization code changes.
- No student records, names, analytics identifiers, or new storage are added.

## Presenter setup

Open the Presenter Guide on the laptop. **Open classroom screen** creates its audience window. Move that window to the extended display and press **Full screen** there. The guide stays on the laptop and controls both notes and the audience. Full screen itself does not create or move a window. Linking is within one computer and browser/profile; this is not a phone remote.

Ordinary visitors use **Enter Arsenal Academy** and explore independently. Visiting the Academy does not start a linked presenter session.

## Source and review

The public projection is `ola-hq/ola-hq`; authoritative entrance templates are in `ola-hq/ola-hq-master/visitor-source`. The same additive patch was applied independently to each existing baseline, retaining their prior differences. Never overwrite the whole private template with the public page: unrelated prior differences exist.

`reviews/academy-entrances-20261123.json` records both baseline commits and destination SHA-256 values. New CSS and artwork are byte-identical in both repositories. No live branch has been changed.

## Validation

- Existing OLA HQ public release guard: PASS.
- Both HTML pages: separate valid links, no nested anchors, unique IDs.
- All four local page/style/image URLs and both public Academy/Guide destinations: HTTP 200.
- Git whitespace check: PASS.
- Actual in-app browser: desktop Arsenal entrance and Deeper Waves card inspected; primary Academy and secondary guide links clicked through to their correct public destinations.
- Phone-width 390×844 Arsenal portal inspected in a scaled same-origin iframe fixture. No physical phone check claimed.
- Screenshots: reviews/screenshots/hub-academy-*.jpg.
- Browser review completed; owned review tabs closed and preview stopped. Publication approval is still pending.
