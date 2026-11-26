/* Shared touch/pen input for every portal. No pressure sensor is required. */
(function (root) {
  function attach(art, button, {start, move, stop}, clock = root) {
    let press = null, timer = 0, suppressUntil = 0;
    const now = () => clock.performance.now();
    const nativeTouch = typeof clock.TouchEvent !== 'undefined';
    function cancel() {
      clock.clearTimeout(timer);
      if (press) { suppressUntil = now() + 700; stop(); }
      press = null;
    }
    if (nativeTouch) {
      const contact = e => Array.from(e.touches || []).find(t => t.identifier === press?.id);
      art.addEventListener('touchstart', e => {
        if (e.touches.length !== 1) { cancel(); return; }
        cancel(); suppressUntil = 0;
        const t=e.touches[0];
        press={id:t.identifier,x:t.clientX,y:t.clientY,latest:t,peeking:false};
        timer=clock.setTimeout(()=>{if(press){press.peeking=true;start(press.latest)}},220);
      }, {passive:true});
      art.addEventListener('touchmove', e => {
        if (!press) return;
        if (e.touches.length !== 1) { cancel(); return; }
        const t=contact(e); if(!t){cancel();return} press.latest=t;
        if (press.peeking) {
          if (e.cancelable) e.preventDefault();
          move(t);
        } else if(Math.hypot(t.clientX-press.x,t.clientY-press.y)>10) cancel();
      }, {passive:false});
      art.addEventListener('touchend', e => {
        if (!press || contact(e)) return;
        clock.clearTimeout(timer);
        if(press.peeking){suppressUntil=now()+700;stop()}
        press=null;
      }, {passive:true});
      art.addEventListener('touchcancel',cancel,{passive:true});
    }
    art.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
      if (nativeTouch && e.pointerType === 'touch') return;
      if (e.isPrimary === false) { cancel(); return; }
      cancel(); suppressUntil = 0;
      press = {id:e.pointerId, x:e.clientX, y:e.clientY, latest:e, peeking:false};
      timer = clock.setTimeout(() => {
        if (!press) return;
        press.peeking = true;
        start(press.latest);
      }, 220);
    }, {passive:true});
    art.addEventListener('pointermove', e => {
      if (!press || press.id !== e.pointerId) return;
      press.latest = e;
      if (!press.peeking) {
        if (Math.hypot(e.clientX-press.x,e.clientY-press.y) > 10) cancel();
      } else move(e);
    }, {passive:true});
    art.addEventListener('pointerup', e => {
      if (!press || press.id !== e.pointerId) return;
      clock.clearTimeout(timer);
      if (press.peeking) { suppressUntil = now() + 700; stop(); }
      press = null;
    }, {passive:true});
    art.addEventListener('pointercancel', e => {if(!(nativeTouch&&e.pointerType==='touch'))cancel()}, {passive:true});
    art.addEventListener('pointerleave', e => { if (e.pointerType !== 'mouse' && !(nativeTouch&&e.pointerType==='touch')) cancel(); }, {passive:true});
    art.addEventListener('contextmenu', e => {
      if (press || now() < suppressUntil) e.preventDefault();
    });
    button.addEventListener('click', e => {
      // Browser compatibility click after a hold must not enter the world.
      // Keyboard activation remains available even just after a cancelled touch.
      if (e.detail !== 0 && now() < suppressUntil) {
        e.preventDefault(); e.stopImmediatePropagation();
      }
    }, true);
    return {cancel};
  }
  root.OLAPressPeek = Object.freeze({attach});
  if (typeof module !== 'undefined') module.exports = {attach};
})(typeof window !== 'undefined' ? window : globalThis);
