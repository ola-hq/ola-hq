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


// OLA HQ World Finder — subjective, playful discovery; no right/wrong scores.
// All twelve destinations are linked to their real existing OLA HQ worlds.
const worldCatalog={
love:{name:'La Ola de Amor',url:'la-ola-de-amor/',about:'People, shared celebrations, love stories, and memories that become places.'},
cinema:{name:'Blockbuster Wave',url:'blockbuster-wave/blockbuster-wave-complete-gallery.html',about:'Movies, reviews, ratings, and the stories wrapped around what we watch.'},
polaroid:{name:'Our Polaroid Wave',url:'our-polaroid-project/',about:'Photographs, captured nights, portraits, and little moments worth keeping.'},
music:{name:'Wave 26',url:'wave-26.html',about:'Music, releases, experiments, and feelings translated into sound.'},
fpl:{name:'FPL Wave',url:'fpl-wave.html',about:'A fantasy-football clubhouse, fixtures, strategy, and shared competition.'},
simulation:{name:'Simulation Wave',url:'simulation-wave/',about:'AI art, impossible ideas, and playful creative worlds.'},
gdb:{name:'GDB Wave',url:'gdb-wave.html',about:'A fictional university of sound, dancefloor culture, and musical mythology.'},
arsenal:{name:'Arsenal',url:'arsenal-wave.html',about:'Real football fandom, matchday traditions, and the culture of the club.'},
offbrand:{name:'Offbrand Wave',url:'offbrand-wave.html',about:'Unfiltered life stories, moving images, and unexpected side quests.'},
willpwr:{name:'Willpwr Wave',url:'willpwr-wave.html',about:'Small daily wins, movement, intention, and showing up.'},
wuwei:{name:'Wu Wei Wave',url:'wu-wei-wave.html',about:'Quiet observation, journaling, reflection, and finding your flow.'},
capybara:{name:'Capybara Wave',url:'capybara-wave.html',about:'Lighthearted play, slow joy, and not taking everything so seriously.'}
};
const worldQuiz=[
{q:'What kind of world pulls you in first?',a:[
['A story that means something to someone',['love','offbrand','polaroid']],
['An atmosphere built around music',['music','gdb','love']],
['Something unusual I can explore',['simulation','capybara','offbrand']],
['A shared team, tradition or matchday',['arsenal','fpl','gdb']]]},
{q:'You have a free afternoon. What sounds right?',a:[
['A movie and a good conversation afterward',['cinema','polaroid','offbrand']],
['A camera and somewhere to wander',['polaroid','offbrand','love']],
['A playlist, mix or creative experiment',['music','gdb','simulation']],
['A small reset, a walk and some space',['willpwr','wuwei','capybara']]]},
{q:'Pick the room you would happily get lost in.',a:[
['An archive of nights, people and memories',['love','polaroid','offbrand']],
['A clubhouse of records, rivals and fixtures',['fpl','arsenal','cinema']],
['A weird gallery where anything is possible',['simulation','capybara','music']],
['A library of thoughts and little rituals',['wuwei','willpwr','gdb']]]},
{q:'What would you rather make?',a:[
['A mini film or photo journal',['polaroid','offbrand','cinema']],
['A song, DJ set or campus radio show',['music','gdb','simulation']],
['A plan to make something real together',['love','willpwr','fpl']],
['A silly little creation that makes someone smile',['capybara','simulation','offbrand']]]},
{q:'Which feeling sounds best today?',a:[
['Connected and surrounded by my people',['love','arsenal','gdb']],
['Curious about something I have never seen',['simulation','cinema','polaroid']],
['Charged up and ready to move',['willpwr','fpl','music']],
['Calm, present and unhurried',['wuwei','capybara','polaroid']]]},
{q:'Follow the next current. Where does it go?',a:[
['To the screening room',['cinema','offbrand','polaroid']],
['To the pitch or the stands',['arsenal','fpl','willpwr']],
['To the dancefloor or music studio',['music','gdb','love']],
['Out into a quiet, unpredictable adventure',['wuwei','capybara','simulation']]]}
];
let waveResponses=[],wavePosition=0;
const waveArea=$('wave-quiz-options');
function node(tag,className,txt){const e=document.createElement(tag);if(className)e.className=className;if(txt!=null)e.textContent=txt;return e;}
function renderWorldQuiz(){
 const done=wavePosition>=worldQuiz.length;
 $('wave-quiz-back').hidden=wavePosition===0||done;
 $('wave-quiz-progress').textContent=done?'Your current':'Question '+(wavePosition+1)+' of '+worldQuiz.length;
 $('wave-quiz-selected').textContent=done?'A place to start, not a permanent label':'Pick what feels right — no wrong answers';
 $('wave-quiz-bar').style.width='100%'; // the interior span below carries visual progress
 $('wave-quiz-bar').style.width=(Math.round(wavePosition/worldQuiz.length*100))+'%';
 if(done){
  $('wave-quiz-question').textContent='Your current points toward…';
  waveArea.replaceChildren();$('wave-quiz-result').hidden=false;
  const scores=Object.fromEntries(Object.keys(worldCatalog).map(k=>[k,0]));
  waveResponses.forEach((answer,i)=>{const choices=worldQuiz[i].a[answer]?.[1]||[];choices.forEach((key,rank)=>{scores[key]+=3-rank;});});
  const ordered=Object.entries(scores).sort((a,b)=>b[1]-a[1]||Object.keys(worldCatalog).indexOf(a[0])-Object.keys(worldCatalog).indexOf(b[0])).slice(0,3);
  const result=$('wave-quiz-result');result.replaceChildren();
  result.append(node('p','','These are three worlds you might enjoy. Explore them in any order.'));
  ordered.forEach(([key],i)=>{const world=worldCatalog[key],card=node('article','wave-match'),h=node('h5','',(i===0?'First current · ':'Also try · ')+world.name),p=node('p','',world.about),link=node('a','','Explore '+world.name+' ↗');link.href=world.url;card.append(h,p,link);result.append(card);});
  return;
 }
 $('wave-quiz-result').hidden=true;
 const q=worldQuiz[wavePosition];$('wave-quiz-question').textContent=q.q;waveArea.replaceChildren();
 q.a.forEach(([label],i)=>{const b=node('button','',label);b.type='button';b.setAttribute('aria-pressed',String(waveResponses[wavePosition]===i));b.addEventListener('click',()=>{waveResponses[wavePosition]=i;waveResponses.length=wavePosition+1;wavePosition++;renderWorldQuiz();});waveArea.append(b);});
}
$('wave-quiz-back').addEventListener('click',()=>{wavePosition=Math.max(0,wavePosition-1);renderWorldQuiz()});
$('wave-quiz-reset').addEventListener('click',()=>{wavePosition=0;waveResponses=[];renderWorldQuiz()});
renderWorldQuiz();

