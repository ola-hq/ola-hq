import {catalog} from './catalog.js?v=wave26-20261126';
import {soundtrack as session} from './audio-session.js?v=wave26-20261126';
import {initDJStudio} from './dj-studio.js?v=wave26-20261126';
import {createBoomboxVisualizer} from './boombox-visualizer.js?v=wave26-20261126';
import {deviceIcon,setDeviceIcon} from './device-icons.js?v=wave26-20261126';
import {esc,musicClock as clock} from './utils.js?v=wave26-20261126';

const $=id=>document.getElementById(id),allIds=catalog.tracks.map(t=>t.id);
const trackById=new Map(catalog.tracks.map(t=>[t.id,t]));
const normal=s=>s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g,'');
const mainByTitle=new Map(catalog.tracks.filter(t=>!t.variant).map(t=>[normal(t.title),t]));
const label=t=>t.title+(t.variant?' · '+t.variant:'');
let albumId=null,queueLabel='All recordings',started=false;
const deck=$('wave26-player');
deck.innerHTML=`<div class="deck-heading"><div><p class="deck-eyebrow">WAVE26 · THE LISTENING ROOM</p><p>Choose a song. Stay for a while.</p></div><span>${catalog.tracks.length} recordings</span></div>
 <div class="boombox-viewport"><div class="boombox-stage music-scene"><img class="boombox-art" src="assets/wave26/wave26-boombox-20261126.webp" width="1672" height="941" alt="Wave26 boombox: engraved ocean waves, navy enamel and warm brass, with a live music display">
 <div class="boombox-display" aria-hidden="true"><img id="face-cover" alt=""><div><small>WAVE26 · NOW ON THE DECK</small><strong id="face-title"></strong><span id="face-state">Ready when you are</span><canvas id="equalizer"></canvas><span id="face-time"></span></div></div>
 <div id="left-speaker" class="speaker-visualizer left-speaker" aria-hidden="true"><canvas></canvas></div><div id="right-speaker" class="speaker-visualizer right-speaker" aria-hidden="true"><canvas></canvas></div>
 <div class="boombox-presets" id="face-presets" aria-label="Quick song selections">${catalog.tracks.slice(0,7).map((t,i)=>`<button data-play="${esc(t.id)}" title="${esc(label(t))}" aria-label="Play ${esc(label(t))}">${String(i+1).padStart(2,'0')}</button>`).join('')}</div>
 <div class="boombox-keys" aria-label="Illustrated playback controls">${[['prev','Previous track'],['play','Play'],['pause','Pause'],['stop','Stop and rewind'],['next','Next track']].map(([k,n])=>`<button data-face="${k}" aria-label="${n}" title="${n}"><span class="sr-only">${n}</span></button>`).join('')}</div></div></div>
 <div class="music-console"><div class="track-heading"><div class="track-art-reserved"><img id="track-cover" width="72" height="72" alt=""></div><div class="track-readout"><span id="track-counter"></span><h2 id="track-title"></h2><p id="audio-state" role="status"></p></div></div>
 <label class="sr-only" for="seek">Track progress</label><input id="seek" type="range" min="0" max="100" value="0" step=".1"><div class="tape-time"><span id="elapsed">0:00</span><span id="duration">—</span></div>
 <div class="playlist-selector"><label class="sr-only" for="track-select">Choose a recording</label><select id="track-select">${catalog.tracks.map(t=>`<option value="${esc(t.id)}">${esc(label(t))}</option>`).join('')}</select></div><div id="tape-slots" class="tape-slots"></div>
 <button id="music-tray-toggle" type="button" aria-expanded="false" aria-controls="music-tray">More listening controls</button><div id="music-tray" class="deck-bottom" hidden><button id="all-recordings" type="button" class="small-key">All recordings</button><button id="visuals-toggle" type="button" class="small-key" aria-pressed="true">Visuals on</button></div>
 <div class="transport" aria-label="Playback controls">${[['prev','Previous track','previous'],['toggle','Play','play'],['stop','Stop and rewind','stop'],['next','Next track','next'],['mute','Mute','volume']].map(([k,n,icon])=>`<button type="button" data-audio="${k}" aria-label="${n}" ${k==='mute'?'aria-pressed="false"':''}>${deviceIcon(icon)}</button>`).join('')}</div>
 <div class="volume-control"><label class="sr-only" for="volume">Volume</label><input id="volume" type="range" min="0" max="1" step=".01" value=".65"><output id="volume-value" for="volume">65%</output></div></div>
 <p id="audio-error" class="deck-error" role="alert"></p><p class="deck-note">Original recordings, ready to play here. Speed, loops and effects change your listening session only.</p>`;

