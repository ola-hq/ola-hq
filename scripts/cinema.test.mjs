import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {filterFilms,scoreText,genreExamples,recommendFilms,journeyPicks} from '../la-ola-cinema-club/assets/club.js';
const films=JSON.parse(readFileSync(new URL('../la-ola-cinema-club/data/films.json',import.meta.url)));
const current=films.filter(f=>f.currentClubCard);
test('exact-score links preserve quarter scores and exclude unrated records',()=>{
 const picks=filterFilms(films,{score:'7.25'});assert.ok(picks.length);assert.ok(picks.every(f=>f.clubScore===7.25));
 assert.equal(filterFilms([{clubScore:null,order:1},{clubScore:0,order:2}],{score:'0'}).length,1);
 assert.equal(filterFilms(films,{score:'invalid'}).length,0);
});
test('secondary genre shelves maximize available primary backgrounds',()=>{
 for(const genre of ['Fantasy','Comedy','Sci-Fi','Musical']){const available=current.filter(f=>f.secondaryGenre===genre);const picks=genreExamples(films,genre,'secondary');assert.equal(new Set(picks.map(x=>x.film.genre)).size,Math.min(3,new Set(available.map(f=>f.genre)).size));}
});
test('mood journey excludes horror in both genre roles when gentle is selected',()=>{
 const picks=journeyPicks(films,{dark:'gentle',energy:'tense',world:'imaginative',perspective:'heart'});assert.equal(picks.length,3);assert.ok(picks.every(x=>current.some(f=>f.id===x.film.id)&&![x.film.genre,x.film.secondaryGenre].includes('Horror')));
});
test('reconciles 44 existing placeholders and 44 additions without losing historic IDs',()=>{
 assert.equal(films.length,234);assert.equal(new Set(films.map(f=>f.id)).size,234);assert.equal(current.length,88);
 const legacy=JSON.parse(readFileSync(new URL('../blockbuster-wave/blockbuster-wave-complete-gallery.html',import.meta.url),'utf8').match(/id="data">(.*?)<\/script>/s)[1]);
 assert.equal(legacy.length,234);assert.equal(legacy.find(f=>f.id==='cinema2026-14').clubScore,9);
 assert.equal(JSON.parse(readFileSync(new URL('../la-ola-cinema-club/data/archives.json',import.meta.url))).length,125);
});
test('all current scores preserve split ratings and exact sum',()=>{for(const f of current){assert.equal(f.brain+f.heart,f.clubScore,f.title);assert.equal(f.score*2,f.clubScore);assert.ok(f.brainReaction&&f.heartReaction);assert.ok(f.stamp);assert.ok(f.genre&&f.secondaryGenre)}});
test('decimal format includes .0 only for whole scores',()=>{assert.equal(scoreText(8),'8.0');assert.equal(scoreText(10),'10.0');assert.equal(scoreText(7.25),'7.25');assert.equal(scoreText(6.5),'6.5')});
test('genre searches include primary and secondary genre without duplicates',()=>{const f=current.find(f=>f.secondaryGenre==='Romance');const r=filterFilms(current,{genre:'Romance'});assert.ok(r.some(x=>x.id===f.id));assert.equal(r.length,new Set(r.map(x=>x.id)).size)});
test('stamp, search, saved filters and score sort work together',()=>{const a=filterFilms(current,{stamp:'Food for Thought'});assert.ok(a.length>0&&a.every(f=>f.stamp==='Food for Thought'));assert.equal(filterFilms(current,{q:'WICKER'})[0].title,'Wicker');assert.equal(filterFilms(current,{saved:true,ids:[current[0].id]}).length,1);assert.equal(filterFilms(current,{q:'no-such-movie-xyz'}).length,0);const s=filterFilms(current,{sort:'score'});assert.equal(s[0].clubScore,10);assert.ok(s.every((x,i)=>!i||s[i-1].clubScore>=x.clubScore))});
test('concepts stay separate from watched-film records',()=>{assert.ok(!films.some(f=>['The Feast','The Inheritance'].includes(f.title)));for(const p of ['the-feast','the-inheritance']){const s=readFileSync(new URL('../la-ola-cinema-club/what-if/'+p+'/index.html',import.meta.url),'utf8');assert.ok(s.includes('An imagined film'));assert.ok(s.includes('not a factual reconstruction'))}});
test('parent homepage uses the Club entrance while preserving the six-world layout',()=>{const s=readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.ok(s.includes('<h2>La Ola Cinema Club</h2>'));assert.ok(s.includes('href="la-ola-cinema-club/"'));assert.ok(s.includes('la-ola-cinema-club-banner.svg'))});

