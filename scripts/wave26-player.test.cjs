// Public listening contracts. Controlled media, not a browser or listening test.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),assets=path.join(root,'assets/wave26');
const code=n=>fs.readFileSync(path.join(assets,n),'utf8').replace(/^import .*\n/gm,'').replace(/export /g,'');
function harness(){
 let created=0,serial=0;const timers=new Map(),handlers={};
 class Audio{constructor(){this.listeners={};this.paused=true;this.ended=false;this.duration=NaN;this.currentTime=0;this.readyState=0;this.seekable={length:0,start:()=>0,end:()=>this.duration};}addEventListener(k,f){this.listeners[k]=f}removeEventListener(k){delete this.listeners[k]}emit(type){this.listeners[type]?.({type})}set src(v){this._src=v;this.duration=NaN;this.currentTime=0;this.readyState=0;this.ended=false}get src(){return this._src}getAttribute(k){return k==='src'?this._src:null}load(){}play(){this.paused=false;this.ended=false;this.emit('play');return Promise.resolve()}pause(){this.paused=true;this.emit('pause')}removeAttribute(){}remove(){}}
 const audio=new Audio(),ctx={document:{createElement(){created++;return audio},body:{append(){}}},window:{addEventListener(k,f){handlers[k]=f},removeEventListener(){}},URL:class extends URL{static createObjectURL(){return 'blob:test'}static revokeObjectURL(){}},Blob,AbortController,console,queueMicrotask,Float32Array,Uint8Array,location:{href:'https://wave26.test/ola-hq/wave-26.html',origin:'https://wave26.test'},setTimeout(f){timers.set(++serial,f);return serial},clearTimeout(id){timers.delete(id)}};
 vm.createContext(ctx);for(const file of['catalog.js','audio-effects.js','sound-pads.js','audio-session.js'])vm.runInContext(code(file),ctx,{filename:file});
 const s=vm.runInContext('soundtrack',ctx),catalog=vm.runInContext('catalog',ctx);
 const ready=(duration=120)=>{audio.duration=duration;audio.readyState=4;audio.seekable.length=1;audio.emit('loadedmetadata');audio.emit('seeked')};
 return{s,audio,catalog,ready,created:()=>created,handlers};
}
test('Every supplied recording has a unique real media file',()=>{
 const {catalog,s}=harness();assert.equal(catalog.tracks.length,38);assert.equal(new Set(catalog.tracks.map(t=>t.id)).size,38);assert.equal(new Set(catalog.tracks.map(t=>t.src)).size,38);
 for(const t of catalog.tracks){assert(t.duration>0);assert(t.src.startsWith('assets/wave26/audio/'));const p=path.join(root,t.src),data=fs.readFileSync(p);assert(data.length>100000);assert(data.length<32*1024*1024);assert(data.subarray(0,3).toString()==='ID3'||(data[0]===255&&(data[1]&224)===224));}
 s.dispose();
});
test('Albums retain complete track order and only real recording associations',()=>{
 const {catalog,s}=harness();assert.deepEqual(Array.from(catalog.albums,a=>a.tracks.length),[13,7,12,6]);let ready=0;
 for(const a of catalog.albums){assert.equal(a.trackEntries.length,a.tracks.length);a.trackEntries.forEach((t,i)=>{assert.equal(t.title,a.tracks[i]);if(t.recordingId){ready++;assert(catalog.tracks.some(r=>r.id===t.recordingId))}})}
 assert.equal(ready,2);assert.equal(catalog.showAudio.filter(t=>t.recordingId).length,1);assert.equal(catalog.showAudio.find(t=>t.recordingId).title,'Night Frequency');assert.equal(catalog.tracks.filter(t=>t.variant).length,3);s.dispose();
});
test('Title similarities never substitute a different song',()=>{
 const {catalog,s}=harness();const oui=catalog.albums.find(a=>a.id==='oui'),love=catalog.albums.find(a=>a.id==='laola');assert.equal(oui.trackEntries.find(t=>t.title==='Same Bed, Different Country').recordingId,null);assert.equal(love.trackEntries.find(t=>t.title==='Welcome to La Ola de Amor').recordingId,null);s.dispose();
});
test('One quiet audio element serves every source selection',async()=>{
 const {s,audio,ready,created}=harness();assert(audio.paused);assert(!s.state().wantPlaying);
 for(const t of s.state().tracks){await s.playTrack(t.id);ready();assert.equal(s.state().track.id,t.id);assert.equal(audio.src,t.src);assert(!audio.paused);s.pause();assert(audio.paused)}assert.equal(created(),1);s.dispose();
});
test('Album next, previous and natural completion stay within its queue',async()=>{
 const {s,audio,ready}=harness(),ids=s.state().tracks.slice(4,7).map(t=>t.id);await s.playTrack(ids[0],ids);ready();s.step(1);assert.equal(s.state().track.id,ids[1]);s.step(-1);assert.equal(s.state().track.id,ids[0]);s.step(-1);assert.equal(s.state().track.id,ids[2]);audio.emit('ended');assert.equal(s.state().track.id,ids[0]);s.dispose();
});
test('A single available album track stops at its end',async()=>{
 const {s,audio,ready}=harness(),id=s.state().tracks[2].id;await s.playTrack(id,[id]);ready();audio.emit('ended');assert.equal(s.state().track.id,id);assert(audio.paused);assert(!s.state().wantPlaying);s.dispose();
});
test('A seek waits for metadata and keeps the latest target',async()=>{
 const {s,audio,ready}=harness();await s.playTrack(s.state().tracks[0].id);s.seek(.2);s.seek(.8);assert(s.state().pendingSeek);ready(200);assert.equal(audio.currentTime,160);assert(!s.state().pendingSeek);s.pause();s.seek(.3);audio.emit('seeked');assert.equal(audio.currentTime,60);assert(audio.paused);s.dispose();
});
test('Mute, speed, media failure and page exit retain safe transport state',async()=>{
 const {s,audio,ready,handlers}=harness();s.setRate(1.13);assert.equal(audio.playbackRate,1.13);s.setRate(9);assert.equal(audio.playbackRate,1.13);s.setVolume(.23);s.toggleMute();assert(s.state().muted);s.toggleMute();assert.equal(s.state().volume,.23);await s.play();ready();audio.emit('error');assert(audio.paused);assert(s.state().error.includes('could not load'));await s.play();handlers.pagehide();assert(audio.paused);s.dispose();
});
test('The world has a native player, album mini players and stable app route',()=>{
 const page=fs.readFileSync(path.join(root,'wave-26.html'),'utf8'),ui=fs.readFileSync(path.join(assets,'player.js'),'utf8');assert(page.indexOf('<h2>Projects</h2>')<page.indexOf('id="wave26-player"'));assert(page.indexOf('id="wave26-player"')<page.indexOf('<h2>Songbook</h2>'));assert(ui.includes('data-mini-album'));assert(ui.includes('data-queue-album'));assert(ui.includes('data-external-listen'));assert(ui.includes('Audio to add'));assert(!page.includes('youtube.com/embed'));assert(fs.readFileSync(path.join(root,'app/app.js'),'utf8').includes("wave26: { name: 'Wave26', path: 'wave-26.html'"));
});
