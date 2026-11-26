/* Original-art relief globe: exact front texture, curved geometry and an ocean continuation. */
(()=>{'use strict';
 const modelURL=new URL('assets/models/ola-hq-original-relief-v2.glb?v=20261126-original3',document.currentScript.src),motion=matchMedia('(prefers-reduced-motion: reduce)');
 const vertex=`attribute vec3 position;attribute vec3 normal;attribute vec2 uv;uniform vec2 rotation;varying vec3 N;varying vec2 UV;varying float Z;
 vec3 turn(vec3 p){float a=rotation.x,b=rotation.y;vec3 q=vec3(p.x,p.y*cos(b)-p.z*sin(b),p.y*sin(b)+p.z*cos(b));return vec3(q.x*cos(a)+q.z*sin(a),q.y,-q.x*sin(a)+q.z*cos(a));}
 void main(){vec3 p=turn(position);N=turn(normal);UV=uv;Z=p.z;gl_Position=vec4(p.xy*.93,-p.z*.4,1.);}`;
 const fragment=`precision mediump float;uniform sampler2D surface;uniform float front;uniform float shell;varying vec3 N;varying vec2 UV;varying float Z;
 void main(){vec4 c=texture2D(surface,UV);if(c.a<.35){if(shell<.5)discard;c=vec4(.012,.078,.118,1.);}vec3 n=normalize(N);float facing=clamp(Z/.88,0.,1.);float shade=mix(.73+.27*facing,.91+.09*facing,front);float sheen=pow(max(dot(n,normalize(vec3(-.35,.5,1.))),0.),56.)*.04*(1.-front);gl_FragColor=vec4(c.rgb*shade+vec3(1.,.87,.6)*sheen,1.);}`;
 function shader(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Globe shader');return s}
 async function image(bytes,mimeType){const url=URL.createObjectURL(new Blob([bytes],{type:mimeType}));try{const img=new Image();img.decoding='async';img.src=url;await img.decode();return img}finally{URL.revokeObjectURL(url)}}
 const asset=fetch(modelURL).then(async r=>{if(!r.ok)throw Error('Globe asset');const model=OLAGlobeModel.decode(await r.arrayBuffer()),images=await Promise.all(model.images.map(i=>image(i.bytes,i.mimeType)));return {model,images}});
 // Consume a failed fetch even if a surface disappears before setup completes.
 asset.catch(()=>{});
 function webgl(canvas,gl,model,images){
  const program=gl.createProgram();gl.attachShader(program,shader(gl,gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl,gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Globe program');gl.useProgram(program);
  const rotation=gl.getUniformLocation(program,'rotation'),front=gl.getUniformLocation(program,'front'),shell=gl.getUniformLocation(program,'shell'),locations={};for(const name of ['position','normal','uv'])locations[name]=gl.getAttribLocation(program,name);
  const meshes=model.primitives.map((p,i)=>{
   const buffers={};for(const [name,data,width]of [['position',p.positions,3],['normal',p.normals,3],['uv',p.uv,2]]){const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);buffers[name]={buffer:b,width}}
   const indices=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indices);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,p.indices,gl.STATIC_DRAW);
   const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,images[p.texture]);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return {buffers,indices,texture,count:p.indices.length,front:p.material!==1?1:0,shell:p.material===2?1:0};
  });gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.clearColor(0,0,0,0);
  return(yaw,pitch)=>{gl.viewport(0,0,canvas.width,canvas.height);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.uniform2f(rotation,yaw,pitch);for(const m of meshes){for(const [name,b]of Object.entries(m.buffers)){gl.bindBuffer(gl.ARRAY_BUFFER,b.buffer);gl.enableVertexAttribArray(locations[name]);gl.vertexAttribPointer(locations[name],b.width,gl.FLOAT,false,0,0)}gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,m.indices);gl.bindTexture(gl.TEXTURE_2D,m.texture);gl.uniform1f(front,m.front);gl.uniform1f(shell,m.shell);gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_SHORT,0)}};
 }
 function software(canvas,model,images){
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Globe canvas');
  const textures=images.map(img=>{const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(img,0,0);return {width:c.width,height:c.height,data:x.getImageData(0,0,c.width,c.height).data}}),raster=OLAGlobeModel.software(model,textures);
  return(yaw,pitch)=>{ctx.putImageData(new ImageData(raster(canvas.width,yaw,pitch),canvas.width,canvas.height),0,0)};
 }
 async function setup(anchor,index){
  let canvas=document.createElement('canvas'),render,engine='webgl',frame=0,yaw=0,pitch=0,vx=0,vy=0,visible=true,last=0;
  anchor.dataset.globe3d='loading';const stop=()=>{cancelAnimationFrame(frame);frame=0;vx=vy=0};
  try{
   const {model,images}=await asset;
   try{const gl=canvas.getContext('webgl',{alpha:true,antialias:true,powerPreference:'low-power',premultipliedAlpha:false});if(!gl)throw Error('WebGL unavailable');render=webgl(canvas,gl,model,images)}catch{canvas=document.createElement('canvas');render=software(canvas,model,images);engine='canvas'}
   function draw(){if(anchor.dataset.globe3d==='fallback')return;const width=anchor.getBoundingClientRect().width,pixels=Math.round(Math.min(engine==='canvas'?400:1024,width*Math.min(devicePixelRatio||1,engine==='canvas'?1.5:2)));if(canvas.width!==pixels||canvas.height!==pixels)canvas.width=canvas.height=pixels;render(yaw,pitch);canvas.dataset.yaw=yaw.toFixed(3);canvas.dataset.pitch=pitch.toFixed(3)}
   function spin(t){frame=0;if(!visible||document.hidden||motion.matches)return;if(engine==='canvas'&&t-last<40){frame=requestAnimationFrame(spin);return}last=t;yaw+=vx;pitch=Math.max(-1.2,Math.min(1.2,pitch+vy));vx*=.94;vy*=.94;draw();if(Math.hypot(vx,vy)>.0005)frame=requestAnimationFrame(spin)}
   const controls=OLAGlobeInput.attach(anchor,{press:stop,rotate(dx,dy){yaw+=dx*.009;pitch=Math.max(-1.2,Math.min(1.2,pitch+dy*.009));draw()},release(x,y){stop();if(!motion.matches){vx=x*.009;vy=y*.009;if(Math.hypot(vx,vy)>.0005)frame=requestAnimationFrame(spin)}},reset(){stop();yaw=pitch=0;draw()}});
   canvas.className='hq-globe-canvas';canvas.setAttribute('aria-hidden','true');anchor.append(canvas);anchor.classList.add('has-3d-globe');anchor.dataset.globe3d='ready';anchor.dataset.globeEngine=engine;
   const help=document.createElement('span');help.className='hq-globe-help';help.id='hq-globe-help-'+index;help.textContent='Drag to rotate the globe. Tap or press Enter to explore Waves. Arrow keys rotate; Home resets the view.';anchor.setAttribute('aria-describedby',help.id);anchor.append(help);draw();
   const observer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible)stop();else draw()});observer?.observe(anchor);
   addEventListener('resize',draw,{passive:true});addEventListener('pagehide',()=>{stop();controls.cancel()});addEventListener('pageshow',draw);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else draw()});motion.addEventListener('change',()=>{stop();draw()});
   canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();stop();try{const replacement=document.createElement('canvas');replacement.className='hq-globe-canvas';replacement.setAttribute('aria-hidden','true');render=software(replacement,model,images);canvas.replaceWith(replacement);canvas=replacement;engine='canvas';anchor.dataset.globeEngine=engine;draw()}catch(error){controls.destroy();canvas.remove();anchor.classList.remove('has-3d-globe');anchor.dataset.globe3d='fallback'}});
  }catch(error){stop();anchor.dataset.globe3d='fallback';anchor.dataset.globeError=error.message;anchor.classList.remove('has-3d-globe');canvas.remove()}
 }
 document.querySelectorAll('.portal-globe-door,#hero-world-jump').forEach(setup);
})();
