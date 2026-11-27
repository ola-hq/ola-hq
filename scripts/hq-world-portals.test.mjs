import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../hq-world-portals.js',import.meta.url),'utf8');
function runtime({key='cinema',portalKeys=null,saved=null,reduced=false,target='',loaded=true,width=390,suffix='',preview=false}={}){
 const tasks=[],frames=[],overlays=[],animations=[],callbacks=[],nodes=[],events={};let removed=0;
 const ctx=new Proxy({}, {get:(_,key)=>key==='createRadialGradient'?()=>({addColorStop(){}}):()=>{}});
 const node=()=>{const listeners={};const n={children:[],style:{},dataset:{},listeners,classList:{add(){},remove(){}},setAttribute(k,v){this[k]=v},addEventListener(k,fn){listeners[k]=fn},append(...items){this.children.push(...items)},remove(){removed++},getContext:()=>ctx,getAnimations:()=>[],animate(keys,options){let resolve;const a={owner:this,keys,options,finished:new Promise(r=>{resolve=r}),resolve:()=>resolve(),cancel(){}};animations.push(a);return a}};nodes.push(n);return n};
 const selected=portalKeys||[key],region={getBoundingClientRect:()=>({x:80,y:120,width:540,height:selected.length*360})};
 const entries=selected.map((key,i)=>{const rect={x:100,y:150+i*360,width:500,height:280};const art={...node(),getBoundingClientRect:()=>rect};const img={src:'https://example.test/ola-hq/assets/portals-20261124/'+key+'.jpg'+suffix,currentSrc:'',getAttribute:()=>'/ola-hq/assets/portals-20261124/'+key+'.jpg'+suffix,closest:()=>art,getBoundingClientRect:()=>rect};const card={...node(),target,getAttribute:name=>name==='data-hq-portal'&&key==='deeper'?'deeper':null,querySelector:()=>img,closest:selector=>selector==='.room'?null:region};return {art,card,rect}});
 const document={currentScript:{src:'https://example.test/ola-hq/hq-world-portals.js'},hidden:false,body:{append(n){if(n.className==='ola-world-entry')overlays.push(n)}},createElement:()=>node(),querySelectorAll(selector){return selector.includes('a.room')?entries.map(e=>e.card):[]},querySelector:()=>null,addEventListener(k,fn){events[k]=fn}};
 const window={OLAPressPeek:{attach(a,b,cb){callbacks.push(cb);return {cancel(){}}}},addEventListener(k,fn){events[k]=fn}};
 const context={document,window,location:new URL('https://example.test/ola-hq/'+(preview?'?olaPortalPreview=1':'')),URL,Image:class{complete=loaded;naturalWidth=loaded?100:0},matchMedia:q=>({matches:q.includes('pointer: fine')?true:reduced,addEventListener(){}}),localStorage:{getItem:()=>saved,setItem(){}},WeakMap,Map,Math,performance:{now:()=>0},innerWidth:width,innerHeight:844,devicePixelRatio:2,requestAnimationFrame(fn){frames.push(fn);return frames.length},cancelAnimationFrame(){},setTimeout(fn){tasks.push(fn);return tasks.length},clearTimeout(){},addEventListener(k,fn){events[k]=fn}};
 vm.runInNewContext(source,context);
 return {api:window.OLAPortals,card:entries[0].card,callbacks,art:entries[0].art,entries,events,document,nodes,tasks,overlays,animations,frames,get lens(){return nodes.find(n=>n.className==='ola-peek-lens')},get stage(){return nodes.find(n=>n.className==='ola-peek-stage')},get pages(){return nodes.filter(n=>n.className==='ola-peek-page')},get removed(){return removed}};
}

