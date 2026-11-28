import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { syncAnnouncements } from './festival-updates.mjs';
import { validateEventsPublicExclusions } from './events-public-exclusions.mjs';

if (execFileSync('git', ['status','--porcelain','--untracked-files=no'], {encoding:'utf8'}).trim()) throw new Error('Refusing a projection from uncommitted tracked changes');
syncAnnouncements('.', {check:true});
validateEventsPublicExclusions('.');
const source = execFileSync('git', ['rev-parse','HEAD'], {encoding:'utf8'}).trim();
const output = '.site';
rmSync(output, {recursive:true, force:true});
mkdirSync(output);
const archive = join(tmpdir(), 'ola-public-' + process.pid + '.tar');
try {
  // Export ONLY tracked files of the already-public repository, never private master/local copies.
  execFileSync('git', ['archive','--format=tar','-o',archive,source]);
  execFileSync('tar', ['--no-same-owner','-xf',archive,'-C',output,'--exclude=.github','--exclude=scripts']);
} finally { rmSync(archive, {force:true}); }
validateEventsPublicExclusions(output);
// Add one shared collector to every published HTML entrypoint, including archival galleries.
// Source content stays unchanged; release hashes below cover the final published bytes.
function addAnalytics(folder) {
  for (const entry of readdirSync(folder, {withFileTypes:true})) {
    const file=join(folder,entry.name);
    if(entry.isDirectory()){addAnalytics(file);continue;}
    if(!entry.name.endsWith('.html'))continue;
    const path=relative(output,file);
    if(path.startsWith('analytics/')||path==='analytics-privacy.html')continue;
    const html=readFileSync(file,'utf8');
    if(/http-equiv=["']refresh["']/i.test(html)||!html.includes('</head>'))continue;
    const script=relative(dirname(file),join(output,'analytics.js')).split('\\').join('/');
    writeFileSync(file,html.replace('</head>',`<script defer src="${script}?v=${source.slice(0,12)}"></script></head>`));
  }
}
addAnalytics(output);

const footballPolicy=JSON.parse(readFileSync(join(output,'data/football-refresh-policy.json'),'utf8'));
if(footballPolicy.mode!=='manual')throw new Error('Expected manual football refresh policy');
const protectedPaths = ['data/football-refresh-policy.json','arsenal-wave.html','arsenal.js','arsenal-scores.js','fpl-wave.html','fpl-league-hq.html','fpl-home.js','fpl-hub.js','football-live.mjs','football-refresh.css','shared/football-models.mjs','analytics.js','analytics/index.html','analytics/report.js','la-ola-de-amor/scan/sw.js','index.html','world-entrances.css','tools.html','tools.js','app/index.html','la-ola-de-amor/index.html','la-ola-de-amor/app.js','la-ola-de-amor/data/visitor-data.js','la-ola-de-amor/scan/guide/index.html','la-ola-de-amor/scan/guide/guide.css','la-ola-de-amor/scan/guide/guide.js','la-ola-de-amor/scan/guide/festival-updates.js','data/fpl/league-18767.json','data/letterboxd-recent.json','data/arsenal-2026.json','data/arsenal-scores.json'];
protectedPaths.push('collectibles/index.html','collectibles/room.css','assets/portals-20261124/collectibles.jpg','more-waves.html','app/app.js','hq-world-portals.js');
const hashes = Object.fromEntries(protectedPaths.map(path => [path, createHash('sha256').update(readFileSync(join(output,path))).digest('hex')]));
const fpl = JSON.parse(readFileSync(join(output,'data/fpl/league-18767.json'),'utf8'));
const release = {schema:'ola-hq-release-v1', source_sha:source, workflow_run_id:process.env.GITHUB_RUN_ID || null, football_refresh_mode:footballPolicy.mode, built_at:new Date().toISOString(), fpl_fetched_at:fpl.meta.fetched_at, protected_sha256:hashes};
writeFileSync(join(output,'release.json'), JSON.stringify(release,null,2)+'\n');
console.log('Public projection built from', source, 'with', protectedPaths.length, 'protected file hashes');
