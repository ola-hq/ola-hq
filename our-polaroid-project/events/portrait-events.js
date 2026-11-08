/* Directory-only enhancement. The shared gallery renderer, canonical registry and album pages stay intact. */
(() => {
 'use strict';
 const script=document.currentScript;
 const root=new URL('../../',script.src);
 const baseClass=customElements.get('ola-events');
 const safeURL=(value,proposal,eventId,registry)=>{
  const result=new URL(value,root);
  if(result.origin===root.origin&&result.pathname.startsWith(new URL('our-polaroid-project/events/',root).pathname))return result.href;
  // Reuse the exact approved wedding thumbnail already exposed by the canonical
  // gallery. This is an Events-card override, never a saved wedding-cover edit.
  const wedding='la-ola-de-amor-2026';
  if(eventId===wedding&&proposal?.sourceEventId===wedding){
   const event=registry?.events?.find(event=>event.id===wedding&&event.publicationStatus==='approved');
   const photo=event?.photos?.find(photo=>photo.id===proposal.photoId&&photo.publicationStatus==='approved');
   if(photo&&result.protocol==='https:'&&result.href===new URL(photo.thumbnail,root).href)return result.href;
  }
  throw Error('Invalid directory cover');
 };
 // Display labels only. Canonical titles/dates still drive ordering, IDs and URLs.
 const displayLabels=event=>{
  const dateLabel=String(event.dateLabel||'');
  const titles={
   'lib-2025':'Lightning in a Bottle','lib-2026':'Lightning in a Bottle',
   'event-a9b5166dfd9f':'Lightning in a Bottle',
   'martins-bach-party':'Martin’s Bach Party',
   'event-54b8c286679f':'EDSEA',
   'event-3ad5f8a48489':'CRSSD Proper · New Year',
   'event-d32df8a80a1a':'Cancún'
  };
  const parts=String(event.title||'').split(' · ');
  const suffix=parts.at(-1);
  if(parts.length>1&&/^\d{4}(?:-\d{2}(?:-\d{2})?)?(?:\s*[–—&]\s*\d{4}(?:-\d{2}(?:-\d{2})?)?)*$/.test(suffix)
    &&(suffix.match(/\d{4}/g)||[]).every(year=>dateLabel.includes(year)))parts.pop();
  const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const parse=value=>{
   const m=/^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(value);if(!m)return null;
   const year=Number(m[1]),month=Number(m[2]),day=m[3]?Number(m[3]):null;
   if(month<1||month>12||day!==null&&(day<1||day>new Date(Date.UTC(year,month,0)).getUTCDate()))return null;
   return {year,month,day};
  };
  const full=d=>`${months[d.month-1]}${d.day===null?'':' '+d.day+','} ${d.year}`;
  let date=dateLabel;
  const single=parse(dateLabel),range=/^(\d{4}-\d{2}-\d{2})\s*([–&])\s*(\d{4}-\d{2}-\d{2})$/.exec(dateLabel);
  if(single)date=full(single);
  else if(range){
   const a=parse(range[1]),b=parse(range[3]),join=range[2]==='&'?' & ':'–';
   if(a&&b)date=a.year!==b.year?`${full(a)}${join}${full(b)}`:a.month!==b.month?
    `${months[a.month-1]} ${a.day}${join}${months[b.month-1]} ${b.day}, ${a.year}`:
    `${months[a.month-1]} ${a.day}${join}${b.day}, ${a.year}`;
  }
  return {title:titles[event.id]||parts.join(' · '),dateLabel:date};
 };
 const displayQuery=query=>String(query||'').replace(/\blightning\s+in\s+a\s+bottle\b/gi,'LIB');
 const matchingDayLabel=event=>{
  const label=displayLabels(event);
  return [label.title,label.dateLabel,`${event.photoCount??event.photos.length} photos ↗`].filter(Boolean).join(' · ');
 };
 class PortraitEvents extends baseClass {
  async connectedCallback(){
   try{
    const response=await fetch(new URL('data/events/portrait-covers.json',root));
    if(!response.ok)throw Error('Portrait recommendations unavailable');
    const data=await response.json();this.portraitCovers=data.schemaVersion===1?data.covers:{};
   }catch{this.portraitCovers={};}
   if(this.isConnected)await super.connectedCallback();
  }
  drawPublished(){
   // Expand the visible LIB name without changing canonical search data or URL text.
   const query=this.filters.q;
   try{this.filters.q=displayQuery(query);super.drawPublished();}finally{this.filters.q=query;}
   const byId=new Map([...this.data.events,...(this.data.parentEvents||[])].map(event=>[event.id,event]));
   this.querySelectorAll('.og-event-card').forEach(card=>{
    const entrance=card.querySelector('.og-event-entry');
    if(!entrance)return;
    const eventId=new URL(entrance.href).pathname.split('/').filter(Boolean).at(-1);
    const event=byId.get(eventId),labels=event&&displayLabels(event);
    if(labels){
     card.querySelector('h2').textContent=labels.title;
     card.querySelector('.og-event-date').textContent=[labels.dateLabel,event.location].filter(Boolean).join(' · ');
    }
    card.querySelectorAll('.og-matching-days a').forEach(link=>{
     const child=byId.get(new URL(link.href).pathname.split('/').filter(Boolean).at(-1));
     if(child)link.textContent=matchingDayLabel(child);
    });
    const matching=Array.from(card.querySelectorAll('.og-matching-days a'),a=>new URL(a.href).pathname.split('/').filter(Boolean).at(-1));
    let proposal=this.portraitCovers?.[eventId];
    // A narrowed parent search must keep the cover inside its visible matching days.
    if(proposal&&matching.length&&!matching.includes(proposal.sourceEventId))proposal=this.portraitCovers[matching[0]];
    const photo=entrance.querySelector('img');
    if(photo&&labels)photo.alt=`${labels.title} album cover`;
    if(photo&&proposal){
     try{
      photo.src=safeURL(proposal.thumbnail,proposal,eventId,this.data);photo.width=proposal.width;photo.height=proposal.height;
      photo.dataset.coverId=proposal.photoId;photo.dataset.sourceEvent=proposal.sourceEventId;
     }catch{/* Retain the existing approved directory image on invalid proposals. */}
    }
    if(photo){
     photo.loading='lazy';photo.decoding='async';
     const print=document.createElement('div');print.className='opw-print';
     if(Number(photo.getAttribute('width'))>=Number(photo.getAttribute('height')))print.classList.add('opw-print--landscape');
     photo.before(print);print.append(photo);
    }
    const copy=entrance.querySelector(':scope > div:not(.opw-print)');
    if(copy)copy.classList.add('opw-card-copy');
    entrance.setAttribute('aria-label',`${card.querySelector('h2')?.textContent}. ${card.querySelector('.og-event-date')?.textContent||''}. Open ${card.classList.contains('og-parent-event')?'event':'album'}.`);
   });
  }
 }
 customElements.define('ola-events-portrait',PortraitEvents);
})();
