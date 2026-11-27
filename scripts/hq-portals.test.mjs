import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const read = p => readFileSync(new URL('../'+p, import.meta.url),'utf8');

test('all 15 worlds have matching artwork in website and app without losing community', () => {
  const home=read('index.html'), deeper=read('more-waves.html'), app=read('app/index.html');
  assert.equal((home.match(/<section class="rooms world-entrances home-six-waves"[\s\S]*?<\/section>/)[0].match(/<div class="room-copy"><h2>/g)||[]).length,6);
  assert.equal((deeper.match(/<h2(?: id="academy-card-title")?>/g)||[]).length,9);
  assert.equal((app.match(/class="world-card portal-card"/g)||[]).length,15);
  for(const key of ['la-ola','cinema','polaroid','wave26','fpl','collectibles','simulation','gdb','arsenal','offbrand','willpwr','wu-wei','homebase','capybara']) {
    const path='assets/portals-20261124/'+key+'.jpg';
    assert.ok((home+deeper).includes(path),key+' website art'); assert.ok(app.includes('../'+path),key+' app art');
    assert.ok(existsSync(new URL('../'+path,import.meta.url)),key+' local asset');
  }
  assert.ok(deeper.includes('assets/entrances/arsenal-academy-clubhouse.jpg'));
  assert.ok(app.includes('../assets/entrances/arsenal-academy-clubhouse.jpg'));
  const firstHome=[...home.matchAll(/<a class="room" href="([^"]+)"/g)].slice(0,3).map(x=>x[1]);assert.deepEqual(firstHome,['la-ola-cinema-club/','our-polaroid-project/','la-ola-de-amor/']);
  const firstApp=[...app.matchAll(/class="world-card portal-card" data-world="([^"]+)"/g)].slice(0,3).map(x=>x[1]);assert.deepEqual(firstApp,['blockbuster','polaroid','la-ola']);
  assert.ok(app.includes('data-world="what-wave"'));
  assert.ok(app.includes('Private beta · Pass required · Unofficial'));
});
test('app routes Cinema to the current Club and keeps gated worlds as direct external doors', () => {
  const js=read('app/app.js'), html=read('app/index.html');
  assert.match(js,/blockbuster: \{ name: 'La Ola Cinema Club', path: 'la-ola-cinema-club\/'/);
  assert.ok(js.includes("if (/^la-ola-cinema-club\\//.test(path)) return 'blockbuster';"));
  assert.ok(html.includes('href="https://home-base-purple-angels.jonathanmlizardi.workers.dev/" target="_blank"'));
  assert.ok(html.includes('href="https://ola-hq.github.io/arsenal-academy-worlds/?v=presenter-entry-1" target="_blank"'));
  assert.ok(read('index.html').includes('class="portal-globe-door" href="#waves"'));
  assert.match(read('index.html').match(/<header[\s\S]*?<\/header>/)[0], /href="app\/"/);
});
test('Collectibles replaces only the sixth main world and Simulation remains in Deeper Waves', () => {
  const home=read('index.html'), deeper=read('more-waves.html'), app=read('app/index.html');
  const main=home.match(/<section class="rooms world-entrances home-six-waves"[\s\S]*?<\/section>/)[0];
  const mainApp=[...app.matchAll(/data-world="([^"]+)" data-tier="main"/g)].map(m=>m[1]);
  assert.deepEqual(mainApp,['blockbuster','polaroid','la-ola','wave26','fpl','collectibles']);
  assert.ok(main.includes('href="collectibles/"'));
  assert.ok(!main.includes('simulation-wave/'));
  assert.equal((deeper.match(/href="simulation-wave\/"/g)||[]).length,1);
  assert.ok(app.indexOf('data-world="simulation"')>app.indexOf('app-deeper-heading'));
  assert.ok(app.includes('data-world="simulation" type="button"'));
});
test('Collectibles app routes and nested navigation remain same-origin public rooms', () => {
  const js=read('app/app.js');
  const registry=js.slice(js.indexOf('const worlds ='),js.indexOf('const rootPath'));
  const functions=js.slice(js.indexOf('const urlFor ='),js.indexOf('function isWorldHome'));
  const api=new Function('location',"const ROOT=new URL('../',location.href);let current=null;"+registry+"const rootPath=ROOT.pathname;"+functions+'return {isAllowed,matchWorld,urlFor};')({href:'https://example.test/ola-hq/app/'});
  assert.equal(api.urlFor('collectibles').pathname,'/ola-hq/collectibles/');
  assert.equal(api.matchWorld('https://example.test/ola-hq/collectibles/'),'collectibles');
  assert.equal(api.matchWorld('https://example.test/ola-hq/collectibles/future-public-page'),'collectibles');
  assert.equal(api.matchWorld('https://example.test/ola-hq/simulation-wave/'),'simulation');
  assert.equal(api.isAllowed('https://private.example/'),false);
});
test('public Collectibles is a static brand room with no private inventory or Desk connection', () => {
  const page=read('collectibles/index.html'), css=read('collectibles/room.css');
  assert.ok(page.includes('https://www.ebay.com/usr/olacollectibles'));
  assert.ok(page.includes('rel="noopener noreferrer" referrerpolicy="no-referrer"'));
  assert.ok(page.includes('../app/?path=collectibles%2F'));
  assert.ok(page.includes('id="main"')&&page.includes('href="#main"'));
  for(const marker of ['.ts.net','127.0.0.1','localhost','sqlite','docs.google.com','/api/','type="password"','<form','<iframe'])assert.ok(!page.toLowerCase().includes(marker.toLowerCase()),marker+' must stay out of public room');
  assert.doesNotMatch(page,/\b(?:CAP-\d{8}-|(?:CARD|ORDER)-[A-F0-9]{12,}|OLA-[A-F0-9]{12}\b)/i,'Internal record identifiers must stay private; the OLA HQ brand is public');
  assert.equal((page.match(/<script/g)||[]).length,0);
  assert.ok(css.includes('@media(max-width:620px)'));
  assert.ok(css.includes('prefers-reduced-motion'));
  const ids=[...page.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
});
function atmosphere(reduced=false) {
  const tasks=[], raf=[], overlays=[]; let moved=0;
  const node=()=>({className:'',classList:{add(){},remove(){}},setAttribute(){},append(){},remove(){moved++}});
  const document={hidden:false,body:{prepend(){},append(n){overlays.push(n)}},createElement(tag){if(tag==='canvas')return {...node(),getContext:()=>null};return node()},querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}};
  const context={document,window:{},matchMedia:()=>({matches:reduced,addEventListener(){}}),innerWidth:1200,innerHeight:800,Math,
    setTimeout(fn){tasks.push(fn);return tasks.length},clearTimeout(){},requestAnimationFrame(fn){raf.push(fn);return raf.length},cancelAnimationFrame(){},addEventListener(){}};
  vm.runInNewContext(read('hq-portals.js'),context);
  return {api:context.window.OLAPortals,tasks,overlays,get removed(){return moved}};
}
test('reduced motion enters immediately and never creates a zoom overlay', () => {
  const a=atmosphere(true);let entries=0;a.api.enter({},()=>entries++);assert.equal(entries,1);assert.equal(a.overlays.length,0);assert.equal(a.tasks.length,0);
});
test('animated entry navigates exactly once despite rapid repeat taps, then resets', () => {
  const a=atmosphere();let entries=0;const card={querySelector:()=>null};
  a.api.enter(card,()=>entries++);a.api.enter(card,()=>entries++);
  assert.equal(entries,0);assert.equal(a.overlays.length,1);a.tasks[0]();assert.equal(entries,1);assert.equal(a.removed,1);
  a.api.enter(card,()=>entries++);assert.equal(a.overlays.length,2);a.tasks[1]();assert.equal(entries,2);
});

function starScene({fine=true,reduced=false,width=1920,height=1080,app=false}={}){
 const listeners={},docListeners={},frames=new Map(),nodes=[];let next=0,arcs=[],observer;
 const style=()=>({values:{},setProperty(k,v){this.values[k]=v}});
 const ctx={setTransform(){},clearRect(){arcs=[]},beginPath(){},arc(x,y,r){arcs.push({x,y,r})},fill(){},moveTo(){},lineTo(){},stroke(){}};
 const section={box:{top:height*2,bottom:height*4},getBoundingClientRect(){return this.box}};
 const universe={hidden:false};
 const node=tag=>({tag,style:style(),classList:{add(){},remove(){}},setAttribute(){},getContext:()=>ctx});
 const doc={hidden:false,body:{prepend(...n){nodes.push(...n)},append(){}},createElement:node,
  getElementById:id=>id==='universe'&&app?universe:id==='worlds'&&app?section:null,
  querySelector:selector=>selector==='.home-six-waves,.deeper-entrances'&&!app?section:null,
  querySelectorAll:()=>[],addEventListener(k,fn){docListeners[k]=fn}};
 const media={matches:reduced,addEventListener(k,fn){this.changed=fn}};
 const math=Object.create(Math);math.random=()=>.5;
 const context={document:doc,window:{},matchMedia:q=>q.includes('prefers-reduced')?media:{matches:fine},innerWidth:width,innerHeight:height,devicePixelRatio:2,Math:math,
  MutationObserver:class{constructor(fn){observer=fn}observe(){}},setTimeout(){},clearTimeout(){},
  requestAnimationFrame(fn){frames.set(++next,fn);return next},cancelAnimationFrame(id){frames.delete(id)},addEventListener(k,fn){listeners[k]=fn}};
 vm.runInNewContext(read('hq-portals.js'),context);
 return {listeners,docListeners,doc,media,section,universe,frames,canvas:nodes.find(n=>n.className==='portal-stars'),wave:nodes.find(n=>n.className==='portal-wave-backdrop'),get arcs(){return arcs},frame(t){const [id,fn]=frames.entries().next().value;frames.delete(id);fn(t)},mutate(){observer()}};
}
test('denser desktop stars retain bounded mobile and retina rendering budgets',()=>{
 const desktop=starScene();assert.equal(desktop.arcs.length,1400);assert.equal(desktop.canvas.width,2880);
 const mobile=starScene({fine:false,width:390,height:844});assert.equal(mobile.arcs.length,274);assert.ok(mobile.arcs.length<=320);
});
test('cursor moves nearby stars away and leaving allows them to settle back',()=>{
 const s=starScene({width:1200,height:800}),initial=s.arcs[0].x;
 s.listeners.pointermove({clientX:620,clientY:400,pointerType:'mouse'});
 for(let i=1;i<=20;i++)s.frame(i*33);
 const displaced=s.arcs[0].x;assert.ok(displaced<initial-20);
 s.docListeners.pointerleave();for(let i=21;i<=80;i++)s.frame(i*33);
 assert.ok(Math.abs(s.arcs[0].x-initial)<Math.abs(displaced-initial)/5);
});
test('Great Wave is absent at the globe and enters behind the Waves selector',()=>{
 const s=starScene();assert.equal(s.wave.style.values['--wave-presence'],'0.000');
 s.section.box={top:80,bottom:2400};s.listeners.scroll();assert.equal(s.wave.style.values['--wave-presence'],'0.820');
 s.section.box={top:-2200,bottom:-50};s.listeners.scroll();assert.equal(s.wave.style.values['--wave-presence'],'0.000');
});
test('reduced motion keeps static stars and an accessible static Waves background',()=>{
 const s=starScene({reduced:true});assert.equal(s.frames.size,0);
 s.section.box={top:50,bottom:2400};s.listeners.scroll();assert.equal(s.wave.style.values['--wave-presence'],'0.820');
 assert.equal(s.wave.style.values['--wave-x'],'0.00px');
});
test('app experience hides the HQ ocean backdrop and restores it on return',()=>{
 const s=starScene({app:true});s.section.box={top:50,bottom:2400};s.listeners.scroll();
 assert.equal(s.wave.style.values['--wave-presence'],'0.820');s.universe.hidden=true;s.mutate();assert.equal(s.wave.style.values['--wave-presence'],'0.000');
 s.universe.hidden=false;s.mutate();assert.equal(s.wave.style.values['--wave-presence'],'0.820');
});
