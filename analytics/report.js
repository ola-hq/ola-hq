(()=>{
 'use strict';
 const API='https://fgtowzonkmirmugnzlsf.supabase.co/functions/v1/ola-analytics',ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZndG93em9ua21pcm11Z256bHNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1MTk5MDIsImV4cCI6MjEwNzA5NTkwMn0.XgVqz_1hvkHv-TptiAXou5RTQMCi8kkJUQjJ6wS3gQc';
 const by=id=>document.getElementById(id);let token='',loading=false;
 const status=text=>{by('status').textContent=text};
 const names={hq_site:'OLA HQ website',hq_app:'OLA HQ app',loda_site:'La Ola de Amor website',loda_app:'Festival Guide app',loda_app_entrance:'Festival Guide entrance'};
 function table(id,headings,rows){
  const node=by(id);node.replaceChildren();
  if(!rows.length){const p=document.createElement('p');p.textContent='No activity recorded yet.';node.append(p);return}
  const table=document.createElement('table'),thead=document.createElement('thead'),tbody=document.createElement('tbody'),tr=document.createElement('tr');
  for(const title of headings){const th=document.createElement('th');th.textContent=title;tr.append(th)}thead.append(tr);table.append(thead,tbody);
  for(const row of rows){const tr=document.createElement('tr');for(const value of row){const td=document.createElement('td');td.textContent=String(value??'');tr.append(td)}tbody.append(tr)}node.append(table);
 }
 function coach(data){
  const s=data.summary||{},e=data.extended||{},visits=Number(s.visits||0),visitors=Number(s.visitors||0),views=Number(s.page_views||0);
  by('coach-title').textContent=visits?'Here’s what your visitors are doing':'Your first insights are coming';
  by('coach-summary').textContent=visits?`${visits} browsing sessions from ${visitors} anonymous visitor IDs generated ${views} page views in this selected period. That doesn't mean ${visitors} distinct people.`:'No sessions in this filter yet. Check a longer period or confirm that the tracker has started collecting on the live site.';
  const tips=[];
  if(!visits)tips.push(['Start with a test','Open an instrumented page, click a navigation link, then refresh this report. Check live deployment if no events appear.']);
  else{
   tips.push(['Understand repeat browsing',visits>visitors?`There are ${visits-visitors} more sessions than visitor IDs. Some browsers returned, but this is not a precise count of returning people.`:'Sessions and visitor IDs are close. Observe a longer period before drawing conclusions.']);
   const top=(data.pages||[])[0];if(top)tips.push(['Start with your top page',`${top.path} has ${top.views} recorded views. Check whether it leads visitors to the next action you want.`]);
   if((data.sources||[]).length===0||data.sources.every(x=>!x.referrer_host))tips.push(['Make sharing measurable','Add UTM source, medium and campaign labels to links you share. Direct visits and in-app browsers often hide referral data.']);
   if(!e.devices?.some(x=>x[0]!=='unknown'))tips.push(['Give device tracking time','Older events have no device label. New visits should begin filling the mobile/desktop report after the updated site is live.']);
   if(!(e.active_seconds>0))tips.push(['Engagement is still warming up','Active-time measurements only begin with the upgraded tracker; zero does not necessarily mean nobody read your content.']);
  }
  const node=by('coach-tips');node.replaceChildren();
  for(const [title,description] of tips.slice(0,4)){const card=document.createElement('article'),heading=document.createElement('b'),p=document.createElement('p');card.className='tip';heading.textContent=title;p.textContent=description;card.append(heading,p);node.append(card)}
 }
 function render(data){
  coach(data);
  by('cards').replaceChildren();
  for(const [key,label] of [['visitors','Visitors'],['visits','Visits'],['page_views','Page views'],['clicks','Clicks'],['app_visitors','App visitors'],['installed_app_visits','Installed app visits'],['observed_installs','Observed installations']]){
   const card=document.createElement('div'),number=document.createElement('strong'),caption=document.createElement('span'),help=document.createElement('small');card.className='card';number.textContent=Number(data.summary[key]||0).toLocaleString();caption.textContent=label;const guides={visitors:'Anonymous browser IDs, not named individuals.',visits:'Sessions reset after 30 minutes inactive.',page_views:'Pages or tracked in-page routes opened.',clicks:'Tracked buttons and navigation links.',app_visitors:'Visitors to app-designated routes.',installed_app_visits:'Sessions recorded in standalone mode.',observed_installs:'Only installations reported by supported browsers.'};help.textContent=guides[key]||'';card.append(number,caption,help);by('cards').append(card);
  }
  by('started').textContent=data.tracking_started?'First recorded visit: '+new Date(data.tracking_started).toLocaleString('en-US',{timeZone:'America/Mexico_City'})+' · Mexico City time.':'Tracking is ready. Numbers will appear after the first visitor arrives.';
  table('pages',['Page','Views','Visitors'],data.pages.map(r=>[r.path,r.views,r.visitors]));
  table('clicks',['Destination or button','From page','Clicks'],data.clicks.map(r=>[r.target,r.path,r.clicks]));
  table('surfaces',['Experience','Visitors','Views'],data.surfaces.map(r=>[names[r.surface]||r.surface,r.visitors,r.views]));
  table('days-table',['Date · Mexico City','Visitors','Views','Clicks'],data.days.map(r=>[r.day,r.visitors,r.views,r.clicks]));
  table('sources',['Referring website','Visitors'],data.sources.map(r=>[r.referrer_host,r.visitors]));
  const more=data.extended||{};
  for(const [id,key,label] of [['devices','devices','Device'],['oses','operating_systems','OS'],['browsers','browsers','Browser'],['locations','locations','Country'],['campaigns','campaigns','Campaign source'],['files','files','Attachment'],['activity','activity','Event type']])table(id,[label,'Count'],more[key]||[]);
  by('active-time').textContent='Recorded active time: '+Math.round((more.active_seconds||0)/60)+' minutes (from new engagement events only).'+(more.sampled?' Recent rows capped at 10,000.':'');
 }
 async function load(){
  if(loading)return;loading=true;by('refresh').disabled=true;by('unlock').disabled=true;status('Loading your report…');const requestToken=token;
  try{
   const response=await fetch(API,{method:'POST',headers:{'content-type':'application/json','apikey':ANON,'authorization':'Bearer '+ANON,'x-loda-moderator-token':token},body:JSON.stringify({action:'report',days:Number(by('days').value),scope:by('scope').value})});
   if(token!==requestToken)return;
   if(response.status===401){token='';by('report').hidden=true;by('login').hidden=false;throw Error('That host password was not accepted.')}
   if(!response.ok)throw Error('The report is temporarily unavailable. Please try again.');
   render(await response.json());by('report').hidden=false;by('login').hidden=true;status('Updated just now.');
  }catch(error){status(error.message||'Unable to load report.')}finally{loading=false;by('refresh').disabled=false;by('unlock').disabled=false}
 }
 by('login-form').addEventListener('submit',async event=>{
  event.preventDefault();if(loading)return;by('unlock').disabled=true;status('Unlocking…');
  try{const password=by('password').value;by('password').value='';const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
   const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new TextEncoder().encode('loda-host-password-v2:'+by('host').value),iterations:600000},material,256);
   token=[...new Uint8Array(bits)].map(x=>x.toString(16).padStart(2,'0')).join('');await load();
  }catch{status('Unable to unlock the report.');by('unlock').disabled=false}
 });
 by('refresh').addEventListener('click',load);by('days').addEventListener('change',load);by('scope').addEventListener('change',load);
 by('lock').addEventListener('click',()=>{token='';by('report').hidden=true;by('login').hidden=false;by('cards').replaceChildren();for(const id of ['pages','clicks','surfaces','days-table','sources','devices','oses','browsers','locations','campaigns','files','activity'])by(id).replaceChildren();status('Report locked.');});
 try{by('exclude').checked=JSON.parse(localStorage.getItem('olaAnalyticsDisabled')||'false')===true}catch{}
 by('exclude').addEventListener('change',()=>{try{localStorage.setItem('olaAnalyticsDisabled',JSON.stringify(by('exclude').checked));if(by('exclude').checked)localStorage.removeItem('olaAnalyticsQueue')}catch{}status(by('exclude').checked?'This browser is excluded.':'Tracking is enabled for this browser.');});
})();
