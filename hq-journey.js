/* Original OLA sky art and finite moments. No physics, storage, navigation or network. */
(function(root){'use strict';
 const assetBase=typeof document!=='undefined'?new URL('.',document.currentScript.src):null;
 let atlas=null;
 function load(onReady){if(!assetBase||typeof root.Image!=='function')return;atlas=new root.Image();atlas.onload=onReady;atlas.src=new URL('assets/living-sky-20261127/ola-constellations.webp',assetBase).href}
 const diamond=[[-.85,0],[-.65,-.2],[-.65,-.33],[-.46,-.33],[-.46,-.5],[-.26,-.5],[-.26,-.68],[0,-.88],[.26,-.68],[.26,-.5],[.46,-.5],[.46,-.33],[.65,-.33],[.65,-.2],[.85,0],[.65,.2],[.65,.33],[.46,.33],[.46,.5],[.26,.5],[.26,.68],[0,.88],[-.26,.68],[-.26,.5],[-.46,.5],[-.46,.33],[-.65,.33],[-.65,.2]];
 const spiral=(offset=0)=>Array.from({length:26},(_,i)=>{const a=i/25*Math.PI*3.1,r=.08+i/25*.7;return [Math.cos(a)*r,Math.sin(a)*r*.55+offset]});
 const formations=[
  {id:'threshold',name:'The Threshold',world:'OLA HQ',color:'#e9d09c',points:diamond,paths:[diamond.map((_,i)=>i).concat(0)]},
  {id:'crest',name:'The First Wave',world:'OLA HQ',color:'#a2e6df',points:spiral(),paths:[Array.from({length:26},(_,i)=>i)]},
  {id:'currents',name:'Two Currents',world:'La Ola de Amor',color:'#e9d09c',points:spiral(),paths:[Array.from({length:26},(_,i)=>i)]}
 ];
 const moments={
  'first-orbit':{title:'A world in motion.',note:'Every journey begins with a little curiosity.',kicker:'OLA SKY / THE THRESHOLD',tone:'sea'},
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
   const sigil=d.createElement('div');sigil.className='journey-sigil';sigil.dataset.symbol=String(typeof item==='string'?Math.max(0,['first-orbit','wave-rider','stargazer'].indexOf(item))%3:1);sigil.setAttribute('aria-hidden','true');copy.setAttribute('aria-hidden','true');el.append(glow,dust,sigil,copy);host.append(el);live.textContent=info.title+' '+info.note;active=el;timeout=timer(()=>{el.remove();active=null;timeout=0;live.textContent='';const next=queue.shift();if(next)present(next)},reduced()?5000:7600);
  }
  return {show(item){if(active){if(queue.length<6)queue.push(item)}else present(item)},dismiss,get active(){return !!active}};
 }
 function curve(ctx,points,path,x,y,scale){const coords=path.map(i=>[x+points[i][0]*scale,y+points[i][1]*scale]);ctx.beginPath();ctx.moveTo(...coords[0]);for(let i=0;i<coords.length-1;i++){const p0=coords[Math.max(0,i-1)],p1=coords[i],p2=coords[i+1],p3=coords[Math.min(coords.length-1,i+2)];ctx.bezierCurveTo(p1[0]+(p2[0]-p0[0])/6,p1[1]+(p2[1]-p0[1])/6,p2[0]-(p3[0]-p1[0])/6,p2[1]-(p3[1]-p1[1])/6,...p2)}ctx.stroke()}
 const revealedAt=new Map();
 function sky(ctx,{width,height,level=0,now=0,reduced=false,energy=0}){
  if(!width||!height||!level)return;
  const mobile=width<650,poses=mobile?[[width*.24,height*.23],[width*.76,height*.25],[width*.5,height*.77]]:[[width*.23,height*.28],[width*.77,height*.3],[width*.72,height*.77]];
  const size=mobile?Math.min(width*.46,185):Math.min(width*.25,310);
  for(let j=0;j<Math.min(level,3);j++){if(!revealedAt.has(j))revealedAt.set(j,now);const reveal=reduced?1:Math.min(1,Math.max(0,(now-revealedAt.get(j))/2600));const f=formations[j],[x,y]=poses[j],s=size*.44;
   ctx.save();ctx.globalCompositeOperation='screen';ctx.shadowBlur=0;
   if(atlas?.complete&&atlas.naturalWidth){const col=atlas.naturalWidth/3;ctx.globalAlpha=reveal*(.7+energy*.24);ctx.drawImage(atlas,col*j,0,col,atlas.naturalHeight,x-size/2,y-size/2,size,size)}
   else{ctx.strokeStyle=f.color;ctx.globalAlpha=reveal*.3;ctx.lineWidth=.7;for(const path of f.paths)curve(ctx,f.points,path,x,y,s)}
   // Live glints and travelling dust give the rendered star art depth without moving the globe.
   for(let i=0;i<18;i++){const a=i*2.399963,r=(.24+(i%7)*.1)*s,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r,pulse=reduced?.55:.35+Math.pow((Math.sin(now/1700+i)+1)/2,5)*.65;ctx.globalAlpha=reveal*pulse;ctx.fillStyle=i%4?'#e6cca0':'#a8f3ed';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=7;ctx.beginPath();ctx.arc(px,py,i%5?.55:1.4,0,Math.PI*2);ctx.fill()}
   ctx.restore();
  }
 }
 const api={formations,moments,phase,create,sky,load};root.OLAJourney=Object.freeze(api);if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
