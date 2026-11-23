import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateFPL} from './validate-fpl.mjs';
import {refreshScores,refreshMatchday,scoreEvent} from '../football-live.mjs';
const event=(id,date,state='pre',home='Arsenal',away='Man City',hs='0',as='0')=>({id,date,status:{type:{state}},competitions:[{venue:{fullName:'Emirates Stadium'},competitors:[{homeAway:'home',team:{id:home==='Arsenal'?'359':'1',displayName:home,abbreviation:home==='Arsenal'?'ARS':'BRE'},score:hs},{homeAway:'away',team:{id:'382',displayName:away,abbreviation:'MNC'},score:as}]}]});
const withFetch=async(fn,body)=>{const original=globalThis.fetch;globalThis.fetch=fn;try{return await body()}finally{globalThis.fetch=original}};
const response=value=>({ok:true,json:async()=>value});
test('manual day refresh replaces only the chosen day, keeps stable IDs and preserves the saved timestamp',async()=>{
 const old=scoreEvent(event('a','2026-11-23T20:00Z','pre','Arsenal','Man City'));
 const other=scoreEvent(event('b','2026-11-24T20:00Z'));
 old.id='pl-123';old.stats=[{label:'Old stat',home:'1',away:'2'}];
 const input={meta:{fetched_at:'2026-11-01T00:00:00Z'},matches:[old,other]};const before=JSON.stringify(input);const calls=[];
 await withFetch(async url=>{calls.push(url);return response({events:[event('a','2026-11-23T20:00Z','post','Arsenal','Man City','2','0')]})},async()=>{
  const got=await refreshScores(input,'2026-11-23');
  assert.equal(calls.length,1);assert.match(calls[0],/dates=20261123$/);
  assert.equal(got.matches.find(m=>m.id==='pl-123').home_score,2);assert.deepEqual(got.matches.find(m=>m.id==='espn-b'),other);
  assert.deepEqual(got.matches.find(m=>m.id==='pl-123').stats,[],'changing scores must not inherit old statistics');
  assert.equal(got.meta.fetched_at,input.meta.fetched_at);assert.equal(got.meta.checked_date,'2026-11-23');assert.ok(got.meta.direct_checked_at);
 });assert.equal(JSON.stringify(input),before);
});
test('failed or malformed manual feeds leave the original snapshot untouched',async()=>{
 const input={meta:{fetched_at:'2026-11-01T00:00:00Z'},matches:[scoreEvent(event('a','2026-11-23T20:00Z'))]};const before=JSON.stringify(input);
 await withFetch(async()=>({ok:false}),async()=>assert.rejects(refreshScores(input,'2026-11-23')));
 await withFetch(async()=>response({events:[{id:'invalid'}]}),async()=>assert.rejects(refreshScores(input,'2026-11-23'),/Invalid match/));
 assert.equal(JSON.stringify(input),before);
});
test('an explicitly checked empty matchday is valid and does not erase other dates',async()=>{
 const other=scoreEvent(event('b','2026-11-24T20:00Z'));
 await withFetch(async()=>response({events:[]}),async()=>{const got=await refreshScores({meta:{fetched_at:'2026-11-01T00:00:00Z'},matches:[other]},'2026-11-23');assert.deepEqual(got.matches,[other]);assert.equal(got.meta.checked_matches,0)});
});
test('manual matchday combines completed schedule and future fixture without retaining a stale next game',async()=>{
 const calls=[];const now=new Date('2026-11-23T12:00:00Z');
 const scores={matches:[scoreEvent(event('next','2026-11-29T16:30Z'))]};
 await withFetch(async url=>{calls.push(url);if(url.includes('/standings'))return response({children:[{standings:{entries:[{team:{id:'359'},stats:[{name:'rank',value:1},{name:'points',value:28}]}]}}]});if(url.includes('/schedule'))return response({events:[event('old','2026-11-21T17:30Z','post','Arsenal','Chelsea','2','1')]});return response({events:url.endsWith('20261129')?[event('next','2026-11-29T16:30Z')]:[]});},async()=>{
 const got=await refreshMatchday({meta:{},snapshot:{next_match:{opponent:'Old opponent',kickoff_utc:'2026-11-21T17:30Z'}}},scores,now);
 assert.equal(got.snapshot.next_match.opponent,'Man City');assert.equal(got.snapshot.league.position,1);assert.equal(got.meta.refresh_strategy,'manual');assert.equal(got.meta.updated_at,now.toISOString());assert.equal(calls.length,4);
 });
});
test('football update policy has no scheduled or push refreshes and declares manual publication mode',()=>{
 for(const file of ['fpl-data-sync.yml','arsenal-data-sync.yml','arsenal-scores-sync.yml']){const source=readFileSync('.github/workflows/'+file,'utf8');assert(!/^  (schedule|push):/m.test(source));assert.match(source,/workflow_dispatch:/)}
 assert.equal(JSON.parse(readFileSync('data/football-refresh-policy.json','utf8')).mode,'manual');
 for(const file of ['arsenal-scores.js','fpl-home.js','fpl-hub.js'])assert(!/setInterval|visibilitychange/.test(readFileSync(file,'utf8')),file);
});

test('manual mode accepts a valid dated snapshot without changing its timestamp, while future timestamps still fail',()=>{
 const snapshot=JSON.parse(readFileSync('data/fpl/league-18767.json','utf8'));const stamp=snapshot.meta.fetched_at;
 assert.equal(validateFPL(snapshot,new Date('2027-01-01T00:00:00Z')).meta.fetched_at,stamp);
 snapshot.meta.fetched_at='2028-01-01T00:00:00Z';assert.throws(()=>validateFPL(snapshot,new Date('2027-01-01T00:00:00Z')),/Invalid FPL fetched_at/);
});
