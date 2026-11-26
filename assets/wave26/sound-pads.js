// Licensed recordings through the existing AudioContext; no procedural fallback.
export const soundPadNames=['horn','siren','laser','riser'];
export const sampleVersion='recorded-pads-v2';
export const recordedSounds={"horn":{"version":"pfranzen-528807","src":"assets/wave26/sounds/dj-airhorn-pfranzen.mp3","sha256":"ca571547a96016ae32aa1b1f4fc44e477ced283452437a0288bd91489ce8cf04","label":"Air Horn"},"siren":{"version":"673349f9d706","src":"assets/wave26/sounds/dj-dub-siren-zoltan87.mp3","sha256":"673349f9d70686443cc37c1cd5545b6b32796d3c491017fdc46ab59f21051b1e","label":"Rave Siren"},"laser":{"version":"ec55b27500f5","src":"assets/wave26/sounds/dj-laser-glitchedtones.mp3","sha256":"ec55b27500f50c96d39b01a066f3f88d2ed0ef0b5eea23480f93d3d7f71478dc","label":"Laser Zap"},"riser":{"version":"7f4668e879d7","src":"assets/wave26/sounds/dj-riser-stereo-surgeon.mp3","sha256":"7f4668e879d74ddeb4931fca8f10db777730f917762d9e7f9549d57196de346f","label":"Noise Riser"}};
export const recordedHorn=recordedSounds.horn;
export function createSoundPads(context,master,onChange=()=>{}){
 const voices=new Set();let disposed=false;
 const active=()=>[...voices].map(v=>v.name);
 function play(name,recording=null){
  if(disposed||!soundPadNames.includes(name))return false;
  if(voices.size>=3)[...voices][0].stop();
  const nodes=[],sources=[],at=context.currentTime,env=context.createGain();nodes.push(env);env.connect(master);
  let closed=false,remaining=0;
  const voice={name,stop(){if(closed)return;for(const source of sources){source.onended=null;try{source.stop()}catch{}}cleanup()}};
  function cleanup(){if(closed)return;closed=true;for(const n of nodes)n.disconnect();voices.delete(voice);onChange()}
  const source=n=>{nodes.push(n);sources.push(n);return n};
  let length=.85,peak=.065;
  try{
   if(!recording||!Number.isFinite(recording.duration)||recording.duration<=0||recording.duration>12)throw Error('Recorded sample unavailable');
   length=recording.duration;peak=.65;const n=source(context.createBufferSource());n.buffer=recording;n.connect(env);
   env.gain.setValueAtTime(0,at);env.gain.linearRampToValueAtTime(peak,at+.005);
   env.gain.setValueAtTime(peak,at+Math.max(.005,length-.015));env.gain.linearRampToValueAtTime(0,at+length);
   remaining=sources.length;voices.add(voice);onChange();
   for(const n of sources){n.onended=()=>{if(--remaining===0)cleanup()};n.start(at);n.stop(at+length+.02)}
   return true;
  }catch(error){voice.stop();throw error}
 }
 const stop=()=>{for(const voice of [...voices])voice.stop()};
 return {play,active,stop,dispose(){disposed=true;stop()}};
}
