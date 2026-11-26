/* One decorative canvas, only in Polaroid documents. Scroll paints a wave; there is no ambient animation loop. */
(() => {
 'use strict';
 if (!document.body?.classList.contains('opw-space-page')) return;
 let stop = null;
 const start = () => {
  if (stop) return;
  const layer=document.createElement('div'),canvas=document.createElement('canvas'),sky=document.createElement('canvas');
  layer.className='opw-universe';layer.setAttribute('aria-hidden','true');layer.inert=true;layer.append(canvas);
  const ctx=canvas.getContext?.('2d'),stars=sky.getContext?.('2d');if(!ctx||!stars)return;
  const events=new AbortController(),motion=matchMedia('(prefers-reduced-motion: reduce)');let frame=0,width=0,height=0,scale=1;
  const random=seed=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const paint=()=>{
   frame=0;if(document.hidden)return;
   ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,width,height);ctx.drawImage(sky,0,0,width,height);
   if(motion.matches)return;
   const y=Math.max(0,window.scrollY||0),cycle=Math.floor(y/(height*2.3)),phase=y/(height*2.3)-cycle;
   const rng=random(cycle+379),entry=.1+rng()*.18,travel=(phase-entry)/.64;
   if(travel<0||travel>1)return;
   const crest=height*(1.35-travel*1.9),swell=Math.sin(travel*Math.PI)*height*.14,alpha=Math.sin(travel*Math.PI);
   ctx.beginPath();ctx.moveTo(-30,crest+height*.12);ctx.bezierCurveTo(width*.2,crest-swell,width*.47,crest+height*.25,width*.72,crest);ctx.bezierCurveTo(width*.88,crest-height*.13,width*1.06,crest+height*.05,width+30,crest-height*.08);ctx.lineTo(width+30,height+30);ctx.lineTo(-30,height+30);ctx.closePath();
   const dark=ctx.createLinearGradient(0,crest-height*.1,0,crest+height*.7);dark.addColorStop(0,`rgba(2,3,9,${alpha*.92})`);dark.addColorStop(1,'rgba(2,3,9,0)');ctx.fillStyle=dark;ctx.fill();
   ctx.beginPath();ctx.moveTo(-30,crest+height*.12);ctx.bezierCurveTo(width*.2,crest-swell,width*.47,crest+height*.25,width*.72,crest);ctx.bezierCurveTo(width*.88,crest-height*.13,width*1.06,crest+height*.05,width+30,crest-height*.08);ctx.lineWidth=1;ctx.strokeStyle=`rgba(174,163,211,${alpha*.18})`;ctx.shadowColor='#7467af';ctx.shadowBlur=18;ctx.stroke();ctx.shadowBlur=0;
  };
  const queue=()=>{if(!frame&&!document.hidden)frame=requestAnimationFrame(paint);};
  const resize=()=>{
   width=Math.max(1,window.innerWidth);height=Math.max(1,window.innerHeight);scale=Math.min(window.devicePixelRatio||1,1.5);
   canvas.width=sky.width=Math.ceil(width*scale);canvas.height=sky.height=Math.ceil(height*scale);stars.setTransform(scale,0,0,scale,0,0);stars.fillStyle='#05070d';stars.fillRect(0,0,width,height);
   const rand=random(171026),cloud=(x,y,r,color)=>{const g=stars.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');stars.fillStyle=g;stars.fillRect(x-r,y-r,r*2,r*2);};
   stars.save();stars.translate(width*.48,height*.47);stars.rotate(-.48);stars.scale(1,.38);const span=Math.max(width,height);
   cloud(-span*.24,0,span*.46,'#4a3c6c55');cloud(span*.18,0,span*.4,'#263c6266');cloud(0,0,span*.34,'#b1a3c925');stars.restore();
   const count=width<650?220:480;
   for(let i=0;i<count;i++){const x=rand()*width,y=rand()*height,r=rand()>.97?1.25:.25+rand()*.6;stars.fillStyle=`rgba(224,222,239,${.17+rand()*.58})`;stars.beginPath();stars.arc(x,y,r,0,Math.PI*2);stars.fill();}
   for(let i=0;i<count*2;i++){const x=(rand()-.5)*Math.max(width,height)*1.6,scatter=(rand()+rand()+rand()-1.5)*height*.14;const px=width*.48+x*Math.cos(-.48)-scatter*Math.sin(-.48),py=height*.47+x*Math.sin(-.48)+scatter*Math.cos(-.48);stars.fillStyle=`rgba(190,179,220,${rand()*.16})`;stars.fillRect(px,py,.6+rand(),.6+rand());}
   queue();
  };
  document.body.prepend(layer);document.documentElement.dataset.opwSpace='ready';resize();
  window.addEventListener('scroll',queue,{passive:true,signal:events.signal});window.addEventListener('resize',resize,{passive:true,signal:events.signal});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else queue();},{signal:events.signal});motion.addEventListener?.('change',queue,{signal:events.signal});
  stop=()=>{events.abort();cancelAnimationFrame(frame);frame=0;layer.remove();delete document.documentElement.dataset.opwSpace;stop=null;};
 };
 window.addEventListener('pagehide',()=>stop?.());window.addEventListener('pageshow',()=>start());start();
})();
