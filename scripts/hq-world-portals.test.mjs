import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../hq-world-portals.js',import.meta.url),'utf8');
function runtime({key='cinema',saved=null,reduced=false,target='',loaded=true,width=390}={}){
 const tasks=[],frames=[],overlays=[],animations=[],callbacks=[];let removed=0;
 const rect={x:100,y:150,width:500,height:280};
 const ctx=new Proxy({}, {get:(_,key)=>key==='createRadialGradient'?()=>({addColorStop(){}}):()=>{}});
 const node=()=>({children:[],style:{},classList:{add(){}},setAttribute(){},addEventListener(){},append(...nodes){this.children.push(...nodes)},remove(){removed++},getContext:()=>ctx,getAnimations:()=>[],animate(keys,options){let resolve;const a={owner:this,keys,options,finished:new Promise(r=>{resolve=r}),resolve:()=>resolve(),cancel(){}};animations.push(a);return a}});
 const art={...node(),getBoundingClientRect:()=>rect};
 const img={src:'https://example.test/ola-hq/assets/portals-20261124/'+key+'.jpg',currentSrc:'',getAttribute:()=>'/ola-hq/assets/portals-20261124/'+key+'.jpg',closest:()=>art,getBoundingClientRect:()=>rect};
 const card={...node(),target,getAttribute:name=>name==='data-hq-portal'&&key==='deeper'?'deeper':null,querySelector:()=>img};
 const document={currentScript:{src:'https://example.test/ola-hq/hq-world-portals.js'},hidden:false,body:{append(n){overlays.push(n)}},createElement:()=>node(),querySelectorAll(selector){return selector.includes('a.room')?[card]:[]},querySelector:()=>null,addEventListener(){}};
 const window={OLAPressPeek:{attach(a,b,cb){callbacks.push(cb);return {cancel(){}}}}};
 const context={document,window,URL,Image:class{complete=loaded;naturalWidth=loaded?100:0},matchMedia:()=>({matches:reduced,addEventListener(){}}),localStorage:{getItem:()=>saved,setItem(){}},WeakMap,Map,Math,performance:{now:()=>0},innerWidth:width,innerHeight:844,devicePixelRatio:2,requestAnimationFrame(fn){frames.push(fn);return frames.length},cancelAnimationFrame(){},setTimeout(fn){tasks.push(fn);return tasks.length},clearTimeout(){},addEventListener(){}};
 vm.runInNewContext(source,context);
 return {api:window.OLAPortals,card,callbacks,art,tasks,overlays,animations,frames,get removed(){return removed}};
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
 const lens=r.art.children[0];assert.equal(lens.style.width,'136px');
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
  const lens=r.art.children[0];assert.ok(lens.style.backgroundImage.includes(key+'-destination.webp'));
  const [w,h]=lens.style.backgroundSize.split(' ').map(parseFloat);assert.ok(Math.abs(w/h-1333/926)<.00001);
  const position=lens.style.backgroundPosition;
  r.callbacks[0].move({clientX:330,clientY:340});r.frames.at(-1)(450);assert.notEqual(lens.style.backgroundPosition,position);
  r.api.enter(r.card,()=>{});const arrival=r.overlays[0].children[0];
  assert.ok(arrival.style.backgroundImage.includes(key+'-destination-mobile.webp'));
  const [aw,ah]=arrival.style.backgroundSize.split(' ').map(parseFloat);assert.ok(Math.abs(aw/ah-375/844)<.00001);
 });
}
test('desktop page arrival keeps landscape proportions rather than stretching it square',()=>{
 const r=runtime({key:'polaroid',width:1333});r.api.enter(r.card,()=>{});
 const scene=r.overlays[0].children[0];assert.ok(scene.style.backgroundImage.includes('polaroid-destination.webp'));
 assert.equal(scene.style.backgroundSize,'1333px 926px');
});

test('Deeper Waves is a collective portal with a real-destination transition',()=>{
 const r=runtime({key:'deeper',width:1200});r.callbacks[0].start({clientX:250,clientY:300});r.frames[0](350);
 assert.ok(r.art.children[0].style.backgroundImage.includes('deeper-destination.webp'));
 let entered=0;r.api.enter(r.card,()=>entered++);assert.equal(r.animations[0].options.duration,2000);r.tasks[0]();assert.equal(entered,1);
});
test('surprise entry can start at the globe instead of an offscreen card',()=>{
 const r=runtime({key:'wave26'});assert.equal(r.api.primeOrigin(r.card,{x:190,y:340}),true);assert.equal(r.api.primeOrigin(r.card,{x:NaN,y:0}),false);assert.equal(r.api.primeOrigin({}, {x:10,y:10}),false);r.api.enter(r.card,()=>{});assert.ok(r.animations[0].keys[0].clipPath.includes('190px 340px'));
});

test('mystical sparks remain outside the clipped destination on mobile and desktop',()=>{for(const width of [390,1333]){const r=runtime({width,key:'wave26'});r.api.primeOrigin(r.card,{x:width/2,y:400});r.api.enter(r.card,()=>{});const overlay=r.overlays[0],scene=overlay.children[0],canvas=overlay.children[1];assert.equal(r.animations[0].owner,scene);assert.equal(overlay.style.background,'transparent');assert.equal(r.animations.some(a=>a.owner===overlay||a.owner===canvas),false);assert.ok(r.animations[0].keys[0].clipPath.includes('400px'))}});
