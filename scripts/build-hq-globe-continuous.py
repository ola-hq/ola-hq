"""Build a single closed OLA globe with a continuous, opaque UV material.
Python 3 + Pillow + NumPy. Original front/rear source artwork stays unchanged.
The original front projection continues over the rim, then smoothly feathers
into the authored rear map. No separate front cap or supporting shell exists.
"""
import io, json, math, pathlib, struct, hashlib
import numpy as np
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[1]
FRONT=ROOT/'assets/entrances/ola-hq-floating-hero-20261007.webp'
BACK=ROOT/'assets/models/ola-hq-ocean-continuation-v2.webp'
OUT=ROOT/'assets/models/ola-hq-continuous-globe-v3.glb'
W,H=2048,1024

def sample(image,u,v):
    a=np.asarray(image.convert('RGBA'),dtype=np.float32)/255
    x=np.clip(u,0,1)*(a.shape[1]-1);y=np.clip(v,0,1)*(a.shape[0]-1)
    x0=x.astype(int);y0=y.astype(int);x1=np.minimum(x0+1,a.shape[1]-1);y1=np.minimum(y0+1,a.shape[0]-1)
    tx=(x-x0)[...,None];ty=(y-y0)[...,None]
    return (a[y0,x0]*(1-tx)+a[y0,x1]*tx)*(1-ty)+(a[y1,x0]*(1-tx)+a[y1,x1]*tx)*ty

# Bake a material for one sphere. The crossfade is entirely behind the original
# front rim; smoothstep has zero slope at both ends. Longitude wraps exactly.
u,v=np.meshgrid(np.linspace(0,1,W),np.linspace(0,1,H))
theta=u*2*np.pi;phi=v*np.pi
nx=np.sin(phi)*np.sin(theta);ny=np.cos(phi);nz=np.sin(phi)*np.cos(theta)
original=sample(Image.open(FRONT),(.87*nx-.01+1)/2,(1-(.87*ny+.002))/2)
rear=sample(Image.open(BACK),u,v)
front_color=original[...,:3]*original[...,3:]+rear[...,:3]*(1-original[...,3:])
t=np.clip((nz+.62)/.60,0,1);weight=(t*t*(3-2*t))[...,None]
color=front_color*weight+rear[...,:3]*(1-weight)
color[:,-1]=color[:,0]
# Collapse the equirectangular pole pixels to the same color at every longitude.
color[0]=color[0].mean(axis=0);color[-1]=color[-1].mean(axis=0)
texture=Image.fromarray(np.uint8(np.clip(color*255,0,255)))
texture_bytes=io.BytesIO();texture.save(texture_bytes,format='WEBP',quality=93,method=6)
gold_bytes=io.BytesIO();Image.new('RGB',(1,1),(218,175,87)).save(gold_bytes,format='WEBP',lossless=True)

vertices=[];groups=[];low=[]
def add(p,n,uv):vertices.append((*p,*n,*uv));return len(vertices)-1
S,T=144,72
for iy in range(T+1):
    p=math.pi*iy/T
    for ix in range(S+1):
        a=2*math.pi*ix/S;n=(math.sin(p)*math.sin(a),math.cos(p),math.sin(p)*math.cos(a))
        # One shared radius: the surface stays closed at every pose and pole.
        add(tuple(c*.87 for c in n),n,(ix/S,iy/T))
def grid_indices(offset,cols,rows,step=1):
    out=[]
    for y in range(0,rows,step):
        for x in range(0,cols,step):
            a=offset+y*(cols+1)+x;b=a+step;c=a+step*(cols+1);d=c+step
            for tri in ((a,c,b),(b,c,d)):
                p,q,r=[np.array(vertices[i][:3]) for i in tri]
                if np.linalg.norm(np.cross(q-p,r-p))>1e-9:out.extend(tri)
    return out
groups.append(grid_indices(0,S,T));low.append(grid_indices(0,S,T,3))

# The gold orbit is now an actual closed torus, not part of a clipped front sheet.
# Its diagonal, shallow ellipse follows the original logo's orbital gesture.
offset=len(vertices);A,B=128,8
ca,sa=math.cos(.50),math.sin(.50);cb,sb=math.cos(1.18),math.sin(1.18)
def orbit_turn(p):
    x,y,z=p;y,z=y*cb-z*sb,y*sb+z*cb
    return (x*ca-y*sa,x*sa+y*ca,z)
for ia in range(B+1):
    b=2*math.pi*ia/B
    for ib in range(A+1):
        a=2*math.pi*ib/A;n=(math.cos(a)*math.cos(b),math.sin(a)*math.cos(b),math.sin(b))
        point=((1.04+.006*math.cos(b))*math.cos(a),(1.04+.006*math.cos(b))*math.sin(a),.006*math.sin(b))
        add(orbit_turn(point),orbit_turn(n),(0,0))
