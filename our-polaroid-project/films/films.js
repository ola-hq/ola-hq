// One intentional soundtrack at a time; no automatic playback.
document.addEventListener('play',event=>{if(event.target instanceof HTMLVideoElement)document.querySelectorAll('video').forEach(video=>{if(video!==event.target)video.pause()})},true);
addEventListener('pagehide',()=>document.querySelectorAll('video').forEach(video=>video.pause()));
