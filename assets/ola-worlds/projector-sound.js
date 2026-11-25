// Edited real Kinoton35mm recording, Joseph SARDIN / BigSoundBank, CC0.
// Source and edit receipt: audio/PROJECTOR-CREDITS.txt. No synthesized fallback.
export class ProjectorSound{
 constructor(){this.until=0;this.request=0;}
 unlock(){try{const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return;const ctx=this.ctx||(this.ctx=new Audio());ctx.resume()?.catch?.(()=>{});
  if(!this.ready)this.ready=fetch(new URL('./audio/projector-35mm-v30.wav',import.meta.url)).then(r=>{if(!r.ok)throw Error('Audio unavailable');return r.arrayBuffer()}).then(bytes=>ctx.decodeAudioData(bytes)).then(buffer=>this.buffer=buffer).catch(()=>{this.ready=null;return null});return ctx;
 }catch{}}
 burst(){const ctx=this.unlock();if(!ctx)return;const request=++this.request,requested=performance.now();
  const play=()=>{if(request!==this.request||performance.now()-requested>500||!this.buffer||ctx.state==='closed')return;try{const now=ctx.currentTime;
   if(!this.source){const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=this.buffer;source.loop=true;source.connect(gain);gain.connect(ctx.destination);gain.gain.value=0;source.start();this.source=source;this.gain=gain;}
   // Keep the recording's natural pitch. Repeated swipes extend one quiet source.
   this.until=now+.23;const g=this.gain.gain;if(g.cancelAndHoldAtTime)g.cancelAndHoldAtTime(now);else g.cancelScheduledValues(now);g.setTargetAtTime(.18,now,.018);g.setTargetAtTime(0,this.until,.045);clearTimeout(this.timer);this.timer=setTimeout(()=>this.stop(),500);
  }catch{}};
  if(this.buffer)play();else this.ready?.then(play);
 }
 stop(){this.request++;clearTimeout(this.timer);if(this.source){try{this.source.stop();this.source.disconnect();this.gain.disconnect();}catch{}this.source=null;}this.until=0;}
 destroy(){this.stop();this.ctx?.close()?.catch?.(()=>{});this.ctx=null;}
}
