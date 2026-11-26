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
test('the portable GLB contains real finite indexed geometry and unit normals',()=>{
 const file=fs.readFileSync(path.join(__dirname,'../assets/models/ola-hq-ocean-globe-v1.glb'));
 assert.equal(file.readUInt32LE(0),0x46546c67);assert.equal(file.readUInt32LE(4),2);assert.equal(file.readUInt32LE(8),file.length);
 const length=file.readUInt32LE(12),model=JSON.parse(file.subarray(20,20+length).toString()),binary=28+length;
 const [position,normal,color,index]=model.accessors,vertex=model.bufferViews[0],tri=model.bufferViews[1];
 assert.ok(position.count>1000);assert.equal(position.count,normal.count);assert.equal(color.count,position.count);assert.equal(index.count%3,0);
 for(let i=0;i<position.count;i++){const at=binary+vertex.byteOffset+i*vertex.byteStride,p=[0,4,8].map(o=>file.readFloatLE(at+o)),n=[12,16,20].map(o=>file.readFloatLE(at+o));assert.ok(p.every(Number.isFinite));assert.ok(Math.hypot(...p)<1.5);assert.ok(Math.abs(Math.hypot(...n)-1)<.02)}
 for(let i=0;i<index.count;i++)assert.ok(file.readUInt16LE(binary+tri.byteOffset+i*2)<position.count);
});
