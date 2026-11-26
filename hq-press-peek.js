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
    function commit() {
      clock.clearTimeout(timer);
      if (press) press.peeking = true;
    }
    function begin(id, point) {
      cancel(); suppressUntil = 0;
      press = {id, x:point.clientX, y:point.clientY, latest:point, peeking:false};
      // Feedback starts on contact; a quick tap still enters the world.
      start(point);
      timer = clock.setTimeout(commit,160);
    }
    function explore(point, event) {
      press.latest = point;
      if (!press.peeking) {
        const dx=Math.abs(point.clientX-press.x),dy=Math.abs(point.clientY-press.y);
        // A normal vertical swipe belongs to the page. Horizontal exploration
        // can start immediately, without a precisely timed long press.
        if (dy>14 && dy>dx*1.15) { cancel(); return; }
        if (dx>8 && dx>dy*1.15) commit();
      }
      if (press.peeking && event.cancelable) event.preventDefault();
      move(point);
    }
    function release() {
      clock.clearTimeout(timer);
      if (press.peeking) suppressUntil = now() + 700;
      stop(); press = null;
    }
    if (nativeTouch) {
      const contact = e => Array.from(e.touches || []).find(t => t.identifier === press?.id);
      art.addEventListener('touchstart', e => {
        if (e.touches.length !== 1) { cancel(); return; }
        const t=e.touches[0]; begin(t.identifier,t);
      }, {passive:true});
      art.addEventListener('touchmove', e => {
        if (!press) return;
        if (e.touches.length !== 1) { cancel(); return; }
        const t=contact(e); if(!t){cancel();return}
        explore(t,e);
      }, {passive:false});
      art.addEventListener('touchend', e => {
        if (press && !contact(e)) release();
      }, {passive:true});
      art.addEventListener('touchcancel',cancel,{passive:true});
    }
    art.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
      if (nativeTouch && e.pointerType === 'touch') return;
      if (e.isPrimary === false) { cancel(); return; }
      begin(e.pointerId,e);
    }, {passive:true});
    art.addEventListener('pointermove', e => {
      if (press && press.id === e.pointerId) explore(e,e);
    }, {passive:false});
    art.addEventListener('pointerup', e => {
      if (press && press.id === e.pointerId) release();
    }, {passive:true});
    art.addEventListener('pointercancel', e => {if(!(nativeTouch&&e.pointerType==='touch'))cancel()}, {passive:true});
    art.addEventListener('pointerleave', e => { if (e.pointerType !== 'mouse' && !(nativeTouch&&e.pointerType==='touch')) cancel(); }, {passive:true});
    art.addEventListener('contextmenu', e => {
      if (press || now() < suppressUntil) e.preventDefault();
    });
    button.addEventListener('click', e => {
      // Browser compatibility click after exploration must not enter the world.
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
