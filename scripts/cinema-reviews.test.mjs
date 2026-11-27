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
test('all236film records have their recovered authentic full reviews',()=>{
 assert.equal(films.length,236);assert.equal(selected.size,236);assert.equal(coverage.fullReviews,236);assert.equal(coverage.archiveReviewsToRecover,0);
 assert.equal(films.filter(f=>f.currentClubCard).length,90);assert.deepEqual(new Set(films.map(f=>f.id)),selected);
 for(const row of coverage.reviews){const f=films.find(f=>f.id===row.filmId);assert.equal(hash(f.review),row.reviewSha256);assert.equal(f.reviewPublication.status,'owner-authorized-website');assert.ok(f.review.length>250);for(const k of ['brainReaction','heartReaction'])if(!f[k])assert.ok(f.reviewPublication.reactionFallbackToOriginalCard.includes(k==='brainReaction'?'brain':'heart')); assert.equal(f.reviewStatus,'Full review available');}
});
test('every published review page contains all narrative paragraphs and both full reactions',()=>{
 for(const row of coverage.reviews){const f=films.find(f=>f.id===row.filmId),page=readFileSync('la-ola-cinema-club/films/'+f.slug+'/index.html','utf8');assert.equal(page.split('data-full-review="'+f.id+'"').length,2,f.title+' exactly one full narrative');for(const paragraph of f.review.split('\n\n'))assert.ok(page.includes('<p>'+escape(paragraph)+'</p>'),f.title);for(const field of ['brainReaction','heartReaction'])if(f[field])assert.ok(page.includes('<p>'+escape(f[field])+'</p>'),f.title);assert.ok(!page.includes('Review coming soon'),f.title);}
 assert.match(readFileSync('la-ola-cinema-club/reviews/index.html','utf8'),/236 full Club reviews, with 236 films/);
});
test('all original ratings, film identities and diary positions stay intact while review fields are populated',()=>{
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

const recoveryBaseline=JSON.parse(execFileSync('git',['show','3180bb80:la-ola-cinema-club/data/films.json'],{encoding:'utf8'}));
test('the existing90full reviews are exact and the146recovered reviews do not alter canonical ratings or diary evidence',()=>{
 const allowed=new Set(['review','reviewKind','reviewStatus','reviewPublication','brainReaction','heartReaction','cardBrainReaction','cardHeartReaction']);
 for(const before of recoveryBaseline){const after=films.find(f=>f.id===before.id);if(before.review){assert.deepEqual(after,before,before.title);continue;}for(const key of new Set([...Object.keys(before),...Object.keys(after)]))if(!allowed.has(key))assert.deepEqual(after[key],before[key],before.title+':'+key);assert.match(after.reviewPublication.sourceURL,/^https:\/\/www\.instagram\.com\/laolacinemaclub\/p\//);assert.match(after.reviewPublication.captionSha256,/^[a-f0-9]{64}$/);}
});
test('all four long reviews retain their recovered author continuation provenance',()=>{
 const continued=films.filter(f=>f.reviewPublication.continuationURL);assert.equal(continued.length,4);for(const f of continued){assert.match(f.reviewPublication.continuationURL,/\/c\/\d+\/$/);assert.match(f.reviewPublication.continuationSha256,/^[a-f0-9]{64}$/);assert.doesNotMatch(f.review,/Continued in comments/i);}
 const vincent=films.find(f=>f.title==='Vincent Must Die');assert.ok(vincent.review.endsWith('if I just survived it.'));
});
