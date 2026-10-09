import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

if (execFileSync('git', ['status','--porcelain','--untracked-files=no'], {encoding:'utf8'}).trim()) throw new Error('Refusing a projection from uncommitted tracked changes');
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
const protectedPaths = ['index.html','world-entrances.css','tools.html','tools.js','app/index.html','la-ola-de-amor/index.html','la-ola-de-amor/app.js','la-ola-de-amor/data/visitor-data.js','la-ola-de-amor/scan/guide/index.html','la-ola-de-amor/scan/guide/guide.css','la-ola-de-amor/scan/guide/guide.js','la-ola-de-amor/scan/guide/festival-updates.js','data/fpl/league-18767.json','data/letterboxd-recent.json','data/arsenal-2026.json','data/arsenal-scores.json'];
const hashes = Object.fromEntries(protectedPaths.map(path => [path, createHash('sha256').update(readFileSync(join(output,path))).digest('hex')]));
const fpl = JSON.parse(readFileSync(join(output,'data/fpl/league-18767.json'),'utf8'));
const release = {schema:'ola-hq-release-v1', source_sha:source, workflow_run_id:process.env.GITHUB_RUN_ID || null, built_at:new Date().toISOString(), fpl_fetched_at:fpl.meta.fetched_at, protected_sha256:hashes};
writeFileSync(join(output,'release.json'), JSON.stringify(release,null,2)+'\n');
console.log('Public projection built from', source, 'with', protectedPaths.length, 'protected file hashes');
