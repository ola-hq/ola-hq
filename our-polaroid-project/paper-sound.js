// Polaroid-only recorded camera eject and the owner-requested earlier return swoosh. The shared Cinema recording remains untouched.
export class PaperSound {
  constructor() { this.request = 0; }
  unlock() {
    try {
      const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Audio) return;
      const ctx = this.ctx || (this.ctx = new Audio());
      ctx.resume()?.catch?.(() => {});
      if (!this.ready) this.ready = fetch(new URL('./audio/polaroid-650-eject-v42.wav', import.meta.url))
        .then(r => { if (!r.ok) throw Error('Audio unavailable'); return r.arrayBuffer(); })
        .then(bytes => ctx.decodeAudioData(bytes)).then(buffer => this.buffer = buffer)
        .catch(() => { this.ready = null; return null; });
      return ctx;
    } catch {}
  }
  prepareExit(ctx = this.unlock()) {
    if (!ctx) return;
    if (!this.exitReady) this.exitReady = fetch(new URL('./audio/paper-exit-v44.wav', import.meta.url))
      .then(r => { if (!r.ok) throw Error('Audio unavailable'); return r.arrayBuffer(); })
      .then(bytes => ctx.decodeAudioData(bytes)).then(buffer => this.exitBuffer = buffer)
      .catch(() => { this.exitReady = null; return null; });
    return this.exitReady;
  }
  burst(action) {
    const ctx = this.unlock(); if (!ctx) return;
    const returning = action === 'return', exiting = action === 'exit';
    if (exiting) this.prepareExit(ctx);
    if (returning && !this.returnReady) this.returnReady = fetch(new URL('./audio/paper-floop-v33.wav', import.meta.url))
      .then(r => { if (!r.ok) throw Error('Audio unavailable'); return r.arrayBuffer(); })
      .then(bytes => ctx.decodeAudioData(bytes)).then(buffer => this.returnBuffer = buffer)
      .catch(() => { this.returnReady = null; return null; });
    const ready = returning ? this.returnReady : exiting ? this.exitReady : this.ready;
    const buffer = () => returning ? this.returnBuffer : exiting ? this.exitBuffer : this.buffer;
    const request = ++this.request, requested = performance.now();
    const play = () => {
      if (request !== this.request || performance.now() - requested > 1200 || !buffer() || ctx.state === 'closed') return;
      this.release();
      try {
        const source = ctx.createBufferSource(), gain = ctx.createGain();
        source.buffer = buffer(); source.loop = false;
        gain.gain.value = 1; source.connect(gain); gain.connect(ctx.destination);
        this.source = source; this.gain = gain;
        source.onended = () => { if (this.source === source) this.release(); };
        source.start();
      } catch { this.release(); }
    };
    if (buffer()) play(); else ready?.then(play);
  }
  release() {
    const source = this.source, gain = this.gain;
    this.source = this.gain = null;
    if (source) { source.onended = null; try { source.stop(); source.disconnect(); gain.disconnect(); } catch {} }
  }
  stop() { this.request++; this.release(); }
  destroy() { this.stop(); this.ctx?.close()?.catch?.(() => {}); this.ctx = null; }
}
