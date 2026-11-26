// Approved public display labels only. Canonical event records remain unchanged.
export const displayLabels=event=>{
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