test('approved full default animates Cinema handoff even when the device prefers reduced motion',()=>{
 const r=runtime({reduced:true});let entered=0;r.api.enter(r.card,()=>entered++);
 assert.equal(r.animations[0].options.duration,750);assert.equal(entered,0);r.tasks[0]();assert.equal(entered,1);
});
test('other worlds retain the approved cinematic duration; saved Gentle stays gentle',()=>{
 const full=runtime({key:'wave26'});full.api.enter(full.card,()=>{});assert.equal(full.animations[0].options.duration,2000);
 const gentle=runtime({saved:'gentle'});gentle.api.enter(gentle.card,()=>{});assert.equal(gentle.animations[0].options.duration,180);
});
test('rapid clicks and animation/timer completion cannot navigate twice',async()=>{
 const r=runtime();let entered=0;r.api.enter(r.card,()=>entered++);r.api.enter(r.card,()=>entered++);assert.equal(r.overlays.length,1);
 r.animations[0].resolve();await Promise.resolve();r.tasks[0]();assert.equal(entered,1);assert.equal(r.removed,1);
});
test('external new-tab doors keep synchronous navigation and no overlay',()=>{
 const r=runtime({key:'homebase',target:'_blank'});let entered=0;r.api.enter(r.card,()=>entered++);assert.equal(entered,1);assert.equal(r.overlays.length,0);
});
test('unmapped community door keeps its existing callback',()=>{
 const r=runtime({key:'what-wave'});let entered=0;r.api.enter(r.card,()=>entered++);assert.equal(entered,1);assert.equal(r.overlays.length,0);
});
test('small touch aperture samples the whole fixed scene rather than a miniature',()=>{
 const r=runtime();r.callbacks[0].start({clientX:250,clientY:300});r.frames[0](350);
 const lens=r.lens;assert.equal(lens.style.width,'136px');
 const sampled=()=>({x:Number(lens.style.transform.match(/translate\(([-.0-9]+)px/)[1])+Number(lens.style.backgroundPosition.split(' ')[0].replace('px','')),y:Number(lens.style.transform.match(/,([-.0-9]+)px/)[1])+Number(lens.style.backgroundPosition.split(' ')[1].replace('px',''))});
 const first=sampled();r.callbacks[0].move({clientX:330,clientY:340});r.frames.at(-1)(450);
 assert.deepEqual(sampled(),first);assert.equal(lens.style.backgroundSize,'500px 500px');

});
test('missing or slow interior never prevents reaching the real destination',()=>{
 const r=runtime({loaded:false});let entered=0;r.api.enter(r.card,()=>entered++);r.tasks[0]();assert.equal(entered,1);
});
test('all public shell entrypoints load the shared controller in order',()=>{
 for(const file of ['index.html','more-waves.html','app/index.html']){
  const html=readFileSync(new URL('../'+file,import.meta.url),'utf8');
  assert.ok(html.indexOf('hq-portals.js?')<html.indexOf('hq-press-peek.js?'));
  assert.ok(html.indexOf('hq-press-peek.js?')<html.indexOf('hq-world-portals.js?'));
 }
 for(const file of ['interior-atlas.webp','interior-refinements.webp','cinema-interior.webp'])assert.ok(existsSync(new URL('../assets/portal-interiors-20261125/'+file,import.meta.url)));
 assert.equal(source.includes('INTERIOR CONCEPT'),false);
});

for(const key of ['polaroid','fpl','simulation']){
 test(key+': peek uses a correctly proportioned destination scene and mobile arrival uses the responsive page',()=>{
  const r=runtime({key});r.callbacks[0].start({clientX:250,clientY:300});r.frames[0](350);
  const lens=r.lens;assert.ok(lens.style.backgroundImage.includes(key==='polaroid'?'milky-way-great-wave-landscape-v47.jpg':key+'-destination.webp'));
  const [w,h]=lens.style.backgroundSize.split(' ').map(parseFloat);assert.ok(Math.abs(w/h-(key==='polaroid'?1536/1024:1333/926))<.00001);
  const position=lens.style.backgroundPosition;
  r.callbacks[0].move({clientX:330,clientY:340});r.frames.at(-1)(450);assert.notEqual(lens.style.backgroundPosition,position);
  r.api.enter(r.card,()=>{});const arrival=r.overlays[0].children[0];
  assert.ok(arrival.style.backgroundImage.includes(key==='polaroid'?'milky-way-great-wave-portrait-v47.jpg':key+'-destination-mobile.webp'));
  const [aw,ah]=arrival.style.backgroundSize.split(' ').map(parseFloat);assert.ok(Math.abs(aw/ah-(key==='polaroid'?1024/1536:375/844))<.00001);
 });
}
test('desktop page arrival keeps landscape proportions rather than stretching it square',()=>{
 const r=runtime({key:'polaroid',width:1536});r.api.enter(r.card,()=>{});
 const scene=r.overlays[0].children[0];assert.ok(scene.style.backgroundImage.includes('milky-way-great-wave-landscape-v47.jpg'));
 assert.equal(scene.style.backgroundSize,'1536px 1024px');
});

test('Deeper Waves is a collective portal with a real-destination transition',()=>{
 const r=runtime({key:'deeper',width:1200});r.callbacks[0].start({clientX:250,clientY:300});r.frames[0](350);
 assert.ok(r.lens.style.backgroundImage.includes('deeper-destination.webp'));
 let entered=0;r.api.enter(r.card,()=>entered++);assert.equal(r.animations[0].options.duration,2000);r.tasks[0]();assert.equal(entered,1);
});
test('surprise entry can start at the globe instead of an offscreen card',()=>{
 const r=runtime({key:'wave26'});assert.equal(r.api.primeOrigin(r.card,{x:190,y:340}),true);assert.equal(r.api.primeOrigin(r.card,{x:NaN,y:0}),false);assert.equal(r.api.primeOrigin({}, {x:10,y:10}),false);r.api.enter(r.card,()=>{});assert.ok(r.animations[0].keys[0].clipPath.includes('190px 340px'));
});

test('mystical sparks remain outside the clipped destination on mobile and desktop',()=>{for(const width of [390,1333]){const r=runtime({width,key:'wave26'});r.api.primeOrigin(r.card,{x:width/2,y:400});r.api.enter(r.card,()=>{});const overlay=r.overlays[0],scene=overlay.children[0],canvas=overlay.children[1];assert.equal(r.animations[0].owner,scene);assert.equal(overlay.style.background,'transparent');assert.equal(r.animations.some(a=>a.owner===overlay||a.owner===canvas),false);assert.ok(r.animations[0].keys[0].clipPath.includes('400px'))}});

test('versioned portal images retain canonical identity and Cinema keeps its own handoff',()=>{const p=runtime({key:'polaroid',suffix:'?v=cosmic49#art'});p.api.enter(p.card,()=>{});assert.equal(p.overlays.length,1);assert.ok(p.overlays[0].children[0].style.backgroundImage.includes('/ola-hq/our-polaroid-project/assets/space/milky-way-great-wave-portrait-v47.jpg'));const c=runtime({key:'cinema',suffix:'?v=49'});c.api.enter(c.card,()=>{});assert.equal(c.animations[0].options.duration,750);assert.ok(c.overlays[0].children[0].style.backgroundImage.includes('cinema-interior.webp'));});


test('one mouse aperture crosses Polaroid gaps in both directions and loads the real neighboring pages',()=>{
 const r=runtime({portalKeys:['cinema','polaroid','la-ola'],width:1200});const move=y=>r.events.pointermove({pointerType:'mouse',clientX:300,clientY:y});
 move(600);assert.equal(r.pages.length,1);assert.ok(r.pages.at(-1).src.includes('/our-polaroid-project/?olaPortalPreview=1'));assert.equal(r.stage.hidden,false);
 move(820);assert.equal(r.pages.length,1);assert.equal(r.stage.hidden,false);
 move(900);assert.equal(r.pages.length,2);assert.ok(r.pages.at(-1).src.includes('/la-ola-de-amor/?olaPortalPreview=1'));
 move(820);move(600);assert.ok(r.pages.at(-1).src.includes('/our-polaroid-project/'));
 const count=r.pages.length;move(460);assert.equal(r.pages.length,count);assert.equal(r.stage.hidden,false);
 move(300);assert.ok(r.pages.at(-1).src.includes('/la-ola-cinema-club/'));
 move(50);assert.equal(r.stage.hidden,true);assert.equal(r.overlays.length,0);
});
test('held touch can hand the same aperture to another world without navigation',()=>{
 const r=runtime({portalKeys:['cinema','polaroid','la-ola']});r.callbacks[1].start({clientX:300,clientY:600});
 r.callbacks[1].move({clientX:300,clientY:820});assert.equal(r.pages.length,1);assert.equal(r.stage.hidden,false);
 r.callbacks[1].move({clientX:300,clientY:900});assert.ok(r.pages.at(-1).src.includes('/la-ola-de-amor/'));assert.equal(r.overlays.length,0);r.callbacks[1].stop();assert.equal(r.stage.hidden,true);
});
test('live website frame is inert, allows no autoplay and uses art until loaded; stale callbacks cannot revive it',()=>{
 const r=runtime({key:'polaroid'});r.callbacks[0].start({clientX:250,clientY:300});const page=r.pages[0];
 assert.equal(page.style.opacity,'0');assert.equal(page.tabindex,'-1');assert.equal(page['aria-hidden'],'true');assert.equal(page.inert,'');assert.ok(page.allow.includes("autoplay 'none'"));assert.equal(page.sandbox,'allow-scripts allow-same-origin');assert.equal(page.dataset.olaPortalPreview,'true');
 page.listeners.load();assert.equal(page.style.opacity,'1');r.events.blur();assert.equal(r.stage.hidden,true);page.style.opacity='0';page.listeners.load();assert.equal(page.style.opacity,'0');r.frames[0](500);assert.equal(r.stage.hidden,true);
});
test('gated and external portal previews never load an iframe',()=>{
 for(const key of ['homebase','arsenal-academy-clubhouse']){const r=runtime({key});r.callbacks[0].start({clientX:250,clientY:300});assert.equal(r.pages.length,0)}
});
test('all local public portals use their own actual website; previews cannot recursively create portals',()=>{
 const pages={polaroid:'our-polaroid-project/',cinema:'la-ola-cinema-club/','la-ola':'la-ola-de-amor/',wave26:'wave-26.html',fpl:'fpl-wave.html',simulation:'simulation-wave/',gdb:'gdb-university/',arsenal:'arsenal-wave.html',offbrand:'offbrand-wave.html',willpwr:'willpwr-wave.html','wu-wei':'wu-wei-wave.html',capybara:'capybara-wave.html',deeper:'more-waves.html'};
 for(const [key,path] of Object.entries(pages)){const r=runtime({key});r.callbacks[0].start({clientX:250,clientY:300});assert.equal(new URL(r.pages[0].src).pathname,'/ola-hq/'+path)}
 const r=runtime({preview:true});assert.equal(r.api,undefined);assert.equal(r.callbacks.length,0);assert.equal(r.nodes.length,2);
});
test('Gentle gap motion updates without a perpetual animation loop; Escape clears the live frame',()=>{
 const r=runtime({saved:'gentle',portalKeys:['cinema','polaroid']});r.events.pointermove({pointerType:'mouse',clientX:300,clientY:300});assert.equal(r.frames.length,0);const p=r.pages[0];p.listeners.load();r.events.pointermove({pointerType:'mouse',clientX:300,clientY:460});assert.equal(r.stage.hidden,false);r.events.keydown({key:'Escape'});assert.equal(r.stage.hidden,true);assert.equal(r.overlays.length,0);
});
