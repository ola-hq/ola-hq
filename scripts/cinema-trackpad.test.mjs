import test from 'node:test';
import assert from 'node:assert/strict';
import {CinemaTrackpad,trackpadDelta} from '../la-ola-cinema-club/assets/cinema-trackpad.js';
function fixture(run){
 const stage=new EventTarget();stage.clientHeight=800;stage.clientWidth=1200;
 const document=new EventTarget();document.hidden=false;globalThis.document=document;
 const media={matches:true};globalThis.matchMedia=()=>media;
 const viewer={stage,dialog:new EventTarget(),pointers:new Map(),scale:1,panX:0,panY:0,rotZ:0,clearPhotoTap(){},paint(){this.painted=(this.painted||0)+1},zoom(value,{keepPan}){assert.equal(keepPan,true);this.scale=Math.max(1,Math.min(3,value));this.paint()}};
 viewer.dialog.open=true;viewer.dialog.dataset={};const trackpad=new CinemaTrackpad(viewer);
 const send=(type,props={},target=stage)=>{const e=new Event(type,{cancelable:true});Object.assign(e,props);target.dispatchEvent(e);return e;};
 try{run({viewer,trackpad,send,media,document});}finally{trackpad.destroy();delete globalThis.document;delete globalThis.matchMedia;}
}
test('trackpad delta units preserve pixels, normalize lines/pages and reject nonfinite movement',()=>{
 assert.deepEqual(trackpadDelta({deltaMode:0,deltaX:12,deltaY:-30},800),{x:12,y:-30});
 assert.deepEqual(trackpadDelta({deltaMode:1,deltaX:2,deltaY:-3},800),{x:32,y:-48});
 assert.deepEqual(trackpadDelta({deltaMode:2,deltaX:1,deltaY:-1},800),{x:800,y:-800});
 assert.deepEqual(trackpadDelta({deltaMode:0,deltaX:NaN,deltaY:Infinity},800),{x:0,y:0});
});
test('desktop two-finger scrolling pans directly, persists on release and keeps the card recoverable',()=>fixture(({viewer,send,trackpad})=>{
 const event=send('wheel',{deltaMode:0,deltaX:75,deltaY:-40});assert.equal(event.defaultPrevented,true);
 assert.equal(viewer.panX,-75);assert.equal(viewer.panY,40);assert.equal(viewer.dialog.dataset.trackpad,'true');
 trackpad.cancel();assert.equal(viewer.panX,-75);assert.equal(viewer.dialog.dataset.trackpad,'false');
 send('wheel',{deltaX:100000,deltaY:-100000});assert.equal(viewer.panX,-540);assert.equal(viewer.panY,360);
}));
test('trackpad pinch zooms within the existing card range while retaining its position',()=>fixture(({viewer,send})=>{
 viewer.panX=100;viewer.panY=-50;send('wheel',{ctrlKey:true,deltaY:-10000});assert.equal(viewer.scale,3);
 send('wheel',{ctrlKey:true,deltaY:10000});assert.equal(viewer.scale,1);assert.equal(viewer.panX,100);assert.equal(viewer.panY,-50);
}));
test('Safari cumulative scale/rotation is applied once and duplicate wheel input is suppressed',()=>fixture(({viewer,send})=>{
 viewer.scale=1.2;viewer.rotZ=10;
 send('wheel',{deltaY:4});send('gesturestart');send('gesturechange',{scale:1.5,rotation:20});assert.ok(Math.abs(viewer.scale-1.8)<1e-10);assert.equal(viewer.rotZ,30);
 send('wheel',{ctrlKey:true,deltaY:-100});assert.ok(Math.abs(viewer.scale-1.8)<1e-10);
 send('gesturechange',{scale:2,rotation:30});assert.ok(Math.abs(viewer.scale-2.4)<1e-10);assert.equal(viewer.rotZ,40);
 send('gestureend');send('wheel',{ctrlKey:true,deltaY:-100});assert.ok(Math.abs(viewer.scale-2.4)<1e-10);assert.equal(viewer.dialog.dataset.trackpad,'false');
}));
test('inactive, touch/coarse, busy, pointer-owned and form input stays with its original interaction',()=>fixture(({viewer,trackpad,send,media,document})=>{
 for(const key of ['turning','browsing','flipped','exitWaiting']){viewer[key]=true;assert.equal(send('wheel',{deltaY:20}).defaultPrevented,false);viewer[key]=false;}
 viewer.dialog.open=false;assert.equal(send('wheel',{deltaY:20}).defaultPrevented,false);viewer.dialog.open=true;
 media.matches=false;assert.equal(send('wheel',{deltaY:20}).defaultPrevented,false);media.matches=true;
 document.hidden=true;assert.equal(send('wheel',{deltaY:20}).defaultPrevented,false);document.hidden=false;
 viewer.pointers.set(1,{});assert.equal(send('gesturestart').defaultPrevented,false);assert.equal(send('wheel',{deltaY:20}).defaultPrevented,false);viewer.pointers.clear();
 assert.equal(trackpad.accepts({target:{closest:()=>true}}),false);assert.equal(viewer.panY,0);
}));
test('close, hidden document and destroy cancel active input and remove wheel/gesture listeners',()=>fixture(({viewer,trackpad,send,document})=>{
 send('gesturestart');send('close',{},viewer.dialog);assert.equal(trackpad.gesture,null);
 send('gesturestart');document.hidden=true;document.dispatchEvent(new Event('visibilitychange'));assert.equal(trackpad.gesture,null);document.hidden=false;
 send('wheel',{deltaY:10});trackpad.destroy();const y=viewer.panY;
 assert.equal(send('wheel',{deltaY:100}).defaultPrevented,false);send('gesturestart');send('gesturechange',{scale:2});assert.equal(viewer.panY,y);assert.equal(trackpad.gesture,null);assert.equal(trackpad.timer,0);
}));
