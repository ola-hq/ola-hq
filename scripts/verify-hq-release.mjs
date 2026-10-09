// OLA HQ release gate: fail before GitHub Pages deployment if shared entrypoints regress.
// This protects known public promises, not the design of individual worlds.
// When the owner approves a content model change, update this check in that reviewed PR.
import { readFileSync } from 'node:fs';

const home = readFileSync('index.html', 'utf8');
const tools = readFileSync('tools.html', 'utf8');
const app = readFileSync('app/index.html', 'utf8');
const styles = readFileSync('world-entrances.css', 'utf8');
const failures = [];
const requireThat = (ok, description) => { if (!ok) failures.push(description); };
const count = (source, pattern) => [...source.matchAll(pattern)].length;

const worldSection = home.match(/<section class="rooms world-entrances home-six-waves"[\s\S]*?<\/section>/)?.[0] ?? '';
requireThat(Boolean(worldSection), 'Missing the canonical six-wave homepage section');
requireThat(count(worldSection, /<a class="room(?: [^"]*)?" href="[^"]+"/g) === 6, 'Homepage must retain six clickable world cards');
requireThat(count(worldSection, /<div class="room-copy"><h2>/g) === 6, 'Homepage must retain six named world cards');
requireThat(count(worldSection, /<span class="portal-label">[^<]+<\/span>/g) === 6, 'All six homepage banner labels must exist');
const approvedLabels = [
  'LOVE · PLACES · MEMORIES',
  'CINEMA · REVIEWS · COLLECTION',
  'INSTANT FILM · REAL MOMENTS',
  'MUSIC · ALBUMS · EXPERIMENTS',
  'FANTASY FOOTBALL · THE CLUB',
  'AI ART · IMPOSSIBLE IDEAS',
];
const visibleLabels = [...worldSection.matchAll(/<span class="portal-label">([^<]+)<\/span>/g)].map(m => m[1]);
requireThat(JSON.stringify(visibleLabels) === JSON.stringify(approvedLabels), 'Homepage banner label content or order changed');
requireThat(worldSection.includes('<h2>FPL Wave</h2>'), 'The fifth homepage source label must be FPL Wave (La Ola FC is the destination)');
requireThat(styles.includes('home-six-waves') && styles.includes('aspect-ratio:16/9'), 'Homepage six-card image treatment is missing');

