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

const cards = [...tools.matchAll(/<button type="button" class="ai-lab-card" data-key="([^"]+)"/g)].map(m => m[1]);
const prompts = [...tools.matchAll(/<template id="ai-prompt-source-([^"]+)"><pre>([\s\S]*?)<\/pre><\/template>/g)];
requireThat(cards.length >= 2, 'The Tools shelf lost its verified prompt cards');
requireThat(new Set(cards).size === cards.length, 'Tool card ids must not be duplicated');
for (const id of cards) {
  const content = prompts.find(m => m[1] === id)?.[2]?.trim() ?? '';
  requireThat(content.length >= 200, 'Tool card has no complete source prompt: ' + id);
}
requireThat(tools.includes('id="ai-tool-modal"') && tools.includes('dialog.showModal()'), 'Tools prompt dialog is missing');
requireThat(tools.includes('navigator.clipboard.writeText'), 'Tools prompt copy action is missing');
requireThat(app.includes('href="../tools.html"') && app.includes('Visit OLA HQ'), 'OLA HQ App must link to the real website Tools page');

if (failures.length) {
  console.error('OLA HQ PUBLIC RELEASE CHECK FAILED:\n' + failures.map(x => ' - ' + x).join('\n'));
  process.exit(1);
}
console.log('OLA HQ public release guard PASS: six labeled wave cards; '+cards.length+' complete prompt cards; app ↔ Tools entry intact.');
