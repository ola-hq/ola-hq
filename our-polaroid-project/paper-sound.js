// Polaroid-only recorded camera eject. The shared Cinema recording remains untouched.
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
  burst() {
    const ctx = this.unlock(); if (!ctx) return;
    const request = ++this.request, requested = performance.now();
    const play = () => {
      if (request !== this.request || performance.now() - requested > 1200 || !this.buffer || ctx.state === 'closed') return;
      this.release();
      try {
        const source = ctx.createBufferSource(), gain = ctx.createGain();
        source.buffer = this.buffer; source.loop = false;
        gain.gain.value = 1; source.connect(gain); gain.connect(ctx.destination);
        this.source = source; this.gain = gain;
        source.onended = () => { if (this.source === source) this.release(); };
        source.start();
      } catch { this.release(); }
    };
    if (this.buffer) play(); else this.ready?.then(play);
  }
  release() {
    const source = this.source, gain = this.gain;
    this.source = this.gain = null;
    if (source) { source.onended = null; try { source.stop(); source.disconnect(); gain.disconnect(); } catch {} }
  }
  stop() { this.request++; this.release(); }
  destroy() { this.stop(); this.ctx?.close()?.catch?.(() => {}); this.ctx = null; }
}