/* Random Wave: a playful alternate entrance, not a quiz score. Repeats only after all twelve worlds have appeared. */
const randomWorldKeys=Object.keys(worldCatalog);
const randomWaveGroups={love:'reflect',polaroid:'reflect',wuwei:'reflect',willpwr:'reflect',cinema:'play',simulation:'play',capybara:'play',offbrand:'play',music:'energy',gdb:'energy',fpl:'energy',arsenal:'energy'};
let randomBag=[],previousRandomWorld=null;
function revealRandomWave(){
 if(!randomBag.length){
  randomBag=randomWorldKeys.slice();
  for(let i=randomBag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[randomBag[i],randomBag[j]]=[randomBag[j],randomBag[i]];}
  if(previousRandomWorld===randomBag[randomBag.length-1]&&randomBag.length>1)[randomBag[0],randomBag[randomBag.length-1]]=[randomBag[randomBag.length-1],randomBag[0]];
 }
 const key=randomBag.pop(),world=worldCatalog[key],card=$('wave-random-result');
 previousRandomWorld=key;card.hidden=false;card.dataset.waveGroup=randomWaveGroups[key]||'play';
 $('wave-random-title').textContent=world.name;
 $('wave-random-about').textContent=world.about;
 const link=$('wave-random-link');link.href=world.url;link.textContent='Explore '+world.name+' ↗';
 $('wave-random-caption').textContent='A WAVE FOUND YOU · '+(12-randomBag.length)+'/12';
}
$('wave-random').addEventListener('click',revealRandomWave);
$('wave-random-again').addEventListener('click',revealRandomWave);