# Torus grid is oriented opposite to the sphere latitude grid.
gold_idx=grid_indices(offset,A,B);gold_idx=[gold_idx[i+j] for i in range(0,len(gold_idx),3) for j in (0,2,1)]

# Small sculpted gold satellites continue the original logo's ornamentation.
for x,y,z,r in [(-.78,.52,.12,.014),(.46,.80,.04,.016),(.80,.38,.10,.021),(-.67,-.70,.10,.018),(.72,-.62,.10,.019)]:
    offset=len(vertices);s,t=16,8
    for iy in range(t+1):
        p=math.pi*iy/t
        for ix in range(s+1):
            a=2*math.pi*ix/s;n=(math.sin(p)*math.sin(a),math.cos(p),math.sin(p)*math.cos(a))
            add((x+n[0]*r,y+n[1]*r,z+n[2]*r),n,(0,0))
    gold_idx.extend(grid_indices(offset,s,t))
groups.append(gold_idx);low.append(gold_idx)

raw=bytearray();views=[];accessors=[]
def view(data,**extra):
    while len(raw)%4:raw.append(0)
    at=len(raw);raw.extend(data);views.append(dict(buffer=0,byteOffset=at,byteLength=len(data),**extra));return len(views)-1
def acc(v,typ,component,count,**extra):
    accessors.append(dict(bufferView=v,componentType=component,count=count,type=typ,**extra));return len(accessors)-1
vb=view(np.array(vertices,dtype='<f4').tobytes(),byteStride=32,target=34962)
positions=np.array(vertices)[:,:3]
pos=acc(vb,'VEC3',5126,len(vertices),byteOffset=0,min=positions.min(axis=0).tolist(),max=positions.max(axis=0).tolist())
norm=acc(vb,'VEC3',5126,len(vertices),byteOffset=12);uv=acc(vb,'VEC2',5126,len(vertices),byteOffset=24)
prims=[]
for i,(indices,lod) in enumerate(zip(groups,low)):
    ia=acc(view(np.array(indices,dtype='<u2').tobytes(),target=34963),'SCALAR',5123,len(indices))
    la=acc(view(np.array(lod,dtype='<u2').tobytes()),'SCALAR',5123,len(lod))
    prims.append(dict(attributes={'POSITION':pos,'NORMAL':norm,'TEXCOORD_0':uv},indices=ia,material=i,extras={'softwareIndices':la,'closedSurface':True}))
images=[{'bufferView':view(b),'mimeType':'image/webp'} for b in (texture_bytes.getvalue(),gold_bytes.getvalue())]
model=dict(asset={'version':'2.0','generator':'OLA HQ continuous globe v3'},extensionsUsed=['EXT_texture_webp'],extensionsRequired=['EXT_texture_webp'],scene=0,scenes=[{'nodes':[0]}],nodes=[{'mesh':0,'name':'Continuous OLA ocean globe'}],meshes=[{'primitives':prims}],bufferViews=views,accessors=accessors,images=images,samplers=[{'magFilter':9729,'minFilter':9729,'wrapS':10497,'wrapT':33071}],textures=[{'sampler':0,'extensions':{'EXT_texture_webp':{'source':i}}} for i in range(2)],materials=[{'name':name,'pbrMetallicRoughness':{'baseColorTexture':{'index':i},'metallicFactor':.20 if i==0 else .75,'roughnessFactor':.42 if i==0 else .25},'alphaMode':'OPAQUE','doubleSided':False} for i,name in enumerate(('Continuous original-art ocean','Sculpted gold orbit'))],buffers=[{'byteLength':len(raw)}],extras={'originalSource':str(FRONT.relative_to(ROOT)),'originalSourceSHA256':hashlib.sha256(FRONT.read_bytes()).hexdigest(),'rearSource':str(BACK.relative_to(ROOT)),'continuousBody':True,'radius':.87,'bodyGrid':[S,T],'blendNormalZ':[-.62,-.02],'textureSize':[W,H],'singleViewReconstruction':True})
js=json.dumps(model,separators=(',',':')).encode();js+=b' '*(-len(js)%4);raw+=b'\0'*(-len(raw)%4)
body=struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(raw),0x004e4942)+raw
OUT.write_bytes(struct.pack('<III',0x46546c67,2,len(body)+12)+body)
print(f'{OUT.name}: {len(vertices)} vertices, {sum(len(i)//3 for i in groups)} triangles, {OUT.stat().st_size} bytes')
