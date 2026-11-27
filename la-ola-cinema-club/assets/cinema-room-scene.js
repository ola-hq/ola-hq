// A view-matched room: the approved interior is projected onto actual architectural planes.
// The card remains a separate DOM interaction surface in front of this decorative scene.
const CAMERA_Z=2.4;
const normalize=v=>{const length=Math.hypot(...v)||1;return v.map(n=>n/length);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a.reduce((n,x,i)=>n+x*b[i],0);
export function cinemaRoomCamera(offset=[0,0],aspect=1){
 const eye=[offset[0],offset[1],CAMERA_Z],forward=normalize([-eye[0],-eye[1],-.5-CAMERA_Z]);
 const right=normalize(cross(forward,[0,1,0])),up=cross(right,forward);
 return {eye,forward,right,up,scale:aspect>=1?[CAMERA_Z,CAMERA_Z*aspect]:[CAMERA_Z/aspect,CAMERA_Z]};
}
export function cinemaPhotoUV([x,y,z]){return [.5+x*CAMERA_Z/(CAMERA_Z-z)*.5,.5-y*CAMERA_Z/(CAMERA_Z-z)*.5];}
export function projectCinemaPoint(point,offset=[0,0],aspect=1){
 const camera=cinemaRoomCamera(offset,aspect),relative=point.map((v,i)=>v-camera.eye[i]),depth=dot(relative,camera.forward);
 return [dot(relative,camera.right)*camera.scale[0]/depth,dot(relative,camera.up)*camera.scale[1]/depth];
}
function roomMesh(){
 const data=[],quad=(a,b,c,d,normal)=>{for(const point of [a,b,c,a,c,d])data.push(...point,...normal);};
 const left=-.9,right=.9,bottom=-.57,top=.87,back=-1.4,front=1.05;
 quad([left,bottom,back],[right,bottom,back],[right,top,back],[left,top,back],[0,0,1]);
 quad([left,bottom,front],[left,bottom,back],[left,top,back],[left,top,front],[1,0,0]);
 quad([right,bottom,back],[right,bottom,front],[right,top,front],[right,top,back],[-1,0,0]);
 quad([left,bottom,front],[right,bottom,front],[right,bottom,back],[left,bottom,back],[0,1,0]);
 quad([left,top,back],[right,top,back],[right,top,front],[left,top,front],[0,-1,0]);
 return new Float32Array(data);
}
const vertex=`precision highp float;attribute vec3 aPosition;attribute vec3 aNormal;
uniform vec3 uEye,uRight,uUp,uForward;uniform vec2 uScale;
varying vec3 vPhoto,vPosition,vNormal;
void main(){vec3 p=aPosition-uEye;float depth=dot(p,uForward);
 gl_Position=vec4(dot(p,uRight)*uScale.x,dot(p,uUp)*uScale.y,depth*1.020202-.2020202,depth);
 vPhoto=vec3(aPosition.xy*2.4,2.4-aPosition.z);vPosition=aPosition;vNormal=aNormal;}`;
const fragment=`precision highp float;uniform sampler2D uPhoto;uniform vec3 uEye;
varying vec3 vPhoto,vPosition,vNormal;
void main(){vec2 uv=vec2(.5+.5*vPhoto.x/vPhoto.z,.5-.5*vPhoto.y/vPhoto.z);
 float edge=min(min(uv.x,1.-uv.x),min(uv.y,1.-uv.y));float coverage=smoothstep(0.,.012,edge);
 vec3 color=texture2D(uPhoto,clamp(uv,0.,1.)).rgb;
 float grazing=pow(1.-abs(dot(normalize(uEye-vPosition),normalize(vNormal))),3.);
 color=color*(1.-grazing*.015)+vec3(1.,.76,.4)*grazing*.004;
 gl_FragColor=vec4(mix(vec3(.025,.045,.073),color,coverage),1.);}`;

export class CinemaRoomScene{
 constructor(room,stage,{imageURL}){
  this.room=room;this.stage=stage;this.current=[0,0];this.target=[0,0];this.frame=0;this.destroyed=false;
  if(typeof window==='undefined'||!room.ownerDocument)return;
  this.dialog=room.parentElement;this.canvas=document.createElement('canvas');this.canvas.className='cinema-room-canvas';this.canvas.setAttribute('aria-hidden','true');room.append(this.canvas);
  this.reduced=matchMedia('(prefers-reduced-motion: reduce)');
  this.move=event=>{
   if(this.reduced.matches||!this.visible())return;
   const box=stage.getBoundingClientRect(),amount=event.pointerType==='touch'?.035:.11;
   this.target=[Math.max(-1,Math.min(1,(event.clientX-box.left)/box.width*2-1))*amount,-Math.max(-1,Math.min(1,(event.clientY-box.top)/box.height*2-1))*amount*.6];this.request();
  };
  this.center=()=>{this.target=[0,0];this.request();};
  this.preference=()=>{this.current=[0,0];this.target=[0,0];this.refresh();};
  this.lost=event=>{event.preventDefault();this.failed=true;room.dataset.renderer='fallback';this.cancel();};
  this.canvas.addEventListener('webglcontextlost',this.lost);
  stage.addEventListener('pointermove',this.move,{passive:true});
  for(const event of ['pointerleave','pointerup','pointercancel'])stage.addEventListener(event,this.center,{passive:true});
  this.reduced.addEventListener?.('change',this.preference);
  this.resize=()=>this.refresh();this.resizeObserver=typeof ResizeObserver==='undefined'?null:new ResizeObserver(this.resize);this.resizeObserver?.observe(room);
  window.addEventListener('resize',this.resize,{passive:true});
  this.observer=new MutationObserver(()=>this.refresh());this.observer.observe(this.dialog,{attributes:true,attributeFilter:['open']});
  this.image=new Image();this.image.onload=()=>this.initialize();this.image.onerror=()=>{room.dataset.renderer='fallback';};this.image.src=imageURL;
 }
 visible(){return !this.destroyed&&!document.hidden&&this.dialog?.open;}
 initialize(){
  if(this.destroyed)return;
  try{
   const gl=this.gl=this.canvas.getContext('webgl',{alpha:false,antialias:true,powerPreference:'low-power'});if(!gl)throw Error('No WebGL context');
   this.shaders=[];const compile=(type,source)=>{const shader=gl.createShader(type);this.shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error('Room shader unavailable');return shader;};
   const program=this.program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Room program unavailable');gl.useProgram(program);
   this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,roomMesh(),gl.STATIC_DRAW);
   for(const [name,offset]of [['aPosition',0],['aNormal',12]]){const location=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,3,gl.FLOAT,false,24,offset);}
   this.uniforms=Object.fromEntries(['uEye','uRight','uUp','uForward','uScale'].map(name=>[name,gl.getUniformLocation(program,name)]));
   this.texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,this.image);
   gl.enable(gl.DEPTH_TEST);gl.clearColor(.025,.045,.073,1);this.ready=true;this.refresh();
  }catch{this.failed=true;this.room.dataset.renderer='fallback';this.cancel();}
 }
 refresh(){
  if(!this.canvas)return;
  this.cancel();if(!this.visible()||!this.ready||this.failed)return;
  const box=this.room.getBoundingClientRect(),ratio=Math.min(window.devicePixelRatio||1,1.5);this.aspect=box.width/Math.max(1,box.height);
  this.canvas.width=Math.max(1,Math.round(box.width*ratio));this.canvas.height=Math.max(1,Math.round(box.height*ratio));this.gl.viewport(0,0,this.canvas.width,this.canvas.height);
  if(this.reduced.matches)this.current=[0,0];this.draw();this.room.dataset.renderer='webgl';
  if(!this.reduced.matches&&Math.hypot(...this.current.map((v,i)=>this.target[i]-v))>.0001)this.request();
 }
 draw(){
  const gl=this.gl,camera=cinemaRoomCamera(this.current,this.aspect);gl.useProgram(this.program);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  for(const [name,value]of [['uEye',camera.eye],['uRight',camera.right],['uUp',camera.up],['uForward',camera.forward]])gl.uniform3fv(this.uniforms[name],value);
  gl.uniform2fv(this.uniforms.uScale,camera.scale);gl.drawArrays(gl.TRIANGLES,0,30);
 }
 request(){
  if(this.frame||!this.ready||this.failed||!this.visible()||this.reduced.matches)return;
  this.frame=requestAnimationFrame(()=>{this.frame=0;if(!this.visible())return;this.current=this.current.map((v,i)=>v+(this.target[i]-v)*.12);this.draw();if(Math.hypot(...this.current.map((v,i)=>this.target[i]-v))>.0001)this.request();});
 }
 cancel(){if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;}
 destroy(){
  this.destroyed=true;this.cancel();if(!this.canvas)return;
  this.observer?.disconnect();this.resizeObserver?.disconnect();window.removeEventListener('resize',this.resize);this.reduced.removeEventListener?.('change',this.preference);
  this.stage.removeEventListener('pointermove',this.move);for(const event of ['pointerleave','pointerup','pointercancel'])this.stage.removeEventListener(event,this.center);
  this.canvas.removeEventListener('webglcontextlost',this.lost);this.image.onload=null;this.image.onerror=null;
  const gl=this.gl;if(gl){if(this.texture)gl.deleteTexture(this.texture);if(this.buffer)gl.deleteBuffer(this.buffer);if(this.program)gl.deleteProgram(this.program);for(const shader of this.shaders||[])gl.deleteShader(shader);}
  this.canvas.remove();
 }
}