// Two independent film archives — Letterboxd ratings must NEVER be invented
// or silently replaced with Blockbuster Wave scores.
const blockbusterTop5=[{"id":"cinema2025-71","title":"One of Them Days","score":5,"order":12,"thumb":"blockbuster-wave-thumbs/cinema2025-71.jpg"},{"id":"cinema2025-258","title":"Unity","score":5,"order":100,"thumb":"blockbuster-wave-thumbs/cinema2025-258.jpg"},{"id":"cinema2025-284","title":"Elf","score":4.75,"order":126,"thumb":"blockbuster-wave-thumbs/cinema2025-284.jpg"},{"id":"cinema2025-56","title":"Wicked","score":4.5,"order":5,"thumb":"blockbuster-wave-thumbs/cinema2025-56.jpg"},{"id":"cinema2025-57","title":"Anora","score":4.5,"order":6,"thumb":"blockbuster-wave-thumbs/cinema2025-57.jpg"}];
const localMovieKey='ola-hq-letterboxd-ourpolaroidproj-v1';
let letterboxdEntries=[];
try{const saved=JSON.parse(localStorage.getItem(localMovieKey)||'[]');if(Array.isArray(saved))letterboxdEntries=saved.filter(x=>x&&typeof x.title==='string'&&Number.isFinite(x.score));}catch{}

const letterboxdSyncURL='data/letterboxd-recent.json';
let syncedLetterboxdEntries=[],letterboxdSyncInfo=null;
function letterboxdRecords(){
 // A user's optional full export supplements the publicly syndicated recent diary.
 return syncedLetterboxdEntries.concat(letterboxdEntries);
}
async function loadLetterboxdDiarySync(){
 const state=$('letterboxd-sync-state');
 if(typeof fetch!=='function'){state.textContent='Automatic RSS data is unavailable in this browser. Your own CSV still works.';return;}
 try{
  const response=await fetch(letterboxdSyncURL+'?v='+Date.now(),{cache:'no-store',credentials:'omit'});
  if(!response.ok)throw Error('Not available yet');
  const result=await response.json();
  if(result?.status!=='ok'||result.account!=='ourpolaroidproj'||!Array.isArray(result.entries))throw Error('Feed unavailable');
  syncedLetterboxdEntries=result.entries.filter(x=>x&&typeof x.title==='string'&&Number.isFinite(x.score)&&x.score>=0.5&&x.score<=5)
   .map(x=>({title:x.title,score:x.score,year:String(x.year||''),watchedDate:x.watchedDate||null,url:x.url||null}));
  letterboxdSyncInfo={checkedAt:result.checkedAt,items:result.totalEntries||result.entries.length};
  const timestamp=result.checkedAt?new Date(result.checkedAt).toLocaleString():'recently';
  state.textContent='Recent diary synced: '+syncedLetterboxdEntries.length+' rated entries · Checked '+timestamp+'. Letterboxd RSS covers recent entries, not the complete all-time library.';
 }catch{
  state.textContent='Automatic diary sync is not currently available. Letterboxd’s recent RSS may be unreachable; a complete export remains an option.';
 }
 renderTopFilms();
}

