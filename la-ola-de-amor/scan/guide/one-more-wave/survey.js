(() => {
'use strict';
const ENDPOINT='https://fgtowzonkmirmugnzlsf.supabase.co/functions/v1/loda-one-more-wave';
const ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZndG93em9ua21pcm11Z256bHNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1MTk5MDIsImV4cCI6MjEwNzA5NTkwMn0.XgVqz_1hvkHv-TptiAXou5RTQMCi8kkJUQjJ6wS3gQc';
const form=document.querySelector('#survey'),status=document.querySelector('#status'),button=document.querySelector('#send');
const answerFields=['moment','connection','difficulties','keep_change','missed_details','worth_trip','notes'];
const fields=[...answerFields,'guest_name','contact'];
let lang='en',sending=false,sent=false,requestId=crypto.randomUUID(),openedAt=Date.now(),statusKey='';
const messages={sending:['Sending your little wave…','Enviando tu pequeña ola…'],empty:['Answer any question or leave a little note before sending.','Responde cualquier pregunta o deja una pequeña nota antes de enviar.'],consent:['Choose what we may contact you about, or remove your contact details.','Elige sobre qué podemos escribirte o quita tus datos de contacto.'],offline:['You’re offline. Your answers are still here—reconnect and try again.','Estás sin conexión. Tus respuestas siguen aquí; conéctate e inténtalo de nuevo.'],error:['We couldn’t confirm your answers were saved. They’re still here; please try again.','No pudimos confirmar que tus respuestas se guardaron. Siguen aquí; inténtalo de nuevo.'],wait:['Take a little moment, then try again.','Espera un momento e inténtalo de nuevo.'],limit:['Please wait a little before trying again. Your answers are still here.','Espera un poco antes de volver a intentarlo. Tus respuestas siguen aquí.']};
try{lang=localStorage.getItem('laOlaGuideLang')==='es'?'es':'en';}catch{}
const requested=new URL(location.href).searchParams.get('lang');if(['en','es'].includes(requested))lang=requested;
function showStatus(key,error=false){statusKey=key;status.textContent=key?messages[key][lang==='es'?1:0]:'';status.classList.toggle('error',error);if(error)status.focus();}
function setLanguage(next){lang=next;document.documentElement.lang=lang==='es'?'es-MX':'en';const current=new URL(location.href);current.searchParams.set('lang',lang);history.replaceState(history.state,'',current.pathname+current.search+current.hash);document.title=(lang==='es'?'Una ola más':'One more wave')+' · La Ola de Amor';document.querySelectorAll('[data-en]').forEach(el=>el.textContent=el.dataset[lang]);document.querySelectorAll('[data-lang]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.lang===lang)));document.querySelector('.languages').setAttribute('aria-label',lang==='es'?'Idioma':'Language');document.querySelector('.survey-shortcuts').setAttribute('aria-label',lang==='es'?'Elige por dónde empezar':'Choose where to start');document.querySelectorAll('header a, footer a, #thanks a').forEach(a=>{const url=new URL(a.getAttribute('href'),location.href);url.searchParams.set('lang',lang);a.href=url.href;});try{localStorage.setItem('laOlaGuideLang',lang);}catch{}if(statusKey)showStatus(statusKey,status.classList.contains('error'));}
document.querySelectorAll('[data-lang]').forEach(el=>el.addEventListener('click',()=>setLanguage(el.dataset.lang)));
form.addEventListener('submit',async event=>{
 event.preventDefault();if(sending||sent)return;
 const data=new FormData(form),payload={id:requestId,language:lang,website:data.get('website')||'',elapsed:Date.now()-openedAt,future_interest:data.get('future_interest')||'',follow_memories:data.has('follow_memories'),follow_gatherings:data.has('follow_gatherings')};
 fields.forEach(field=>payload[field]=String(data.get(field)||'').trim());
 if(!answerFields.some(field=>payload[field])&&!payload.future_interest){showStatus('empty',true);return;}
 if(payload.contact&&!payload.follow_memories&&!payload.follow_gatherings){document.querySelector('#follow-up').open=true;showStatus('consent',true);return;}
 if(!navigator.onLine){showStatus('offline',true);return;}
 sending=true;button.disabled=true;form.setAttribute('aria-busy','true');showStatus('sending');
 try{
  const response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',apikey:ANON,Authorization:'Bearer '+ANON},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});
  const result=await response.json();
  if(!response.ok||result.ok!==true){const keys={ADD_ONE_ANSWER:'empty',CONTACT_PERMISSION_REQUIRED:'consent',PLEASE_TAKE_A_MOMENT:'wait',PLEASE_TRY_LATER:'limit'};showStatus(keys[result.error]||'error',true);return;}
  sent=true;form.hidden=true;const thanks=document.querySelector('#thanks');thanks.hidden=false;thanks.focus();
 }catch{showStatus(navigator.onLine?'error':'offline',true);}finally{sending=false;button.disabled=sent;form.removeAttribute('aria-busy');}
});
setLanguage(lang);button.disabled=false;
})();
