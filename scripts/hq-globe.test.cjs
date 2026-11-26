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
function continuousModel(){const {decode}=require('../hq-globe-model.js'),b=fs.readFileSync(path.join(__dirname,'../assets/models/ola-hq-continuous-globe-v3.glb'));return decode(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength))}
test('the active globe has one closed opaque body and a separate sculpted gold orbit',()=>{
 const m=continuousModel();assert.equal(m.primitives.length,2);assert.equal(m.json.extras.continuousBody,true);
 const original=fs.readFileSync(path.join(__dirname,'../assets/entrances/ola-hq-floating-hero-20261007.webp'));
 assert.equal(m.json.extras.originalSourceSHA256,require('node:crypto').createHash('sha256').update(original).digest('hex'));
 assert.equal(m.images[0].mimeType,'image/webp');assert.equal(Buffer.from(m.images[0].bytes).subarray(12,16).toString(),'VP8 ');
 for(const mat of m.json.materials)assert.equal(mat.alphaMode,'OPAQUE');
 for(const p of m.primitives){const n=p.positions.length/3;assert.equal(p.uv.length,n*2);assert.equal(p.normals.length,n*3);assert.equal(p.indices.length%3,0);assert.ok(p.low.length<=p.indices.length);for(const i of [...p.indices,...p.low])assert.ok(i<n);for(let i=0;i<n;i++){assert.ok([...p.positions.subarray(i*3,i*3+3)].every(Number.isFinite));assert.ok(Math.abs(Math.hypot(...p.normals.subarray(i*3,i*3+3))-1)<.02)}}
});
test('the body is a watertight sphere with no cap boundary or disconnected seam',()=>{
 const p=continuousModel().primitives[0],vertices=new Map(),ids=new Map(),edges=new Map();
 for(const i of new Set(p.indices)){const xyz=[...p.positions.subarray(i*3,i*3+3)];assert.ok(Math.abs(Math.hypot(...xyz)-.87)<1e-6);const key=xyz.map(v=>Math.round(v*1e5)).join(',');if(!vertices.has(key))vertices.set(key,vertices.size);ids.set(i,vertices.get(key))}
 for(let f=0;f<p.indices.length;f+=3){const tri=[...p.indices.subarray(f,f+3)].map(i=>ids.get(i));assert.equal(new Set(tri).size,3);for(let k=0;k<3;k++){const a=tri[k],b=tri[(k+1)%3],key=a<b?a+':'+b:b+':'+a;edges.set(key,(edges.get(key)||0)+1)}}
 for(const count of edges.values())assert.equal(count,2);assert.equal(vertices.size-edges.size+p.indices.length/3,2);
});
test('full spins and extreme tilts remain opaque through the entire body',()=>{
 const {software}=require('../hq-globe-model.js'),m=continuousModel(),tex=(r,g,b)=>({width:1,height:1,data:new Uint8ClampedArray([r,g,b,255])}),render=software(m,[tex(20,90,100),tex(218,175,87)]),size=64,radius=size*.93*.77/2;
 for(let a=0;a<24;a++)for(const pitch of [-1.2,-.8,-.4,0,.4,.8,1.2]){const pixels=render(size,a*Math.PI/12,pitch);for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(Math.hypot(x+.5-size/2,y+.5-size/2)<radius)assert.equal(pixels[(y*size+x)*4+3],255,`hole at yaw ${a}, pitch ${pitch}, ${x}/${y}`)}
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
