/* Original OLA sky art and finite moments. No physics, storage, navigation or network. */
(function(root){'use strict';
 const formations=[
  {id:'crest',name:'The First Wave',world:'OLA HQ',color:'#9cece4',points:[[-.9,.25],[-.65,.05],[-.38,-.25],[0,-.5],[.4,-.55],[.69,-.3],[.66,.03],[.42,.12],[.28,-.05],[.38,-.19],[.48,-.13],[-.34,.35],[0,.48],[.48,.41],[.83,.26]],paths:[[0,1,2,3,4,5,6,7,8,9,10],[0,11,12,13,14]]},
  {id:'currents',name:'Two Currents',world:'La Ola de Amor',color:'#f2c2ad',points:[[-.85,.08],[-.58,-.29],[-.22,-.35],[.08,-.06],[.38,.3],[.75,.15],[.88,-.08],[-.84,.31],[-.46,.49],[-.08,.28],[.22,-.13],[.56,-.33],[.87,-.24]],paths:[[0,1,2,3,4,5,6],[7,8,9,10,11,12]]},
  {id:'afterglow',name:'Afterglow',world:'La Ola Cinema Club',color:'#d1c0ff',points:[[-.78,.34],[-.75,-.18],[-.48,-.52],[0,-.65],[.48,-.52],[.75,-.18],[.78,.34],[-.38,.25],[-.36,-.08],[-.19,-.29],[0,-.35],[.19,-.29],[.36,-.08],[.38,.25],[0,.05],[.92,.55],[-.92,.55]],paths:[[0,1,2,3,4,5,6],[7,8,9,10,11,12,13],[14,15],[14,16]]},
  {id:'homeward',name:'Homeward',world:'HOME BASE',color:'#e5d6a7',points:[[0,-.78],[.13,-.2],[.68,0],[.13,.14],[0,.68],[-.13,.14],[-.68,0],[-.13,-.2],[0,-.78],[.44,-.4],[.52,.33],[-.42,.43],[-.53,-.31]],paths:[[0,1,2,3,4,5,6,7,8],[9,10,11,12,9]]}
 ];
 const moments={
  'first-orbit':{title:'A world in motion.',note:'Every journey begins with a little curiosity.',kicker:'OLA SKY / THE FIRST WAVE',tone:'sea'},
  stargazer:{title:'You found your current.',note:'For a moment, the universe moves with you.',kicker:'TWO CURRENTS / ONE HOME',tone:'rose'},
  'wave-rider':{title:'The first crossing.',note:'Somewhere between here and what comes next.',kicker:'OLA TRANSIT / A ROUTE BEGINS',tone:'gold'},
  'ola-voyager':{title:'A place among worlds.',note:'The first vessel remembers your passage.',kicker:'OLA TRANSIT / VESSEL 001',tone:'violet'},
  'deep-space':{title:'A little further from ordinary.',note:'There is always another way home.',kicker:'HOMEWARD / OUR WAVES, ONE HOME',tone:'sea'},
  'big-bang':{title:'And then, everything.',note:'A trillion miles. Still finding our way home.',kicker:'OLA UNIVERSE / BEYOND THE ODOMETER',tone:'violet'},
  transit:{title:'One day, between worlds.',note:'For now, a glimpse. This is where the journeys began.',kicker:'OLA TRANSIT / FIRST VESSEL',tone:'gold'}
 };
 const phase=(now,began,duration=7600)=>Math.max(0,Math.min(1,(now-began)/duration));
 function create(host,{reduced=()=>false,timer=setTimeout,clear=clearTimeout}={}){
  const live=host.ownerDocument.createElement('span');live.className='journey-announcement';live.setAttribute('role','status');live.setAttribute('aria-live','polite');live.setAttribute('aria-atomic','true');host.append(live);
  let active=null,timeout=0,queue=[];
  function dismiss(){clear(timeout);timeout=0;active?.remove();active=null;queue=[];live.textContent=''}
  function present(item){const d=host.ownerDocument,info=typeof item==='string'?moments[item]:item;if(!info)return;const el=d.createElement('div');el.className='hq-journey-moment';el.dataset.tone=info.tone||'sea';el.dataset.still=String(reduced());el.setAttribute('data-analytics-ignore','');
   const glow=d.createElement('div');glow.className='journey-light';glow.setAttribute('aria-hidden','true');const dust=d.createElement('div');dust.className='journey-dust';dust.setAttribute('aria-hidden','true');
   for(let i=0;i<36;i++){const p=d.createElement('i');const a=i*2.399963,r=15+(i%9)*4;p.style.setProperty('--dust-x',(Math.cos(a)*r).toFixed(2)+'vw');p.style.setProperty('--dust-y',(Math.sin(a)*r*.55).toFixed(2)+'vh');p.style.setProperty('--dust-delay',(i%7*.09)+'s');dust.append(p)}
   const copy=d.createElement('div');copy.className='journey-copy';const eyebrow=d.createElement('p');eyebrow.className='journey-kicker';eyebrow.textContent=info.kicker;const title=d.createElement('p');title.className='journey-title';title.setAttribute('aria-hidden','true');info.title.split(' ').forEach((word,i)=>{const span=d.createElement('span');span.textContent=word+' ';span.style.setProperty('--word',i);title.append(span)});const note=d.createElement('p');note.className='journey-note';note.textContent=info.note;copy.append(eyebrow,title,note);
   copy.setAttribute('aria-hidden','true');el.append(glow,dust,copy);host.append(el);live.textContent=info.title+' '+info.note;active=el;timeout=timer(()=>{el.remove();active=null;timeout=0;live.textContent='';const next=queue.shift();if(next)present(next)},reduced()?5000:7600);
  }
  return {show(item){if(active){if(queue.length<6)queue.push(item)}else present(item)},dismiss,get active(){return !!active}};
 }
 function curve(ctx,points,path,x,y,scale){const coords=path.map(i=>[x+points[i][0]*scale,y+points[i][1]*scale]);ctx.beginPath();ctx.moveTo(...coords[0]);for(let i=0;i<coords.length-1;i++){const p0=coords[Math.max(0,i-1)],p1=coords[i],p2=coords[i+1],p3=coords[Math.min(coords.length-1,i+2)];ctx.bezierCurveTo(p1[0]+(p2[0]-p0[0])/6,p1[1]+(p2[1]-p0[1])/6,p2[0]-(p3[0]-p1[0])/6,p2[1]-(p3[1]-p1[1])/6,...p2)}ctx.stroke()}
 function sky(ctx,{width,height,level=0,now=0,reduced=false,energy=0}){
  if(!width||!height||!level)return;
  const scale=Math.min(width*.2,145),cx=width/2,cy=height/2,spread=Math.min(width*.27,340),vertical=Math.min(height*.25,205);
  const poses=[[cx-spread,cy-vertical],[cx+spread,cy-vertical*.82],[cx-spread*.9,cy+vertical*.85],[cx+spread*.95,cy+vertical*.95]];
  for(let j=0;j<Math.min(level,4);j++){const f=formations[j],[x,y]=poses[j],s=scale*(j===2?.82:1);ctx.save();ctx.globalCompositeOperation='screen';const halo=ctx.createRadialGradient(x,y,0,x,y,s*1.2);halo.addColorStop(0,f.color+'0d');halo.addColorStop(1,f.color+'00');ctx.fillStyle=halo;ctx.fillRect(x-s*1.3,y-s*1.3,s*2.6,s*2.6);ctx.strokeStyle=f.color;ctx.globalAlpha=.17+energy*.16;ctx.lineWidth=.6;ctx.shadowColor=f.color;ctx.shadowBlur=5;for(const path of f.paths)curve(ctx,f.points,path,x,y,s);
   for(let i=0;i<f.points.length;i++){const [px,py]=f.points[i],sx=x+px*s,sy=y+py*s,pulse=reduced?.8:.65+Math.sin(now/1900+i*1.7)*.2,major=i%4===0,r=major?1.6:.8;ctx.globalAlpha=pulse;ctx.shadowBlur=major?12:4;ctx.fillStyle=major?'#fff5dc':f.color;ctx.beginPath();ctx.arc(sx,sy,r,0,Math.PI*2);ctx.fill();if(major){ctx.globalAlpha=.28;ctx.strokeStyle=f.color;ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(sx-5,sy);ctx.lineTo(sx+5,sy);ctx.moveTo(sx,sy-5);ctx.lineTo(sx,sy+5);ctx.stroke()}}
   ctx.restore();
  }
 }
 const api={formations,moments,phase,create,sky};root.OLAJourney=Object.freeze(api);if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
