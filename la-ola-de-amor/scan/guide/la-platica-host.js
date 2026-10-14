'use strict';
/* Private host passwords derive a token for the protected Edge function.
   Credentials never enter repository, URL, server logs or localStorage. */
(()=>{
const API='https://fgtowzonkmirmugnzlsf.supabase.co/functions/v1/loda-guest-wall';
const PUSH_API='https://fgtowzonkmirmugnzlsf.supabase.co/functions/v1/loda-festival-push';
const ANON=window.__platicaAnonKey;
const strings={
 en:{hostLabel:'Hosts only · Moderation',hostNameLabel:'Host',keyLabel:'Private host password',unlock:'Unlock host tools',hostDescription:'Choose Hide on a public guest note to remove it from view.',lock:'Lock host tools',bad:'That password was not accepted.',ready:'Host tools unlocked.',hidden:'Message hidden.',hide:'Hide note',
 pushTitle:'🔔 Festival push controls',pushExplain:'Review the full festival showflow, test your phone, then schedule Thursday through Saturday alerts.',
 sendTest:'Send test to this phone 🔔',sendStressBeta:'Beta Test — The Stress Report 🌊🔔',previewPush:'Review 31 alerts ↗',schedulePush:'Schedule 31 festival alerts 🪩',
 noSubscription:'Enable Festival Alerts on this device first, then try again.',
 noKey:'Push delivery needs the private OneSignal key in Supabase Edge Function Secrets before sending.',
 testSent:'Test push requested. Lock your phone and watch for the banner! 🔔',
 stressSent:'The Stress Report was accepted by OneSignal. Ask friends to send a 🌊 in the chat if it arrived. Delivery is not guaranteed.',
 stressAlready:'The Stress Report was already sent once. It will not be sent again.',
 stressConfirm:'Send “Beta Test — The Stress Report” NOW to all devices opted into Festival Alerts? This is a ONE-TIME independent test. It will not schedule or send any of the 31 wedding alerts.',
 betaFail:'Beta could not be sent. Check your OneSignal subscriptions and private key.',
 scheduleDone:'All 31 festival notifications have accepted OneSignal scheduling receipts for October 15–17 (Guadalajara time). 🌊',
 schedulePartial:'Only %COUNT% of 31 alerts have confirmed scheduling receipts. Please tap Schedule 31 again to complete the remaining alerts.',
 scheduleAlready:'All 31 alerts were already scheduled. No duplicate sends were created.',
 pushFailed:'Push delivery could not be completed. Check Supabase configuration and OneSignal.',
 confirmSchedule:'Schedule 31 festival announcements for October 15–17 (including Thursday\'s noon setup-party invite), only to guests subscribed to Festival Alerts? This schedules future delivery; nothing is sent now.'},
 es:{hostLabel:'Solo anfitriones · Moderación',hostNameLabel:'Anfitrión',keyLabel:'Contraseña privada de anfitrión',unlock:'Abrir controles',hostDescription:'Pulsa Ocultar junto a un mensaje para retirarlo de la vista pública.',lock:'Cerrar controles',bad:'No se aceptó esa contraseña.',ready:'Controles activados.',hidden:'Mensaje oculto.',hide:'Ocultar mensaje',
 pushTitle:'🔔 Controles de avisos',pushExplain:'Revisa todo el programa, prueba tu teléfono y luego programa avisos del jueves al sábado.',
 sendTest:'Enviar prueba a este teléfono 🔔',sendStressBeta:'Prueba Beta — El Reporte del Estrés 🌊🔔',previewPush:'Revisar 31 avisos ↗',schedulePush:'Programar 31 avisos 🪩',
 noSubscription:'Primero activa las alertas del festival en este teléfono.',
 noKey:'Falta configurar la clave privada de OneSignal en Supabase Edge Function Secrets.',
 testSent:'Prueba solicitada. ¡Bloquea el teléfono y espera el aviso! 🔔',
 stressSent:'OneSignal aceptó El Reporte del Estrés. Pide que manden una 🌊 al chat si les llegó. Aún no confirma la entrega.',
 stressAlready:'El Reporte del Estrés ya se envió una vez. No se enviará de nuevo.',
 stressConfirm:'¿Enviar AHORA “Prueba Beta — El Reporte del Estrés” a todos los dispositivos que activaron Alertas del Festival? Es una prueba independiente DE UNA SOLA VEZ; no programa ni envía los 31 avisos de la boda.',
 betaFail:'No se pudo enviar la prueba. Revisa los suscriptores de OneSignal y la clave privada.',
 scheduleDone:'Los 31 avisos tienen comprobantes de programación aceptados por OneSignal del 15 al 17 de octubre (hora de Guadalajara). 🌊',
 schedulePartial:'Solo %COUNT% de 31 avisos tienen comprobante de programación. Vuelve a pulsar Programar 31 para terminar los pendientes.',
 scheduleAlready:'Los 31 avisos ya estaban programados. No se duplicaron los envíos.',
 pushFailed:'No se pudo completar. Revisa la configuración de Supabase y OneSignal.',
 confirmSchedule:'¿Programamos 31 avisos del 15 al 17 de octubre (incluida la invitación del jueves al mediodía), solo para quienes activaron Alertas del Festival? No se enviarán ahora.'}
};const by=id=>document.getElementById(id),lang=()=>document.documentElement.lang.startsWith('es')?'es':'en',t=k=>strings[lang()][k];let key='';
function updateHostCopy(){document.querySelectorAll('[data-host-copy]').forEach(node=>{const value=t(node.dataset.hostCopy);if(typeof value==='string')node.textContent=value})}
updateHostCopy();
async function hostToken(password,host){const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new TextEncoder().encode('loda-host-password-v2:'+host),iterations:600000},material,256);return [...new Uint8Array(bits)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function headers(){return {'apikey':ANON,'authorization':'Bearer '+ANON,'content-type':'application/json','x-loda-moderator-token':key}}
async function send(action,fields={}){const r=await fetch(API,{method:'POST',headers:headers(),body:JSON.stringify({action,...fields})});if(!r.ok)throw Error('NOT_AUTHORIZED');return r.json()}
async function sendPush(action,fields={}){
 const r=await fetch(PUSH_API,{method:'POST',headers:headers(),body:JSON.stringify({action,...fields})});
 let data={};try{data=await r.json()}catch{}
 if(!r.ok){const error=new Error(data.error||'PUSH_FAILED');error.providerCode=data.providerCode;error.providerStatus=data.providerStatus;throw error}
 return data;
}
function displayPushResult(text){const node=by('platica-host-push-result');if(node)node.textContent=text}
function pushError(error){
 if(error.message==='PUSH_NOT_CONFIGURED'){displayPushResult(t('noKey'));return}
 if(error.message==='SCHEDULED_BUT_RECEIPT_FAILED'){
  displayPushResult(lang()==='en'
   ? 'OneSignal may have accepted an alert but its receipt failed in Supabase. Do not manually duplicate it. Error: SCHEDULED_BUT_RECEIPT_FAILED.'
   : 'OneSignal pudo aceptar un aviso, pero falló el comprobante de Supabase. No lo dupliques manualmente. Error: SCHEDULED_BUT_RECEIPT_FAILED.');return;
 }
 if(error.message==='SCHEDULE_NO_PROGRESS'){
  displayPushResult(lang()==='en'?'No scheduling progress was saved; please report this to ChatGPT.':'No se guardó progreso de programación; avisa a ChatGPT.');return;
 }
 const reasons={
  KEY_REJECTED:{
   en:'OneSignal rejected the API key. Verify the App API Key belongs to La Ola De Amor in OneSignal Settings → Keys & IDs.',
   es:'OneSignal rechazó la clave. Revisa que la App API Key pertenezca a La Ola De Amor en OneSignal → Keys & IDs.'
  },
  NO_MATCHING_SUBSCRIPTIONS:{
   en:'OneSignal found no matching subscribed devices. Have everyone open the installed app and check Festival Alerts ON, then retry.',
   es:'OneSignal no encontró dispositivos suscritos. Abre la app instalada, revisa Alertas del Festival ACTIVADAS e intenta otra vez.'
  },
  APP_ID_INVALID:{
   en:'OneSignal says the application ID does not match. Check the API key was created for this OneSignal app.',
   es:'OneSignal indica un problema con el ID de la app. Revisa que la clave corresponda a esta app.'
  },
  AUDIENCE_INVALID:{
   en:'OneSignal rejected the audience filter; ask ChatGPT to inspect the send parameters.',
   es:'OneSignal rechazó el filtro de destinatarios; pide a ChatGPT revisar los parámetros.'
  },
  ACCOUNT_LIMIT:{
   en:'OneSignal reported an account or sending limit. Check your OneSignal dashboard.',
   es:'OneSignal reportó un límite de cuenta o envíos. Revisa el panel de OneSignal.'
  },
  REQUEST_INVALID:{
   en:'OneSignal rejected the request format. Tell ChatGPT this diagnostic code.',
   es:'OneSignal rechazó el formato del envío. Comunica a ChatGPT este diagnóstico.'
  },
  PROVIDER_ERROR:{
   en:'OneSignal returned a service error. Ask ChatGPT to check the server logs.',
   es:'OneSignal devolvió un error de servicio. Pide a ChatGPT revisar los registros.'
  }
 };
 const explanation=reasons[error.providerCode]?.[lang()]||t('pushFailed');
 const suffix=error.providerCode?' · '+error.providerCode+(Number.isInteger(error.providerStatus)?' (HTTP '+error.providerStatus+')':''):'';
 displayPushResult(explanation+suffix);
}
async function runPushTest(){
 const btn=by('platica-host-push-test');
 const sub=window.LA_OLA_PUSH;
 if(!sub?.subscribed()||!sub.subscriptionId()){displayPushResult(t('noSubscription'));return}
 btn.disabled=true;
 try{await sendPush('test',{subscriptionId:sub.subscriptionId()});displayPushResult(t('testSent'))}
 catch(err){pushError(err)}
 finally{btn.disabled=false}
}
// A response to "schedule" is not enough: verify accepted provider IDs are
// actually persisted for all 31 planned events before reporting success.
async function confirmedScheduleCount(){
 const result=await sendPush('status');
 return new Set((result.scheduled||[]).filter(item=>item.provider_notification_id).map(item=>item.event_id)).size;
}
function displayScheduleCount(count){
 displayPushResult(t('schedulePartial').replace('%COUNT%',String(count)));
}
async function schedulePush(){
 if(!confirm(t('confirmSchedule')))return;
 const btn=by('platica-host-push-schedule');
 btn.disabled=true;
 let count=0;
 try{
  // Small batches keep the iPhone request alive and allow safe retries.
  // A notification already queued at OneSignal retains its deterministic
  // idempotency key, so a missing Supabase receipt can be recovered.
  count=await confirmedScheduleCount();
  if(count===31){displayPushResult(t('scheduleAlready'));return}
  for(let attempt=0;attempt<8 && count<31;attempt++){
   displayScheduleCount(count);
   const data=await sendPush('schedule');
   const next=await confirmedScheduleCount();
   if(next===31){
    const already=attempt===0&&data.results?.every(item=>item.status==='already_scheduled');
    displayPushResult(t(already?'scheduleAlready':'scheduleDone'));
    return;
   }
   if(next<=count)throw Error('SCHEDULE_NO_PROGRESS');
   count=next;
  }
  displayScheduleCount(count);
 }catch(err){
  pushError(err);
  const diagnostic=by('platica-host-push-result')?.textContent||'';
  try {
   count=await confirmedScheduleCount();
   if(count===31)displayPushResult(t('scheduleDone'));
   else displayPushResult(diagnostic+' '+t('schedulePartial').replace('%COUNT%',String(count)));
  }catch{
   // Preserve the real diagnostic when protected status cannot be read.
  }
 }finally{btn.disabled=false}
}
by('platica-host-push-preview')?.addEventListener('click',async()=>{
 const button=by('platica-host-push-preview');button.disabled=true;
 try{
  const data=await sendPush('preview');
  const date=new Intl.DateTimeFormat(lang()==='en'?'en-US':'es-MX',{timeZone:'America/Mexico_City',weekday:'short',hour:'numeric',minute:'2-digit'});
  displayPushResult((data.program||[]).map(item=>date.format(new Date(item.at))+' · '+item.title[lang()]+' ['+item.status+']\n'+item.body[lang()]).join('\n\n'));
 }catch(error){pushError(error)}
 finally{button.disabled=false}
});
by('platica-host-push-test')?.addEventListener('click',runPushTest);
by('platica-host-push-stress')?.addEventListener('click',async()=>{
 if(!confirm(t('stressConfirm')))return;
 const btn=by('platica-host-push-stress');btn.disabled=true;
 try{
  const data=await sendPush('stress_report');
  const count=Number.isInteger(data.recipients)?' · '+data.recipients+' '+(lang()==='en'?'recipients reported':'destinatarios reportados'):'';
  displayPushResult(t(data.alreadySent?'stressAlready':'stressSent')+count);
  if(data.feedSaved===false)displayPushResult(t('pushFailed'));
 }catch(error){pushError(error)}
 finally{btn.disabled=false}
});
by('platica-host-push-schedule')?.addEventListener('click',schedulePush);
function decorate(){document.querySelectorAll('.platica-message').forEach(li=>{if(li.querySelector('[data-platica-hide]'))return;const id=li.dataset.messageId;if(!id||!key)return;const btn=document.createElement('button');btn.type='button';btn.dataset.platicaHide=id;btn.className='platica-hide';btn.textContent=t('hide');btn.addEventListener('click',async()=>{btn.disabled=true;try{await send('moderate',{id,status:'hidden'});li.remove();by('platica-host-notice').textContent=t('hidden')}catch{btn.disabled=false;by('platica-host-notice').textContent=t('bad')}});li.append(btn)})}
new MutationObserver(decorate).observe(by('platica-messages'),{childList:true});
by('platica-host-login').addEventListener('submit',async e=>{e.preventDefault();const input=by('platica-host-key'),candidate=input.value;input.value='';if(candidate.length<12||candidate.length>128){by('platica-host-notice').textContent=t('bad');return}
try{key=await hostToken(candidate,by('platica-host-name').value);await send('auth');by('platica-host-login').hidden=true;by('platica-host-panel').hidden=false;by('platica-host-notice').textContent=t('ready');decorate()}catch{key='';by('platica-host-notice').textContent=t('bad')}});
by('platica-host-logout').addEventListener('click',()=>{key='';by('platica-host-panel').hidden=true;by('platica-host-login').hidden=false;document.querySelectorAll('[data-platica-hide]').forEach(b=>b.remove());by('platica-host-notice').textContent=''});
document.querySelectorAll('[data-lang]').forEach(btn=>btn.addEventListener('click',()=>queueMicrotask(()=>{updateHostCopy();document.querySelectorAll('[data-platica-hide]').forEach(b=>b.textContent=t('hide'))})));
})();
