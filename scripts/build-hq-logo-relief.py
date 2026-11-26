"""Build the original-logo relief globe. Python 3 + Pillow + NumPy; no Blender required.

The front UVs preserve the existing transparent logo's pixels at the rest view.
A curved, displaced front mesh carries that image. A separately textured sphere
continues the unseen sides/back. It is an authored single-view reconstruction,
not a recovered original CAD model. Run from the repository root.
"""
import io, json, math, pathlib, struct
import numpy as np
from PIL import Image
ROOT = pathlib.Path(__file__).resolve().parents[1]
FRONT = ROOT/'assets/entrances/ola-hq-floating-hero-20261007.webp'
BACK = ROOT/'assets/models/ola-hq-ocean-continuation-v2.webp'
OUT = ROOT/'assets/models/ola-hq-original-relief-v2.glb'
vertices=[]; groups=[]; low_groups=[]

def add(p,n,uv):
    vertices.append((*p,*n,*uv));return len(vertices)-1

def normalize(v):
    return v/max(np.linalg.norm(v),1e-9)

# The curved artwork panel follows the original sphere, including the wave's
# overhang, orbit and small gold satellites outside the globe's circular body.
N=144
pixels=np.asarray(Image.open(FRONT).convert('RGBA'))/255

def depth(x,y):
    px=int(np.clip((x+1)*.5*(pixels.shape[1]-1),0,pixels.shape[1]-1))
    py=int(np.clip((1-y)*.5*(pixels.shape[0]-1),0,pixels.shape[0]-1))
    r,g,b,a=pixels[py,px]
    d=(x+.01)**2+(y-.002)**2
    base=math.sqrt(max(0,.87**2-d))
    # Tactile enamel/foil relief follows the source pigments, never replaces art.
    foam=min(r,g,b);gold=max(0,r-b)*.7;wave=max(0,g-r)*.45
    return base+.018+a*(foam*.018+gold*.027+wave*.025)
for iy in range(N+1):
    y=1-iy*2/N
    for ix in range(N+1):
        x=-1+ix*2/N;z=depth(x,y);eps=.002
        dx=(depth(x+eps,y)-depth(x-eps,y))/(2*eps)
        dy=(depth(x,y+eps)-depth(x,y-eps))/(2*eps)
        normal=normalize(np.array([-dx,-dy,1.]))
        add((x,y,z),normal,(ix/N,iy/N))

def front_indices(step):
    idx=[]
    for y in range(0,N,step):
        for x in range(0,N,step):
            a=y*(N+1)+x;b=a+step;c=a+step*(N+1);d=c+step
            idx.extend((a,c,b,b,c,d))
    return idx
# Counterclockwise in model coordinates (screen y goes downward).
groups.append(front_indices(1));low_groups.append(front_indices(4))
# Complete round shell: the front hemisphere repeats the original projection;
# the unseen rear uses the generated continuation. The shell closes tiny gaps
# behind raised source detail while preserving a continuous side silhouette.
S,T=96,48
for front in (False,True):
    offset=len(vertices)
    for iy in range(T+1):
        phi=math.pi*iy/T
        for ix in range(S+1):
            theta=2*math.pi*ix/S
            n=np.array([math.sin(phi)*math.sin(theta),math.cos(phi),math.sin(phi)*math.cos(theta)])
            pt=n*.866
            uv=((pt[0]+1)/2,(1-pt[1])/2) if front else (ix/S,iy/T)
            add(pt,n,uv)
    def shell_indices(step):
        idx=[]
        for y in range(0,T,step):
            for x in range(0,S,step):
                a=offset+y*(S+1)+x;b=a+step;c=a+step*(S+1);d=c+step
                for tri in ((a,c,b),(b,c,d)):
                    z=sum(vertices[i][2] for i in tri)
                    if (z>=0) == front:idx.extend(tri)
        return idx
    groups.append(shell_indices(1));low_groups.append(shell_indices(3))
# Export a normal glTF 2.0 mesh with embedded WebP materials and CPU LOD indices.
raw=bytearray();views=[];accessors=[]
def view(data,**extra):
    while len(raw)%4:raw.append(0)
    at=len(raw);raw.extend(data);views.append(dict(buffer=0,byteOffset=at,byteLength=len(data),**extra));return len(views)-1
def acc(v,typ,component,count,**extra):
    accessors.append(dict(bufferView=v,componentType=component,count=count,type=typ,**extra));return len(accessors)-1
v=view(np.array(vertices,dtype='<f4').tobytes(),byteStride=32,target=34962)
positions=np.array(vertices)[:,:3]
pos=acc(v,'VEC3',5126,len(vertices),byteOffset=0,min=positions.min(axis=0).tolist(),max=positions.max(axis=0).tolist())
norm=acc(v,'VEC3',5126,len(vertices),byteOffset=12)
uv=acc(v,'VEC2',5126,len(vertices),byteOffset=24)
prims=[]
for i,(indices,low) in enumerate(zip(groups,low_groups)):
    iv=view(np.array(indices,dtype='<u2').tobytes(),target=34963);ia=acc(iv,'SCALAR',5123,len(indices))
    lv=view(np.array(low,dtype='<u2').tobytes());la=acc(lv,'SCALAR',5123,len(low))
    prims.append(dict(attributes={'POSITION':pos,'NORMAL':norm,'TEXCOORD_0':uv},indices=ia,material=i,extras={'softwareIndices':la}))
images=[]
for path in (FRONT,BACK):
    images.append(dict(bufferView=view(path.read_bytes()),mimeType='image/webp',name=path.name))
model=dict(asset={'version':'2.0','generator':'OLA HQ original-art relief builder v2'},extensionsUsed=['EXT_texture_webp'],extensionsRequired=['EXT_texture_webp'],scene=0,scenes=[{'nodes':[0]}],nodes=[{'mesh':0,'name':'Original OLA HQ relief globe'}],meshes=[{'primitives':prims}],bufferViews=views,accessors=accessors,images=images,samplers=[{'magFilter':9729,'minFilter':9729,'wrapS':10497,'wrapT':33071}],textures=[{'sampler':0,'extensions':{'EXT_texture_webp':{'source':i}}} for i in range(2)],materials=[{'name':name,'pbrMetallicRoughness':{'baseColorTexture':{'index':0 if i==2 else i},'metallicFactor':.28,'roughnessFactor':.38},'alphaMode':'OPAQUE' if i==2 else 'MASK','alphaCutoff':.35,'doubleSided':False} for i,name in enumerate(('Exact original front artwork','Ocean and gold continuation','Original-projection supporting shell'))],buffers=[{'byteLength':len(raw)}],extras={'frontSource':str(FRONT.relative_to(ROOT)),'frontProjection':'Orthographic rest view; original pixels preserved','singleViewReconstruction':True,'frontGrid':N,'sphereSegments':S,'sphereRings':T})
js=json.dumps(model,separators=(',',':')).encode();js+=b' '*(-len(js)%4);raw+=b'\0'*(-len(raw)%4)
body=struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(raw),0x004e4942)+raw
OUT.write_bytes(struct.pack('<III',0x46546c67,2,len(body)+12)+body)
print(f'{OUT.name}: {len(vertices)} vertices, {sum(len(i)//3 for i in groups)} triangles, {OUT.stat().st_size} bytes')
