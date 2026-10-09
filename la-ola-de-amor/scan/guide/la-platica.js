'use strict';
/* La Plática — public guests, protected Edge function, no credentials stored in site source. */
(() => {
const API='https://fgtowzonkmirmugnzlsf.supabase.co/functions/v1/loda-guest-wall';
const ANON="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZndG93em9ua21pcm11Z256bHNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1MTk5MDIsImV4cCI6MjEwNzA5NTkwMn0.XgVqz_1hvkHv-TptiAXou5RTQMCi8kkJUQjJ6wS3gQc";
const copy={
 en:{intro:'Our people, our stories, our little corner of La Ola.',wallTitle:'Notes from our people',wallNote:'Little messages, big love.',writeTitle:'Leave a little love',nameLabel:'Your name',messageLabel:'Your message',send:'Send a little love ♥',guideline:'Be kind. Your message appears for everyone once it is saved. The hosts may remove inappropriate messages.',loading:'Gathering the love notes…',empty:'The first note is waiting for you. ♥',sent:'¡Tu mensaje ya está en La Ola! 🌊',offline:'Guest messages need an internet connection.',failed:'The message did not go through. Try again.',slow:'So much love! Wait a bit before posting again.',links:'Please keep links out of guest notes.'},
 es:{intro:'Nuestra gente, nuestras historias, nuestro rinconcito en La Ola.',wallTitle:'Mensajes de nuestra gente',wallNote:'Palabritas que se quedan con nosotros.',writeTitle:'Deja un poquito de amor',nameLabel:'Tu nombre',messageLabel:'Tu mensaje',send:'Manda un poquito de amor ♥',guideline:'Con cariño y respeto. Tu mensaje aparece para todos al guardarse. Los anfitriones pueden retirar mensajes inapropiados.',loading:'Reuniendo los mensajitos…',empty:'El primer mensajito te está esperando. ♥',sent:'¡Tu mensaje ya está en La Ola! 🌊',offline:'Se necesita internet para leer y enviar mensajes.',failed:'No se pudo enviar. Intenta otra vez.',slow:'¡Mucho amor! Espera un poquito antes de volver a escribir.',links:'Evita poner enlaces en los mensajes.'}
};
const by=id=>document.getElementById(id),lang=()=>document.documentElement.lang.startsWith('es')?'es':'en',t=k=>copy[lang()][k];
window.__platicaAnonKey=ANON;
const headers={'apikey':ANON,'authorization':'Bearer '+ANON};
const date=stamp=>new Intl.DateTimeFormat(lang()==='es'?'es-MX':'en-US',{timeZone:'America/Mexico_City',year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(stamp));
let messages=[],busy=false;
function applyCopy(){document.querySelectorAll('[data-platica-copy]').forEach(node=>{const value=t(node.dataset.platicaCopy);if(value)node.textContent=value;});render()}
function render(){const host=by('platica-messages');if(!host)return;host.replaceChildren();if(!messages.length){const li=document.createElement('li');li.className='platica-message';li.textContent=t('empty');host.append(li);return}
messages.forEach(x=>{const li=document.createElement('li');li.className='platica-message';li.dataset.messageId=x.id;const row=document.createElement('div');row.className='platica-message-head';const who=document.createElement('strong');who.textContent=x.guest_name;const when=document.createElement('time');when.dateTime=x.created_at;when.textContent=date(x.created_at);row.append(who,when);const note=document.createElement('p');note.textContent=x.message;li.append(row,note);host.append(li)})}
async function fetchMessages(){const status=by('platica-load-status');if(!status)return;status.textContent=t('loading');try{const r=await fetch(API,{headers,cache:'no-store'});if(!r.ok)throw Error('Read error');const data=await r.json();messages=Array.isArray(data.messages)?data.messages:[];render();status.textContent='';}catch{status.textContent=t('offline')}}
async function submit(e){e.preventDefault();if(busy)return;const form=by('platica-form'),name=by('platica-name').value.trim(),message=by('platica-message').value.trim(),status=by('platica-form-status'),submit=by('platica-submit');if(name.length<2||name.length>48||message.length<1||message.length>500)return;
busy=true;submit.disabled=true;status.textContent='';try{const r=await fetch(API,{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({name,message,website:form.elements.website.value})});const data=await r.json();if(!r.ok){if(r.status===429)throw Error('slow');if(data.error==='LINKS_NOT_ALLOWED')throw Error('links');throw Error('post')}
status.textContent=t('sent');by('platica-message').value='';by('platica-count').textContent='0 / 500';await fetchMessages();
}catch(e){status.textContent=t(e.message==='slow'?'slow':e.message==='links'?'links':'failed')}finally{busy=false;submit.disabled=false}}
by('platica-form')?.addEventListener('submit',submit);
by('platica-message')?.addEventListener('input',e=>{by('platica-count').textContent=e.target.value.length+' / 500'});
document.querySelectorAll('[data-lang]').forEach(btn=>btn.addEventListener('click',()=>queueMicrotask(applyCopy)));
addEventListener('hashchange',()=>{if(location.hash.startsWith('#updates'))fetchMessages()});
addEventListener('online',()=>{if(location.hash.startsWith('#updates'))fetchMessages()});
setInterval(()=>{if(location.hash.startsWith('#updates')&&!document.hidden)fetchMessages()},60000);
applyCopy();if(location.hash.startsWith('#updates'))fetchMessages();
})();
