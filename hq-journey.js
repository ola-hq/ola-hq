/* Original OLA sky art and finite moments. No physics, storage, navigation or network. */
(function(root){'use strict';
 const assetBase=typeof document!=='undefined'?new URL('.',document.currentScript.src):null;
 let atlas=null,homeward=null;
 function load(onReady){if(!assetBase||typeof root.Image!=='function')return;atlas=new root.Image();atlas.onload=onReady;atlas.src=new URL('assets/living-sky-20261127/ola-constellations.webp',assetBase).href;homeward=new root.Image();homeward.onload=onReady;homeward.src=new URL('assets/living-sky-20261127/ola-homeward.webp',assetBase).href}
 const diamond=[[-.85,0],[-.65,-.2],[-.65,-.33],[-.46,-.33],[-.46,-.5],[-.26,-.5],[-.26,-.68],[0,-.88],[.26,-.68],[.26,-.5],[.46,-.5],[.46,-.33],[.65,-.33],[.65,-.2],[.85,0],[.65,.2],[.65,.33],[.46,.33],[.46,.5],[.26,.5],[.26,.68],[0,.88],[-.26,.68],[-.26,.5],[-.46,.5],[-.46,.33],[-.65,.33],[-.65,.2]];
 const spiral=(offset=0)=>Array.from({length:26},(_,i)=>{const a=i/25*Math.PI*3.1,r=.08+i/25*.7;return [Math.cos(a)*r,Math.sin(a)*r*.55+offset]});
 const formations=[
  {id:'threshold',name:'The Threshold',world:'OLA HQ',color:'#e9d09c',points:diamond,paths:[diamond.map((_,i)=>i).concat(0)]},
  {id:'crest',name:'The First Wave',world:'OLA HQ',color:'#a2e6df',points:spiral(),paths:[Array.from({length:26},(_,i)=>i)]},
  {id:'currents',name:'Two Currents',world:'La Ola de Amor',color:'#e9d09c',points:spiral(),paths:[Array.from({length:26},(_,i)=>i)]},
  {id:'homeward',name:'Homeward',world:'HOME BASE',color:'#c8efdf',points:diamond,paths:[diamond.map((_,i)=>i).concat(0)]}
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
   const sigil=d.createElement('div');sigil.className='journey-sigil';sigil.dataset.symbol=String(({'first-orbit':0,'wave-rider':1,stargazer:2,'deep-space':3})[item]??1);sigil.setAttribute('aria-hidden','true');copy.setAttribute('aria-hidden','true');el.append(glow,dust,sigil,copy);host.append(el);live.textContent=info.title+' '+info.note;active=el;timeout=timer(()=>{el.remove();active=null;timeout=0;live.textContent='';const next=queue.shift();if(next)present(next)},reduced()?5000:7600);
  }
  return {show(item){if(active){if(queue.length<6)queue.push(item)}else present(item)},dismiss,get active(){return !!active}};
 }
 function curve(ctx,points,path,x,y,scale){const coords=path.map(i=>[x+points[i][0]*scale,y+points[i][1]*scale]);ctx.beginPath();ctx.moveTo(...coords[0]);for(let i=0;i<coords.length-1;i++){const p0=coords[Math.max(0,i-1)],p1=coords[i],p2=coords[i+1],p3=coords[Math.min(coords.length-1,i+2)];ctx.bezierCurveTo(p1[0]+(p2[0]-p0[0])/6,p1[1]+(p2[1]-p0[1])/6,p2[0]-(p3[0]-p1[0])/6,p2[1]-(p3[1]-p1[1])/6,...p2)}ctx.stroke()}
 const revealedAt=new Map();
 function layout(width,height){const mobile=width<650;return {size:Math.min(width*(mobile?.4:.25),mobile?185:310,height*.32),poses:[[width*.24,height*.24],[width*.76,height*.24],[width*.24,height*.76],[width*.76,height*.76]]}}
 function motionState(now,index,energy=0,reduced=false){if(reduced)return {scale:1,tilt:0,orbit:0,breath:.5,energy:0};const e=Math.max(0,Math.min(1,Number.isFinite(energy)?energy:0)),t=(Number.isFinite(now)?now:0)/1000;const breath=(Math.sin(t*.68+index*1.8)+1)/2;return {scale:.975+breath*.045+e*.025,tilt:Math.sin(t*.25+index)*(.025+e*.035),orbit:t*(index%2?-.055:.055)+index*1.2,breath,energy:e}}
 function sky(ctx,{width,height,level=0,now=0,reduced=false,energy=0}){
  if(!width||!height||!level)return;
  const {size,poses}=layout(width,height);
  for(let j=0;j<Math.min(level,4);j++){
   if(!revealedAt.has(j))revealedAt.set(j,now);const reveal=reduced?1:Math.min(1,Math.max(0,(now-revealedAt.get(j))/2600)),f=formations[j],[x,y]=poses[j],m=motionState(now,j,energy,reduced),s=size*.44;
   ctx.save();ctx.translate(x,y);ctx.rotate(m.tilt);ctx.scale(m.scale,m.scale);ctx.globalCompositeOperation='screen';ctx.shadowBlur=0;
   const art=j===3?homeward:atlas;
   if(art?.complete&&art.naturalWidth){const col=j===3?art.naturalWidth:art.naturalWidth/3;ctx.globalAlpha=reveal*Math.min(1,(.58+m.breath*.18+m.energy*.18)*(j===3?1.25:1));ctx.drawImage(art,j===3?0:col*j,0,col,art.naturalHeight,-size/2,-size/2,size,size)}
   else{ctx.strokeStyle=f.color;ctx.globalAlpha=reveal*.3;ctx.lineWidth=.7;for(const path of f.paths)curve(ctx,f.points,path,0,0,s)}
   // Rotating celestial apertures: independent of the symbol, and quiet at rest.
   if(!reduced){
    ctx.save();ctx.rotate(m.orbit);ctx.scale(1,.9+Math.sin(now/3300+j)*(.05+m.energy*.12));ctx.shadowColor='#a6e5d7';ctx.shadowBlur=5;ctx.lineWidth=.8+m.energy*.7;ctx.globalAlpha=reveal*(.08+m.breath*.06+m.energy*.5);ctx.strokeStyle=f.color;
    for(let band=0;band<2;band++){const r=size*(.43+band*.075);for(let part=0;part<4;part++){const a=part*Math.PI/2+band*.32;ctx.beginPath();ctx.arc(0,0,r,a,a+Math.PI*.34);ctx.stroke()}}
    // Nested four-direction geometry blooms as spin energy rises.
    ctx.rotate(-m.orbit*1.7);ctx.globalAlpha=reveal*(.06+m.breath*.04+m.energy*.42);for(let layer=0;layer<2;layer++){const r=size*(.35-layer*.07);ctx.beginPath();for(let k=0;k<=4;k++){const a=k*Math.PI/2+layer*Math.PI/4;(k?ctx.lineTo:ctx.moveTo).call(ctx,Math.cos(a)*r,Math.sin(a)*r)}ctx.stroke()}ctx.restore();
    // A pair of light tracers travels around the outer star paths.
    for(let k=0;k<2;k++){const a=m.orbit*(2+k*.2)+k*Math.PI,r=size*.45,px=Math.cos(a)*r,py=Math.sin(a)*r;ctx.globalAlpha=reveal*(.4+m.energy*.4);ctx.fillStyle=k?'#9ce9dd':'#f9e2ad';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=10;ctx.beginPath();ctx.arc(px,py,1.3+m.energy*.6,0,Math.PI*2);ctx.fill()}
   }
   for(let i=0;i<18;i++){const a=i*2.399963+(reduced?0:m.orbit*.15),r=(.24+(i%7)*.1)*s,px=Math.cos(a)*r,py=Math.sin(a)*r,pulse=reduced?.55:.35+Math.pow((Math.sin(now/1700+i)+1)/2,5)*.65;ctx.globalAlpha=reveal*pulse;ctx.fillStyle=i%4?'#e6cca0':'#a8f3ed';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=7;ctx.beginPath();ctx.arc(px,py,i%5?.55:1.4,0,Math.PI*2);ctx.fill()}
   ctx.restore();
  }
 }
 const api={formations,moments,phase,create,sky,load,layout,motionState};root.OLAJourney=Object.freeze(api);if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
