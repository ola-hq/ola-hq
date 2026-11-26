import {effectDefaults,effectLimits,effectiveEffects,anyEffect,createEffectsRack} from './audio-effects.js?v=wave26-polish-20261126';
import {approvedTracks,bonusTrack} from './catalog.js?v=wave26-polish-20261126';
import {createSoundPads,soundPadNames,recordedHorn,recordedSounds,sampleVersion} from './sound-pads.js?v=wave26-polish-20261126';

// One audio element and audible graph for the whole site, independent of room lifecycles.
export function createSoundtrackSession(){
 const audio=document.createElement('audio');audio.id='wave26-audio';audio.preload='metadata';audio.hidden=true;document.body.append(audio);
 const tracks=[...approvedTracks],listeners=new Set(),knownHashes=new Set([...approvedTracks,bonusTrack].filter(Boolean).flatMap(t=>[t.sourceSha256,t.webSha256].filter(Boolean)));
 let queue=tracks.map((_,i)=>i);
 let index=0,volume=.65,muted=false,context,source,gain,analysisInput,split,analysers,arrays,waveformArray,analysisConnected=false;
 let url=null,request=0,waiting=false,error='',warning='',disposed=false,visuals=true,localSerial=0;
 let bonus=false,returnPoint=null,playIntent=false,generation=0,pendingSeek=null,seekTimer=null,confirmTimer=null,fetchController=null,blobReady=false,manualEndGuard=false,lastProgressTime=0;
 let rate=1,effects=effectDefaults(),rack=null,fxError='',soundRack=null,soundError='',loop={a:null,b:null,enabled:false};const pads=new Set();
 const soundBuffers=new Map(),soundControllers=new Map(),loadingSounds=new Set();let soundLoading=false,soundRequest=0;const pendingSounds=new Set();
 const current=()=>bonus?bonusTrack:tracks[index];
 const duration=()=>Number.isFinite(audio.duration)&&audio.duration>0?audio.duration:current()?.duration||0;
 // A pending seek belongs to one source generation. Only the latest user target wins.
 function cancelSeek(){clearTimeout(seekTimer);clearTimeout(confirmTimer);confirmTimer=null;seekTimer=null;fetchController?.abort();fetchController=null;pendingSeek=null}
 function revokeURL(){if(url)URL.revokeObjectURL(url);url=null}
 const events=['play','playing','pause','waiting','stalled','ended','error','timeupdate','loadedmetadata','durationchange','seeked','progress','loadeddata','canplay','canplaythrough','suspend','ratechange'];
 // Duration alone does not mean a streaming response can seek. Some private
 // hosts expose metadata before any usable TimeRange exists.
 function seekRanges(){
  if(!Number.isFinite(audio.duration)||audio.duration<=0)return [];
  const ranges=[];
  for(let i=0;i<(audio.seekable?.length||0);i++){
   const start=Math.max(0,audio.seekable.start(i)),end=Math.min(audio.duration,audio.seekable.end(i));
   if(Number.isFinite(start)&&Number.isFinite(end)&&end>start)ranges.push({start,end});
  }
  return ranges;
 }
 function state(){return {rate,actualRate:audio.playbackRate,tempoVersion:'precise-rate-v2',sounds:{active:soundRack?.active()||[],error:soundError,loadingHorn:loadingSounds.has('horn'),loading:[...loadingSounds],sampleVersion,hornVersion:recordedHorn.version},pitchPreserved:!!(audio.preservesPitch??audio.webkitPreservesPitch),effects:{...effects,pads:[...pads],active:anyEffect(effectiveEffects(effects,pads)),error:fxError},loop:{...loop},tracks:[...tracks],bonusTrack,track:current(),index:bonus?-1:index,isBonus:bonus,canReturn:bonus&&!!returnPoint,volume,muted,visuals,waiting,error,warning,
  playing:!audio.paused&&!audio.ended&&(!context||context.state==='running'),wantPlaying:playIntent,
  interrupted:!audio.paused&&!!context&&context.state!=='running',currentTime:audio.currentTime||0,
  displayTime:pendingSeek?pendingSeek.ratio*duration():audio.currentTime||0,pendingSeek:!!pendingSeek,
  duration:duration(),seekable:duration()>0,analysisAvailable:!!gain,localCount:tracks.filter(t=>t.local).length};}
 function emit(){if(!disposed)listeners.forEach(f=>f(state()))}
 function level(){if(gain){audio.volume=1;audio.muted=false;gain.gain.setTargetAtTime(muted?0:volume,context.currentTime,.025)}else{audio.volume=volume;audio.muted=muted}}
 function init(){
  if(context||disposed||warning)return;
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC){warning='Live visualizers are unavailable in this browser; playback still works.';emit();return}
  try{
   context=new AC();gain=context.createGain();gain.channelCount=2;gain.channelCountMode='explicit';gain.channelInterpretation='speakers';gain.connect(context.destination);
   source=context.createMediaElementSource(audio);source.connect(gain);level();
   updateEffects();
   context.onstatechange=()=>{if(disposed)return;emit()};
  }catch{
   warning='Live visualizers are unavailable; playback uses the boombox controls.';
   if(source){try{source.disconnect();source.connect(context.destination)}catch{}}
   else {context?.close().catch(()=>{});context=undefined}
   gain=undefined;level();emit();
  }
 }
 function updateEffects(){
  if(!gain||!source||!context){if(anyEffect(effectiveEffects(effects,pads))){effects=effectDefaults();pads.clear();fxError='Effects require Web Audio in this browser. Original playback is still available.'}return;}
  const effective=effectiveEffects(effects,pads);
  try{
   if(anyEffect(effective)){
    if(!rack){const next=createEffectsRack(context);next.update(effective);next.output.connect(gain);try{source.disconnect(gain)}catch{}source.connect(next.input);rack=next}
    else rack.update(effective);
   }else if(rack){source.disconnect(rack.input);rack.dispose();rack=null;source.connect(gain)}
   fxError='';
  }catch{if(rack){try{source.disconnect(rack.input);rack.dispose()}catch{}rack=null}try{source.disconnect(gain)}catch{}source.connect(gain);effects=effectDefaults();pads.clear();fxError='Effects are unavailable here. Original playback is still available.'}
 }
 function setEffect(name,value){if(!(name in effects))return;if(name in effectLimits){const [lo,hi]=effectLimits[name];if(!Number.isFinite(Number(value)))return;effects[name]=Math.min(hi,Math.max(lo,Number(value)))}else effects[name]=!!value;init();updateEffects();emit()}
 function holdPad(name,held){if(!['cut','echo','space','sweep'].includes(name))return;if(held)pads.add(name);else pads.delete(name);init();updateEffects();emit()}
 function suspendIfIdle(){queueMicrotask(()=>{if(!disposed&&audio.paused&&!soundLoading&&!pendingSounds.size&&!soundRack?.active().length&&context?.state==='running')context.suspend().catch(()=>{})})}
 function stopSounds(){soundRequest++;pendingSounds.clear();for(const c of soundControllers.values())c.abort();soundControllers.clear();loadingSounds.clear();soundLoading=false;soundRack?.stop();emit();suspendIfIdle()}
 async function triggerSound(name){
  if(disposed||!soundPadNames.includes(name)||loadingSounds.has(name))return false;init();
  if(!context||!gain){soundError='Sound pads need Web Audio in this browser. Music controls still work.';emit();return false}
  const ticket=soundRequest,pending=Symbol();pendingSounds.add(pending);let loadTimer=null;
  try{
   const resume=context.state!=='running'?context.resume():Promise.resolve();
   resume.catch(()=>{}); // Network/decode can finish after an interrupted resume.
   soundRack ||= createSoundPads(context,gain,()=>{emit();suspendIfIdle()});
   if(!soundBuffers.has(name)){
    loadingSounds.add(name);soundLoading=true;soundError='';emit();const controller=new AbortController();soundControllers.set(name,controller);loadTimer=setTimeout(()=>controller.abort(),15000);
    const response=await fetch(recordedSounds[name].src,{credentials:'same-origin',cache:'no-store',signal:controller.signal});
    if(disposed||ticket!==soundRequest)return false;
    if(!response.ok||!response.headers.get('content-type')?.startsWith('audio/')||Number(response.headers.get('content-length'))>1048576)throw Error('Horn request failed');
    const bytes=await response.arrayBuffer();if(bytes.byteLength>1048576)throw Error('Horn too large');
    const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
    if(disposed||ticket!==soundRequest)return false;
    if(hash!==recordedSounds[name].sha256)throw Error('Horn recording mismatch');
    const decoded=await context.decodeAudioData(bytes);if(!Number.isFinite(decoded.duration)||decoded.duration<=0||decoded.duration>12)throw Error('Horn decode failed');
    if(disposed||ticket!==soundRequest)return false;soundBuffers.set(name,decoded);soundControllers.delete(name);loadingSounds.delete(name);soundLoading=loadingSounds.size>0;
   }
   await resume;if(disposed||ticket!==soundRequest)return false;
   if(context.state!=='running')throw Error('Audio interrupted');
   const played=soundRack.play(name,soundBuffers.get(name));soundError='';emit();return played;
  }catch(e){
   if(disposed||ticket!==soundRequest)return false;
   soundControllers.delete(name);loadingSounds.delete(name);soundLoading=loadingSounds.size>0;
   soundError='The recorded '+recordedSounds[name].label+' could not load or play. Tap its pad to retry.';emit();return false;
  }finally{clearTimeout(loadTimer);pendingSounds.delete(pending);suspendIfIdle()}
 }
 function resetEffects(){stopSounds();pads.clear();effects=effectDefaults();updateEffects();emit()}
 function applyRate(){
  try{if(audio.defaultPlaybackRate!==rate)audio.defaultPlaybackRate=rate;if(audio.playbackRate!==rate)audio.playbackRate=rate;
   if('preservesPitch'in audio)audio.preservesPitch=true;if('webkitPreservesPitch'in audio)audio.webkitPreservesPitch=true;
  }catch{} // state exposes the native rate so the interface never silently claims success.
 }
 function setRate(value){const next=Number(value);if(!Number.isFinite(next)||next<.6||next>1.5)return;rate=Math.round(next*100)/100;applyRate();emit()}
 function releaseAnalysis(){
  if(!analysisConnected)return;
  try{source.disconnect(analysisInput)}catch{}
  analysisConnected=false;
 }
 function readSpectrum(){
  if(disposed||!gain||context?.state!=='running'||audio.paused||audio.ended||muted||volume===0||!visuals)return null;
  if(!analysers){
   analysisInput=context.createGain();analysisInput.channelCount=2;analysisInput.channelCountMode='explicit';analysisInput.channelInterpretation='speakers';analysisInput.gain.value=1;
   split=context.createChannelSplitter(2);analysers=Array.from({length:3},()=>{const a=context.createAnalyser();a.fftSize=2048;a.smoothingTimeConstant=.65;return a});
   analysisInput.connect(split);analysisInput.connect(analysers[2]);split.connect(analysers[0],0);split.connect(analysers[1],1);arrays=analysers.map(a=>new Float32Array(a.frequencyBinCount));
  }
  // Analyze before the listening gain: quiet 18% playback still has full-frequency detail.
  if(!analysisConnected){source.connect(analysisInput);analysisConnected=true}
  analysers.forEach((a,i)=>a.getFloatFrequencyData(arrays[i]));return {arrays,sampleRate:context.sampleRate};
 }
 function readWaveform(){const spectrum=readSpectrum();if(!spectrum)return null;waveformArray ||= new Float32Array(analysers[2].fftSize);analysers[2].getFloatTimeDomainData(waveformArray);return waveformArray}
 async function play(){
  if(disposed||!current())return false;
  playIntent=true;const token=++request;
  try{
   init();applyRate();const resume=context&&context.state!=='running'?context.resume():Promise.resolve();
   const playback=audio.play(); // Keep both calls inside the visitor's click/tap gesture.
   await Promise.all([resume,playback]);applyRate();if(disposed||token!==request){if(!playIntent)audio.pause();return false;}
   error='';if(!pendingSeek)waiting=false;emit();return true;
  }catch{if(!disposed&&token===request){playIntent=false;error='Playback could not start. Tap Play to retry, or choose another track.';emit()}return false}
 }
 function pause(){playIntent=false;request++;stopSounds();audio.pause();releaseAnalysis();emit();suspendIfIdle()}
 function loadCurrent(continuePlaying){
  loop={a:null,b:null,enabled:false};
  generation++;request++;cancelSeek();revokeURL();blobReady=false;manualEndGuard=false;lastProgressTime=0;playIntent=continuePlaying;
  audio.pause();waiting=false;error='';url=current().local?URL.createObjectURL(current().file):null;
  audio.src=url||current().src;audio.load();setRate(rate);emit();if(continuePlaying)return play();
 }
 function select(n,continuePlaying=false){
  if(disposed||!tracks.length||!Number.isFinite(n))return;
  bonus=false;returnPoint=null;index=((Math.trunc(n)%tracks.length)+tracks.length)%tracks.length;return loadCurrent(continuePlaying);
 }
 function returnToRegular(continuePlaying=playIntent){
  if(!bonus)return;const point=returnPoint;bonus=false;returnPoint=null;
  const found=tracks.findIndex(t=>t.id===point?.id);index=found>=0?found:0;
  loadCurrent(continuePlaying);if(point?.ratio>0)seek(point.ratio);
 }
 function playBonus(){
  if(!bonusTrack)return false;
  if(bonus)return play();
  returnPoint={id:tracks[index].id,ratio:duration()?audio.currentTime/duration():0,playing:playIntent};bonus=true;return loadCurrent(true);
 }
 function scheduleFallback(){
  if(seekTimer||fetchController||blobReady||current().local||!pendingSeek)return;
  seekTimer=setTimeout(()=>{seekTimer=null;if(pendingSeek)void loadSeekableCopy()},200);
 }
 async function loadSeekableCopy(){
  // Only a requested seek on a non-range host downloads a bounded private copy.
  // Same-origin cookies remain with that host; nothing is uploaded or persisted.
  const gen=generation,controller=new AbortController();fetchController=controller;
  try{
   const endpoint=new URL(current().src,location.href);if(endpoint.origin!==location.origin)throw Error('origin');
   const response=await fetch(endpoint.href,{credentials:'same-origin',cache:'no-store',signal:controller.signal});
   const max=32*1024*1024,type=response.headers.get('content-type')||'';
   if(!response.ok||(!type.startsWith('audio/')&&!type.startsWith('application/octet-stream'))||Number(response.headers.get('content-length'))>max)throw Error('response');
   const reader=response.body?.getReader();let parts=[],size=0;
   if(reader){while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw Error('size')}parts.push(value)}}
   else{const data=await response.arrayBuffer();if(data.byteLength>max)throw Error('size');parts=[data]}
   if(disposed||gen!==generation||controller.signal.aborted||!pendingSeek)return;
   const blob=new Blob(parts,{type:'audio/mpeg'});revokeURL();url=URL.createObjectURL(blob);blobReady=true;
   pendingSeek.attempted=false;clearTimeout(confirmTimer);confirmTimer=null;request++;audio.pause();audio.src=url;audio.load();setRate(rate); // Reuse the SAME element and Web Audio source.
  }catch(e){if(!disposed&&gen===generation&&!controller.signal.aborted){pendingSeek=null;waiting=false;pause();error='Seeking could not finish downloading. Tap Play to continue, or move the timeline to retry.';emit()}}
  finally{if(fetchController===controller)fetchController=null}
 }
 function confirmSeek(){
  if(!pendingSeek?.attempted)return false;
  if(Math.abs(audio.currentTime-pendingSeek.target)>.4)return false;
  pendingSeek=null;clearTimeout(confirmTimer);confirmTimer=null;clearTimeout(seekTimer);seekTimer=null;
  fetchController?.abort();fetchController=null;waiting=false;error='';
  if(playIntent&&audio.paused)void play();else if(!playIntent&&!audio.paused)audio.pause();emit();return true;
 }
 function applySeek(){
  if(!pendingSeek||pendingSeek.generation!==generation)return false;
  if(!Number.isFinite(audio.duration)||audio.duration<=0||audio.readyState<1){scheduleFallback();return false}
  const target=Math.min(Math.max(0,audio.duration-.08),pendingSeek.ratio*audio.duration);
  const available=blobReady||current().local||seekRanges().some(r=>target>=r.start-.01&&target<=r.end);
  if(!available){scheduleFallback();return false}
  if(pendingSeek.attempted)return false;
  try{
   clearTimeout(confirmTimer);pendingSeek.attempted=true;pendingSeek.target=target;
   audio.currentTime=target;
   // Safari may accept currentTime then silently reset a non-range stream.
   // A seeked event (or a settled position after the timeout) must confirm it.
   const gen=generation;
   confirmTimer=setTimeout(()=>{
    confirmTimer=null;if(disposed||gen!==generation||!pendingSeek)return;
    if(!audio.seeking&&confirmSeek())return;
    pendingSeek.attempted=false;
    if(blobReady||current().local){pendingSeek=null;pause();error='This browser could not finish the seek. Move the timeline to retry.';emit()}
    else scheduleFallback();
   },2500);
   emit();return true;
  }catch{pendingSeek.attempted=false;scheduleFallback();return false}
 }

 function seek(ratio,fromLoop=false){
  if(disposed||!Number.isFinite(ratio)||!duration())return false;
  if(!fromLoop&&loop.enabled&&(ratio*duration()<loop.a||ratio*duration()>loop.b))loop.enabled=false;
  clearTimeout(confirmTimer);confirmTimer=null;ratio=Math.max(0,Math.min(1,ratio));pendingSeek={ratio,generation};manualEndGuard=ratio>=.995;
  waiting=true;error='';const applied=applySeek();emit();return applied;
 }
 function onEvent(e){
  if(disposed)return;
  if(['loadedmetadata','canplay','playing','loadeddata'].includes(e.type))applyRate();
  // Source changes can settle an old play promise after a paused selection.
  if((e.type==='play'||e.type==='playing')&&!playIntent){audio.pause();emit();return}
  if(e.type==='play'||e.type==='playing'||e.type==='pause')waiting=false;
  // stalled describes the network transfer, not necessarily audible buffering.
  if(e.type==='waiting')waiting=!audio.paused;
  if(e.type==='stalled')waiting=!audio.paused&&audio.readyState<3;
  if(['canplay','canplaythrough','loadeddata'].includes(e.type)&&!pendingSeek&&audio.readyState>=3)waiting=false;
  if(e.type==='timeupdate'){if(!audio.paused&&!pendingSeek&&audio.currentTime>lastProgressTime+.02)waiting=false;lastProgressTime=audio.currentTime}
  if((e.type==='timeupdate'||e.type==='ended')&&loop.enabled&&playIntent&&!pendingSeek&&audio.currentTime>=loop.b-.03){seek(loop.a/duration(),true);return}
  if(e.type==='ended'){
   if(pendingSeek){applySeek();return}
   if(manualEndGuard){pause();return}
   if(bonus){returnToRegular(returnPoint?.playing??false);return}
   if(queue.length>1)step(1,true);else pause();return;
  }
  if(e.type==='error'){cancelSeek();pause();error='This recording could not load or decode. Tap Play to retry, or choose another song.'}
  if(e.type==='seeked'&&pendingSeek?.attempted){if(!confirmSeek()){pendingSeek.attempted=false;scheduleFallback()}}
  if(['loadedmetadata','durationchange','canplay','progress','loadeddata'].includes(e.type))applySeek();
  emit();if(e.type==='pause')suspendIfIdle();
 }
 events.forEach(e=>audio.addEventListener(e,onEvent));
 const onPageHide=()=>pause();window.addEventListener('pagehide',onPageHide);
 function setQueue(ids){const indices=[...new Set(ids)].map(id=>tracks.findIndex(t=>t.id===id)).filter(i=>i>=0);if(indices.length)queue=indices;return queue.map(i=>tracks[i].id)}
 function playTrack(id,ids=tracks.map(t=>t.id)){const next=tracks.findIndex(t=>t.id===id);if(next<0)return false;setQueue(ids);if(next===index&&audio.getAttribute('src'))return play();return select(next,true)}
 function step(delta,continuePlaying=playIntent){const currentIndex=queue.indexOf(index);const position=((currentIndex<0?0:currentIndex)+delta+queue.length)%queue.length;return select(queue[position],continuePlaying)}
 select(0,false);level();
 return {audio,state,play,pause,setQueue,playTrack,readSpectrum,readWaveform,releaseAnalysis,playBonus,returnToRegular,setRate,setEffect,holdPad,resetEffects,triggerSound,stopSounds,
  releasePads(){if(pads.size){pads.clear();updateEffects();emit()}},
  quickLoop(seconds){
   const length=Number(seconds),total=duration();
   if(![2,4,8].includes(length)||total<1||pendingSeek)return false;
   const span=Math.min(length,total),a=Math.min(Math.max(0,audio.currentTime||0),Math.max(0,total-span));
   loop={a,b:a+span,enabled:true};
   if(audio.currentTime>=loop.b-.03)seek(a/total,true);
   emit();return true;
  },
  setLoopPoint(point){const time=audio.currentTime||0;if(point==='a'){loop={a:time,b:null,enabled:false}}else if(point==='b'&&loop.a!==null&&time-loop.a>=1){loop.b=time;loop.enabled=true}emit()},
  toggleLoop(){if(loop.a!==null&&loop.b!==null){loop.enabled=!loop.enabled;if(loop.enabled&&(audio.currentTime<loop.a||audio.currentTime>=loop.b))seek(loop.a/duration(),true)}emit()},
  clearLoop(){loop={a:null,b:null,enabled:false};emit()},
  subscribe(f){listeners.add(f);f(state());return()=>listeners.delete(f)},
  toggle(){return playIntent&&!state().interrupted?pause():play()},
  select,step,
  stop(){cancelSeek();pause();manualEndGuard=false;try{audio.currentTime=0}catch{}emit()},
  seek,
  setVolume(v){volume=Math.max(0,Math.min(1,Number(v)||0));muted=false;level();emit()},
  toggleMute(){muted=!muted;level();emit()},
  setVisuals(v){visuals=v;if(!v)releaseAnalysis();emit()},
  enterQuietly(){pause()},
  enterWithMusic(){volume=.18;muted=false;level();return play()},
  async addLocal(files){
   let added=0,duplicates=0,rejected=0;
   for(const file of files){
    if(disposed)break;
    if(!file.size||file.size>150*1024*1024||!(file.type?.startsWith('audio/')||/\.(mp3|m4a|aac|wav|ogg|flac|opus)$/i.test(file.name))){rejected++;continue}
    let hash;
    try{if(globalThis.crypto?.subtle)hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('')}catch{}
    if(disposed)break;
    const key=hash||`${file.name}:${file.size}:${file.lastModified}`;
    if(knownHashes.has(key)){duplicates++;continue}
    knownHashes.add(key);tracks.push({id:'local-'+(++localSerial),title:file.name.replace(/\.[^.]+$/,'').replace(/[_]+/g,' ').trim()||'Personal song',filename:file.name,file,local:true,key});added++;
   }
   emit();return {added,duplicates,rejected};
  },
  removeLocal(id){
   const n=tracks.findIndex(t=>t.id===id&&t.local);if(n<0)return;
   const wasCurrent=!bonus&&n===index;knownHashes.delete(tracks[n].key);tracks.splice(n,1);
   if(wasCurrent)select(Math.min(n,tracks.length-1),false);else{if(n<index)index--;emit()}
  },
  dispose(){if(disposed)return;cancelSeek();pause();disposed=true;events.forEach(e=>audio.removeEventListener(e,onEvent));window.removeEventListener('pagehide',onPageHide);
   rack?.dispose();soundRack?.dispose();listeners.clear();if(context)context.onstatechange=null;for(const n of [source,gain,analysisInput,split,...(analysers||[])])n?.disconnect();context?.close().catch(()=>{});
   revokeURL();audio.removeAttribute('src');audio.load();audio.remove();
  }
 };
}
export const soundtrack=createSoundtrackSession();
