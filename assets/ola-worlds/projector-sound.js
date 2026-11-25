// Original mechanical projector synthesis. No third-party recording is embedded.
export function projectorSamples(rate=24000,seconds=1){
 const data=new Float32Array(Math.floor(rate*seconds));let seed=1977,low=0;
 for(let i=0;i<data.length;i++){
  const t=i/rate,phase=(t*24)%1;seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const noise=seed/2147483648-1;low=.82*low+.18*noise;
  const claw=Math.exp(-phase*65)*(noise*.48+Math.sin(2*Math.PI*1250*t)*.22);
  const returnClick=Math.exp(-((phase+.48)%1)*85)*noise*.22;
  data[i]=claw+returnClick+low*.06+Math.sin(2*Math.PI*96*t)*.018;
 }return data;
}
export class ProjectorSound{
 constructor(){this.until=0;this.last=0;}
 unlock(){try{const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return;const ctx=this.ctx||(this.ctx=new Audio());ctx.resume()?.catch?.(()=>{});return ctx;}catch{}}
 burst(){const ctx=this.unlock();if(!ctx)return;const now=ctx.currentTime;
  try{
   if(!this.source){const samples=projectorSamples(ctx.sampleRate),buffer=ctx.createBuffer(1,samples.length,ctx.sampleRate);buffer.copyToChannel(samples,0);const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=buffer;source.loop=true;filter.type='lowpass';filter.frequency.value=3600;source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);gain.gain.value=0;source.start();this.source=source;this.gain=gain;}
   const gap=now-this.last;this.last=now;this.source.playbackRate.setTargetAtTime(gap>0&&gap<.8?Math.min(1.3,.9+.12/gap):1,now,.04);
   // Repeated swipes extend one motor instead of stacking loud clips.
   this.until=now+.24;const g=this.gain.gain;g.cancelScheduledValues(now);g.setTargetAtTime(.2,now,.008);g.setTargetAtTime(0,this.until,.035);clearTimeout(this.timer);this.timer=setTimeout(()=>this.stop(),400);
  }catch{}
 }
 stop(){clearTimeout(this.timer);if(this.source){try{this.source.stop();this.source.disconnect();this.gain.disconnect();}catch{}this.source=null;}this.until=0;}
 destroy(){this.stop();this.ctx?.close()?.catch?.(()=>{});this.ctx=null;}
}
