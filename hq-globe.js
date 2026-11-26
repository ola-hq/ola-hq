/* One real GLB mesh, local WebGL lighting, and a 3D canvas path for browsers without WebGL. */
(()=>{'use strict';
 const modelURL=new URL('assets/models/ola-hq-ocean-globe-v1.glb',document.currentScript.src),motion=matchMedia('(prefers-reduced-motion: reduce)');
 const vertex=`attribute vec3 position;attribute vec3 normal;attribute vec4 color;uniform vec2 rotation;varying vec3 N;varying vec3 P;varying vec3 C;
 vec3 turn(vec3 p){float a=rotation.x,b=rotation.y;vec3 q=vec3(p.x,p.y*cos(b)-p.z*sin(b),p.y*sin(b)+p.z*cos(b));return vec3(q.x*cos(a)+q.z*sin(a),q.y,-q.x*sin(a)+q.z*cos(a));}
 void main(){P=turn(position);N=turn(normal);C=color.rgb;float z=P.z-4.6;gl_Position=vec4(P.xy*3.65,-1.01005*z-.201005,-z);}`;
 const fragment=`precision mediump float;varying vec3 N;varying vec3 P;varying vec3 C;
 void main(){vec3 n=normalize(N),v=normalize(vec3(0.,0.,4.6)-P),l=normalize(vec3(-3.,4.,5.));float gold=step(C.b*1.55,C.r)*step(C.g*1.08,C.r);float diffuse=max(dot(n,l),0.);float fill=max(dot(n,normalize(vec3(4.,-1.,2.))),0.);float shine=pow(max(dot(n,normalize(l+v)),0.),mix(28.,85.,gold));float rim=pow(1.-max(dot(n,v),0.),3.);vec3 lit=C*(.27+.7*diffuse+.16*fill)+mix(vec3(.35,.6,.65),vec3(1.,.86,.53),gold)*shine*(.3+gold*.55)+vec3(.08,.15,.2)*rim;gl_FragColor=vec4(lit,1.);}`;
 function shader(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Globe shader');return s}
 function webgl(canvas,gl,buffer,model,binaryStart){
  const p=model.meshes[0].primitives[0],vb=model.bufferViews[0],ib=model.bufferViews[1],indices=model.accessors[p.indices];
  if(indices.componentType===5125&&!gl.getExtension('OES_element_index_uint'))throw Error('Globe indices');
  const program=gl.createProgram();gl.attachShader(program,shader(gl,gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl,gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Globe program');gl.useProgram(program);
  const vbo=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vbo);gl.bufferData(gl.ARRAY_BUFFER,new Uint8Array(buffer,binaryStart+(vb.byteOffset||0),vb.byteLength),gl.STATIC_DRAW);
  for(const [name,a]of [['position',model.accessors[p.attributes.POSITION]],['normal',model.accessors[p.attributes.NORMAL]],['color',model.accessors[p.attributes.COLOR_0]]]){const loc=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,a.type==='VEC4'?4:3,a.componentType,!!a.normalized,vb.byteStride,a.byteOffset||0)}
  const ebo=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ebo);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint8Array(buffer,binaryStart+(ib.byteOffset||0),ib.byteLength),gl.STATIC_DRAW);
  const rotation=gl.getUniformLocation(program,'rotation');gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.clearColor(0,0,0,0);
  return (yaw,pitch)=>{gl.viewport(0,0,canvas.width,canvas.height);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.uniform2f(rotation,yaw,pitch);gl.drawElements(gl.TRIANGLES,indices.count,indices.componentType,0)};
 }
 function software(canvas,buffer,model,binaryStart){
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Globe canvas');
  const view=new DataView(buffer),vb=model.bufferViews[0],ib=model.bufferViews[1],n=model.accessors[0].count,count=model.accessors[3].count;
  const positions=new Float32Array(n*3),normals=new Float32Array(n*3),colors=new Uint8Array(n*3),indices=new Uint32Array(count),screen=new Float32Array(n*3),shades=new Float32Array(n),depth=new Float32Array(count/3);
  for(let i=0;i<n;i++){const at=binaryStart+(vb.byteOffset||0)+i*vb.byteStride;for(let k=0;k<3;k++){positions[i*3+k]=view.getFloat32(at+k*4,true);normals[i*3+k]=view.getFloat32(at+12+k*4,true);colors[i*3+k]=view.getUint8(at+24+k)}}
  for(let i=0;i<count;i++)indices[i]=view.getUint16(binaryStart+ib.byteOffset+i*2,true);
  return (yaw,pitch)=>{
   const ca=Math.cos(yaw),sa=Math.sin(yaw),cb=Math.cos(pitch),sb=Math.sin(pitch),size=canvas.width,half=size/2;
   for(let i=0;i<n;i++){
    const j=i*3,x=positions[j],y=positions[j+1]*cb-positions[j+2]*sb,z=positions[j+1]*sb+positions[j+2]*cb,xx=x*ca+z*sa,zz=-x*sa+z*ca,f=3.65/(4.6-zz);
    screen[j]=half+xx*f*half;screen[j+1]=half-y*f*half;screen[j+2]=zz;
    const nx=normals[j],ny=normals[j+1]*cb-normals[j+2]*sb,nz=normals[j+1]*sb+normals[j+2]*cb,rx=nx*ca+nz*sa,rz=-nx*sa+nz*ca;
    shades[i]=.29+.7*Math.max(0,rx*-.424+ny*.566+rz*.707)+.12*Math.max(0,rx*.873-ny*.218+rz*.436);
   }
   const faces=[];
   for(let f=0;f<count/3;f++){const a=indices[f*3]*3,b=indices[f*3+1]*3,c=indices[f*3+2]*3;if((screen[b]-screen[a])*(screen[c+1]-screen[a+1])-(screen[b+1]-screen[a+1])*(screen[c]-screen[a])>=0)continue;depth[f]=(screen[a+2]+screen[b+2]+screen[c+2])/3;faces.push(f)}
   faces.sort((a,b)=>depth[a]-depth[b]);ctx.clearRect(0,0,size,size);ctx.lineWidth=.35;
   for(const f of faces){const ai=indices[f*3],bi=indices[f*3+1],ci=indices[f*3+2],a=ai*3,b=bi*3,c=ci*3,s=(shades[ai]+shades[bi]+shades[ci])/3;const rgb=[0,1,2].map(k=>Math.min(255,Math.round(colors[a+k]*s)));ctx.fillStyle=ctx.strokeStyle=`rgb(${rgb.join(',')})`;ctx.beginPath();ctx.moveTo(screen[a],screen[a+1]);ctx.lineTo(screen[b],screen[b+1]);ctx.lineTo(screen[c],screen[c+1]);ctx.closePath();ctx.fill();ctx.stroke()}
  };
 }
 async function setup(anchor,index){
  let canvas=document.createElement('canvas'),render,engine='webgl',frame=0,yaw=0,pitch=-.08,vx=0,vy=0,visible=true,last=0;
  anchor.dataset.globe3d='loading';
  const stop=()=>{cancelAnimationFrame(frame);frame=0;vx=vy=0};
  try{
   const response=await fetch(modelURL);if(!response.ok)throw Error('Globe asset');const buffer=await response.arrayBuffer(),view=new DataView(buffer);
   if(view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2)throw Error('Globe model');
   const jsonLength=view.getUint32(12,true),model=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,jsonLength))),binaryStart=28+jsonLength;
   try{const gl=canvas.getContext('webgl',{alpha:true,antialias:true,powerPreference:'low-power',premultipliedAlpha:false});if(!gl)throw Error('WebGL unavailable');render=webgl(canvas,gl,buffer,model,binaryStart)}catch{canvas=document.createElement('canvas');render=software(canvas,buffer,model,binaryStart);engine='canvas'}
   function draw(){if(anchor.dataset.globe3d==='fallback')return;const pixels=Math.round(anchor.getBoundingClientRect().width*Math.min(devicePixelRatio||1,engine==='canvas'?1.5:2));if(canvas.width!==pixels||canvas.height!==pixels)canvas.width=canvas.height=pixels;render(yaw,pitch);canvas.dataset.yaw=yaw.toFixed(3);canvas.dataset.pitch=pitch.toFixed(3)}
   function spin(t){frame=0;if(!visible||document.hidden||motion.matches)return;if(engine==='canvas'&&t-last<32){frame=requestAnimationFrame(spin);return}last=t;yaw+=vx;pitch=Math.max(-1.2,Math.min(1.2,pitch+vy));vx*=.94;vy*=.94;draw();if(Math.hypot(vx,vy)>.0005)frame=requestAnimationFrame(spin)}
   const controls=window.OLAGlobeInput.attach(anchor,{press:stop,rotate(dx,dy){yaw+=dx*.009;pitch=Math.max(-1.2,Math.min(1.2,pitch+dy*.009));draw()},release(x,y){stop();if(!motion.matches){vx=x*.009;vy=y*.009;if(Math.hypot(vx,vy)>.0005)frame=requestAnimationFrame(spin)}},reset(){stop();yaw=0;pitch=-.08;draw()}});
   canvas.className='hq-globe-canvas';canvas.setAttribute('aria-hidden','true');anchor.append(canvas);anchor.classList.add('has-3d-globe');anchor.dataset.globe3d='ready';anchor.dataset.globeEngine=engine;
   const hint=document.createElement('span');hint.className='hq-globe-hint';hint.textContent='Drag to spin';hint.setAttribute('aria-hidden','true');
   const help=document.createElement('span');help.className='hq-globe-help';help.id='hq-globe-help-'+index;help.textContent='Drag to rotate the globe. Tap or press Enter to explore Waves. Arrow keys rotate; Home resets the view.';anchor.setAttribute('aria-describedby',help.id);anchor.append(hint,help);draw();
   const observer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible)stop();else draw()});observer?.observe(anchor);
   addEventListener('resize',draw,{passive:true});addEventListener('pagehide',()=>{stop();controls.cancel()});addEventListener('pageshow',draw);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else draw()});motion.addEventListener('change',()=>{stop();draw()});
   canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();stop();const replacement=document.createElement('canvas');replacement.className='hq-globe-canvas';replacement.setAttribute('aria-hidden','true');canvas.replaceWith(replacement);canvas=replacement;render=software(canvas,buffer,model,binaryStart);engine='canvas';anchor.dataset.globeEngine=engine;draw()});
  }catch(error){stop();anchor.dataset.globe3d='fallback';anchor.dataset.globeError=error.message;anchor.classList.remove('has-3d-globe');canvas.remove()}
 }
 document.querySelectorAll('.portal-globe-door,#hero-world-jump').forEach(setup);
})();
