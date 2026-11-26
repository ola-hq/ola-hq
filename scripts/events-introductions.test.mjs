import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import {displayLabels} from '../our-polaroid-project/events/display-labels.js';
import {eventIntroduction} from '../our-polaroid-project/events/intro-copy.js';
const source=readFileSync('shared/gallery/gallery.js','utf8');
const baseline='058dac43b7257635f9e472b34a541050f661ed81';
const previous=execFileSync('git',['show',`${baseline}:shared/gallery/gallery.js`],{encoding:'utf8'});
const catalog=JSON.parse(readFileSync('data/events/index.json','utf8'));
function hero(code,event,brand='polaroid',intro=true){
 const classes={},stop=Symbol('captured'),sandbox={URL,URLSearchParams,Map,HTMLElement:class{},document:{currentScript:{src:'https://example.test/ola-hq/shared/gallery/gallery.js'}},customElements:{define:(name,type)=>classes[name]=type}};
 vm.runInNewContext(code,sandbox);
 const gallery=new classes['ola-gallery']();gallery.event=event;gallery.photos=event.photos.filter(p=>p.publicationStatus==='approved');gallery.preview=false;gallery.getAttribute=()=>brand;gallery.polaroidEntrance=brand==='polaroid';if(intro&&brand==='polaroid')gallery.introduction=eventIntroduction(event);
 let markup;Object.defineProperty(gallery,'innerHTML',{set:value=>{markup=value;throw stop;}});try{gallery.render();}catch(e){if(e!==stop)throw e;}
 return markup;
}
test('dedicated Wedding/default branded render remains byte-identical to the approved baseline',()=>{
 const wedding=catalog.events.find(e=>e.id==='la-ola-de-amor-2026');
 for(const brand of ['wedding','default'])assert.equal(hero(source,wedding,brand,false),hero(previous,wedding,brand,false));
});
test('Events entrance removes only decorative cover captions and promotes the existing Magic Mirror route',()=>{
 const event=catalog.events.find(e=>e.id==='la-ola-de-amor-2026'),before=JSON.stringify(event),markup=hero(source,event);
 assert.doesNotMatch(markup,/<figcaption>/);assert.match(markup,/og-hero--celebration/);assert.match(markup,/One frame at a time\./);assert.match(markup,/class="og-button og-collection-primary" href="https:\/\/example.test\/ola-hq\/la-ola-de-amor\/scan\/guide\/magic-mirror\//);
 for(const p of event.packages)assert.ok(markup.includes(p.filename));assert.equal(JSON.stringify(event),before);
});
test('all approved shared albums receive an introduction without altering saved metadata or memberships',()=>{
 const shared=catalog.events.filter(e=>e.manifest||e.id==='la-ola-de-amor-2026');assert.equal(shared.length,61);
 for(const summary of shared){const event=summary.manifest?JSON.parse(readFileSync(summary.manifest,'utf8')).events.find(e=>e.id===summary.id):summary;const before=JSON.stringify(event),intro=eventIntroduction(event),markup=hero(source,event);
  assert.equal(intro.heading,displayLabels(event).title);assert.ok(intro.emphasis);assert.ok(markup.includes('href="#photographs"'));assert.doesNotMatch(markup,/<figcaption>/);assert.equal(JSON.stringify(event),before);
  assert.ok(markup.includes(displayLabels(event).dateLabel.replaceAll('&','&amp;')));assert.ok(markup.includes('og-hero'));
 }
});
test('generic introduction supplies no invented dates, places, personal stories or artistically selected replacement covers',()=>{
 const e=Object.freeze({id:'ordinary',title:'A night out',dateLabel:'Year to confirm',location:'',photos:Object.freeze([])}),intro=eventIntroduction(e);
 assert.deepEqual(Object.keys(intro).sort(),['dateLabel','emphasis','fallbackDescription','gridButton','heading']);assert.equal(intro.heading,e.title);assert.equal(intro.celebration,undefined);assert.equal(e.dateLabel,'Year to confirm');
});
test('curated entrances preserve full approved grids, scripts, downloads, primary and secondary cover IDs',()=>{
 for(const id of ['lib-2025','lib-2026','martins-bach-party']){
  const path=`our-polaroid-project/events/${id}/index.html`,current=readFileSync(path,'utf8'),old=execFileSync('git',['show',`${baseline}:${path}`],{encoding:'utf8'}),record=catalog.events.find(e=>e.id===id);
  assert.match(current,/curated-memory\.js\?v=20261126-stars49/);
  const body=s=>s.slice(s.indexOf('</header>',s.indexOf('<header class="album-header'))+9).replace('curated-memory.js?v=20261126-stars49','curated-memory.js?v=20261125-polaroid45');assert.equal(body(current),body(old),'approved grids and existing script/download logic untouched except the explicit viewer cache pin');
  const header=current.slice(current.indexOf('<header class="album-header'),current.indexOf('</header>',current.indexOf('<header class="album-header')));
  assert.ok(header.includes(`photos/${record.coverId}.jpg`));assert.ok(header.includes(`photos/${record.secondaryCoverId}.jpg`));assert.doesNotMatch(header,/<figcaption/);assert.match(header,/<em>/);assert.ok(header.includes(record.dateLabel));
 }
});
test('every shared Events route loads versioned enhancement while dedicated LIVE1 stays outside it',()=>{
 for(const e of catalog.events.filter(e=>e.manifest||e.id==='la-ola-de-amor-2026')){
  const path=`our-polaroid-project/events/${e.id}/index.html`,html=readFileSync(path,'utf8');assert.match(html,/gallery\.js\?v=20261126-events-stars49/);assert.match(html,/album-introductions\.css\?v=20261126-intro46/);
 }
 const dedicated=readFileSync('la-ola-de-amor/photos/index.html','utf8');assert.doesNotMatch(dedicated,/album-introductions|intro-copy/);
});

test('shared album/directory display formatter preserves every approved card label from production',()=>{
 const original=execFileSync('git',['show',`${baseline}:our-polaroid-project/events/portrait-events.js`],{encoding:'utf8'}),scope={};const formatter=original.slice(original.indexOf(' const displayLabels='),original.indexOf(' const displayQuery='));vm.runInNewContext(formatter+';this.labels=displayLabels;',scope);
 const all=new Map([...catalog.events,...catalog.parentEvents].map(e=>[e.id,e]));const covers=JSON.parse(readFileSync('data/events/portrait-covers.json')).covers;assert.equal(Object.keys(covers).length,66);
 for(const id of Object.keys(covers)){const event=all.get(id);assert.deepEqual(displayLabels(event),JSON.parse(JSON.stringify(scope.labels(event))));}
});
test('classic directory bootstrap captures its base before await and registers even if shared formatting cannot load',async()=>{
 const actual=readFileSync('our-polaroid-project/events/portrait-events.js','utf8');const importLine="await import(new URL('our-polaroid-project/events/display-labels.js?v=20261125-labels1',root))";assert.ok(actual.includes(importLine));
 for(const fail of [false,true]){let registered,requests=0;class Base{drawPublished(){this.observedQuery=this.filters.q}}
  const sandbox={URL,document:{currentScript:{src:'https://example.test/ola-hq/our-polaroid-project/events/portrait-events.js'}},customElements:{get:()=>Base,whenDefined:async name=>assert.equal(name,'ola-events'),define:(name,type)=>{assert.equal(name,'ola-events-portrait');registered=type}},__loadLabels:async()=>{requests++;if(fail)throw Error('fixture unavailable');return{displayLabels}}};
  const pending=vm.runInNewContext(actual.replace(importLine,'await __loadLabels()'),sandbox);sandbox.document.currentScript=null;await pending;assert.equal(requests,1);assert.ok(registered);
  const directory=new registered();directory.filters={q:'Lightning in a Bottle 2025'};directory.data={events:[]};directory.querySelectorAll=()=>[];directory.drawPublished();assert.equal(directory.observedQuery,'LIB 2025');assert.equal(directory.filters.q,'Lightning in a Bottle 2025');
 }
});
