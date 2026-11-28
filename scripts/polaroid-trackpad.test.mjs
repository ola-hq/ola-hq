import test from 'node:test';
import assert from 'node:assert/strict';
import {PolaroidTrackpad,trackpadDelta} from '../our-polaroid-project/trackpad.js';
function fixture(run){
 const names=['document','window','matchMedia','setTimeout','clearTimeout'],saved=names.map(n=>Object.getOwnPropertyDescriptor(globalThis,n));let now=1000,id=0;const timers=new Map();
 const document=new EventTarget();document.hidden=false;const window=new EventTarget(),media={matches:true};
 Object.assign(globalThis,{document,window,matchMedia:()=>media,setTimeout:(fn,delay)=>{timers.set(++id,{fn,at:now+delay});return id;},clearTimeout:key=>timers.delete(key)});
 const stage=new EventTarget();Object.assign(stage,{clientWidth:1200,clientHeight:800});const dialog=new EventTarget();Object.assign(dialog,{open:true,dataset:{}});
 const viewer={stage,dialog,immersive:true,physicalCard:true,items:[{id:'a'},{id:'b'},{id:'c'}],index:1,pointers:new Map(),scale:1,panX:0,panY:0,rotZ:0,orientation:0,moves:[],clearPhotoTap(){this.cleared=true},paint(){this.paints=(this.paints||0)+1},zoom(value,{keepPan}){assert.equal(keepPan,true);this.scale=Math.max(1,Math.min(3,value));this.paint()},move(delta){this.moves.push(delta);this.index=(this.index+delta+3)%3;this.trackpad.cancel();this.reset()},reset(){this.trackpad.cancel();this.panX=this.panY=this.rotZ=0;this.scale=1}};
 const trackpad=viewer.trackpad=new PolaroidTrackpad(viewer);
 const advance=ms=>{now+=ms;for(const [key,t] of [...timers])if(t.at<=now){timers.delete(key);t.fn();}};
 const send=(type,props={},target=stage)=>{const e=new Event(type,{cancelable:true});Object.assign(e,props);Object.defineProperty(e,'timeStamp',{value:now});target.dispatchEvent(e);return e;};
 const wheel=(x,y=0,extra={},dt=16)=>{advance(dt);return send('wheel',{deltaX:x,deltaY:y,deltaMode:0,...extra})};
 try{return run({viewer,trackpad,send,wheel,advance,media,document,window,timers});}finally{trackpad.destroy();names.forEach((n,i)=>saved[i]?Object.defineProperty(globalThis,n,saved[i]):delete globalThis[n]);}
}
test('Polaroid trackpad normalizes finite pixel/line/page deltas',()=>{
 assert.deepEqual(trackpadDelta({deltaX:4,deltaY:-3},800),{x:4,y:-3});assert.deepEqual(trackpadDelta({deltaMode:1,deltaX:2,deltaY:3},800),{x:32,y:48});assert.deepEqual(trackpadDelta({deltaMode:2,deltaX:2,deltaY:-1},800),{x:800,y:-800});assert.deepEqual(trackpadDelta({deltaX:NaN,deltaY:Infinity},800),{x:0,y:0});
});
test('deliberate horizontal trackpad swipe browses in screen space at any card rotation and zoom',()=>{
 for(const rotation of [0,90,180,270])for(const direction of [-1,1])fixture(({viewer,wheel})=>{viewer.orientation=rotation;viewer.rotZ=13;viewer.scale=2;for(let i=0;i<4;i++)wheel(direction*30,2);assert.deepEqual(viewer.moves,[direction]);assert.equal(viewer.orientation,rotation);assert.equal(viewer.index,direction===1?2:0)});
});
test('inertia cannot browse twice even after move/show/reset; a new quiet-separated stroke rearms',()=>fixture(({viewer,wheel,advance})=>{
 for(let i=0;i<4;i++)wheel(30);for(let i=0;i<40;i++)wheel(i%2?80:-80);assert.deepEqual(viewer.moves,[1]);advance(221);for(let i=0;i<4;i++)wheel(-30);assert.deepEqual(viewer.moves,[1,-1]);
}));
test('slow horizontal positioning persists without browsing; Shift always allows fast positioning',()=>fixture(({viewer,wheel,advance})=>{
 viewer.rotZ=37;for(let i=0;i<6;i++)wheel(20,0,{},100);advance(221);assert.equal(viewer.panX,-120);assert.equal(viewer.rotZ,37);assert.deepEqual(viewer.moves,[]);wheel(200,0,{shiftKey:true});assert.equal(viewer.panX,-320);assert.deepEqual(viewer.moves,[]);
}));
test('vertical and diagonal trackpad movement only pans and remains recoverable',()=>fixture(({viewer,wheel})=>{
 for(let i=0;i<8;i++)wheel(50,45);assert.deepEqual(viewer.moves,[]);assert.equal(viewer.panX,-400);assert.equal(viewer.panY,-360);wheel(0,10000);assert.equal(viewer.panY,-360);
}));
test('Option/Alt trackpad rotation changes only the angle and retains scale/position',()=>fixture(({viewer,wheel,advance})=>{
 viewer.panX=40;viewer.panY=-80;viewer.scale=1.7;viewer.rotZ=15;wheel(100,0,{altKey:true});assert.equal(viewer.rotZ,-30);wheel(-200,0,{altKey:true});advance(221);assert.equal(viewer.rotZ,60);assert.equal(viewer.panX,40);assert.equal(viewer.panY,-80);assert.equal(viewer.scale,1.7);assert.deepEqual(viewer.moves,[]);
}));
test('Ctrl-wheel pinch retains position, stays in existing zoom bounds and never browses',()=>fixture(({viewer,wheel})=>{
 viewer.panX=40;viewer.panY=-80;wheel(200,-800,{ctrlKey:true});assert.equal(viewer.scale,3);wheel(200,800,{ctrlKey:true});assert.equal(viewer.scale,1);assert.equal(viewer.panX,40);assert.equal(viewer.panY,-80);assert.deepEqual(viewer.moves,[]);
}));
test('native Safari cumulative twist/pinch applies once and suppresses duplicate wheel input',()=>fixture(({viewer,send,wheel})=>{
 viewer.rotZ=10;viewer.scale=1.2;send('gesturestart');send('gesturechange',{rotation:35,scale:1.5});assert.equal(viewer.rotZ,45);assert.ok(Math.abs(viewer.scale-1.8)<1e-9);wheel(200,-200,{ctrlKey:true});assert.equal(viewer.rotZ,45);assert.ok(Math.abs(viewer.scale-1.8)<1e-9);send('gesturechange',{rotation:-25,scale:2});assert.equal(viewer.rotZ,-15);assert.ok(Math.abs(viewer.scale-2.4)<1e-9);send('gestureend');wheel(200,-200,{ctrlKey:true});assert.ok(Math.abs(viewer.scale-2.4)<1e-9);assert.deepEqual(viewer.moves,[]);
}));
test('changing modifiers or collection item cancels classification rather than finishing a stale swipe',()=>fixture(({viewer,wheel,advance})=>{
 wheel(60);wheel(60,0,{altKey:true});assert.deepEqual(viewer.moves,[]);advance(221);wheel(60);viewer.index=2;wheel(60);assert.deepEqual(viewer.moves,[]);
}));
test('pointer-owned, hidden, closed and coarse/touch input is left to existing controls',()=>fixture(({viewer,wheel,media,document})=>{
 viewer.pointers.set(1,{});assert.equal(wheel(200).defaultPrevented,false);viewer.pointers.clear();media.matches=false;assert.equal(wheel(200).defaultPrevented,false);media.matches=true;document.hidden=true;assert.equal(wheel(200).defaultPrevented,false);document.hidden=false;viewer.dialog.open=false;assert.equal(wheel(200).defaultPrevented,false);assert.deepEqual(viewer.moves,[]);
}));
test('busy animation consumes wheel without scrolling/navigating; editable/control targets remain alone',()=>fixture(({viewer,wheel,trackpad})=>{
 for(const key of ['turning','browsing','exitWaiting']){viewer[key]=true;assert.equal(wheel(200).defaultPrevented,true);viewer[key]=false;}assert.deepEqual(viewer.moves,[]);assert.equal(trackpad.accepts({target:{closest:()=>true}}),false);
}));
test('reset, close, blur, hidden and destroy clear input without restoring an old pose or item',()=>fixture(({viewer,trackpad,send,wheel,advance,window,document,timers})=>{
 for(const kind of ['reset','close','blur','hidden']){advance(221);wheel(40);if(kind==='reset')viewer.reset();else if(kind==='close')send('close',{},viewer.dialog);else if(kind==='blur')window.dispatchEvent(new Event('blur'));else{document.hidden=true;document.dispatchEvent(new Event('visibilitychange'));document.hidden=false;}wheel(100);assert.deepEqual(viewer.moves,[],kind);assert.equal(trackpad.session,null,kind);}
 advance(221);send('gesturestart');trackpad.destroy();const z=viewer.rotZ;send('gesturechange',{rotation:90,scale:2});assert.equal(wheel(200).defaultPrevented,false);assert.equal(viewer.rotZ,z);assert.equal(timers.size,0);assert.equal(trackpad.gesture,null);
}));
