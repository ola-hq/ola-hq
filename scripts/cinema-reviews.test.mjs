import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const films=JSON.parse(readFileSync('la-ola-cinema-club/data/films.json'));
const coverage=JSON.parse(readFileSync('la-ola-cinema-club/data/review-coverage.json'));
const registry=JSON.parse(readFileSync('la-ola-cinema-club/data/artwork.json'));
const original=JSON.parse(execFileSync('git',['show','add4daf8:la-ola-cinema-club/data/films.json'],{encoding:'utf8'}));
const selected=new Set(coverage.reviews.map(r=>r.filmId));
const hash=s=>createHash('sha256').update(s).digest('hex');
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#x27;');
test('all90completed captions become full reviews without dropping any of the236films',()=>{
 assert.equal(films.length,236);assert.equal(selected.size,90);assert.equal(coverage.fullReviews,90);assert.equal(coverage.archiveReviewsToRecover,146);
 assert.deepEqual(new Set(films.filter(f=>f.currentClubCard).map(f=>f.id)),selected);
 for(const row of coverage.reviews){const f=films.find(f=>f.id===row.filmId);assert.equal(hash(f.review),row.reviewSha256);assert.equal(f.reviewPublication.status,'owner-authorized-website');assert.ok(f.review.length>250);assert.ok(f.brainReaction&&f.heartReaction);assert.equal(f.reviewStatus,'Full review available');}
});
test('every published review page contains all narrative paragraphs and both full reactions',()=>{
 for(const row of coverage.reviews){const f=films.find(f=>f.id===row.filmId),page=readFileSync('la-ola-cinema-club/films/'+f.slug+'/index.html','utf8');assert.ok(page.includes('data-full-review="'+f.id+'"'),f.title);for(const paragraph of f.review.split('\n\n'))assert.ok(page.includes('<p>'+escape(paragraph)+'</p>'),f.title);for(const field of ['brainReaction','heartReaction'])assert.ok(page.includes('<p>'+escape(f[field])+'</p>'),f.title);assert.ok(!page.includes('Review coming soon'),f.title);}
 assert.match(readFileSync('la-ola-cinema-club/reviews/index.html','utf8'),/90 full Club reviews, with 236 films/);
});
test('146 archive records remain byte-equivalent and all original film identities/diary positions stay intact',()=>{
 const allowedReview=['review','reviewKind','reviewStatus','reviewHistory','reviewPublication','brainReaction','heartReaction','cardBrainReaction','cardHeartReaction'];
 const allowedScore=['brain','heart','score','clubScore','ratingHistory','ratingProvenance'];let scoreChanges=0;
 assert.deepEqual(films.map(f=>f.id),original.map(f=>f.id));
 for(const old of original){const f=films.find(x=>x.id===old.id);if(!selected.has(old.id)){assert.deepEqual(f,old,old.title);continue;}const before={...old},after={...f};for(const k of allowedReview){delete before[k];delete after[k];}if(old.brain!==f.brain||old.heart!==f.heart){scoreChanges++;assert.equal(f.ratingHistory.at(-1).recordedAt,'2026-11-26');for(const k of allowedScore){delete before[k];delete after[k];}}assert.deepEqual(after,before,old.title);}
 assert.equal(scoreChanges,13);
 for(const old of original.filter(f=>f.sourceConflict)){const f=films.find(x=>x.id===old.id);for(const k of ['brain','heart','clubScore','sourceConflict','ratingAuthority'])assert.equal(f[k],old[k],old.title);}
});
test('all13corrected cards agree with the recorded ratings, metadata and approved full-resolution assets',()=>{
 const corrected=films.filter(f=>f.ratingHistory?.some(h=>h.recordedAt==='2026-11-26'));
 assert.equal(corrected.length,13);
 for(const f of corrected){assert.equal(f.brain+f.heart,f.clubScore);const art=registry.films[f.id];assert.equal(art.status,'approved');assert.ok(art.approvalReceipt);assert.equal(hash(readFileSync('la-ola-cinema-club/'+art.image)),art.sha256);const page=readFileSync('la-ola-cinema-club/films/'+f.slug+'/index.html','utf8');assert.ok(page.includes('Club '+f.clubScore+'/10.'));assert.ok(page.includes('?art='+art.revision));}
});
