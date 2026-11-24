# Academy routes and entrance fit — 24 November 2026

User-requested minor layout/navigation patch. No lesson, host script, roster, media selection, presenter protocol or football refresh behavior changes.

- Academy clubhouse and standalone journal footer: OLA HQ return button.
- Deeper Waves: GDB and Arsenal media use the Academy landscape ratio; GDB text scales inside its own card, Arsenal fills its frame without brown bands. Other entrances retain their styles.
- Arsenal: existing Academy portal moved into More than football, directly before Club DNA. One portal, same #academy navigation target.
- La Ola FC: Academy added to the main/section tabs; League HQ includes it in desktop and horizontally scrollable mobile navigation.
- Mirrored hub changes independently into private visitor-source, preserving baseline differences.

Browser QA: actual in-app browser 1280×720; same-origin iframe fixtures at 390, 800 and 1600 CSS pixels for responsive cards. No horizontal document overflow at 390 or 1280. GDB/Arsenal/Academy media measured 560×315 at 1280. Academy footer clicked through to the public OLA HQ homepage. Club phone tabs rendered a complete 3×3 grid. Arsenal Academy navigation reached the moved portal; its next sibling is Club DNA. Existing public release guard and 23 Cinema/manual-football tests passed. Git whitespace check passed. No physical phone or classroom hardware test claimed.

Publication is handled by repository PR/Pages records; local checks alone do not establish live deployment. CSS uses a new cache key. Evidence screenshot: reviews/screenshots/academy-navigation-cards-local.jpg.
