'use strict';
/* Private host passwords derive a token for the protected Edge function.
   Credentials never enter repository, URL, server logs or localStorage. */
(()=>{
const API='https://fgtowzonkmirmugnzlsf.supabase.co/functions/v1/loda-guest-wall';
const PUSH_API='https://fgtowzonkmirmugnzlsf.supabase.co/functions/v1/loda-festival-push';
const ANON=window.__platicaAnonKey;
const strings={
 en:{hostLabel:'Hosts only · Moderation',hostNameLabel:'Host',keyLabel:'Private host password',unlock:'Unlock host tools',hostDescription:'Choose Hide on a public guest note to remove it from view.',lock:'Lock host tools',bad:'That password was not accepted.',ready:'Host tools unlocked.',hidden:'Message hidden.',hide:'Hide note',
 pushTitle:'🔔 Festival push controls',pushExplain:'Review the full wedding showflow, test your phone, then schedule Friday and Saturday alerts.',
 sendTest:'Send test to this phone 🔔',previewPush:'Review 14 alerts ↗',schedulePush:'Schedule 14 festival alerts 🪩',
 noSubscription:'Enable Festival Alerts on this device first, then try again.',
 noKey:'Push delivery needs the private OneSignal key in Supabase Edge Function Secrets before sending.',
 testSent:'Test push requested. Lock your phone and watch for the banner! 🔔',
 scheduleDone:'The festival showflow is scheduled for Friday and Saturday (Guadalajara time). 🌊',
 scheduleAlready:'Those alerts were already scheduled.',
 pushFailed:'Push delivery could not be completed. Check Supabase configuration and OneSignal.',
 confirmSchedule:'Schedule 14 wedding announcements for October 16–17, only to guests subscribed to Festival Alerts? This schedules future delivery; nothing is sent now.'},
 es:{hostLabel:'Solo anfitriones · Moderación',hostNameLabel:'Anfitrión',keyLabel:'Contraseña privada de anfitrión',unlock:'Abrir controles',hostDescription:'Pulsa Ocultar junto a un mensaje para retirarlo de la vista pública.',lock:'Cerrar controles',bad:'No se aceptó esa contraseña.',ready:'Controles activados.',hidden:'Mensaje oculto.',hide:'Ocultar mensaje',
 pushTitle:'🔔 Controles de avisos',pushExplain:'Revisa el programa, prueba tu teléfono y luego programa avisos del viernes y sábado.',
 sendTest:'Enviar prueba a este teléfono 🔔',previewPush:'Revisar 14 avisos ↗',schedulePush:'Programar 14 avisos 🪩',
 noSubscription:'Primero activa las alertas del festival en este teléfono.',
 noKey:'Falta configurar la clave privada de OneSignal en Supabase Edge Function Secrets.',
 testSent:'Prueba solicitada. ¡Bloquea el teléfono y espera el aviso! 🔔',
 scheduleDone:'Los avisos del festival quedaron programados para viernes y sábado (hora de Guadalajara). 🌊',
 scheduleAlready:'Los avisos ya estaban programados.',
 pushFailed:'No se pudo completar. Revisa la configuración de Supabase y OneSignal.',
 confirmSchedule:'¿Programamos 14 avisos del 16 y 17 de octubre, solo para quienes activaron alertas del festival? No se enviarán ahora.'}
};const by=id=>document.getElementById(id),lang=()=>document.documentElement.lang.startsWith('es')?'es':'en',t=k=>strings[lang()][k];let key='';
async function hostToken(password,host){const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new TextEncoder().encode('loda-host-password-v2:'+host),iterations:600000},material,256);return [...new Uint8Array(bits)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function headers(){return {'apikey':ANON,'authorization':'Bearer '+ANON,'content-type':'application/json','x-loda-moderator-token':key}}
async function send(action,fields={}){const r=await fetch(API,{method:'POST',headers:headers(),body:JSON.stringify({action,...fields})});if(!r.ok)throw Error('NOT_AUTHORIZED');return r.json()}
async function sendPush(action,fields={}){
 const r=await fetch(PUSH_API,{method:'POST',headers:headers(),body:JSON.stringify({action,...fields})});
 let data={};try{data=await r.json()}catch{}
 if(!r.ok)throw Error(data.error||'PUSH_FAILED');
 return data;
}
function displayPushResult(text){const node=by('platica-host-push-result');if(node)node.textContent=text}
function pushError(error){displayPushResult(t(error.message==='PUSH_NOT_CONFIGURED'?'noKey':'pushFailed'))}
async function runPushTest(){
 const btn=by('platica-host-push-test');
 const sub=window.LA_OLA_PUSH;
 if(!sub?.subscribed()||!sub.subscriptionId()){displayPushResult(t('noSubscription'));return}
 btn.disabled=true;
 try{await sendPush('test',{subscriptionId:sub.subscriptionId()});displayPushResult(t('testSent'))}
 catch(err){pushError(err)}
 finally{btn.disabled=false}
}
async function schedulePush(){
 if(!confirm(t('confirmSchedule')))return;
 const btn=by('platica-host-push-schedule');
 btn.disabled=true;
 try{
  const data=await sendPush('schedule');
  const already=data.results?.length===14&&data.results.every(item=>item.status==='already_scheduled');
  displayPushResult(t(already?'scheduleAlready':'scheduleDone'));
 }catch(err){pushError(err)}
 finally{btn.disabled=false}
}
by('platica-host-push-preview')?.addEventListener('click',async()=>{
 const button=by('platica-host-push-preview');button.disabled=true;
 try{
  const data=await sendPush('preview');
  const date=new Intl.DateTimeFormat(lang()==='en'?'en-US':'es-MX',{timeZone:'America/Mexico_City',weekday:'short',hour:'numeric',minute:'2-digit'});
  displayPushResult((data.program||[]).map(item=>date.format(new Date(item.at))+' · '+item.title[lang()]+' ['+item.status+']').join('\n'));
 }catch(error){pushError(error)}
 finally{button.disabled=false}
});
by('platica-host-push-test')?.addEventListener('click',runPushTest);
by('platica-host-push-schedule')?.addEventListener('click',schedulePush);
function decorate(){document.querySelectorAll('.platica-message').forEach(li=>{if(li.querySelector('[data-platica-hide]'))return;const id=li.dataset.messageId;if(!id||!key)return;const btn=document.createElement('button');btn.type='button';btn.dataset.platicaHide=id;btn.className='platica-hide';btn.textContent=t('hide');btn.addEventListener('click',async()=>{btn.disabled=true;try{await send('moderate',{id,status:'hidden'});li.remove();by('platica-host-notice').textContent=t('hidden')}catch{btn.disabled=false;by('platica-host-notice').textContent=t('bad')}});li.append(btn)})}
new MutationObserver(decorate).observe(by('platica-messages'),{childList:true});
by('platica-host-login').addEventListener('submit',async e=>{e.preventDefault();const input=by('platica-host-key'),candidate=input.value;input.value='';if(candidate.length<12||candidate.length>128){by('platica-host-notice').textContent=t('bad');return}
try{key=await hostToken(candidate,by('platica-host-name').value);await send('auth');by('platica-host-login').hidden=true;by('platica-host-panel').hidden=false;by('platica-host-notice').textContent=t('ready');decorate()}catch{key='';by('platica-host-notice').textContent=t('bad')}});
by('platica-host-logout').addEventListener('click',()=>{key='';by('platica-host-panel').hidden=true;by('platica-host-login').hidden=false;document.querySelectorAll('[data-platica-hide]').forEach(b=>b.remove());by('platica-host-notice').textContent=''});
document.querySelectorAll('[data-lang]').forEach(btn=>btn.addEventListener('click',()=>queueMicrotask(()=>{document.querySelectorAll('[data-host-copy]').forEach(node=>node.textContent=t(node.dataset.hostCopy));document.querySelectorAll('[data-platica-hide]').forEach(b=>b.textContent=t('hide'))})));
})();
