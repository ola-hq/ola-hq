/* Continuous original-art globe: one closed body, one feathered UV material and a sculpted orbit. */
(()=>{'use strict';
 const modelURL=new URL('assets/models/ola-hq-sculpted-globe-v5.glb?v=20261126-patch1',document.currentScript.src),motion=matchMedia('(prefers-reduced-motion: reduce)');
 const vertex=`attribute vec3 position;attribute vec3 normal;attribute vec2 uv;uniform mat3 rotation;varying vec3 N;varying vec2 UV;varying float Z;
 vec3 turn(vec3 p){return rotation*p;}
 void main(){vec3 p=turn(position);N=turn(normal);UV=uv;Z=p.z;gl_Position=vec4(p.xy*.80,-p.z*.4,1.);}`;
 const fragment=`precision mediump float;uniform sampler2D surface;uniform float front;varying vec3 N;varying vec2 UV;varying float Z;
 void main(){vec4 c=texture2D(surface,UV);if(c.a<.35)discard;vec3 n=normalize(N);float facing=clamp(Z/.88,0.,1.);float light=max(dot(n,normalize(vec3(-.35,.5,1.))),0.);float shade=mix(.48+.52*light,.76+.24*light,front);float sheen=pow(max(dot(n,normalize(vec3(-.35,.5,1.))),0.),56.)*.04*(1.-front);gl_FragColor=vec4(c.rgb*shade+vec3(1.,.87,.6)*sheen,1.);}`;
 function shader(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Globe shader');return s}
 async function image(bytes,mimeType){const url=URL.createObjectURL(new Blob([bytes],{type:mimeType}));try{const img=new Image();img.decoding='async';img.src=url;await img.decode();return img}finally{URL.revokeObjectURL(url)}}
 const asset=fetch(modelURL).then(async r=>{if(!r.ok)throw Error('Globe asset');const model=OLAGlobeModel.decode(await r.arrayBuffer()),images=await Promise.all(model.images.map(i=>image(i.bytes,i.mimeType)));return {model,images}});
 // Consume a failed fetch even if a surface disappears before setup completes.
 asset.catch(()=>{});
 function webgl(canvas,gl,model,images){
  const program=gl.createProgram();gl.attachShader(program,shader(gl,gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl,gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Globe program');gl.useProgram(program);
  const rotation=gl.getUniformLocation(program,'rotation'),front=gl.getUniformLocation(program,'front'),locations={};for(const name of ['position','normal','uv'])locations[name]=gl.getAttribLocation(program,name);
  const meshes=model.primitives.map((p,i)=>{
   const buffers={};for(const [name,data,width]of [['position',p.positions,3],['normal',p.normals,3],['uv',p.uv,2]]){const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);buffers[name]={buffer:b,width}}
   const indices=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indices);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,p.indices,gl.STATIC_DRAW);
   const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,images[p.texture]);const bitmap=images[p.texture],mipmapped=(bitmap.width&(bitmap.width-1))===0&&(bitmap.height&(bitmap.height-1))===0;if(mipmapped)gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,mipmapped?gl.LINEAR_MIPMAP_LINEAR:gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return {buffers,indices,texture,count:p.indices.length,front:p.material!==1?1:0};
  });gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.clearColor(0,0,0,0);
  return(rotationMatrix)=>{gl.viewport(0,0,canvas.width,canvas.height);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.uniformMatrix3fv(rotation,false,rotationMatrix);for(const m of meshes){for(const [name,b]of Object.entries(m.buffers)){gl.bindBuffer(gl.ARRAY_BUFFER,b.buffer);gl.enableVertexAttribArray(locations[name]);gl.vertexAttribPointer(locations[name],b.width,gl.FLOAT,false,0,0)}gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,m.indices);gl.bindTexture(gl.TEXTURE_2D,m.texture);gl.uniform1f(front,m.front);gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_SHORT,0)}};
 }
 function software(canvas,model,images){
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Globe canvas');
  const textures=images.map(img=>{const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(img,0,0);return {width:c.width,height:c.height,data:x.getImageData(0,0,c.width,c.height).data}}),raster=OLAGlobeModel.software(model,textures);
  return(rotationMatrix)=>{ctx.putImageData(new ImageData(raster(canvas.width,rotationMatrix),canvas.width,canvas.height),0,0)};
 }
 function surpriseTargets(){return [...document.querySelectorAll('.home-six-waves>a.room,.world-card[data-tier="main"]')].filter(card=>card.target!=='_blank')}
 async function setup(anchor,index){
  let canvas=document.createElement('canvas'),render,engine='webgl',frame=0,visible=true,last=0,controls,burst=null,burstTimer=0,cooldown=0,surpriseBusy=false,preparedTarget=null;
  const ball=OLAGlobeMotion.create();anchor.dataset.globe3d='loading';
  const stop=()=>{cancelAnimationFrame(frame);frame=0;last=0;ball.stop();anchor.classList.remove('is-spinning');anchor.style.setProperty('--globe-charge','0')};
  const cancelSurprise=()=>{clearTimeout(burstTimer);clearTimeout(cooldown);burstTimer=cooldown=0;burst?.remove();burst=null;surpriseBusy=false};
  const originalDrag=anchor.getAttribute('draggable');
  try{
   const {model,images}=await asset;
   try{const gl=canvas.getContext('webgl',{alpha:true,antialias:true,powerPreference:'low-power',premultipliedAlpha:false});if(!gl)throw Error('WebGL unavailable');render=webgl(canvas,gl,model,images)}catch{canvas=document.createElement('canvas');render=software(canvas,model,images);engine='canvas'}
   function draw(active=false){
    if(anchor.dataset.globe3d==='fallback')return;
    const width=canvas.getBoundingClientRect().width||anchor.getBoundingClientRect().width*1.24,pixels=OLAGlobeMotion.resolution(width,devicePixelRatio,engine==='canvas',active);
    if(canvas.width!==pixels||canvas.height!==pixels)canvas.width=canvas.height=pixels;
    render(ball.matrix);canvas.dataset.yaw=ball.yaw.toFixed(3);canvas.dataset.pitch=ball.pitch.toFixed(3);canvas.dataset.orientation=ball.orientation.map(v=>v.toFixed(4)).join(',');
   }
   function spin(t){
    frame=0;if(!visible||document.hidden||motion.matches){stop();draw();return}
    const dt=last?Math.min(80,t-last):16.667;if(engine==='canvas'&&last&&dt<40){frame=requestAnimationFrame(spin);return}last=t;
    const moving=ball.step(dt);anchor.classList.toggle('is-spinning',moving);anchor.style.setProperty('--globe-charge',Math.min(1,ball.speed*160).toFixed(2));draw(moving);
    if(moving)frame=requestAnimationFrame(spin);else{last=0;anchor.classList.remove('is-spinning');anchor.style.setProperty('--globe-charge','0')}
   }
   function release(x,y){stop();if(!motion.matches&&visible&&!document.hidden){ball.release(x,y);if(ball.moving){anchor.classList.add('is-spinning');frame=requestAnimationFrame(spin);return}}draw()}
   function prepare(){if(preparedTarget)return;preparedTarget=OLAGlobeMotion.choose(surpriseTargets());if(preparedTarget){const r=anchor.getBoundingClientRect();window.OLAPortals?.primeOrigin?.(preparedTarget,{x:r.x+r.width/2,y:r.y+r.height/2})}}
   function surprise(){
    if(surpriseBusy)return;prepare();const target=preparedTarget;preparedTarget=null;if(!target){anchor.click();return}
    surpriseBusy=true;stop();const r=anchor.getBoundingClientRect(),point={x:r.x+r.width/2,y:r.y+r.height/2};
    window.OLAPortals?.primeOrigin?.(target,point);
    anchor.dataset.surpriseWorld=target.dataset.world||target.getAttribute('href');
    // Use the same mystical canvas portal and navigation policy as world cards.
    target.click();
    cooldown=setTimeout(()=>{cooldown=0;surpriseBusy=false},3000);
   }
   canvas.className='hq-globe-canvas';canvas.setAttribute('aria-hidden','true');canvas.draggable=false;anchor.append(canvas);anchor.classList.add('has-3d-globe');anchor.dataset.globe3d='ready';anchor.dataset.globeEngine=engine;draw();
   anchor.draggable=false;anchor.querySelectorAll('img').forEach(img=>{img.draggable=false});
   controls=OLAGlobeInput.attach(anchor,{press(){stop();prepare();if(!surpriseBusy)draw()},rotate(dx,dy){if(surpriseBusy)return;ball.rotate(dx,dy);draw(true)},release,reset(){stop();ball.reset();draw()},activate(){if(!surpriseBusy)anchor.click()},surprise});
   const help=document.createElement('span');help.className='hq-globe-help';help.id='hq-globe-help-'+index;help.textContent='Click and drag or use two fingers on a trackpad over the globe to spin it. Tap or press Enter to explore Waves. Arrow keys rotate; Home resets. Triple tap or press R for a surprise world.';anchor.setAttribute('aria-describedby',help.id);anchor.append(help);
   const cancel=()=>{stop();controls.cancel();cancelSurprise();draw()};
   const observer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible){stop();controls.cancel()}else draw()});observer?.observe(anchor);
   addEventListener('resize',()=>draw(),{passive:true});addEventListener('pagehide',cancel);addEventListener('pageshow',()=>draw());document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();else draw()});motion.addEventListener('change',cancel);addEventListener('keydown',e=>{if(e.key==='Escape')cancel()});
   canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();stop();try{const replacement=document.createElement('canvas');replacement.className='hq-globe-canvas';replacement.setAttribute('aria-hidden','true');render=software(replacement,model,images);canvas.replaceWith(replacement);canvas=replacement;engine='canvas';anchor.dataset.globeEngine=engine;draw()}catch(error){controls.destroy();cancelSurprise();canvas.remove();anchor.classList.remove('has-3d-globe');anchor.dataset.globe3d='fallback'}});
  }catch(error){stop();controls?.destroy();cancelSurprise();if(originalDrag===null)anchor.removeAttribute('draggable');else anchor.setAttribute('draggable',originalDrag);anchor.dataset.globe3d='fallback';anchor.dataset.globeError=error.message;anchor.classList.remove('has-3d-globe');canvas.remove()}
 }
 document.querySelectorAll('.portal-globe-door,#hero-world-jump').forEach(setup);
})();
