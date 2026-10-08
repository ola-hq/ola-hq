document.querySelectorAll('[data-play]').forEach(button=>{
 const video=document.getElementById(button.dataset.play),title=video.getAttribute('aria-label');
 const update=()=>{button.textContent=`${video.paused?'Play':'Pause'} ${title}`};
 button.addEventListener('click',async()=>{
  if(!video.paused){video.pause();return}
  document.querySelectorAll('video').forEach(other=>{if(other!==video)other.pause()});
  try{await video.play()}catch{button.textContent=`Try the native controls or Open film for ${title}`}
 });
 video.addEventListener('play',update);video.addEventListener('pause',update);video.addEventListener('ended',update);
});
