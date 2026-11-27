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
function continuousModel(){const {decode}=require('../hq-globe-model.js'),b=fs.readFileSync(path.join(__dirname,'../assets/models/ola-hq-sculpted-globe-v7.glb'));return decode(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength))}
test('the active globe has one closed body, floating marquee and separate raised wave curls',()=>{
 const m=continuousModel();assert.equal(m.primitives.length,4);assert.equal(m.json.extras.continuousBody,true);
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
 const {software}=require('../hq-globe-model.js'),m=continuousModel(),tex=(r,g,b)=>({width:1,height:1,data:new Uint8ClampedArray([r,g,b,255])}),render=software(m,[tex(20,90,100),tex(218,175,87),tex(240,220,180),tex(246,223,174)]),size=64,radius=size*.80*.77/2;
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
function gestureHarness(native=false){let now=0,id=0;const timers=new Map(),e=new Target(),moves=[],flings=[];let enters=0,surprises=0;
 const clock={...(native?{TouchEvent:class{}}:{}),performance:{now:()=>now},setTimeout(fn,delay){timers.set(++id,{at:now+delay,fn});return id},clearTimeout(id){timers.delete(id)}};
 const c=attach(e,{press(){},rotate:(x,y)=>moves.push([x,y]),release:(x,y)=>flings.push([x,y]),reset(){},activate:()=>enters++,surprise:()=>surprises++},clock);
 function advance(ms){now+=ms;for(const [id,t]of [...timers])if(t.at<=now){timers.delete(id);t.fn()}}
 function tap(){e.emit('pointerdown');e.emit('pointerup');return e.emit('click')}
 return {e,c,tap,advance,moves,flings,get enters(){return enters},get surprises(){return surprises}};
}
test('native mouse/link dragging is cancelled while modified links stay available',()=>{const h=gestureHarness();assert.equal(h.e.emit('pointerdown',{pointerType:'mouse'}).prevented,true);assert.equal(h.e.emit('dragstart').prevented,true);h.e.emit('pointermove',{clientX:160});h.e.emit('pointerup');assert.equal(h.e.emit('click').prevented,true);assert.equal(h.e.emit('click',{ctrlKey:true}).prevented,false);h.advance(1000);assert.equal(h.enters,0)});
test('a single or double tap enters exactly once after the triple-tap window',()=>{for(const count of [1,2]){const h=gestureHarness();for(let i=0;i<count;i++){h.tap();h.advance(100)}assert.equal(h.enters,0);h.advance(321);assert.equal(h.enters,1);assert.equal(h.surprises,0)}});
test('triple tap opens one surprise and never also enters Waves',()=>{const h=gestureHarness();h.tap();h.advance(100);h.tap();h.advance(100);h.tap();h.advance(1000);assert.equal(h.enters,0);assert.equal(h.surprises,1)});
test('starting a drag or cancelling clears pending delayed entry',()=>{const h=gestureHarness();h.tap();h.advance(100);h.e.emit('pointerdown');h.advance(400);assert.equal(h.enters,0);h.e.emit('pointermove',{clientY:150});h.e.emit('pointerup');h.e.emit('click');h.advance(500);assert.equal(h.enters,0);h.tap();h.c.cancel();h.advance(500);assert.equal(h.enters,0)});
test('trackpad wheel rotates in either axis while pinch keeps browser zoom',()=>{const h=gestureHarness();const e=h.e.emit('wheel',{deltaX:10,deltaY:20,deltaMode:0});assert.equal(e.prevented,true);assert.deepEqual(h.moves,[[6,12]]);h.advance(100);assert.ok(h.flings.at(-1)[1]>0);assert.equal(h.e.emit('wheel',{deltaX:0,deltaY:20,deltaMode:0,ctrlKey:true}).prevented,false)});
test('keyboard surprise and immediate keyboard entry stay accessible',()=>{const h=gestureHarness();assert.equal(h.e.emit('keydown',{key:'r'}).prevented,true);assert.equal(h.surprises,1);assert.equal(h.e.emit('click',{detail:0}).prevented,false);h.c.destroy()});
test('quaternion bearing rotates over both poles without a pitch clamp or scale drift',()=>{const {create}=require('../hq-globe-motion.js'),b=create();for(let i=0;i<100;i++)b.rotate(10,20);assert.ok(b.pitch>Math.PI*4);assert.ok(Math.abs(Math.hypot(...b.orientation)-1)<1e-10);const m=b.matrix;for(let i=0;i<3;i++)assert.ok(Math.abs(Math.hypot(m[i*3],m[i*3+1],m[i*3+2])-1)<1e-6);b.reset();assert.deepEqual(b.orientation,[0,0,0,1])});
test('bearing momentum persists and decays consistently across frame rates',()=>{const {create}=require('../hq-globe-motion.js'),a=create(),b=create();a.release(6,3);b.release(6,3);for(let i=0;i<60;i++)a.step(1000/60);for(let i=0;i<30;i++)b.step(1000/30);assert.ok(a.moving);assert.ok(Math.abs(a.yaw-b.yaw)<1e-8);assert.ok(Math.abs(a.pitch-b.pitch)<1e-8);a.stop();assert.equal(a.moving,false)});
test('quaternion and matrix transforms agree with known quarter turns',()=>{const {create}=require('../hq-globe-motion.js'),{transformMatrix}=require('../hq-globe-model.js'),b=create();b.rotate((Math.PI/2)/.014,0);const p=transformMatrix(new Float32Array([0,0,1]),b.matrix,new Float32Array(3));assert.ok(Math.abs(p[0]-1)<1e-6);assert.ok(Math.abs(p[2])<1e-6)});
test('HD rendering retains a bounded software-motion fallback',()=>{const {resolution,choose}=require('../hq-globe-motion.js');assert.equal(resolution(180,3,false,true),1080);assert.equal(resolution(180,3,true,true),480);assert.equal(resolution(180,3,true,false),1440);assert.equal(resolution(800,3,false,false),2048);assert.equal(choose([],()=>0),null);assert.equal(choose(['a','b'],()=>.99),'b')});

test('marquee is physically above the closed sphere and has solid depth',()=>{const m=continuousModel();assert.equal(m.json.extras.bodyHasPaintedLettering,false);assert.ok(m.json.extras.marqueeDepth>=.07);const letters=m.primitives[2];for(const i of new Set(letters.indices))assert.ok(letters.positions[i*3+2]>.95);assert.ok(m.primitives[3].indices.length>1000);assert.ok(m.json.extras.waveRelief>=.1)});
test('touch flick retains both-axis momentum after a stationary final event',()=>{const h=controls();h.e.emit('pointerdown');h.tick(20);h.e.emit('pointermove',{clientX:120,clientY:110});h.tick(20);h.e.emit('pointermove',{clientX:150,clientY:140});h.tick(30);h.e.emit('pointermove',{clientX:150,clientY:140});h.tick(20);h.e.emit('pointerup');assert.ok(h.releases.at(-1)[0]>15);assert.ok(h.releases.at(-1)[1]>10);assert.equal(h.e.emit('click').prevented,true)});
test('touch flick handles infrequent Safari move samples without losing release',()=>{const h=controls();h.e.emit('pointerdown');h.tick(110);h.e.emit('pointermove',{clientX:160,clientY:160});h.e.emit('pointerup');assert.ok(h.releases.at(-1)[0]>0);assert.ok(h.releases.at(-1)[1]>0)});
test('touch hold and cancellation never fling a stale gesture',()=>{for(const end of ['pointerup','pointercancel']){const h=controls();h.e.emit('pointerdown');h.tick(20);h.e.emit('pointermove',{clientX:160});h.tick(200);h.e.emit('pointermove',{clientX:160});h.e.emit(end);assert.deepEqual(h.releases.at(-1),[0,0])}});

function touch(h,type,points=[]){return h.e.emit(type,{touches:points.map(([x,y,id=7])=>({identifier:id,clientX:x,clientY:y}))})}
test('Safari native touch rotates both axes despite pointer cancellation and retains fling',()=>{const h=gestureHarness(true);touch(h,'touchstart',[[100,100]]);h.e.emit('pointercancel');h.advance(20);const move=touch(h,'touchmove',[[140,130]]);assert.equal(move.prevented,true);h.advance(20);touch(h,'touchmove',[[160,160]]);touch(h,'touchend');assert.deepEqual(h.moves,[[40,30],[20,30]]);assert.ok(h.flings.at(-1)[0]>0);assert.ok(h.flings.at(-1)[1]>0);assert.equal(h.e.emit('click',{detail:0}).prevented,true);h.advance(1000);assert.equal(h.enters,0)});
test('Safari native triple tap opens one surprise and suppresses compatibility clicks even with detail zero',()=>{const h=gestureHarness(true);for(let i=0;i<3;i++){touch(h,'touchstart',[[100,100]]);touch(h,'touchend');assert.equal(h.e.emit('click',{detail:0}).prevented,true);h.advance(80)}h.advance(1000);assert.equal(h.surprises,1);assert.equal(h.enters,0)});
test('Safari native single tap commits once while double tap also enters only once',()=>{for(const n of [1,2]){const h=gestureHarness(true);for(let i=0;i<n;i++){touch(h,'touchstart',[[100,100]]);touch(h,'touchend');h.e.emit('click');h.advance(80)}h.advance(321);assert.equal(h.enters,1);assert.equal(h.surprises,0)}});
test('Safari native pinch and cancellation cannot spin or open a stale world',()=>{for(const cancel of ['touchcancel','pinch']){const h=gestureHarness(true);touch(h,'touchstart',[[100,100]]);h.advance(20);touch(h,'touchmove',[[150,130]]);if(cancel==='pinch')touch(h,'touchstart',[[150,130],[200,200,8]]);else touch(h,'touchcancel');touch(h,'touchend');h.advance(1000);assert.deepEqual(h.flings.at(-1),[0,0]);assert.equal(h.enters,0);assert.equal(h.surprises,0)}});
test('Safari native compatibility mouse cannot cancel the pending single tap and keyboard entry stays available',()=>{const h=gestureHarness(true);touch(h,'touchstart',[[100,100]]);touch(h,'touchend');assert.equal(h.e.emit('pointerdown',{pointerType:'mouse'}).prevented,true);h.advance(321);assert.equal(h.enters,1);h.e.emit('keydown',{key:'Enter'});assert.equal(h.e.emit('click',{detail:0}).prevented,false)});
test('active body bake excludes the transparent horizon and rear projection',()=>{const m=continuousModel();assert.equal(m.json.extras.alphaSafeBody,true);assert.deepEqual(m.json.extras.blendNormalZ,[.05,.25]);assert.ok(m.json.extras.sourceFit.radius>0)});

test('the reference front survives ordinary 253-alpha source pixels',()=>{const m=continuousModel();assert.equal(m.json.extras.cleanAlphaThreshold,.90);assert.ok(m.json.extras.referenceFrontCoverage>.99);assert.deepEqual(m.json.extras.textureSize,[4096,2048])});