const studio=initDJStudio({root:deck,session});
// The original studio provides an eight-preset grid. Wave26 has an open catalogue instead.
deck.querySelector('.dj-library .dj-section-label span:last-child').textContent=`${catalog.tracks.length} RECORDINGS`;
const visualizer=createBoomboxVisualizer({session,scene:deck.querySelector('.music-scene'),canvases:[$('left-speaker').querySelector('canvas'),$('right-speaker').querySelector('canvas'),$('equalizer')]});
const narrow=matchMedia('(max-width:620px)');
function artTargets(){for(const n of deck.querySelectorAll('.boombox-presets,.boombox-keys')){n.inert=narrow.matches;n.setAttribute('aria-hidden',String(narrow.matches));}}
narrow.addEventListener('change',artTargets);artTargets();

function playTrack(id,ids=allIds,context='All recordings'){
 if(!trackById.has(id))return;
 started=true;queueLabel=context;
 return session.playTrack(id,ids);
}
function act(action){
 if(action==='play'){started=true;return session.play();}
 if(action==='toggle'){started=true;return session.toggle();}
 if(action==='pause')return session.pause();
 if(action==='stop')return session.stop();
 if(action==='mute')return session.toggleMute();
 return session.step(action==='next'?1:-1);
}
deck.querySelectorAll('[data-audio]').forEach(b=>b.onclick=()=>act(b.dataset.audio));
deck.querySelectorAll('[data-face]').forEach(b=>b.onclick=()=>act(b.dataset.face));
$('track-select').onchange=e=>playTrack(e.target.value);
$('all-recordings').onclick=()=>{session.setQueue(allIds);queueLabel='All recordings';update(session.state());};
$('visuals-toggle').onclick=()=>session.setVisuals(!session.state().visuals);
$('music-tray-toggle').onclick=()=>{const open=$('music-tray').hidden;$('music-tray').hidden=!open;$('music-tray-toggle').setAttribute('aria-expanded',String(open));};
$('volume').oninput=e=>session.setVolume(+e.target.value);
let scrubbing=false,pointer=null;
const seek=$('seek');
const seekAt=e=>{const r=seek.getBoundingClientRect();if(r.width)session.seek(Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)));};
const endScrub=()=>{scrubbing=false;pointer=null;};
seek.onpointerdown=e=>{if(e.button!==0||seek.disabled)return;e.preventDefault();scrubbing=true;pointer=e.pointerId;seek.focus({preventScroll:true});seek.setPointerCapture?.(pointer);seekAt(e);};
seek.onpointermove=e=>{if(scrubbing&&pointer===e.pointerId){e.preventDefault();seekAt(e);}};
seek.onpointerup=e=>{if(pointer===e.pointerId){seekAt(e);seek.releasePointerCapture?.(pointer);endScrub();}};
seek.onpointercancel=seek.onblur=endScrub;seek.oninput=e=>session.seek(+e.target.value/100);seek.onchange=endScrub;
window.addEventListener('pointerup',endScrub);window.addEventListener('pointercancel',endScrub);

function navigate(view,album=null,{replace=false}={}){
 document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===view));
 if(view==='albums'){
  if(album)openAlbum(album);else{$('albumGrid').style.display='grid';$('albumDetail').classList.remove('active');$('albumDetail').innerHTML='';albumId=null;}
 }
 const hash=album?'#album-'+album:view==='landing'?'':'#'+view;
 if(location.hash!==hash)history[replace?'replaceState':'pushState'](null,'',location.pathname+location.search+hash);
 window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
 update(session.state());window.dispatchEvent(new Event('wave26:layout'));
}
function restore(){const hash=location.hash.slice(1);if(hash.startsWith('album-'))navigate('albums',hash.slice(6),{replace:true});else navigate(['albums','library'].includes(hash)?hash:'landing',null,{replace:true});}
window.addEventListener('popstate',restore);
document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>navigate(b.dataset.open));
document.querySelectorAll('[data-back]').forEach(b=>b.onclick=()=>navigate(b.dataset.back));
$('albumGrid').innerHTML=catalog.albums.map(a=>`<button type="button" class="album-card" data-album="${a.id}"><img src="${a.art}" alt="${esc(a.title)} artwork" loading="lazy"><div class="album-copy"><h2>${esc(a.title)}</h2><p>${a.tracks.length} tracks · ${a.trackEntries.filter(t=>t.recordingId).length} ready to play here</p><span class="open-line">Open album</span></div></button>`).join('');

