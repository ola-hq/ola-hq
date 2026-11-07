import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const code=readFileSync(new URL('../shared/gallery/gallery.js',import.meta.url),'utf8');
const helper=code.slice(code.indexOf('function groupPublishedEvents('),code.indexOf('// End published event grouping.'));
const scope={};vm.runInNewContext(helper+';this.group=groupPublishedEvents;',scope);
const clean=value=>JSON.parse(JSON.stringify(value));
const photo=id=>({id,publicationStatus:'approved'});
const leaf=(id,title,photoCount,year=2022)=>({id,title,year,photoCount,photos:[photo(id)],publicationStatus:'approved',route:`events/${id}/`});
function sample(){return {events:[leaf('day1','Festival · Day 1',10),leaf('day2','Festival · Day 2',20),{...leaf('hidden','Restricted day',99),publicationStatus:'private'},leaf('standalone','Concert',7)],parentEvents:[{id:'festival-2022',title:'Festival · 2022',year:2022,publicationStatus:'approved',childEventIds:['day1','hidden','day2'],coverId:'day1',route:'events/festival-2022/'}]};}
test('parent counts exclude restricted children and never double-count day photos',()=>{
 const r=clean(scope.group(sample()));assert.equal(r.eventCount,2);assert.equal(r.leafGalleryCount,3);assert.equal(r.photoCount,37);assert.equal(r.dayGalleryCount,2);assert.equal(r.parentEventCount,1);assert.equal(r.rows[0].photoCount,30);
});
test('parent-name search finds its days; day-name search keeps a direct matching-day entrance',()=>{
 const a=clean(scope.group(sample(),{q:'Festival 2022'}));assert.equal(a.eventCount,1);assert.equal(a.leafGalleryCount,2);assert.equal(a.photoCount,30);
 const b=clean(scope.group(sample(),{q:'Day 2'}));assert.equal(b.photoCount,20);assert.equal(b.rows[0].galleryCount,1);assert.equal(b.rows[0].matchingGalleries[0].route,'events/day2/');assert.equal(clean(scope.group(sample(),{q:'Restricted'})).photoCount,0);
});
test('parent entrance preserves original day ordering and source data',()=>{
 const data=sample(),before=JSON.stringify(data);const r=clean(scope.group(data,{},'festival-2022'));assert.deepEqual(r.rows.map(e=>e.id),['day1','day2']);assert.equal(JSON.stringify(data),before);assert.equal(r.photoCount,30);
});
test('day search does not match the middle of Birthday followed by a year',()=>{
 const data=sample();data.events.push(leaf('birthday','A Birthday · 2022',42));const r=clean(scope.group(data,{q:'Day 2'}));assert.equal(r.photoCount,20);assert.equal(r.leafGalleryCount,1);
});
test('unknown years have a real filter, and absent parents fail closed',()=>{
 const data=sample();data.events.push(leaf('unknown','Uncertain trip',4,null));assert.equal(scope.group(data,{year:'unknown'}).photoCount,4);assert.equal(scope.group(data,{year:'2023'}).leafGalleryCount,0);assert.equal(scope.group(data,{},'not-published').photoCount,0);
});
test('catalog cover summaries use photoCount rather than their one-photo cover list',()=>{
 const r=scope.group({events:[leaf('summary','Large album',225)]});assert.equal(r.photoCount,225);assert.equal(r.leafGalleryCount,1);
});
function loader(catalog,detail){const requests=[];const sandbox={URL,fetch:async target=>{requests.push(String(target));return {ok:true,json:async()=>requests.length===1?catalog:detail};}};
 const source=code.slice(code.indexOf('async function events('),code.indexOf('const image ='));
 vm.runInNewContext("const ROOT=new URL('https://example.test/ola-hq/');const registries=new Map();"+source+';this.load=events;',sandbox);return {load:sandbox.load,requests};}
test('historical album fetches its approved same-origin manifest; existing full wedding data stays unchanged',async()=>{
 const summary={...leaf('archive','Archive',10),manifest:'data/events/archive.json'};const full={...summary,photos:[photo('a'),photo('b')]};const a=loader({events:[summary]},{events:[full]});assert.deepEqual(clean((await a.load('archive')).events),[full]);assert.equal(a.requests.length,2);
 const wedding=leaf('wedding','Wedding',174),b=loader({events:[wedding]},null);assert.deepEqual(clean((await b.load('wedding')).events),[wedding]);assert.equal(b.requests.length,1);
});
test('manifest loader rejects external paths and unapproved summaries before requesting detail',async()=>{
 for(const summary of [{...leaf('x','X',1),manifest:'https://other.test/private.json'},{...leaf('x','X',1),manifest:'data/events/x.json',publicationStatus:'private'}]){
  const a=loader({events:[summary]},{events:[summary]});await assert.rejects(a.load('x'));assert.equal(a.requests.length,1);
 }
});