let movieSource='letterboxd',moviePeriod='overall';
const movieList=$('top-movie-list'),movieNote=$('top-movie-note');
const diaryURL='https://letterboxd.com/ourpolaroidproj/diary/films/';
function topFilmCard(movie,index,fromLetterboxd){
 const card=node('article','top-movie'),detail=node('div','top-movie-content');
 if(!fromLetterboxd&&movie.thumb){const img=node('img','');img.src='blockbuster-wave/'+movie.thumb;img.alt='Blockbuster Wave artwork for '+movie.title;img.loading='lazy';card.append(img);}
 detail.append(node('span','top-movie-position','#'+(index+1)),node('strong','',movie.title),node('span','top-movie-score',(fromLetterboxd?'★ ':'🌊 ')+movie.score+'/5'));
 if(fromLetterboxd&&movie.url){const link=node('a','','View on Letterboxd ↗');link.href=movie.url;link.target='_blank';link.rel='noopener noreferrer';detail.append(link);}
 if(fromLetterboxd&&movie.watchedDate)detail.append(node('span','top-movie-date','Watched '+movie.watchedDate));
 card.append(detail);return card;
}
function movieRanking(entries){
 const filtered=entries.filter(x=>Number.isFinite(x.score)&&x.score>=4);
 const unique=new Map();
 filtered.forEach(f=>{const key=(f.url||f.title+'|'+(f.year||'')).toLowerCase();const prev=unique.get(key);if(!prev||f.score>prev.score||(f.score===prev.score&&(f.watchedDate||'')>(prev.watchedDate||'')))unique.set(key,f);});
 return [...unique.values()].sort((a,b)=>b.score-a.score||(b.watchedDate||'').localeCompare(a.watchedDate||'')||(a.order??Infinity)-(b.order??Infinity)||a.title.localeCompare(b.title));
}
function within30(dateText){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(dateText||''))return false;
 const dt=new Date(dateText+'T12:00:00'),today=new Date();today.setHours(12,0,0,0);
 return !Number.isNaN(dt.getTime())&&today.getTime()-dt.getTime()>=0&&today.getTime()-dt.getTime()<=30*86400000;
}
function renderTopFilms(){
 movieList.replaceChildren();
 document.querySelectorAll('[data-movie-source]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.movieSource===movieSource)));
 document.querySelectorAll('[data-top-period]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.topPeriod===moviePeriod)));
 const isLB=movieSource==='letterboxd';
 $('letterboxd-import').hidden=!isLB;
 const sourceLink=$('movie-source-link'),footnote=$('movie-source-footnote');
 sourceLink.href=isLB?diaryURL:'blockbuster-wave/blockbuster-wave-complete-gallery.html#insights';
 sourceLink.textContent=isLB?'Open Our Polaroid PROJ on Letterboxd ↗':'Explore Blockbuster Wave ↗';
 sourceLink.target=isLB?'_blank':'_self';
 if(isLB){
  footnote.textContent='Source: Our Polaroid PROJ public Letterboxd diary RSS (when available) + optional browser-local export. RSS is a recent activity feed, not an all-time ratings API.';
  if(!letterboxdRecords().length){movieNote.textContent='No verified ratings have synced yet. Open the real diary or import its export to calculate the Top 5.';return;}
  const overall=movieRanking(letterboxdRecords()),recent=overall.filter(f=>within30(f.watchedDate));
  const fallback=moviePeriod==='recent'&&recent.length===0;
  const ranking=(moviePeriod==='recent'&&recent.length?recent:overall).slice(0,5);
  movieNote.textContent=fallback?'No 4★+ titles with confirmed viewing dates in the last 30 days in the available data. Showing this account’s best available rated entries instead.':moviePeriod==='recent'?'4★+ ratings with confirmed diary watch dates from the last 30 days.':letterboxdEntries.length?'Highest-rated 4★+ films in the imported account records plus synced diary.':'Highest-rated 4★+ films in the recent public diary feed. Full all-time rankings require an account export.';
  if(!ranking.length)movieList.append(node('p','quiet','No films rated 4 stars or higher in the imported records.'));
  ranking.forEach((f,i)=>movieList.append(topFilmCard(f,i,true)));
 }else{
  footnote.textContent='Source: verified Blockbuster Wave archive snapshot; exact theater visit dates are unavailable.';
  movieNote.textContent=moviePeriod==='recent'?'Exact viewing dates are not documented in Blockbuster Wave. Showing its overall Top 5 instead.':'These are Blockbuster Wave scores—not Letterboxd star ratings.';
  movieRanking(blockbusterTop5).slice(0,5).forEach((f,i)=>movieList.append(topFilmCard(f,i,false)));
 }
}
document.querySelectorAll('[data-movie-source]').forEach(button=>button.addEventListener('click',()=>{movieSource=button.dataset.movieSource;renderTopFilms()}));
document.querySelectorAll('[data-top-period]').forEach(button=>button.addEventListener('click',()=>{moviePeriod=button.dataset.topPeriod;renderTopFilms()}));
function parseCSV(source){
 const out=[],line=[];let field='',quoted=false;
 for(let i=0;i<source.length;i++){
  const c=source[i];
  if(c==='"'){if(quoted&&source[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
  else if(c===','&&!quoted){line.push(field);field='';}
  else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&source[i+1]==='\n')i++;line.push(field);field='';if(line.some(x=>x.trim()))out.push(line.slice());line.length=0;}
  else field+=c;
 }
 line.push(field);if(line.some(x=>x.trim()))out.push(line);
 return out;
}
function isoDate(date){
 if(!date)return null;
 const s=String(date).trim();const match=s.match(/^(\d{4})[-/](\d\d?)[-/](\d\d?)$/);
 if(!match)return null;
 const y=+match[1],m=+match[2],d=+match[3],dateObj=new Date(Date.UTC(y,m-1,d));
 if(dateObj.getUTCFullYear()!==y||dateObj.getUTCMonth()!==m-1||dateObj.getUTCDate()!==d)return null;
 return [y,String(m).padStart(2,'0'),String(d).padStart(2,'0')].join('-');
}
function csvEntries(csv,name){
 const rows=parseCSV(csv.replace(/^\uFEFF/,''));if(rows.length<2)throw Error('The file contains no movie rows.');
 const header=rows.shift().map(s=>s.trim().toLowerCase());const index=label=>header.indexOf(label.toLowerCase());
 const titleAt=index('Name'),ratingAt=index('Rating');
 if(titleAt<0||ratingAt<0)throw Error('Missing Name or Rating columns. Export diary.csv or ratings.csv from Letterboxd.');
 const yearAt=index('Year'),urlAt=index('Letterboxd URI'),watchAt=index('Watched Date');
 const isDiary=watchAt>=0||/diary/i.test(name||'');
 return rows.map(row=>{
  const title=(row[titleAt]||'').trim(),score=Number((row[ratingAt]||'').trim()),year=yearAt>=0?(row[yearAt]||'').trim():'';
  const url=urlAt>=0?(row[urlAt]||'').trim():'';
  const watchedDate=isDiary&&watchAt>=0?isoDate(row[watchAt]):null;
  if(!title||!Number.isFinite(score)||score<0.5||score>5)return null;
  return {title,score,year,url:/^https:\/\/letterboxd\.com\//.test(url)?url:null,watchedDate};
 }).filter(Boolean);
}
$('letterboxd-files').addEventListener('change',async event=>{
 const files=[...event.target.files].filter(x=>x.name.toLowerCase().endsWith('.csv'));
 const status=$('letterboxd-import-status');
 if(!files.length){status.textContent='Select diary.csv or ratings.csv from your Letterboxd export.';return;}
 try{
  let imported=[];for(const file of files){if(file.size>8*1024*1024)throw Error('Each CSV must be under 8 MB.');imported.push(...csvEntries(await file.text(),file.name));}
  if(!imported.length)throw Error('No rated movies found in the CSV file(s).');
  letterboxdEntries=movieRanking(letterboxdEntries.concat(imported));
  try{localStorage.setItem(localMovieKey,JSON.stringify(letterboxdEntries));status.textContent='Loaded '+letterboxdEntries.length+' rated movies. Saved only in this browser.';}
  catch{status.textContent='Loaded '+letterboxdEntries.length+' rated movies for this session; browser storage unavailable.';}
  movieSource='letterboxd';renderTopFilms();
 }catch(e){status.textContent=e.message;}
});
$('letterboxd-clear').addEventListener('click',()=>{
 letterboxdEntries=[];try{localStorage.removeItem(localMovieKey)}catch{}
 $('letterboxd-files').value='';$('letterboxd-import-status').textContent='Saved Letterboxd data cleared from this device.';movieSource='letterboxd';renderTopFilms();
});
renderTopFilms();
loadLetterboxdDiarySync();