function openAlbum(id){
 const a=catalog.albums.find(a=>a.id===id);if(!a){navigate('albums');return;}
 albumId=id;const playable=a.trackEntries.filter(t=>t.recordingId);
 $('albumGrid').style.display='none';$('albumDetail').classList.add('active');
 $('albumDetail').innerHTML=`<div class="album-detail-grid"><img src="${a.art}" alt="${esc(a.title)} artwork"><div><button type="button" class="back" data-all-albums>Albums</button><p class="album-kicker">OLA · ${a.tracks.length} tracks</p><h2>${esc(a.title)}</h2><p class="album-desc">${esc(a.desc)}</p>
 <div class="album-mini" data-mini-album="${id}"><div><span>THE ALBUM DECK</span><strong>${esc(a.title)}</strong><p class="mini-state">${playable.length?'Choose a recording below.':'The recordings are still being added. Listen through the original playlists below.'}</p></div><div class="mini-controls"><button type="button" data-album-prev aria-label="Previous available album track" ${playable.length?'':'disabled'}>${deviceIcon('previous')}</button><button type="button" data-album-toggle ${playable.length?'':'disabled'} aria-label="Play ${esc(a.title)}">${deviceIcon('play')}</button><button type="button" data-album-next aria-label="Next available album track" ${playable.length?'':'disabled'}>${deviceIcon('next')}</button></div><label class="sr-only" for="album-seek">Album track progress</label><input id="album-seek" type="range" min="0" max="100" step=".1" value="0" ${playable.length?'':'disabled'}><div class="mini-time"><span data-mini-elapsed>0:00</span><span data-mini-duration>—</span></div></div>
 <div class="listen-links"><a class="listen-link" href="https://www.youtube.com/playlist?list=${encodeURIComponent(a.playlist)}" target="_blank" rel="noopener" data-external-listen>YouTube playlist</a><a class="listen-link" href="${a.suno||'https://suno.com/@ola_hq'}" target="_blank" rel="noopener" data-external-listen>Suno</a></div>
 <ol class="tracklist playable-tracklist">${a.trackEntries.map((t,i)=>`<li><span class="num">${String(i+1).padStart(2,'0')}</span><span>${esc(t.title)}</span>${t.recordingId?`<button type="button" data-play="${t.recordingId}" data-queue-album="${id}" aria-label="Play ${esc(t.title)}">Play</button>`:'<span class="audio-needed">Audio to add</span>'}</li>`).join('')}</ol></div></div>`;
 $('albumDetail').querySelector('[data-all-albums]').onclick=()=>navigate('albums');
 const ids=playable.map(t=>t.recordingId),belongs=()=>ids.includes(session.state().track.id);
 const albumPlay=()=>{if(!ids.length)return;if(belongs()){session.setQueue(ids);queueLabel=a.title;started=true;session.toggle();}else playTrack(ids[0],ids,a.title);};
 $('albumDetail').querySelector('[data-album-toggle]').onclick=albumPlay;
 for(const [attr,delta] of [['data-album-prev',-1],['data-album-next',1]])$('albumDetail').querySelector('['+attr+']').onclick=()=>{if(!ids.length)return;session.setQueue(ids);queueLabel=a.title;if(!belongs())playTrack(ids[0],ids,a.title);else session.step(delta);};
 $('album-seek').oninput=e=>{if(belongs())session.seek(+e.target.value/100);};
 updateMini(session.state());
}

