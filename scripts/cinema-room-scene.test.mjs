import test from 'node:test';
import assert from 'node:assert/strict';
import {cinemaPhotoUV,projectCinemaPoint,cinemaRoomCamera} from '../la-ola-cinema-club/assets/cinema-room-scene.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} differs from ${b}`);
test('the five-plane projection keeps the approved interior registered at rest, including architectural joints',()=>{
 for(const point of [[0,0,-1.4],[-.9,.87,-1.4],[.9,-.57,-1.4],[-.9,-.57,1.05],[.9,.87,1.05]]){
  const uv=cinemaPhotoUV(point),projected=projectCinemaPoint(point);near(projected[0],uv[0]*2-1);near(projected[1],1-uv[1]*2);
 }
 const ceiling=cinemaPhotoUV([0,.87,-1.4]),floor=cinemaPhotoUV([0,-.57,-1.4]);assert.ok(ceiling[1]<.25);assert.ok(floor[1]>.65);
 for(const aspect of [.39,1.44]){const center=projectCinemaPoint([0,0,-1.4],[0,0],aspect);near(center[0],0);near(center[1],0);}
});
test('camera movement produces depth-dependent parallax rather than moving a flat background',()=>{
 const nearPoint=[.3,.2,1],farPoint=[.3,.2,-1.4];
 const movement=p=>{const a=projectCinemaPoint(p),b=projectCinemaPoint(p,[.11,.04]);return Math.hypot(b[0]-a[0],b[1]-a[1]);};
 assert.ok(movement(nearPoint)>movement(farPoint)*2);
 const camera=cinemaRoomCamera([.11,.04],.39);for(const axis of [camera.right,camera.up,camera.forward])near(Math.hypot(...axis),1);
 near(camera.right.reduce((n,v,i)=>n+v*camera.forward[i],0),0);
});
