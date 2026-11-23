# Manual football refresh — 23 November 2026

Status: publication approved by the owner on 23 November 2026: “Publish manual football updates.” Reviewed implementation: public 4e88227 / private templates 5d32621. Public PR #101 and private PR #27 carry the release; deployment and public verification follow. The earlier review notes below are historical. The Academy toolbar/hub entrances are already published separately.

The owner requested replacing automatic football updates with explicit refresh controls and chose the simplest existing-service approach.

## Visitor behavior

- Arsenal **Refresh matchday** reads the public ESPN Arsenal schedule, the next known fixture day, today’s scoreboard and the league table only after a click. It updates this open page and shows when/source. It does not write a public snapshot.
- Arsenal **Refresh this matchday** checks the selected day from ESPN. Other dates retain saved information and their original snapshot time. Invalid/failed reads preserve the last displayed records. Changed scores do not inherit old statistics.
- La Ola FC and League HQ load the existing dated saved snapshot once. **Update league data** opens the existing GitHub FPL workflow. The owner signs in if necessary, chooses **Run workflow** on main, waits for the publisher to finish, then uses **Reload results**. This is deliberately not claimed as one-click browser ingestion: the FPL API does not grant cross-origin browser reads. No new server, token in frontend or public workflow trigger is added.
- No timed/visibility-triggered football fetches remain. The three football GitHub workflows have no cron or push data-refresh triggers; owner dispatch remains. PRs retain relevant validation. The normal publisher still publishes a completed owner-requested snapshot. Unrelated Letterboxd synchronization is unchanged.
- A manual snapshot may intentionally be older than three hours. The deployment receipt explicitly declares/protects manual mode; data integrity/source checks, exact live hashes and invalid/future timestamp rejection remain strict. The football snapshot itself has not been refreshed or modified by this patch.

## Source and privacy

Existing tested normalizers were moved into `shared/football-models.mjs` for both Node ingestion and browser reads. They retain their prior exports through the scripts. No student data, credentials, backend or new browser persistence is introduced. Direct ESPN calls omit credentials and have 20-second timeouts. No third-party CORS proxy is used.

The private master visitor-source receives the runtime and focused HTML patches. Its older Arsenal template lacked the already-public matchday/scores controls, so only those data panels and required CSS/saved-score dependencies are reconciled; its creative sections are retained. Prior FPL template-only differences are retained. Operational GitHub workflows and tests are owned by the public repository; the private visitor source never contained a parallel operational workflow tree.

## Validation

- Full existing publication test command passed locally (analytics, FPL, concurrent publishing, Arsenal schedule/scores, festival updates), plus six manual-refresh tests. Parser behavior, source failures, valid empty dates, selected-day replacement, stable IDs, source timestamps and no automatic football triggers are covered.
- Workflow ownership/manual policy checks passed using the workflow’s pinned PyYAML 6.0.3. Existing release guard and complete FPL integrity checks passed. Frontend/module syntax and whitespace checks passed.
- Actual in-app browser: real ESPN manual matchday returned the next Nov 29 fixture and current source timestamp; selected-day scores refreshed with explicit ESPN attribution; the request probe read 0 external football fetches on initial load, 4 after the click and still 4 after switching tabs. No timer/visibility refresh is installed.
- Simulated unavailable public feed: both matchday and scores retained saved records and displayed a clear retry message. No swallowed reset to invented figures.
- League HQ and La Ola FC front page read the saved standings/roster and show original timestamp; Reload results worked; Update league data opened the correct public GitHub workflow. Its authenticated Run workflow was not executed during QA. Owner GitHub sign-in remains required.
- Desktop 1280×720 and actual 390×844 embedded layouts were visually checked. The score-button grid width and league-link contrast found during review were corrected. No physical phone/ViewSonic check claimed.
- Actual screenshots: reviews/screenshots/football-manual-{scores,league,phone}.jpg. Temporary review fixtures removed, owned review tabs closed and temporary server stopped after QA.

The owner separately approved this football behavior change on 23 November 2026 after the browser review and required GitHub checks passed. The earlier Academy publication approval was not reused for it.
