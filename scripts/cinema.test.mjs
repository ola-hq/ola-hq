import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {filterFilms,scoreText} from '../la-ola-cinema-club/assets/club.js';
const films=JSON.parse(readFileSync(new URL('../la-ola-cinema-club/data/films.json',import.meta.url)));
const current=films.filter(f=>f.currentClubCard);
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
