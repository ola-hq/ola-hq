const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {attach}=require('../hq-globe-input.js');
class Target{
 listeners={};addEventListener(n,fn){(this.listeners[n]||=[]).push(fn)}removeEventListener(n,fn){this.listeners[n]=(this.listeners[n]||[]).filter(f=>f!==fn)}
 setPointerCapture(){}releasePointerCapture(){}
 emit(n,extra={}){const e={pointerId:1,isPrimary:true,pointerType:'touch',button:0,clientX:100,clientY:100,detail:1,cancelable:true,prevented:false,stopped:false,preventDefault(){this.prevented=true},stopImmediatePropagation(){this.stopped=true},...extra};for(const fn of this.listeners[n]||[]){fn(e);if(e.stopped)break}return e}
}
function controls(){let time=0;const e=new Target(),moves=[],releases=[];let resets=0;const c=attach(e,{rotate:(x,y)=>moves.push([x,y]),release:(x,y)=>releases.push([x,y]),reset:()=>resets++},{performance:{now:()=>time}});return {e,c,moves,releases,get resets(){return resets},tick(t){time+=t}}}
test('tap keeps the native globe entrance available',()=>{const h=controls();h.e.emit('pointerdown');h.tick(50);h.e.emit('pointerup');assert.equal(h.e.emit('click').prevented,false);assert.equal(h.moves.length,0)});
test('drag rotates and cannot accidentally trigger fast-travel on release',()=>{const h=controls();h.e.emit('pointerdown');h.tick(16);h.e.emit('pointermove',{clientX:140,clientY:120});h.e.emit('pointerup');assert.deepEqual(h.moves,[[40,20]]);assert.ok(h.releases[0][0]>0);assert.equal(h.e.emit('click').prevented,true)});
test('a deliberate tap immediately after a spin can still enter',()=>{const h=controls();h.e.emit('pointerdown');h.e.emit('pointermove',{clientX:140});h.e.emit('pointerup');h.e.emit('click');h.e.emit('pointerdown');h.e.emit('pointerup');assert.equal(h.e.emit('click').prevented,false)});
test('small hand jitter still counts as a tap',()=>{const h=controls();h.e.emit('pointerdown');h.e.emit('pointermove',{clientX:103,clientY:102});h.e.emit('pointerup');assert.equal(h.moves.length,0);assert.equal(h.e.emit('click').prevented,false)});
test('holding the globe still before release removes momentum',()=>{const h=controls();h.e.emit('pointerdown');h.e.emit('pointermove',{clientX:140});h.tick(200);h.e.emit('pointerup');assert.deepEqual(h.releases.at(-1),[0,0])});
test('pointer cancellation stops interaction without accidental entry',()=>{const h=controls();h.e.emit('pointerdown');h.e.emit('pointermove',{clientX:140});h.e.emit('pointercancel');assert.deepEqual(h.releases.at(-1),[0,0]);assert.equal(h.e.emit('click').prevented,true)});
test('keyboard rotation and reset preserve Enter activation',()=>{const h=controls();assert.equal(h.e.emit('keydown',{key:'ArrowRight'}).prevented,true);assert.deepEqual(h.moves,[[16,0]]);h.e.emit('keydown',{key:'Home'});assert.equal(h.resets,1);assert.equal(h.e.emit('click',{detail:0}).prevented,false)});
test('modifier clicks and renderer teardown retain the native link fallback',()=>{const h=controls();h.e.emit('pointerdown',{ctrlKey:true});assert.equal(h.e.emit('click').prevented,false);h.c.destroy();h.e.emit('pointerdown');h.e.emit('pointermove',{clientX:160});assert.equal(h.moves.length,0);assert.equal(h.e.emit('click').prevented,false)});
test('the original-logo GLB embeds unchanged front artwork on curved textured geometry',()=>{
 const {decode}=require('../hq-globe-model.js');
 const file=fs.readFileSync(path.join(__dirname,'../assets/models/ola-hq-original-relief-v2.glb'));
 const m=decode(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength));
 assert.equal(m.primitives.length,3);
 const original=fs.readFileSync(path.join(__dirname,'../assets/entrances/ola-hq-floating-hero-20261007.webp'));
 assert.deepEqual(Buffer.from(m.images[0].bytes),original);
 for(const p of m.primitives){
  const n=p.positions.length/3;assert.ok(n>1000);assert.equal(p.uv.length,n*2);assert.equal(p.normals.length,n*3);
  assert.equal(p.indices.length%3,0);assert.ok(p.low.length<p.indices.length);
  for(const i of [...p.indices,...p.low])assert.ok(i<n);
  for(let i=0;i<n;i++){const point=p.positions.subarray(i*3,i*3+3),normal=p.normals.subarray(i*3,i*3+3);assert.ok([...point].every(Number.isFinite));assert.ok(Math.hypot(...point)<1.5);assert.ok(Math.abs(Math.hypot(...normal)-1)<.02)}
 }
 const p=m.primitives[0],zs=Array.from(p.positions).filter((v,i)=>i%3===2);assert.ok(Math.max(...zs)-Math.min(...zs)>.8);
});
test('the rest-view projection preserves the original image coordinates',()=>{
 const {decode,transform}=require('../hq-globe-model.js'),file=fs.readFileSync(path.join(__dirname,'../assets/models/ola-hq-original-relief-v2.glb'));
 const m=decode(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength)),p=m.primitives[0],xyz=transform(p.positions,0,0,new Float32Array(p.positions.length));
 for(const i of new Set(p.indices)){assert.ok(Math.abs((xyz[i*3]+1)/2-p.uv[i*2])<1e-6);assert.ok(Math.abs((1-xyz[i*3+1])/2-p.uv[i*2+1])<1e-6)}
});
test('software rendering respects texture alpha, front culling and depth occlusion',()=>{
 const {software}=require('../hq-globe-model.js');
 const tri={positions:new Float32Array([-.7,-.7,.5,.7,-.7,.5,0,.7,.5]),uv:new Float32Array([0,0,1,0,.5,1]),low:new Uint16Array([0,1,2]),material:0};
 const tex=(r,g,b,a=255)=>({width:1,height:1,data:new Uint8ClampedArray([r,g,b,a])});
 let render=software({primitives:[tri]},[tex(200,40,10)]),pixels=render(32,0,0);const at=(16*32+16)*4;
 assert.equal(pixels[at+3],255);assert.ok(pixels[at]>150);assert.equal(render(32,Math.PI,0)[at+3],0);
 assert.equal(software({primitives:[tri]},[tex(255,255,255,0)])(32,0,0)[at+3],0);
 const back={...tri,positions:Float32Array.from(tri.positions,(v,i)=>i%3===2?-.5:v),material:1};
 pixels=software({primitives:[tri,back]},[tex(200,40,10),tex(0,255,0)])(32,0,0);assert.ok(pixels[at]>150);assert.ok(pixels[at+1]<60);
});
