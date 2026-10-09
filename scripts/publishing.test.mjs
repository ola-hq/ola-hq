import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, copyFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const root=resolve('.');
const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const run=(cwd)=>spawnSync('bash',['scripts/commit-data.sh','data/fpl/league-18767.json','data: test snapshot'],{cwd,encoding:'utf8'});
const files=['index.html','tools.html','tools.js','world-entrances.css','app/index.html','scripts/verify-hq-release.mjs','scripts/validate-fpl.mjs','scripts/sync-letterboxd.py','.github/workflows/pages.yml','data/fpl/league-18767.json','scripts/commit-data.sh'];
function prepare() {
  const dir=mkdtempSync(join(tmpdir(),'ola-publishing-'));
  const remote=join(dir,'remote.git'), seed=join(dir,'seed'),worker=join(dir,'worker'),other=join(dir,'other');
  mkdirSync(seed); git(seed,'init','-b','main');
  for(const file of files) { const path=join(seed,file); mkdirSync(dirname(path),{recursive:true}); copyFileSync(join(root,file),path); }
  git(seed,'add','.'); git(seed,'-c','user.name=Test','-c','user.email=test@example.invalid','commit','-m','baseline');
  git(dir,'init','--bare','--initial-branch=main',remote); git(seed,'remote','add','origin',remote); git(seed,'push','origin','main');
  git(dir,'clone',remote,worker); git(dir,'clone',remote,other);
  return {dir,remote,worker,other};
}
function editSnapshot(cwd, stamp) {
  const path=join(cwd,'data/fpl/league-18767.json'); const data=JSON.parse(readFileSync(path,'utf8'));
  data.meta.fetched_at=stamp; writeFileSync(path,JSON.stringify(data,null,2)+'\n');
}
function commit(cwd,message) {git(cwd,'add','.');git(cwd,'-c','user.name=Test','-c','user.email=test@example.invalid','commit','-m',message);git(cwd,'push','origin','HEAD:main');}

test('real data commit rebases over a concurrent page update, preserving both',()=>{
  const t=prepare();
  try {
    editSnapshot(t.worker,'2026-10-08T23:00:00Z');
    writeFileSync(join(t.other,'index.html'),readFileSync(join(t.other,'index.html'),'utf8')+'\n<!-- newer approved page -->\n');
    commit(t.other,'site: concurrent change');
    const result=run(t.worker); assert.equal(result.status,0,result.stdout+result.stderr);
    assert(git(t.remote,'show','main:index.html').includes('newer approved page'));
    assert(git(t.remote,'show','main:data/fpl/league-18767.json').includes('2026-10-08T23:00:00Z'));
    assert.equal(git(t.worker,'diff','--name-only','origin/main~1','HEAD'),'data/fpl/league-18767.json');
  } finally {rmSync(t.dir,{recursive:true,force:true});}
});
test('overlapping newer snapshot aborts; remote bytes and page remain intact',()=>{
  const t=prepare();
  try {
    editSnapshot(t.worker,'2026-10-08T22:00:00Z');
    editSnapshot(t.other,'2026-10-08T23:00:00Z'); commit(t.other,'data: newer concurrent snapshot');
    const before=git(t.remote,'rev-parse','main');
    const result=run(t.worker); assert.notEqual(result.status,0); assert.match(result.stdout,/Overlapping update/);
    assert.equal(git(t.remote,'rev-parse','main'),before);
    assert(git(t.remote,'show','main:data/fpl/league-18767.json').includes('2026-10-08T23:00:00Z'));
  } finally {rmSync(t.dir,{recursive:true,force:true});}
});
test('regressed release on fresh main blocks data push even after a clean rebase',()=>{
  const t=prepare();
  try {
    editSnapshot(t.worker,'2026-10-08T23:00:00Z');
    writeFileSync(join(t.other,'index.html'),readFileSync(join(t.other,'index.html'),'utf8').replace('LOVE · PLACES · MEMORIES','broken label'));
    commit(t.other,'site: broken label');
    const before=git(t.remote,'rev-parse','main');
    const result=run(t.worker); assert.notEqual(result.status,0); assert.match(result.stderr,/PUBLIC RELEASE CHECK FAILED/);
    assert.equal(git(t.remote,'rev-parse','main'),before);
  } finally {rmSync(t.dir,{recursive:true,force:true});}
});
test('data writer rejects unexpected site edits and unapproved output paths',()=>{
  const t=prepare();
  try {
    const before=git(t.remote,'rev-parse','main');
    editSnapshot(t.worker,'2026-10-08T23:00:00Z');
    writeFileSync(join(t.worker,'index.html'),readFileSync(join(t.worker,'index.html'),'utf8')+'\n<!-- unexpected -->');
    assert.notEqual(run(t.worker).status,0);
    assert.equal(git(t.remote,'rev-parse','main'),before);
    const result=spawnSync('bash',['scripts/commit-data.sh','index.html','bad'],{cwd:t.worker,encoding:'utf8'});
    assert.notEqual(result.status,0);assert.match(result.stdout,/Not an approved/);
  } finally {rmSync(t.dir,{recursive:true,force:true});}
});
test('unchanged snapshot is a no-op; a rejected push retries without force',()=>{
  const t=prepare();
  try {
    const before=git(t.remote,'rev-parse','main'); assert.equal(run(t.worker).status,0); assert.equal(git(t.remote,'rev-parse','main'),before);
    editSnapshot(t.worker,'2026-10-08T23:00:00Z');
    const hook=join(t.remote,'hooks/pre-receive');
    writeFileSync(hook,'#!/bin/sh\nif [ ! -f "'+join(t.dir,'rejected-once')+'" ]; then touch "'+join(t.dir,'rejected-once')+'"; exit 1; fi\nexit 0\n',{mode:0o755});
    const result=run(t.worker);assert.equal(result.status,0,result.stdout+result.stderr);assert.match(result.stdout,/retry 1\/3/);
  } finally {rmSync(t.dir,{recursive:true,force:true});}
});
