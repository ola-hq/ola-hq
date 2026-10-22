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
 let referrer='';try{const u=new URL(document.referrer);if(u.origin!==location.origin)referrer=u.hostname}catch{}
 async function flush(){
  if(busy||!queue.length||!navigator.onLine)return;
  if(disabled()){queue=[];write('olaAnalyticsQueue',[]);return}
  busy=true;const batch=queue.slice(0,20);
  try{const r=await fetch(API,{method:'POST',headers:{'content-type':'application/json','apikey':ANON,'authorization':'Bearer '+ANON},body:JSON.stringify({action:'collect',events:batch}),keepalive:true});
   if(r.ok){const sent=new Set(batch.map(e=>e.id));queue=queue.filter(e=>!sent.has(e.id));write('olaAnalyticsQueue',queue)}
  }catch{}finally{busy=false}
 }
 function track(event_name,target='',label=''){
  if(disabled())return;
  queue.push({id:id(),visitor_id:visitor,session_id:session(),event_name,path:path(location),mode:mode(),target,label,referrer_host:referrer,language:document.documentElement.lang.slice(0,12),occurred_at:new Date().toISOString(),is_test:read('olaAnalyticsTest',false)===true});
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
 },true);
 window.addEventListener('hashchange',page);
 window.addEventListener('popstate',page);
 window.addEventListener('pageshow',e=>{if(e.persisted){lastPath='';page()}});
 window.addEventListener('appinstalled',()=>track('app_install'));
 window.addEventListener('online',()=>void flush());
 window.addEventListener('pagehide',()=>void flush());
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')void flush()});
 setInterval(()=>void flush(),10000);
 page();
})();
