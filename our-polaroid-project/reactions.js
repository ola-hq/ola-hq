function mountFeedback(container, item) {
  const key = 'our-polaroid-wave:feedback:v1:' + item.id;
  let saved = {liked: false, note: ''};
  let storageAvailable = true;
  try { const value = JSON.parse(localStorage.getItem(key) || 'null'); if(value && typeof value === 'object') saved = {liked: value.liked === true, note: typeof value.note === 'string' ? value.note.slice(0,2000) : ''}; } catch (_) {storageAvailable = false;}
  container.innerHTML = '<div class="feedback"><h2>A moment worth keeping.</h2><button type="button" class="like" aria-pressed="false">♡ Like this moment</button><label>Leave a note<textarea maxlength="2000" placeholder="What does this moment bring to mind?"></textarea></label><div class="feedback-actions"><button type="button" class="save-note">Save draft</button><button type="button" class="clear-note">Clear draft</button><a class="email-note">Email your note ↗</a></div><p class="feedback-note">Likes and saved notes stay on this device. Email a note to share it with Our Polaroid Wave.</p><p class="feedback-status" role="status" aria-live="polite"></p></div>';
  const like = container.querySelector('.like'), note = container.querySelector('textarea'), status = container.querySelector('.feedback-status'), email = container.querySelector('.email-note');
  note.value = saved.note;
  function emailLink(){ email.href = 'mailto:Thewavehub26@gmail.com?subject=' + encodeURIComponent('A note on ' + item.title) + '&body=' + encodeURIComponent(note.value + '\n\n' + item.title + '\n' + item.url); }
  function refreshLike(){like.setAttribute('aria-pressed',String(saved.liked));like.textContent=saved.liked?'♥ Liked on this device':'♡ Like this moment';}
  function persist(message){try {localStorage.setItem(key,JSON.stringify(saved));storageAvailable=true;status.textContent=message;}catch(_){storageAvailable=false;status.textContent='This device could not save your draft. You can still email your note.';}}
  refreshLike();emailLink();if(!storageAvailable)status.textContent='Saved notes are unavailable on this device. You can still email a note.';
  like.onclick=()=>{saved.liked=!saved.liked;refreshLike();persist(saved.liked?'Liked on this device.':'Like removed.');};
  note.oninput=()=>{emailLink();status.textContent=note.value===saved.note?'':'Draft changed. Choose Save draft to keep it on this device.';};
  container.querySelector('.save-note').onclick=()=>{saved.note=note.value;persist('Draft saved on this device.');};
  container.querySelector('.clear-note').onclick=()=>{saved.note='';note.value='';emailLink();persist('Draft cleared.');};
}
