# Arsenal Academy entrances — 2026-11-23

Status: browser review passed. Owner explicitly approved publication on 23 November 2026, including the Academy Presenter mode toolbar and both hub/template entrance changes. Follow public PR #99 / private master PR #25 and Pages workflow records for merge/deployment state. Earlier pending-publication wording below describes the pre-approval review.

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

## Published and cache follow-up

The owner-approved entrances were merged (public 0638d649 / private master 2865ae0d) and deployed in run 45250880227. The deployment itself completed, live revision and all protected bytes passed, but the final workflow failed on an existing FPL snapshot from 09:05 UTC. Automatic approval review rejected running its separate refresh workflow because that would commit unrelated football data. No retry or workaround was attempted; owner approval for that separate refresh is required.

Live browser inspection confirmed the Academy tab and photo entrance, and the published Academy Presenter mode link opened page-2 notes and connected/advanced the classroom screen to page 3. However, clicking the normal Academy URL from the hub reproduced an older cached HTML page without the toolbar link. This follow-up adds `?v=presenter-entry-1` to all three primary Academy entrances so they load the already-published new HTML. Guide links and all other content are unchanged. User's publication request explicitly includes fixing access to the live toolbar; no new publication gate is required for this focused cache correction.
