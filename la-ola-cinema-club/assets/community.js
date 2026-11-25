import {API,ANON} from './community-config.js?v=20261125-worlds34';
export function tallyText(data){if(!data||![data.yes,data.no,data.total].every(n=>Number.isInteger(n)&&n>=0)||data.yes+data.no!==data.total)throw Error('Invalid tally');return data.total?data.yes+' yes · '+data.no+' no · '+data.total+' response'+(data.total===1?'':'s'):'No responses yet. Be the first.';}
export async function pollRequest(concept,action,extra={}){const r=await fetch(API,{method:'POST',headers:{'content-type':'application/json',apikey:ANON,authorization:'Bearer '+ANON},body:JSON.stringify({concept,action,...extra})});const d=await r.json();if(!r.ok)throw Error(d.error==='TRY_LATER'?'Please wait a moment before changing your answer.':'The shared tally is unavailable. Please try again.');tallyText(d);return d;}
if(typeof document!=='undefined')for(const poll of document.querySelectorAll('[data-concept-poll]')){
 const concept=poll.dataset.conceptId;if(!['the-feast','the-inheritance'].includes(concept))continue;
 const status=poll.querySelector('[role=status]'),results=poll.querySelector('[data-poll-results]'),buttons=[...poll.querySelectorAll('[data-vote]')],key='ola-cinema-vote-'+concept;let busy=false;
 const choice=()=>{try{return localStorage.getItem(key)}catch{return null}};
 const sync=()=>buttons.forEach(b=>b.setAttribute('aria-pressed',String(choice()===b.dataset.vote)));
 const render=data=>{results.textContent=tallyText(data);sync();};
 const load=async()=>{try{render(await pollRequest(concept,'summary'));status.textContent='Shared responses from the Club.';}catch(e){results.textContent='';status.textContent=e.message;}};
 const retry=document.createElement('button');retry.type='button';retry.className='save-button';retry.textContent='Refresh tally';retry.onclick=load;poll.append(retry);
 for(const b of buttons)b.addEventListener('click',async()=>{if(busy)return;busy=true;buttons.forEach(b=>b.disabled=true);status.textContent='Saving your response…';try{let voter=localStorage.getItem('ola-cinema-voter');if(!/^[a-f0-9-]{36}$/i.test(voter||'')){voter=crypto.randomUUID();localStorage.setItem('ola-cinema-voter',voter);}const data=await pollRequest(concept,'vote',{voter,choice:b.dataset.vote==='yes'});localStorage.setItem(key,b.dataset.vote);render(data);status.textContent='Your response is saved. You can change it.';window.dispatchEvent(new CustomEvent('ola:cinema',{detail:{action:'concept_vote',value:concept+'-'+b.dataset.vote}}));}catch(e){status.textContent=e.message;}finally{busy=false;buttons.forEach(b=>b.disabled=false);}});sync();load();
}
