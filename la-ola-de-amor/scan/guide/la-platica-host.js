'use strict';
/* Private host passwords derive a token for the protected Edge function.
   Credentials never enter repository, URL, server logs or localStorage. */
(()=>{
const API='https://fgtowzonkmirmugnzlsf.supabase.co/functions/v1/loda-guest-wall';
const ANON=window.__platicaAnonKey;
const strings={
 en:{hostLabel:'Hosts only · Moderation',hostNameLabel:'Host',keyLabel:'Private host password',unlock:'Unlock host tools',hostDescription:'Choose Hide on a public guest note to remove it from view.',lock:'Lock host tools',bad:'That password was not accepted.',ready:'Host tools unlocked.',hidden:'Message hidden.',hide:'Hide note'},
 es:{hostLabel:'Solo anfitriones · Moderación',hostNameLabel:'Anfitrión',keyLabel:'Contraseña privada de anfitrión',unlock:'Abrir controles',hostDescription:'Pulsa Ocultar junto a un mensaje para retirarlo de la vista pública.',lock:'Cerrar controles',bad:'No se aceptó esa contraseña.',ready:'Controles activados.',hidden:'Mensaje oculto.',hide:'Ocultar mensaje'}
};const by=id=>document.getElementById(id),lang=()=>document.documentElement.lang.startsWith('es')?'es':'en',t=k=>strings[lang()][k];let key='';
async function hostToken(password,host){const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new TextEncoder().encode('loda-host-password-v2:'+host),iterations:600000},material,256);return [...new Uint8Array(bits)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function headers(){return {'apikey':ANON,'authorization':'Bearer '+ANON,'content-type':'application/json','x-loda-moderator-token':key}}
async function send(action,fields={}){const r=await fetch(API,{method:'POST',headers:headers(),body:JSON.stringify({action,...fields})});if(!r.ok)throw Error('NOT_AUTHORIZED');return r.json()}
function decorate(){document.querySelectorAll('.platica-message').forEach(li=>{if(li.querySelector('[data-platica-hide]'))return;const id=li.dataset.messageId;if(!id||!key)return;const btn=document.createElement('button');btn.type='button';btn.dataset.platicaHide=id;btn.className='platica-hide';btn.textContent=t('hide');btn.addEventListener('click',async()=>{btn.disabled=true;try{await send('moderate',{id,status:'hidden'});li.remove();by('platica-host-notice').textContent=t('hidden')}catch{btn.disabled=false;by('platica-host-notice').textContent=t('bad')}});li.append(btn)})}
new MutationObserver(decorate).observe(by('platica-messages'),{childList:true});
by('platica-host-login').addEventListener('submit',async e=>{e.preventDefault();const input=by('platica-host-key'),candidate=input.value;input.value='';if(candidate.length<12||candidate.length>128){by('platica-host-notice').textContent=t('bad');return}
try{key=await hostToken(candidate,by('platica-host-name').value);await send('auth');by('platica-host-login').hidden=true;by('platica-host-panel').hidden=false;by('platica-host-notice').textContent=t('ready');decorate()}catch{key='';by('platica-host-notice').textContent=t('bad')}});
by('platica-host-logout').addEventListener('click',()=>{key='';by('platica-host-panel').hidden=true;by('platica-host-login').hidden=false;document.querySelectorAll('[data-platica-hide]').forEach(b=>b.remove());by('platica-host-notice').textContent=''});
document.querySelectorAll('[data-lang]').forEach(btn=>btn.addEventListener('click',()=>queueMicrotask(()=>{document.querySelectorAll('[data-host-copy]').forEach(node=>node.textContent=t(node.dataset.hostCopy));document.querySelectorAll('[data-platica-hide]').forEach(b=>b.textContent=t('hide'))})));
})();
