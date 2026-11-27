/* OLA lore study: pure preview state. No storage, network or globe control. */
(function(root){
'use strict';
const ORIGIN='https://ola-hq.github.io';
const worlds={
 cinema:{name:'La Ola Cinema Club',path:'/ola-hq/la-ola-cinema-club/',color:'#e9c58f',greeting:'The credits ended. The world stayed with you.'},
 polaroid:{name:'Our Polaroid Wave',path:'/ola-hq/our-polaroid-project/',color:'#d6c2d9',greeting:'A moment came home with you.'},
 wave26:{name:'Wave26',path:'/ola-hq/wave-26.html',color:'#a8d8e9',greeting:'Some songs follow you home.'},
 amor:{name:'La Ola de Amor',path:'/ola-hq/la-ola-de-amor/',color:'#e8baaa',greeting:'The plaza is quiet. The celebration stays.'},
 simulation:{name:'Simulation Wave',path:'/ola-hq/simulation-wave/',color:'#c8bbec',greeting:'You brought back a little impossible.'},
 fpl:{name:'FPL Wave',path:'/ola-hq/fpl-wave.html',color:'#b8d3ae',greeting:'Back from the touchline. Still carrying the belief.'}
};
function unit(random){const n=Number(random());return Number.isFinite(n)?Math.max(0,Math.min(.999999999,n)):0}
function delay(random=Math.random){return 10000+Math.floor(unit(random)*30001)}
function createFlyby(random=Math.random){
 let time=0,next=delay(random),began=null,held=false;
 function state(){return {visible:began!==null,progress:began===null?0:Math.min(1,(time-began)/2000),held,nextIn:Math.max(0,next-time)}}
 return {
  step(ms,active=true){if(!active||held)return state();time+=Math.max(0,Math.min(1000,Number(ms)||0));if(began!==null&&time-began>=2000)began=null;if(time>=next){began=time;next=time+delay(random)}return state()},
  hold(on){held=!!on;return state()},
  summon(){began=time;next=time+delay(random);return state()},
  state
 };
}
function constellationOpacity(ms,index,reduced=false){if(reduced)return 1;const t=(Number.isFinite(ms)?ms:0)/1000;const a=(Math.sin(t/(4.5+index*1.3)+index*1.9)+1)/2;return .045+.91*a*a*(3-2*a)}
function matchesWorld(key,url){try{const u=new URL(url),w=worlds[key];return !!w&&u.origin===ORIGIN&&u.pathname===w.path}catch{return false}}
function createVisits(){
 let active=null,sequence=0;const greeted=new Set();
 return {
  begin(key,now){if(!Object.hasOwn(worlds,key))return null;active={id:++sequence,key,at:now,loaded:false,verified:false};return active.id},
  loaded(id){if(active?.id===id)active.loaded=true},
  verified(id,url){if(active?.id===id)active.verified=matchesWorld(active.key,url)},
  finish(now){const visit=active;active=null;if(!visit||!visit.loaded||!visit.verified||!Number.isFinite(now)||now-visit.at<1000||greeted.has(visit.key))return null;greeted.add(visit.key);return {key:visit.key,...worlds[visit.key]}},
  cancel(){active=null},
  current(){return active?{...active}:null}
 };
}
const api={ORIGIN,worlds,delay,createFlyby,constellationOpacity,matchesWorld,createVisits};root.OLALoreCore=Object.freeze(api);if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