// Protect the distinct meanings of background and border in the guide.
test('primary genre shelves select matching backgrounds before secondary fallbacks',()=>{for(const name of ['Drama','Comedy','Horror','Romance','Sci-Fi','Action','Fantasy','Thriller']){const examples=genreExamples(films,name);assert.equal(examples.length,3);assert.ok(examples.every(x=>x.role==='primary'&&x.film.genre===name),name)}const musical=genreExamples(films,'Musical');assert.equal(musical.filter(x=>x.role==='primary').length,2);assert.equal(musical[2].role,'secondary');assert.equal(musical[2].film.secondaryGenre,'Musical');assert.equal(new Set(musical.map(x=>x.film.id)).size,3)});
test('secondary shelves exclusively select the requested border genre',()=>{for(const name of ['Drama','Comedy','Horror','Romance','Sci-Fi','Musical','Action','Fantasy','Historical','Thriller']){const examples=genreExamples(films,name,'secondary');assert.ok(examples.length);assert.ok(examples.every(x=>x.role==='secondary'&&x.film.secondaryGenre===name),name)}});
test('quiz respects genre and perspective while returning real reviewed films',()=>{for(const perspective of ['brain','heart','club']){const picks=recommendFilms(films,{genre:'Romance',mood:'feel',perspective});assert.equal(picks.length,3);assert.ok(picks.every(x=>x.film.genre==='Romance'||x.film.secondaryGenre==='Romance'));assert.ok(picks.every(x=>current.some(f=>f.id===x.film.id)&&x.reasons.length>=2));}const b=recommendFilms(films,{perspective:'brain'});assert.equal(b[0].film.brain,5);assert.equal(recommendFilms(films,{genre:'nonexistent'}).length,0)});

import {collectionStats} from '../la-ola-cinema-club/assets/stats-data.js';
const sample=[{id:'legacy',clubScore:8,brain:null,heart:null,currentClubCard:false,order:1},{id:'zero',clubScore:0,brain:0,heart:0,currentClubCard:true,genre:'Horror',stamp:'Skip It',order:2},{id:'quarter',clubScore:7.25,brain:3.5,heart:3.75,currentClubCard:true,genre:'Fantasy',stamp:'Food for Thought',order:3},{id:'perfect',clubScore:10,brain:5,heart:5,currentClubCard:true,genre:'Fantasy',stamp:'Hits Home',order:4},{id:'pending',clubScore:null,currentClubCard:false,order:5}];
test('stats retain zero and quarter scores and exclude unrated entries from averages',()=>{const s=collectionStats(sample);assert.equal(s.total,5);assert.equal(s.rated,4);assert.equal(s.average,6.3125);assert.equal(s.median,7.625);assert.deepEqual(s.distribution.map(x=>[x.score,x.count]),[[0,1],[7.25,1],[8,1],[10,1]]);assert.equal(s.high,2);assert.equal(s.perfect.length,1)});
test('two-perspective comparisons exclude legacy combined-only cards and keep genuine zero ratings',()=>{const s=collectionStats(sample);assert.equal(s.pairs,3);assert.equal(s.agree,2);assert.equal(s.heartHigher,1);assert.equal(s.brainHigher,0);assert.equal(s.brainMean,8.5/3);assert.equal(s.heartMean,8.75/3);assert.equal(s.different[0].id,'quarter')});
test('genre and stamp counts use current cards rather than imputing archive metadata',()=>{const s=collectionStats(sample);assert.deepEqual(s.genres,[['Fantasy',2],['Horror',1]]);assert.equal(s.stamps.reduce((n,x)=>n+x[1],0),3);assert.equal(collectionStats(sample.filter(f=>f.currentClubCard)).rated,3)});
test('empty collections return unknown averages rather than invented zero scores',()=>{const s=collectionStats([]);assert.equal(s.average,null);assert.equal(s.median,null);assert.equal(s.brainMean,null);assert.equal(s.heartMean,null);assert.deepEqual(s.distribution,[])});

test('reviewer patterns retain genuine zero scores and exclude archive-only or incomplete pairs',async()=>{
 const {perspectiveStats}=await import('../la-ola-cinema-club/assets/stats-data.js');
 const data=[{currentClubCard:true,brain:0,heart:4,genre:'Horror',order:1},{currentClubCard:true,brain:5,heart:5,genre:'Horror',order:2},{currentClubCard:true,brain:4,heart:3,genre:'Horror',order:3},{currentClubCard:false,brain:5,heart:5,genre:'Horror',order:4},{currentClubCard:true,brain:5,heart:null,genre:'Horror',order:5}];
 const s=perspectiveStats(data,'brain');assert.equal(s.count,3);assert.equal(s.average,3);assert.equal(s.high,2);assert.equal(s.low,1);assert.equal(s.genres[0].average,3);assert.equal(s.standout.order,2);
});
test('genre patterns require three primary-genre records and do not infer preferences from secondary colors',async()=>{
 const {perspectiveStats}=await import('../la-ola-cinema-club/assets/stats-data.js');
 const data=[1,2,3].map(order=>({currentClubCard:true,brain:4,heart:5,genre:'Drama',secondaryGenre:'Horror',order}));data.push({currentClubCard:true,brain:5,heart:5,genre:'Musical',order:4});
 assert.deepEqual(perspectiveStats(data,'heart').genres,[{name:'Drama',count:3,average:5}]);assert.equal(perspectiveStats([],'brain').average,null);assert.throws(()=>perspectiveStats(data,'unknown'),TypeError);
});
