const {test} = require('node:test');
const assert = require('node:assert/strict');
const {attach} = require('../hq-press-peek.js');
class Target {
  listeners = {};
  addEventListener(name, fn) { (this.listeners[name] ||= []).push(fn); }
  emit(name, values = {}) {
    const e = {pointerType:'touch',isPrimary:true,pointerId:1,clientX:100,clientY:100,detail:1,
      prevented:false, stopped:false, preventDefault(){this.prevented=true},
      stopImmediatePropagation(){this.stopped=true}, ...values};
    for (const fn of this.listeners[name] || []) { fn(e); if (e.stopped) break; }
    return e;
  }
}
function setup(nativeTouch=false) {
  let time=0, next=0; const timers=new Map(), calls=[];
  const clock={performance:{now:()=>time},setTimeout(fn,ms){timers.set(++next,{fn,at:time+ms});return next},clearTimeout(id){timers.delete(id)}};
  if(nativeTouch)clock.TouchEvent=function(){};
  const art=new Target(),button=new Target();
  const controller=attach(art,button,{start:()=>calls.push('peek'),move:()=>calls.push('move'),stop:()=>calls.push('stop')},clock);
  return {art,button,calls,controller,tick(ms){time+=ms;for(const [id,t] of timers){if(t.at<=time){timers.delete(id);t.fn()}}}};
}
test('quick tap gives immediate feedback and still enters normally',()=>{
  const h=setup();h.art.emit('pointerdown');h.tick(100);h.art.emit('pointerup');h.tick(200);
  assert.deepEqual(h.calls,['peek','stop']);assert.equal(h.button.emit('click').prevented,false);
});
test('hold reveals, movement explores, release closes and suppresses accidental entry',()=>{
  const h=setup();h.art.emit('pointerdown');h.tick(220);h.art.emit('pointermove',{clientX:130});h.art.emit('pointerup');
  assert.deepEqual(h.calls,['peek','move','stop']);assert.equal(h.button.emit('click').prevented,true);
});
test('vertical scroll closes immediate feedback and does not enter',()=>{
  const h=setup();h.art.emit('pointerdown');h.art.emit('pointermove',{clientY:125});h.tick(300);h.art.emit('pointerup');
  assert.deepEqual(h.calls,['peek','stop']);assert.equal(h.button.emit('click').prevented,true);
});
test('browser pointer cancellation closes a peek and prevents navigation',()=>{
  const h=setup();h.art.emit('pointerdown');h.tick(250);h.art.emit('pointercancel');
  assert.deepEqual(h.calls,['peek','stop']);assert.equal(h.button.emit('click').prevented,true);
});
test('global scroll or pinch cancellation removes pending hold',()=>{
  const h=setup();h.art.emit('pointerdown');h.controller.cancel();h.tick(500);
  assert.deepEqual(h.calls,['peek','stop']);
});
test('a new intentional tap works immediately after a hold',()=>{
  const h=setup();h.art.emit('pointerdown');h.tick(250);h.art.emit('pointerup');h.button.emit('click');
  h.art.emit('pointerdown');h.tick(50);h.art.emit('pointerup');assert.equal(h.button.emit('click').prevented,false);
});
test('keyboard activation is not swallowed after a touch hold',()=>{
  const h=setup();h.art.emit('pointerdown');h.tick(250);h.art.emit('pointerup');
  assert.equal(h.button.emit('click',{detail:0}).prevented,false);
});
test('mouse input remains under the desktop hover handler',()=>{
  const h=setup();h.art.emit('pointerdown',{pointerType:'mouse'});h.tick(300);
  assert.deepEqual(h.calls,[]);assert.equal(h.button.emit('click').prevented,false);
});
test('native context menu is prevented only during or just after a touch peek',()=>{
  const h=setup();assert.equal(h.art.emit('contextmenu').prevented,false);h.art.emit('pointerdown');h.tick(250);
  assert.equal(h.art.emit('contextmenu').prevented,true);h.art.emit('pointerup');h.tick(800);
  assert.equal(h.art.emit('contextmenu').prevented,false);
});

test('Safari hold can drag in two dimensions without giving the gesture to scrolling',()=>{
 const h=setup(true),t={identifier:3,clientX:100,clientY:100};
 h.art.emit('touchstart',{touches:[t]});h.tick(230);
 const e=h.art.emit('touchmove',{touches:[{...t,clientX:130,clientY:145}],cancelable:true});
 assert.equal(e.prevented,true);assert.deepEqual(h.calls,['peek','move']);
 h.art.emit('touchend',{touches:[]});assert.equal(h.button.emit('click').prevented,true);
});
test('Safari swipe before hold keeps native scrolling',()=>{
 const h=setup(true),t={identifier:3,clientX:100,clientY:100};h.art.emit('touchstart',{touches:[t]});
 const e=h.art.emit('touchmove',{touches:[{...t,clientY:125}],cancelable:true});h.tick(300);
 assert.equal(e.prevented,false);assert.deepEqual(h.calls,['peek','stop']);
});
test('Safari pinch cancels peek and permits native zoom',()=>{
 const h=setup(true),t={identifier:3,clientX:100,clientY:100};h.art.emit('touchstart',{touches:[t]});h.tick(250);
 const e=h.art.emit('touchmove',{touches:[t,{identifier:4,clientX:150,clientY:150}],cancelable:true});
 assert.equal(e.prevented,false);assert.deepEqual(h.calls,['peek','stop']);
});
test('Safari touch does not also start the pointer-event handler',()=>{
 const h=setup(true);h.art.emit('pointerdown');h.tick(300);assert.deepEqual(h.calls,[]);
});

for (const nativeTouch of [false,true]) {
 const label=nativeTouch?'Safari touch':'pointer fallback';
 const begin=h=>nativeTouch?h.art.emit('touchstart',{touches:[{identifier:3,clientX:100,clientY:100}]}):h.art.emit('pointerdown');
 const drag=(h,x,y)=>nativeTouch?h.art.emit('touchmove',{touches:[{identifier:3,clientX:x,clientY:y}],cancelable:true}):h.art.emit('pointermove',{clientX:x,clientY:y,cancelable:true});
 const end=h=>nativeTouch?h.art.emit('touchend',{touches:[]}):h.art.emit('pointerup');
 test(label+': first contact reveals without waiting for a special press',()=>{
  const h=setup(nativeTouch);begin(h);assert.deepEqual(h.calls,['peek']);h.tick(80);end(h);
  assert.deepEqual(h.calls,['peek','stop']);assert.equal(h.button.emit('click').prevented,false);
 });
 test(label+': horizontal exploration works before the hold threshold',()=>{
  const h=setup(nativeTouch);begin(h);h.tick(40);const e=drag(h,125,104);end(h);
  assert.equal(e.prevented,true);assert.deepEqual(h.calls,['peek','move','stop']);assert.equal(h.button.emit('click').prevented,true);
 });
 test(label+': small diagonal hand jitter does not abandon the preview',()=>{
  const h=setup(nativeTouch);begin(h);const early=drag(h,110,111);h.tick(160);const held=drag(h,120,140);end(h);
  assert.equal(early.prevented,false);assert.equal(held.prevented,true);
  assert.deepEqual(h.calls,['peek','move','move','stop']);assert.equal(h.button.emit('click').prevented,true);
 });
 test(label+': a vertical swipe remains native and cancels the hold timer',()=>{
  const h=setup(nativeTouch);begin(h);const e=drag(h,102,125);h.tick(300);end(h);
  assert.equal(e.prevented,false);assert.deepEqual(h.calls,['peek','stop']);assert.equal(h.button.emit('click').prevented,true);
 });
}