const cards=[...tools.matchAll(/<button type="button" class="ai-lab-card" data-key="([^"]+)"/g)].map(m=>m[1]);
requireThat(JSON.stringify(cards)===JSON.stringify(['movie','handoff']), 'AI Toolbox must contain Movie Planner and AI Handoff only');
requireThat(!tools.includes('Showtime Challenge')&&!tools.includes('open-showtime-quiz')&&!tools.includes('id="tool-mode-quiz"'), 'The incorrect showtime trivia quiz has returned');
requireThat(!['quiz','router','graveyard','release','funnel','library'].some(k=>tools.includes('data-key="'+k+'"')), 'Unsupported Toolbox placeholder card present');
requireThat((tools.match(/id="wave-discovery"/g)||[]).length===1 && tools.includes('<details class="tool tool-pocket tool-discovery"'), 'Expandable OLA HQ world-finder rectangle missing');
requireThat((tools.match(/id="movie-top-five"/g)||[]).length===1 && tools.includes('<details class="tool tool-pocket tool-movie-pocket"'), 'Expandable film Top 5 rectangle missing');
requireThat(tools.includes('data-movie-source="letterboxd"')&&tools.includes('data-movie-source="blockbuster"'), 'Movie ranking must offer separate Letterboxd and Blockbuster tabs');
requireThat(tools.includes('https://letterboxd.com/ourpolaroidproj/diary/films/'), 'Our Polaroid PROJ original Letterboxd source link missing');
requireThat(tools.includes('id="letterboxd-files"')&&tools.includes('id="letterboxd-import-status"'), 'Real Letterboxd CSV import missing');
requireThat(tools.includes('id="top-movie-list"')&&tools.includes('data-top-period="overall"')&&tools.includes('data-top-period="recent"'), 'Movie Top 5 period filters missing');
requireThat(!tools.includes('OLA HQ palette')&&!tools.includes('data-color='), 'Old palette has returned');
requireThat(tools.includes('<h3>Timer</h3>')&&!tools.includes('<h3>Focus timer</h3>'), 'Timer title changed');
const duration=tools.match(/<select id="duration">([\s\S]*?)<\/select>/)?.[1]||'';
const options=[...duration.matchAll(/<option value="(\d+)"/g)].map(m=>Number(m[1]));
requireThat(options.length===30&&options.every((x,i)=>x===60*(i+1)), 'Timer must retain one-minute increments 1–30');
requireThat((tools.match(/class="timer-use" data-timer-use=/g)||[]).length===6, 'Timer must retain six suggestions');
requireThat(tools.includes('id="wave-note"')&&tools.includes('id="prompt-text"'), 'Grounded creative prompt area is missing');
requireThat(tools.includes('Protected Personal Tools')&&tools.includes('href="ai/"')&&tools.includes('id="start"'), 'Unrelated Tools content changed');
const ids=[...tools.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);requireThat(new Set(ids).size===ids.length, 'Duplicate HTML element IDs detected');
const prompts=[...tools.matchAll(/<template id="ai-prompt-source-([^"]+)"><pre>([\s\S]*?)<\/pre><\/template>/g)];
for(const id of ['movies','handoff'])requireThat((prompts.find(m=>m[1]===id)?.[2]||'').trim().length>=200,'Missing complete '+id+' prompt');
const inline=tools.match(/<script id="ai-toolbox-script">([\s\S]*?)<\/script>/)?.[1]||'';
requireThat(Boolean(inline)&&tools.includes('id="ai-tool-modal"'),'Toolbox modal missing');
if(inline){try{new Function(inline);}catch(e){failures.push('Toolbox script syntax failed: '+e.message)}}
const toolsJS=readFileSync('tools.js','utf8');
try{new Function(toolsJS)}catch(e){failures.push('Everyday tools JS syntax failed: '+e.message)}
requireThat(toolsJS.includes('const worldCatalog=')&&toolsJS.includes('const worldQuiz=')&&toolsJS.includes('function renderWorldQuiz('), 'World-discovery quiz logic missing');
for(const id of ['love','cinema','polaroid','music','fpl','simulation','gdb','arsenal','offbrand','willpwr','wuwei','capybara'])requireThat(toolsJS.includes(id+":{name:"), 'World finder dropped a canonical world: '+id);
requireThat(toolsJS.includes('function csvEntries(')&&toolsJS.includes('function parseCSV(')&&toolsJS.includes('function renderTopFilms('), 'CSV-driven Letterboxd ranking logic missing');
requireThat(toolsJS.includes('movieSource=')&&toolsJS.includes('letterboxdEntries')&&toolsJS.includes('blockbusterTop5'), 'Independent film sources not implemented');
requireThat(toolsJS.includes('!letterboxdRecords().length')&&toolsJS.includes('No verified ratings have synced yet'), 'Unsourced Letterboxd ratings must remain transparently empty');
requireThat(toolsJS.includes('Exact viewing dates are not documented'), 'Blockbuster last-30-days caveat missing');
requireThat(toolsJS.includes('const starts=')&&toolsJS.includes('renderCreative()')&&toolsJS.includes("querySelectorAll('[data-timer-use]')"), 'Creative or timer tools missing');
requireThat(app.includes('href="../tools.html"')&&app.includes('Visit OLA HQ'), 'App return link to Tools missing');
if(inline){
 const a=inline.indexOf('function clock('),b=inline.indexOf('function formatChain(',a);
 if(a<0||b<=a)failures.push('Movie marathon schedule calculation missing');
 else try{
 const {parseShowtimes,plan}=new Function(inline.slice(a,b)+'return {parseShowtimes,plan}')();
 const demo=parseShowtimes('Opening Wave | 12:00 PM | 1:40 PM\nSide Quest | 1:45 PM | 3:20 PM\nThe Detour | 1:50 PM | 3:15 PM\nMidnight Signal | 3:25 PM | 5:00 PM\nNeon Dreams | 5:10 PM | 6:45 PM\nLast Train | 7:05 PM | 8:40 PM');
 requireThat(plan(demo,0).combos[0]?.ids.length===5&&plan(demo,0).combos[0]?.idle===40, 'Marathon best-chain regression');
 }catch(e){failures.push('Marathon unit check: '+e.message)}
}


// October 9 user-approved polish: restore the surprise route, not new trivia.
requireThat(tools.includes('id="wave-random"') && tools.includes('id="wave-random-result"') && tools.includes('id="wave-random-again"'), 'Random Wave reveal controls are missing');
requireThat(toolsJS.includes('function revealRandomWave(') && toolsJS.includes("randomWorldKeys=Object.keys(worldCatalog)"), 'Random Wave logic is missing');
requireThat(tools.includes('<h3>Find Your Current</h3>') && !tools.includes('<h3>Creative Starting Points</h3>'), 'Grounding tool title has regressed');
requireThat(tools.includes('id="letterboxd-sync-state"'), 'Letterboxd RSS sync status is not visible');
requireThat(toolsJS.includes("letterboxdSyncURL='data/letterboxd-recent.json'") && toolsJS.includes('loadLetterboxdDiarySync()'), 'Public Letterboxd diary reader not wired');
requireThat(toolsJS.includes("not the complete all-time library") && toolsJS.includes('letterboxdRecords()'), 'Letterboxd limited-feed honesty or aggregation lost');
const pagesWorkflow=readFileSync('.github/workflows/pages.yml','utf8');
requireThat(pagesWorkflow.includes("python3 scripts/sync-letterboxd.py --self-test") && pagesWorkflow.includes("python3 scripts/sync-letterboxd.py") && pagesWorkflow.includes('schedule:'), 'Recurring Letterboxd RSS sync missing from Pages build');
const rssScript=readFileSync('scripts/sync-letterboxd.py','utf8');
requireThat(rssScript.includes('ACCOUNT="ourpolaroidproj"') && rssScript.includes('recent_public_diary_entries_not_complete_library') && rssScript.includes('status="ok"'), 'Letterboxd public RSS sync script is missing or no longer honest about scope');

if (failures.length) {
  console.error('OLA HQ PUBLIC RELEASE CHECK FAILED:\n' + failures.map(x => ' - ' + x).join('\n'));
  process.exit(1);
}
console.log('OLA HQ public release guard PASS: six labeled wave cards; '+cards.length+' working Toolbox cards; app ↔ Tools entry intact.');
