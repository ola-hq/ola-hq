export const musicClock=v=>Number.isFinite(v)?`${Math.floor(Math.max(0,v)/60)}:${String(Math.floor(Math.max(0,v)%60)).padStart(2,'0')}`:'—';
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
