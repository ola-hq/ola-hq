/* OLA aggregate usage: no names, form values, query strings or raw IP addresses. */
(()=>{
 'use strict';
 if(window.__olaAnalyticsLoaded)return;
 window.__olaAnalyticsLoaded=true;
 const ROOT='/ola-hq/',API='https://fgtowzonkmirmugnzlsf.supabase.co/functions/v1/ola-analytics';
 const ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZndG93em9ua21pcm11Z256bHNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1MTk5MDIsImV4cCI6MjEwNzA5NTkwMn0.XgVqz_1hvkHv-TptiAXou5RTQMCi8kkJUQjJ6wS3gQc';
 const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
 const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
 const disabled=()=>navigator.globalPrivacyControl===true||navigator.doNotTrack==='1'||read('olaAnalyticsDisabled',false);
 if(location.hostname!=='ola-hq.github.io'||!location.pathname.startsWith(ROOT)||location.pathname.startsWith(ROOT+'analytics')||disabled())return;
 const id=()=>crypto.randomUUID();
 let visitor=read('olaAnalyticsVisitor',null);
 if(!/^[a-f0-9-]{36}$/i.test(visitor||'')){visitor=id();write('olaAnalyticsVisitor',visitor)}
 let queue=read('olaAnalyticsQueue',[]).filter(e=>Date.parse(e.occurred_at)>Date.now()-7*86400000).slice(-100),busy=false,lastPath='';
 const path=url=>url.pathname.replace(/[^a-z0-9_./-]/gi,'').slice(0,200)+(/^#[a-z0-9_./-]{1,90}$/i.test(url.hash)?url.hash:'');
 const mode=()=>{try{return navigator.standalone===true||matchMedia('(display-mode: standalone)').matches||window.top!==window&&window.top.matchMedia('(display-mode: standalone)').matches?'standalone':'browser'}catch{return 'browser'}};
 const session=()=>{let s=read('olaAnalyticsSession',{});if(!s.id||Date.now()-s.at>1800000)s={id:id()};s.at=Date.now();write('olaAnalyticsSession',s);return s.id};
 const agent=navigator.userAgent||'';
 const os=/iPhone|iPad|iPod/i.test(agent)?'iOS':/Android/i.test(agent)?'Android':/Windows/i.test(agent)?'Windows':/Mac OS/i.test(agent)?'macOS':/Linux/i.test(agent)?'Linux':'other';
 const device=/iPad|Tablet/i.test(agent)||(/Android/i.test(agent)&&!/Mobile/i.test(agent))?'tablet':/iPhone|iPod|Android.*Mobile|Mobile/i.test(agent)?'mobile':'desktop';
 const browser=/Edg\//.test(agent)?'Edge':/SamsungBrowser\//.test(agent)?'Samsung Internet':/Firefox\//.test(agent)?'Firefox':/CriOS|Chrome\//.test(agent)?'Chrome':/Safari\//.test(agent)?'Safari':'other';
 const screenBucket=()=>innerWidth<600?'small':innerWidth<1000?'medium':innerWidth<1600?'large':'xlarge';
 const params=new URLSearchParams(location.search);
 const campaign={campaign_source:(params.get('utm_source')||'').replace(/[^a-z0-9_ .-]/gi,'').slice(0,60),campaign_medium:(params.get('utm_medium')||'').replace(/[^a-z0-9_ .-]/gi,'').slice(0,60),campaign_name:(params.get('utm_campaign')||'').replace(/[^a-z0-9_ .-]/gi,'').slice(0,80)};
 let referrer='';try{const u=new URL(document.referrer);if(u.origin!==location.origin)referrer=u.hostname}catch{}
 async function flush(){
  if(busy||!queue.length||!navigator.onLine)return;
  if(disabled()){queue=[];write('olaAnalyticsQueue',[]);return}
  busy=true;const batch=queue.slice(0,20);
  try{const r=await fetch(API,{method:'POST',headers:{'content-type':'application/json','apikey':ANON,'authorization':'Bearer '+ANON},body:JSON.stringify({action:'collect',events:batch}),keepalive:true});
   if(r.ok){const sent=new Set(batch.map(e=>e.id));queue=queue.filter(e=>!sent.has(e.id));write('olaAnalyticsQueue',queue)}
  }catch{}finally{busy=false}
 }
 function track(event_name,target='',label='',metrics={}){
  if(disabled())return;
  queue.push({id:id(),visitor_id:visitor,session_id:session(),event_name,path:path(location),mode:mode(),target,label,device_type:device,os_family:os,browser_family:browser,screen_bucket:screenBucket(),...campaign,...metrics,referrer_host:referrer,language:document.documentElement.lang.slice(0,12),occurred_at:new Date().toISOString(),is_test:read('olaAnalyticsTest',false)===true});
  queue=queue.slice(-100);write('olaAnalyticsQueue',queue);void flush();
 }
 function page(){const p=path(location);if(p!==lastPath){lastPath=p;track('page_view')}}
 document.addEventListener('click',event=>{
  const el=event.target instanceof Element?event.target.closest('a,button,[role="button"],summary'):null;
  if(!el||el.closest('form,[contenteditable],#platica-messages,#platica-hosts,[data-analytics-ignore]'))return;
  let target='',label=(el.id||el.dataset.open||el.dataset.world||el.dataset.i18n||el.dataset.openGallery||el.tagName.toLowerCase()).replace(/[^a-z0-9_./:# -]/gi,'').slice(0,100);
  if(el.tagName==='A'){
   const raw=el.getAttribute('href');if(!raw)return;
   try{const u=new URL(raw,location.href);if(!['https:','http:'].includes(u.protocol))return;
    target=u.origin===location.origin?path(u):u.protocol==='https:'?'https://'+u.hostname+u.pathname.replace(/[^a-z0-9_./-]/gi,'').slice(0,150):'external';
   }catch{return}
  }else target='button:'+label.replace(/[^a-z0-9_./:-]/gi,'-');
  track('click',target,label);
  if(el.tagName==='A'&&/\.(?:pdf|docx?|xlsx?|pptx?|zip|csv|txt|jpe?g|png|webp|svg|mp3|mp4|mov|webm)(?:$|[?#])/i.test(el.getAttribute('href')||''))track('file_open',target,label);
 },true);
 // Observe actual file saves triggered through link download attributes (not server-confirmed transfers).
 document.addEventListener('click',e=>{const a=e.target instanceof Element?e.target.closest('a[download]'):null;if(a){const raw=a.getAttribute('href');if(!raw)return;try{const u=new URL(raw,location.href);track('file_download',u.origin===location.origin?path(u):'external','download_link')}catch{}}},true);
 let activeSeconds=0,lastTick=Date.now(),lastReported=0;
 const active=()=>{const now=Date.now(),delta=Math.max(0,Math.min(15,(now-lastTick)/1000));lastTick=now;if(document.visibilityState==='visible'&&document.hasFocus())activeSeconds+=delta};
 const engagement=()=>{active();const delta=Math.floor(activeSeconds)-lastReported;if(delta>=5){lastReported+=delta;track('engagement','','active_seconds',{duration_seconds:delta})}};
 setInterval(engagement,15000);
 let highWater=0;addEventListener('scroll',()=>{const max=document.documentElement.scrollHeight-innerHeight;if(max<=0)return;const depth=Math.floor(scrollY/max*100);for(const mark of [25,50,75,100])if(depth>=mark&&highWater<mark){highWater=mark;track('scroll_depth','','scroll',{metric_value:mark})}},{passive:true});
 document.addEventListener('play',e=>{if(e.target instanceof HTMLMediaElement)track('media_play','','media')},true);
 document.addEventListener('ended',e=>{if(e.target instanceof HTMLMediaElement)track('media_complete','','media')},true);
 document.addEventListener('timeupdate',e=>{const m=e.target;if(!(m instanceof HTMLMediaElement)||!Number.isFinite(m.duration)||m.duration<=0)return;const percentage=Math.floor(m.currentTime/m.duration*4)*25;const old=Number(m.dataset.olaProgress||'0');if(percentage>old&&percentage<=100){m.dataset.olaProgress=String(percentage);track('media_progress','','media',{metric_value:percentage})}},true);
 window.addEventListener('hashchange',()=>{engagement();activeSeconds=0;lastReported=0;highWater=0;page()});
 window.addEventListener('popstate',page);
 window.addEventListener('pageshow',e=>{if(e.persisted){lastPath='';page()}});
 window.addEventListener('appinstalled',()=>track('app_install'));
 window.addEventListener('online',()=>void flush());
 window.addEventListener('pagehide',()=>{engagement();void flush()});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){engagement();void flush()}});
 setInterval(()=>void flush(),10000);
 page();
})();