const ground=catalog.tracks.filter(t=>t.project==='Ground Control'||/ground control/i.test(t.title));
$('projectShelf').innerHTML=catalog.projects.map(p=>`<article class="project"><h3>${esc(p.title)}</h3><div class="project-desc">${esc(p.desc)}</div>${p.title==='Ground Control'&&ground.length?`<button type="button" class="project-link" data-play="${ground[0].id}" data-project="ground-control">Play ${ground.length} recordings</button>`:p.suno?`<a class="project-link" href="${p.suno}" target="_blank" rel="noopener" data-external-listen>Suno</a>`:''}</article>`).join('');
const songbook=$('songbook'),search=$('songSearch');
function renderSongs(){
 const q=normal(search.value),recordings=catalog.tracks.filter(t=>!q||normal(label(t)).includes(q)||normal((t.aliases||[]).join(' ')).includes(q));
 const loose=[...new Set(catalog.songbook)].filter(t=>!mainByTitle.has(normal(t))&&(!q||normal(t).includes(q))).sort((a,b)=>a.localeCompare(b));
 songbook.innerHTML=recordings.map(t=>`<article class="song song-ready"><span class="recording-tag">${esc(t.collection)}</span><h3>${esc(t.title)}</h3>${t.variant?`<p>${esc(t.variant)}</p>`:''}${t.aliases?.length?`<p class="recording-alias">Ground Control: ${esc(t.aliases[0])}</p>`:''}<div class="song-action"><button type="button" data-play="${t.id}" aria-label="Play ${esc(label(t))}">Play</button><span>${clock(t.duration)}</span></div></article>`).join('')+loose.map(t=>`<article class="song"><h3>${esc(t)}</h3><span class="audio-needed">Audio to add</span></article>`).join('');
 $('songEmpty').style.display=recordings.length+loose.length?'none':'block';
}
search.addEventListener('input',renderSongs);renderSongs();
$('showGrid').innerHTML=catalog.showAudio.map(t=>`<article class="show-card"><span>OLA · Show Audio</span><h3>${esc(t.title)}</h3>${t.recordingId?`<button type="button" data-play="${t.recordingId}" data-show-audio aria-label="Play ${esc(t.title)}">Play recording</button><span>${clock(trackById.get(t.recordingId).duration)}</span>`:'<span class="audio-needed">Recording to add</span>'}</article>`).join('');
const versions=catalog.tracks.filter(t=>t.variant);
const namedFamilies=new Map();
for(const raw of catalog.rawVersions){let title=raw.replace(/\s*\(\d+\)$/,'').replace(/\s+\d+$/,'').replace(/\s+—\s+alternate$/i,'').replace(/!$/,'').trim();if(/^la ola de amor \(/i.test(title))title='La Ola de Amor';if(/^jalisco time/i.test(title))title='Jalisco Time';if(/^leavin'?$/i.test(title))title="Leavin'";const key=title.toLowerCase();const family=namedFamilies.get(key)||{title,count:0};family.count++;namedFamilies.set(key,family);}
$('versionGrid').innerHTML=versions.map(t=>`<div class="version-family"><b>${esc(t.title)}</b><span>${esc(t.variant)}</span><button type="button" data-play="${t.id}" aria-label="Play ${esc(label(t))}">Play cut</button></div>`).join('')+[...namedFamilies.values()].filter(f=>f.count>1).sort((a,b)=>a.title.localeCompare(b.title)).map(f=>`<div class="version-family"><b>${esc(f.title)}</b><span>${f.count} named source cuts preserved</span></div>`).join('')+`<p class="version-note">Different cuts are kept separate; no version is silently promoted to a final master. Named source families without recordings remain part of the archive.</p>`;

document.addEventListener('click',e=>{
 const target=e.target.closest('button[data-play]');
 if(target){
  let ids=allIds,context='All recordings';
  if(target.dataset.queueAlbum){const a=catalog.albums.find(a=>a.id===target.dataset.queueAlbum);ids=a.trackEntries.flatMap(t=>t.recordingId?[t.recordingId]:[]);context=a.title;}
  if(target.hasAttribute('data-show-audio')){ids=catalog.showAudio.flatMap(t=>t.recordingId?[t.recordingId]:[]);context='Show Audio';}
  if(target.dataset.project==='ground-control'){ids=ground.map(t=>t.id);context='Ground Control';}
  playTrack(target.dataset.play,ids,context);
 }
 const album=e.target.closest('[data-album]');if(album)navigate('albums',album.dataset.album);
 if(e.target.closest('[data-external-listen]'))session.pause();
});

const floating=$('wave26-now-playing');
floating.innerHTML=`<div><span>WAVE26 · NOW PLAYING</span><strong id="floating-title"></strong></div><button type="button" data-floating-toggle aria-label="Pause music">${deviceIcon('pause')}</button><button type="button" data-open-listening>Open player</button>`;
floating.querySelector('[data-floating-toggle]').onclick=()=>act('toggle');
floating.querySelector('[data-open-listening]').onclick=()=>{navigate('library');deck.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});};
function updateMini(s){
 if(!albumId)return;const a=catalog.albums.find(a=>a.id===albumId),ids=a.trackEntries.flatMap(t=>t.recordingId?[t.recordingId]:[]),inside=ids.includes(s.track.id),mini=$('albumDetail').querySelector('.album-mini');if(!mini)return;
 if(inside){mini.querySelector('.mini-state').textContent=(s.error?'Playback needs another tap':s.playing?'Playing':'Paused')+' · '+label(s.track);setDeviceIcon(mini.querySelector('[data-album-toggle]'),s.wantPlaying?'pause':'play');mini.querySelector('[data-album-toggle]').setAttribute('aria-label',(s.wantPlaying?'Pause ':'Play ')+a.title);$('album-seek').disabled=!s.seekable;$('album-seek').value=s.duration?s.displayTime/s.duration*100:0;mini.querySelector('[data-mini-elapsed]').textContent=clock(s.displayTime);mini.querySelector('[data-mini-duration]').textContent=clock(s.duration);}else if(ids.length){mini.querySelector('.mini-state').textContent=ids.length+' recording'+(ids.length===1?'':'s')+' ready here. Other tracks remain on the original playlists.';setDeviceIcon(mini.querySelector('[data-album-toggle]'),'play');$('album-seek').disabled=true;}
}
function update(s){
 const t=s.track;if(!t)return;
 const message=s.error?'Tap Play to retry':s.interrupted?'Interrupted · tap Play':s.pendingSeek?'Seeking…':s.waiting?'Loading…':s.playing?'Playing':'Ready when you are';
 $('track-title').textContent=label(t);$('track-counter').textContent=queueLabel+' · '+t.collection;$('audio-state').textContent=message;
 for(const id of ['track-cover','face-cover']){const image=$(id);if(image.getAttribute('src')!==t.cover)image.src=t.cover;image.alt=t.collection+' artwork';}
 $('face-title').textContent=label(t);$('face-state').textContent=message;$('face-time').textContent=clock(s.displayTime)+' / '+clock(s.duration);
 if(!scrubbing)seek.value=s.duration?s.displayTime/s.duration*100:0;seek.disabled=!s.seekable;seek.setAttribute('aria-valuetext',clock(s.displayTime)+' of '+clock(s.duration));
 $('elapsed').textContent=clock(s.displayTime);$('duration').textContent=clock(s.duration);$('volume').value=s.volume;$('volume-value').textContent=Math.round(s.volume*100)+'%';
 const toggle=deck.querySelector('[data-audio=toggle]');setDeviceIcon(toggle,s.wantPlaying&&!s.interrupted?'pause':'play');toggle.setAttribute('aria-label',s.wantPlaying?'Pause':'Play');
 const mute=deck.querySelector('[data-audio=mute]');setDeviceIcon(mute,s.muted?'mute':'volume');mute.setAttribute('aria-label',s.muted?'Unmute':'Mute');mute.setAttribute('aria-pressed',String(s.muted));
 $('track-select').value=t.id;$('audio-error').textContent=s.error||s.warning;$('visuals-toggle').setAttribute('aria-pressed',String(s.visuals));$('visuals-toggle').textContent=s.visuals?'Visuals on':'Visuals off';
 floating.hidden=!started||$('library').classList.contains('active');$('floating-title').textContent=label(t);const f=floating.querySelector('[data-floating-toggle]');setDeviceIcon(f,s.wantPlaying?'pause':'play');f.setAttribute('aria-label',s.wantPlaying?'Pause music':'Play music');
 document.querySelectorAll('[data-play]').forEach(b=>{const current=b.dataset.play===t.id&&s.wantPlaying;b.classList.toggle('is-playing',current);b.setAttribute('aria-pressed',String(current));});
 updateMini(s);
}
const unsubscribe=session.subscribe(update);
const story=$('waveStory');$('openWaveStory').onclick=()=>story.showModal();$('closeWaveStory').onclick=()=>story.close();story.addEventListener('click',e=>{if(e.target===story)story.close();});
restore();
window.addEventListener('pagehide',()=>{endScrub();session.pause();});
// The app hosts this same page; there is one audio element, never one per album.
export {session,navigate,playTrack};
