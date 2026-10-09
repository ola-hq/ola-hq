'use strict';
// OLA HQ Tools: one quiz launcher, one timer, a grounded creative prompt,
// and a source-derived Blockbuster Wave Top 5. No duplicate ratings ledger.
const $=id=>document.getElementById(id);
async function copy(text,status){
  try{await navigator.clipboard.writeText(text);$(status).textContent='Copied.';}
  catch{$(status).textContent='Copy unavailable in this browser. Select the prompt text and copy it manually.';}
}

// Timer: 1–30 minutes in exact one-minute steps; selection may be set by the six activities.
const duration=$('duration'),clockDisplay=$('time'),timerStatus=$('timer-status'),timerStart=$('start'),timerReset=$('reset');
const timerUseButtons=[...document.querySelectorAll('[data-timer-use]')];
let seconds=Number(duration.value),deadline=0,tick=null,chosenUse='';
function drawTime(){clockDisplay.textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');}
function stopTick(){if(tick!==null)clearInterval(tick);tick=null;timerStart.textContent='Start';}
function resetTimer(){
 stopTick();seconds=Number(duration.value);drawTime();
 timerStatus.textContent=chosenUse?'Ready for '+chosenUse+'.':'Ready when you are.';
}
function advanceTimer(){
 seconds=Math.max(0,Math.ceil((deadline-Date.now())/1000));drawTime();
 if(seconds===0){stopTick();timerStatus.textContent='Finished. You made time for this moment.';}
}
timerStart.addEventListener('click',()=>{
 if(tick!==null){advanceTimer();if(tick!==null){stopTick();timerStatus.textContent='Paused.';}return;}
 if(seconds===0)seconds=Number(duration.value);
 deadline=Date.now()+seconds*1000;
 timerStart.textContent='Pause';
 timerStatus.textContent='Timer running'+(chosenUse?' · '+chosenUse:'')+'.';
 drawTime();tick=setInterval(advanceTimer,250);
});
timerReset.addEventListener('click',resetTimer);
duration.addEventListener('change',()=>{
 chosenUse='';timerUseButtons.forEach(button=>button.setAttribute('aria-pressed','false'));resetTimer();
});
timerUseButtons.forEach(button=>button.addEventListener('click',()=>{
 const minutes=Number(button.dataset.minutes);if(!(minutes>=1&&minutes<=30))return;
 chosenUse=button.querySelector('strong').textContent.toLowerCase();
 duration.value=String(minutes*60);
 timerUseButtons.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
 $('timer-purpose').textContent='Suggested '+minutes+' minutes for '+chosenUse+'. You can change the duration above.';
 resetTimer();
}));
drawTime();

// Grounded, portable creative starts: real complete prompts, not placeholder cards.
const starts={
 ground:'Find my current. Help me slow down and notice where I actually am. Ask me one simple question about what is happening around me, one about what feels important, and help me choose a small next step. Do not invent context or turn this into a huge plan.',
 notice:'Notice what is already good. Help me capture three concrete details from today: something I saw, something I felt, and something I want to remember. Keep the words simple and genuine. Ask me for details before writing anything personal.',
 current:'Follow the current. I have an idea I do not want to overthink. Help me describe it in one sentence, identify what is already real, and find a playful 10-minute experiment to test it. Keep it light; do not expand the whole project unless I ask.',
 memory:'Hold onto a moment. Help me create a short memory capsule from a real experience. Ask where I was, who was there, and what detail I never want to forget. Preserve my own voice and do not manufacture quotes or facts.',
 make:'Make one small thing. Ask me what I have in front of me and suggest a creative exercise I can finish in 10–15 minutes, using only what I have. One artifact, one clear starting move, no unnecessary planning.',
 release:'Let a thought pass. Help me name one unfinished thing that is taking up space, separate what needs action from what does not, and choose one gentle next step or an intentional decision to leave it alone. No grand conclusions.'
};
const choice=$('prompt'),creativeText=$('prompt-text'),note=$('wave-note');
function renderCreative(){
 const extra=note.value.trim();
 creativeText.value=starts[choice.value]+(extra?'\n\nMy starting note: '+extra:'');
 $('prompt-status').textContent='';
}
choice.addEventListener('change',renderCreative);
note.addEventListener('input',renderCreative);
$('copy-prompt').addEventListener('click',async()=>{
 const val=creativeText.value;
 try{await navigator.clipboard.writeText(val);$('prompt-status').textContent='Starting point copied.';}
 catch{creativeText.focus();creativeText.select();$('prompt-status').textContent='Select and copy with Command+C or Ctrl+C.';}
});
renderCreative();

// Snapshot from public Blockbuster Wave gallery JSON, as published Oct 2, 2026.
// Original 192 movie entries; 43 >=4/5 ratings. Exact viewing days are NOT stored.
// Avoid implying month-only records prove any screening happened in a 30-day window.
const movieTopFive=[{"id":"cinema2025-71","title":"One of Them Days","score":5,"order":12,"thumb":"blockbuster-wave-thumbs/cinema2025-71.jpg","watchDate":null},{"id":"cinema2025-258","title":"Unity","score":5,"order":100,"thumb":"blockbuster-wave-thumbs/cinema2025-258.jpg","watchDate":null},{"id":"cinema2025-284","title":"Elf","score":4.75,"order":126,"thumb":"blockbuster-wave-thumbs/cinema2025-284.jpg","watchDate":null},{"id":"cinema2025-56","title":"Wicked","score":4.5,"order":5,"thumb":"blockbuster-wave-thumbs/cinema2025-56.jpg","watchDate":null},{"id":"cinema2025-57","title":"Anora","score":4.5,"order":6,"thumb":"blockbuster-wave-thumbs/cinema2025-57.jpg","watchDate":null}];
function make(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e;}
function renderMovieTop(period){
 const list=$('top-movie-list'),status=$('top-movie-note');
 list.replaceChildren();
 const fallback=period==='recent';
 status.textContent=fallback
 ?'No exact theater-visit dates are available to verify the last 30 days. Showing the overall Top 5 instead.'
 :'Showing the five highest Wave scores (4/5 or higher) from our documented collection.';
 document.querySelectorAll('[data-top-period]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.topPeriod===period)));
 movieTopFive.forEach((r,i)=>{
  const card=make('article','top-movie'),img=make('img'),detail=make('div','top-movie-content');
  img.src='blockbuster-wave/'+r.thumb;img.alt='Original movie card artwork for '+r.title;img.loading='lazy';
  detail.append(make('span','top-movie-position','#'+(i+1)),make('strong','',r.title),make('span','top-movie-score','🌊 '+r.score+'/5'));
  card.append(img,detail);list.append(card);
 });
}
document.querySelectorAll('[data-top-period]').forEach(button=>button.addEventListener('click',()=>renderMovieTop(button.dataset.topPeriod)));
renderMovieTop('overall');
