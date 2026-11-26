/* Portable GLB decoding and a small textured 3D rasterizer for the WebGL fallback. */
(function(root){'use strict';
 function decode(buffer){
  const view=new DataView(buffer);if(view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==buffer.byteLength)throw Error('Globe model');
  const length=view.getUint32(12,true),json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,length))),start=28+length;
  function accessor(i){const a=json.accessors[i],v=json.bufferViews[a.bufferView],components={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],step=a.componentType===5126?4:2,stride=v.byteStride||components*step;const out=new (step===4?Float32Array:Uint16Array)(a.count*components);for(let n=0;n<a.count;n++)for(let k=0;k<components;k++){const at=start+(v.byteOffset||0)+(a.byteOffset||0)+n*stride+k*step;out[n*components+k]=step===4?view.getFloat32(at,true):view.getUint16(at,true)}return out}
  const primitives=json.meshes[0].primitives.map(p=>({positions:accessor(p.attributes.POSITION),normals:accessor(p.attributes.NORMAL),uv:accessor(p.attributes.TEXCOORD_0),indices:accessor(p.indices),low:accessor(p.extras.softwareIndices),material:p.material,texture:json.materials[p.material].pbrMetallicRoughness.baseColorTexture.index}));
  const images=json.images.map(i=>{const v=json.bufferViews[i.bufferView];return {mimeType:i.mimeType,bytes:new Uint8Array(buffer,start+(v.byteOffset||0),v.byteLength)}});
  return {json,primitives,images};
 }
 function transform(p,yaw,pitch,out){const ca=Math.cos(yaw),sa=Math.sin(yaw),cb=Math.cos(pitch),sb=Math.sin(pitch);for(let i=0;i<p.length;i+=3){const y=p[i+1]*cb-p[i+2]*sb,z=p[i+1]*sb+p[i+2]*cb;out[i]=p[i]*ca+z*sa;out[i+1]=y;out[i+2]=-p[i]*sa+z*ca}return out}
 function software(model,textures){
  const projected=model.primitives.map(p=>new Float32Array(p.positions.length));
  return function(size,yaw,pitch){
   const pixels=new Uint8ClampedArray(size*size*4),zbuffer=new Float32Array(size*size);zbuffer.fill(-Infinity);const half=size/2,scale=half*.93;
   model.primitives.forEach((p,pi)=>{
    const xyz=transform(p.positions,yaw,pitch,projected[pi]),tex=textures[p.texture??p.material],ind=p.low;
    for(let n=0;n<xyz.length;n+=3){xyz[n]=half+xyz[n]*scale;xyz[n+1]=half-xyz[n+1]*scale}
    for(let f=0;f<ind.length;f+=3){
     const ai=ind[f],bi=ind[f+1],ci=ind[f+2],a=ai*3,b=bi*3,c=ci*3;
     const ax=xyz[a],ay=xyz[a+1],bx=xyz[b],by=xyz[b+1],cx=xyz[c],cy=xyz[c+1],area=(bx-ax)*(cy-ay)-(by-ay)*(cx-ax);
     if(area>=-.00001)continue;
     const minX=Math.max(0,Math.floor(Math.min(ax,bx,cx))),maxX=Math.min(size-1,Math.ceil(Math.max(ax,bx,cx))),minY=Math.max(0,Math.floor(Math.min(ay,by,cy))),maxY=Math.min(size-1,Math.ceil(Math.max(ay,by,cy)));
     const uva=ai*2,uvb=bi*2,uvc=ci*2;
     for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
      const xx=x+.5,yy=y+.5,w0=((bx-xx)*(cy-yy)-(by-yy)*(cx-xx))/area,w1=((cx-xx)*(ay-yy)-(cy-yy)*(ax-xx))/area,w2=1-w0-w1;
      if(w0<-.00001||w1<-.00001||w2<-.00001)continue;
      const z=w0*xyz[a+2]+w1*xyz[b+2]+w2*xyz[c+2],at=y*size+x;if(z<=zbuffer[at])continue;
      const u=w0*p.uv[uva]+w1*p.uv[uvb]+w2*p.uv[uvc],v=w0*p.uv[uva+1]+w1*p.uv[uvb+1]+w2*p.uv[uvc+1];
      const tx=Math.max(0,Math.min(tex.width-1,Math.round(u*(tex.width-1)))),ty=Math.max(0,Math.min(tex.height-1,Math.round(v*(tex.height-1)))),source=(ty*tex.width+tx)*4;
      const blank=tex.data[source+3]<90;if(blank&&p.material!==2)continue;
      const facing=Math.max(0,Math.min(1,z/.88)),shade=p.material!==1?.91+.09*facing:.73+.27*facing;
      const dst=at*4;pixels[dst]=(blank?3:tex.data[source])*shade;pixels[dst+1]=(blank?20:tex.data[source+1])*shade;pixels[dst+2]=(blank?30:tex.data[source+2])*shade;pixels[dst+3]=255;zbuffer[at]=z;
     }
    }
   });return pixels;
  };
 }
 const api={decode,transform,software};root.OLAGlobeModel=Object.freeze(api);if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
