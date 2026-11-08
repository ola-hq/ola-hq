import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import vm from 'node:vm';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=readFileSync(resolve(root,'our-polaroid-project/events/portrait-events.js'),'utf8');
const helper=source.slice(source.indexOf(' const displayLabels='),source.indexOf(' class PortraitEvents'));
const context={};vm.runInNewContext(helper+';this.labels=displayLabels;this.query=displayQuery;this.dayLink=matchingDayLabel;',context);
const label=event=>JSON.parse(JSON.stringify(context.labels(event)));
const registry=JSON.parse(readFileSync(resolve(root,'data/events/index.json')));
const all=new Map([...registry.events,...registry.parentEvents].map(e=>[e.id,e]));
test('all LIB editions expand only for display, preserving year and uncertainty',()=>{
 for(const [id,date] of [['lib-2025','2025'],['lib-2026','2026'],['event-a9b5166dfd9f','2024 · event/date unconfirmed']])assert.deepEqual(label(all.get(id)),{title:'Lightning in a Bottle',dateLabel:date});
});
test('precise dates use readable month/day/year beneath a date-free title',()=>{
 assert.deepEqual(label(all.get('event-31f06b8208a3')),{title:'Desert Air',dateLabel:'November 16, 2024'});
 assert.deepEqual(label(all.get('event-f2ecebb9c81a')),{title:'Miami',dateLabel:'March 2023'});
});
test('ranges and separate dates retain their distinct meaning',()=>{
 assert.deepEqual(label(all.get('event-0606c8d3bb97')),{title:'EDSEA',dateLabel:'November 4–8, 2023'});
 assert.deepEqual(label(all.get('event-5ef8c7704ba8')),{title:'JJ’s 29th Birthday',dateLabel:'May 16 & 20, 2023'});
});
test('parent, weekend, day, New Year and recovered-part identities survive',()=>{
 for(const [id,title] of [['coachella-2022','Coachella'],['nft-la-2022','NFT LA'],['event-91e9a50f9352','Coachella · Weekend 2, Day 2'],['event-f0da42950bf2','Holy Ship · Part 2 (Recovered Photographs)'],['event-3ad5f8a48489','CRSSD Proper · New Year']])assert.equal(label(all.get(id)).title,title);
});
test('all uncertainty labels remain verbatim and no exact date is invented',()=>{
 for(const e of all.values())if(/unconfirmed|confirm/i.test(e.dateLabel))assert.equal(label(e).dateLabel,e.dateLabel);
 assert.deepEqual(label(all.get('event-54b8c286679f')),{title:'EDSEA',dateLabel:'November 1–9 · year unconfirmed'});
 assert.deepEqual(label(all.get('coachella-2022')),{title:'Coachella',dateLabel:'April 2022'});
});
test('brand acronyms, names and meaningful title punctuation are not title-cased',()=>{
 for(const [id,title] of [['event-67469f366e1b','SuperMint'],['event-00c669f0e75a','AYYBO'],['event-a48976b25e8d','Smilesss × Chill Rx · NFT LA'],['event-a55c9062f39c','DTLA Night Out'],['event-c4611157e940','Columbia Festival'],['event-a3087620aaa2','Brazilian BBQ + Escape Room']])assert.equal(label(all.get(id)).title,title);
 assert.equal(label(all.get('martins-bach-party')).title,'Martin’s Bach Party');
 assert.equal(label(all.get('event-d32df8a80a1a')).title,'Cancún');
});
test('malformed dates and date-less numeric names are retained rather than guessed',()=>{
 for(const date of ['2024-02-30','2024-13','Summer · year unconfirmed'])assert.equal(label({title:'Room 2024',dateLabel:date}).dateLabel,date);
 assert.equal(label({title:'Edition · 2024',dateLabel:''}).title,'Edition · 2024');
});
test('formatting is pure for every frozen card; canonical records stay unchanged',()=>{
 const covers=JSON.parse(readFileSync(resolve(root,'data/events/portrait-covers.json'))).covers;
 assert.equal(Object.keys(covers).length,66);
 for(const id of Object.keys(covers)){const event=all.get(id),before=JSON.stringify(event);assert(label(event).title);assert.equal(JSON.stringify(event),before);}
});
test('expanded name and legacy LIB searches share the same canonical query',()=>{
 assert.equal(context.query('Lightning in a Bottle 2025'),'LIB 2025');
 assert.equal(context.query('LIGHTNING IN A BOTTLE'),'LIB');
 assert.equal(context.query('LIB'),'LIB');assert.equal(context.query('NFT LA'),'NFT LA');
});
test('formatter does not reach leaf-gallery or canonical data files',()=>{
 assert(!source.includes('this.data.events='));assert(!source.includes('event.title='));
 assert(source.includes('finally{this.filters.q=query;}'));
});
test('matching-day search links keep precise dates visible without a separate date line',()=>{
 const event=all.get('event-91e9a50f9352');
 assert.equal(context.dayLink(event),`Coachella · Weekend 2, Day 2 · April 23, 2022 · ${event.photoCount??event.photos.length} photos ↗`);
 const nft=all.get('event-6b57285f605d');assert(context.dayLink(nft).includes('Smilesss · NFT LA · March 31, 2022'));
});
test('matching-day search links retain the entire uncertain day-zero date label',()=>{
 const event=all.get('event-ed9faea9a573');
 assert(context.dayLink(event).includes('April 2022 · Weekend 1, Day 0 · date unconfirmed'));
 assert(context.dayLink(event).startsWith('Coachella · Weekend 1, Day 0 · '));
});
