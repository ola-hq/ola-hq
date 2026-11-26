import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../hq-world-portals.js',import.meta.url),'utf8');
function runtime({key='cinema',saved=null,reduced=false,target='',loaded=true}={}){
 const tasks=[],frames=[],overlays=[],animations=[],callbacks=[];let removed=0;
 const rect={x:100,y:150,width:500,height:280};
 const ctx=new Proxy({}, {get:(_,key)=>key==='createRadialGradient'?()=>({addColorStop(){}}):()=>{}});
 const node=()=>({children:[],style:{},classList:{add(){}},setAttribute(){},addEventListener(){},append(...nodes){this.children.push(...nodes)},remove(){removed++},getContext:()=>ctx,getAnimations:()=>[],animate(keys,options){let resolve;const a={keys,options,finished:new Promise(r=>{resolve=r}),resolve:()=>resolve(),cancel(){}};animations.push(a);return a}});
 const art={...node(),getBoundingClientRect:()=>rect};
 const img={src:'https://example.test/ola-hq/assets/portals-20261124/'+key+'.jpg',currentSrc:'',getAttribute:()=>'/ola-hq/assets/portals-20261124/'+key+'.jpg',closest:()=>art,getBoundingClientRect:()=>rect};
 const card={...node(),target,querySelector:()=>img};
 const document={currentScript:{src:'https://example.test/ola-hq/hq-world-portals.js'},hidden:false,body:{append(n){overlays.push(n)}},createElement:()=>node(),querySelectorAll(selector){return selector.includes('a.room')?[card]:[]},querySelector:()=>null,addEventListener(){}};
 const window={OLAPressPeek:{attach(a,b,cb){callbacks.push(cb);return {cancel(){}}}}};
 const context={document,window,URL,Image:class{complete=loaded;naturalWidth=loaded?100:0},matchMedia:()=>({matches:reduced,addEventListener(){}}),localStorage:{getItem:()=>saved,setItem(){}},WeakMap,Map,Math,performance:{now:()=>0},innerWidth:390,innerHeight:844,devicePixelRatio:2,requestAnimationFrame(fn){frames.push(fn);return frames.length},cancelAnimationFrame(){},setTimeout(fn){tasks.push(fn);return tasks.length},clearTimeout(){},addEventListener(){}};
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
