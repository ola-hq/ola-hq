const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
async function audit(reduced,{hidden=false,inView=true,stopAfterRelease=false,telemetryThrows=false}={}){
 const travel=[];let now=100,id=0,paints=0;const frames=new Map(),timers=new Map();
 class Target{constructor(){this.listeners={};this.dataset={};this.style={setProperty(){}};this.classList={add(){},remove(){},toggle(){}}}addEventListener(n,f){(this.listeners[n]||=[]).push(f)}removeEventListener(){}setAttribute(){}getAttribute(){return null}querySelectorAll(){return []}getBoundingClientRect(){return {x:100,y:100,width:244,height:244}}append(e){e.ownerDocument=doc;if(e.className==='hq-globe-canvas')this.canvas=e}setPointerCapture(){}releasePointerCapture(){}emit(n,e){for(const f of this.listeners[n]||[])f(e)}}
 const doc=new Target(),anchor=new Target();anchor.ownerDocument=doc;doc.hidden=hidden;doc.currentScript={src:'https://test.invalid/hq-globe.js'};doc.createElement=()=>{const e=new Target();e.getContext=n=>n==='webgl'?null:{putImageData(){paints++}};return e};doc.querySelectorAll=s=>s==='.portal-globe-door,#hero-world-jump'?[anchor]:[];
 const env={URL,console,Uint8ClampedArray,Float32Array,ImageData:class{},TouchEvent:class{},performance:{now:()=>now},document:doc,location:{href:'https://test.invalid/'},devicePixelRatio:3,
 requestAnimationFrame(fn){frames.set(++id,fn);return id},cancelAnimationFrame(id){frames.delete(id)},setTimeout(fn,ms){timers.set(++id,{fn,at:now+ms});return id},clearTimeout(id){timers.delete(id)},
 matchMedia(){return {matches:reduced,addEventListener(){}}},IntersectionObserver:class{constructor(fn){this.fn=fn}observe(){this.fn([{isIntersecting:inView}])}},addEventListener(){},fetch:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(0)}),
 OLACosmos:{travel(a,b,ms){if(telemetryThrows)throw Error("Observer unavailable");travel.push({a,b,ms})}},
 OLAGlobeModel:{decode:()=>({model:{},images:[]}),software:()=>()=>new Uint8ClampedArray(0)}};
 env.window=env;vm.createContext(env);for(const f of ['hq-globe-input.js','hq-globe-motion.js','hq-globe.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),env,{filename:f});
 for(let n=0;n<8;n++)await Promise.resolve();if(anchor.dataset.globe3d!=='ready')throw Error('Runtime setup failed');
 function advance(ms){now+=ms;const batch=[...frames];frames.clear();for(const [,fn]of batch)fn(now)}
 function touch(type,x,y){const p={identifier:7,clientX:x,clientY:y},e={timeStamp:now,cancelable:true,preventDefault(){},touches:type==='touchend'?[]:[p],changedTouches:[p]};doc.emit(type,e);anchor.emit(type,e)}
 const before=anchor.canvas.dataset.orientation;touch('touchstart',100,100);now+=20;touch('touchmove',130,120);advance(50);const held=anchor.canvas.dataset.orientation;now+=20;touch('touchend',160,150);advance(50);const postA=anchor.canvas.dataset.orientation;if(stopAfterRelease)touch('touchstart',160,150);advance(80);const postB=anchor.canvas.dataset.orientation;
 return {reduceMotion:reduced,rotatesWhileHeld:held!==before,oldCheckWouldPass:postA!==held,postReleaseContinues:postA!==postB,orientationAfterRelease:[postA,postB],renderCalls:paints,travel};
}
module.exports={audit};
