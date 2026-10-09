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

const cards = [...tools.matchAll(/<button type="button" class="ai-lab-card" data-key="([^"]+)"/g)].map(m=>m[1]);
requireThat(JSON.stringify(cards)===JSON.stringify(['movie','handoff']), 'AI Toolbox must contain only Movie Planner and AI Handoff');
requireThat(!['quiz','router','graveyard','release','funnel','library'].some(id => tools.includes('data-key="'+id+'"')), 'Unsupported or duplicated AI Toolbox card present');
requireThat(tools.includes('id="open-showtime-quiz"') && tools.includes('id="quiz-answers"') && tools.includes("launch('quiz',byId('open-showtime-quiz'))"), 'Single standalone Showtime quiz is not wired');
requireThat((tools.match(/id="open-showtime-quiz"/g)||[]).length===1, 'Showtime Challenge appears more than once');
requireThat(!tools.includes('OLA HQ palette') && !tools.includes('data-color='), 'Legacy palette should be absent');
requireThat(tools.includes('<h3>Timer</h3>') && !tools.includes('<h3>Focus timer</h3>'), 'Timer title regressed');
const duration=tools.match(/<select id="duration">([\s\S]*?)<\/select>/)?.[1]||'';
const minuteOptions=[...duration.matchAll(/<option value="(\d+)"/g)].map(m=>Number(m[1]));
requireThat(minuteOptions.length===30&&minuteOptions.every((value,i)=>value===60*(i+1)), 'Timer must support 1–30 minute increments');
requireThat((tools.match(/class="timer-use" data-timer-use=/g)||[]).length===6, 'Timer needs six purpose suggestions on right');
requireThat(tools.includes('id="top-movie-list"')&&tools.includes('data-top-period="overall"')&&tools.includes('data-top-period="recent"'), 'Movie Top 5 period controls missing');
requireThat(tools.includes('id="wave-note"')&&tools.includes('id="prompt-text"'), 'Grounding creative prompt area missing');
requireThat(tools.includes('Protected Personal Tools')&&tools.includes('id="start"')&&tools.includes('href="ai/"'), 'Existing unrelated tools removed');

const prompts=[...tools.matchAll(/<template id="ai-prompt-source-([^"]+)"><pre>([\s\S]*?)<\/pre><\/template>/g)];
for(const id of ['movies','handoff']){
 const full=prompts.find(m=>m[1]===id)?.[2]||'';
 requireThat(full.trim().length>=200, 'Missing complete reusable prompt: '+id);
}
const inlineScript=tools.match(/<script id="ai-toolbox-script">([\s\S]*?)<\/script>/)?.[1];
requireThat(Boolean(inlineScript)&&tools.includes('id="ai-tool-modal"'), 'Top-aligned AI tool dialog missing');
if(inlineScript){try{new Function(inlineScript)}catch(e){failures.push('AI Toolbox JS syntax invalid: '+e.message)}}
const toolsJS=readFileSync('tools.js','utf8');
try{new Function(toolsJS)}catch(e){failures.push('Everyday Tools JS syntax invalid: '+e.message)}
requireThat(toolsJS.includes("querySelectorAll('[data-timer-use]')")&&toolsJS.includes('resetTimer()'), 'Timer purpose and reset behavior is missing');
requireThat(toolsJS.includes('ground:')&&toolsJS.includes('release:')&&toolsJS.includes('renderCreative()'), 'Grounded Wave creative prompts are missing');
requireThat(toolsJS.includes("const movieTopFive=")&&toolsJS.includes('renderMovieTop('), 'Actual Top 5 movie archive data or rendering missing');
requireThat(toolsJS.includes('No exact theater-visit dates are available'), 'Last 30 days must not invent dates');
const ratingMatch=toolsJS.match(/const movieTopFive=(\[[^\n]+\]);/);
if(!ratingMatch)failures.push('Top 5 score source is missing');
else {
 try {
  const ranked=JSON.parse(ratingMatch[1]);
  const expected=['cinema2025-71','cinema2025-258','cinema2025-284','cinema2025-56','cinema2025-57'];
  requireThat(ranked.length===5 && JSON.stringify(ranked.map(x=>x.id))===JSON.stringify(expected), 'Movie Top 5 must preserve the five source-ranked records');
  requireThat(new Set(ranked.map(x=>x.id)).size===5, 'Movie Top 5 contains duplicate movie records');
  requireThat(ranked.every((x,i)=>Number.isFinite(x.score)&&x.score>=4&&(i===0||ranked[i-1].score>=x.score)), 'Movie Top 5 has invalid score/order');
  requireThat(ranked.every(x=>x.thumb && x.watchDate===null), 'Movie archive source art or missing-date caveat has changed');
 } catch(e){ failures.push('Movie Top 5 data validation failed: '+e.message); }
}

requireThat(app.includes('href="../tools.html"') && app.includes('Visit OLA HQ'), 'App-to-Tools entry lost');

if(inlineScript){
 const start=inlineScript.indexOf('function clock('),end=inlineScript.indexOf('function formatChain(',start);
 if(start<0||end<=start)failures.push('Movie scheduling logic missing');
 else try{
  const {parseShowtimes,plan}=new Function(inlineScript.slice(start,end)+'return {parseShowtimes,plan};')();
  const rows=parseShowtimes('Opening Wave | 12:00 PM | 1:40 PM\nSide Quest | 1:45 PM | 3:20 PM\nThe Detour | 1:50 PM | 3:15 PM\nMidnight Signal | 3:25 PM | 5:00 PM\nNeon Dreams | 5:10 PM | 6:45 PM\nLast Train | 7:05 PM | 8:40 PM');
  const best=plan(rows,0).combos[0];
  requireThat(best?.ids.length===5&&best.idle===40,'Movie planner calculations regressed');
  requireThat(plan(parseShowtimes('A | 1:00 PM | 2:00 PM\nB | 1:55 PM | 3:00 PM'),0).combos.length===0, 'Movie overlap handling regressed');
 }catch(e){failures.push('Movie planner check failed: '+e.message)}
}

if (failures.length) {
  console.error('OLA HQ PUBLIC RELEASE CHECK FAILED:\n' + failures.map(x => ' - ' + x).join('\n'));
  process.exit(1);
}
console.log('OLA HQ public release guard PASS: six labeled wave cards; '+cards.length+' working Toolbox cards; app ↔ Tools entry intact.');
