/* Camera-relative quaternion spin: no vertical hard stop or frame-rate-dependent fling. */
(function(root){'use strict';
 function multiply(a,b){return [a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]]}
 function matrix(q){const [x,y,z,w]=q;return new Float32Array([1-2*(y*y+z*z),2*(x*y+z*w),2*(x*z-y*w),2*(x*y-z*w),1-2*(x*x+z*z),2*(y*z+x*w),2*(x*z+y*w),2*(y*z-x*w),1-2*(x*x+y*y)])}
 function create(){let q=[0,0,0,1],vx=0,vy=0,yaw=0,pitch=0;
  function turn(x,y){const angle=Math.hypot(x,y);if(!angle)return;const s=Math.sin(angle/2)/angle;q=multiply([y*s,x*s,0,Math.cos(angle/2)],q);const length=Math.hypot(...q);q=q.map(v=>v/length);yaw+=x;pitch+=y}
  return {rotate(dx,dy){turn(dx*.014,dy*.014)},release(x,y){vx=Math.max(-24,Math.min(24,x))*.014/16.667;vy=Math.max(-24,Math.min(24,y))*.014/16.667},step(ms){const dt=Math.max(0,Math.min(80,ms)),decay=Math.exp(-dt/1450),distance=1450*(1-decay);turn(vx*distance,vy*distance);vx*=decay;vy*=decay;if(Math.hypot(vx,vy)<.000018){vx=vy=0;return false}return true},stop(){vx=vy=0},reset(){q=[0,0,0,1];vx=vy=yaw=pitch=0},get moving(){return Math.hypot(vx,vy)>.000018},get speed(){return Math.hypot(vx,vy)},get orientation(){return q.slice()},get matrix(){return matrix(q)},get yaw(){return yaw},get pitch(){return pitch}};
 }
 function resolution(width,dpr,software,active){return software&&active?480:Math.round(Math.max(720,Math.min(1440,width*Math.max(1,dpr||1))))}
 function choose(cards,random=Math.random){if(!cards.length)return null;return cards[Math.min(cards.length-1,Math.floor(Math.max(0,random())*cards.length))]}
 const api={create,matrix,resolution,choose};root.OLAGlobeMotion=Object.freeze(api);if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
