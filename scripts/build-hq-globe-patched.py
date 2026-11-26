"""Build the closed v5 ocean with exact-source extruded marquee and wave relief.
Requires Python 3, Pillow, NumPy, SciPy, Shapely and mapbox-earcut.
Original artwork stays untouched. Trace masks are native geometry construction.
The generated text-free front body is blended into the existing rear map.
"""
import io, json, math, pathlib, struct, hashlib
import numpy as np
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[1]
FRONT=ROOT/'assets/entrances/ola-hq-floating-hero-20261007.webp'
BACK=ROOT/'assets/models/ola-hq-ocean-continuation-v2.webp'
OUT=ROOT/'assets/models/ola-hq-sculpted-globe-v5.glb'
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
# The closed body uses the existing text-free ocean map. Branding is geometry,
# never baked onto this surface. Original-art UVs belong only to raised pieces.
rear=sample(Image.open(BACK),u,v)
# Fit to the actual opaque globe, not the PNG/WebP canvas dimensions. Never
# sample its transparent/colored matte at the horizon or mirror it onto the back.
clean_image=Image.open(ROOT/'assets/models/ola-hq-clean-body-v4.webp').convert('RGBA')
clean_pixels=np.asarray(clean_image);opaque=clean_pixels[:,:,3]>254
ys,xs=np.where(opaque);cx=(xs.min()+xs.max())/2;cy=(ys.min()+ys.max())/2
safe_radius=min(xs.max()-xs.min(),ys.max()-ys.min())*.47
clean=sample(clean_image,(cx+safe_radius*nx)/(clean_image.width-1),(cy-safe_radius*ny)/(clean_image.height-1))
t=np.clip((nz-.35)/.40,0,1);weight=(t*t*(3-2*t))[...,None]
weight*= (clean[...,3:]>.995)
color=clean[...,:3]*weight+rear[...,:3]*(1-weight)
assert np.all(weight[nz<=.35]==0), 'No front projection at horizon or rear'
assert np.all(weight[clean[...,3]<.995]==0), 'No hidden matte pixels'
# Regression audit: the failed bake imported near-black and neon matte stripes.
assert not np.any((color[:,:,1]>.75)&(color[:,:,0]<.15)&(color[:,:,2]<.2)), 'Neon matte in ocean UV'
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

# Digitize the exact original lettering into closed extrusions. The bitmap is
# untouched: color segmentation is used only to trace native mesh boundaries.
from shapely.geometry import box, Polygon
from shapely.ops import unary_union
from shapely.geometry.polygon import orient
import mapbox_earcut
source=np.asarray(Image.open(FRONT).convert('RGBA').resize((1000,1000)))/255
r,g,b,alpha=source.transpose(2,0,1)
yy,xx=np.mgrid[:1000,:1000]
letter_zone=((xx>=150)&(xx<860)&(yy>=422)&(yy<594))
letter_zone|=((xx>=260)&(xx<738)&(yy>=602)&(yy<628))
mask=letter_zone&(r>.72)&(g>.61)&(b>.38)&(r>g*1.025)&(alpha>.8)
mask|=(xx>=260)&(xx<738)&(yy>=602)&(yy<628)&(r>.75)&(g>.7)&(b>.6)&(alpha>.8)
# Keep only substantive connected shapes; preserve the small tagline glyphs.
from scipy.ndimage import label
labels,count=label(mask)
for k in range(1,count+1):
    if np.sum(labels==k)<3:mask[labels==k]=False
runs=[]
for y in range(1000):
    xs=np.flatnonzero(mask[y]);chunks=np.split(xs,np.flatnonzero(np.diff(xs)>1)+1)
    for chunk in chunks:
        if len(chunk):runs.append(box(chunk[0],y,(chunk[-1]+1),(y+1)))
letters=unary_union(runs).buffer(.7).buffer(-.7).simplify(.6,preserve_topology=True)
front_indices=[];wave_indices=[]
def mesh_polygon(poly,depth,thickness,dest):
    """Triangulated textured face, solid gold rear, and genuine side walls."""
    poly=orient(poly,sign=1)
    contours=[np.asarray(poly.exterior.coords)[:-1]]+[np.asarray(i.coords)[:-1] for i in poly.interiors]
    pts=np.concatenate(contours);ends=np.cumsum([len(c) for c in contours]).astype(np.uint32)
    triangles=mapbox_earcut.triangulate_float64(pts,ends)
    def xyz(px,py):return (px/500-1,1-py/500)
    cache={}
    def face_vertex(p):
        key=tuple(np.round(p,5))
        if key not in cache:
            px,py=p;x,y=xyz(px,py);z=depth(x,y);n=np.array([x,y,max(.1,z-.105)]) if dest is wave_indices else np.array([.14*x,0,1]);n/=np.linalg.norm(n);cache[key]=add((x,y,z),n,(px/1000,py/1000))
        return cache[key]
    def triangle(a,b,c):
        # Split only long face edges, sampling the surface at each new point.
        lengths=[np.linalg.norm(a-b),np.linalg.norm(b-c),np.linalg.norm(c-a)]
        k=int(np.argmax(lengths))
        if lengths[k]>45:
            if k==0:
                m=(a+b)/2;triangle(a,m,c);triangle(m,b,c)
            elif k==1:
                m=(b+c)/2;triangle(a,b,m);triangle(a,m,c)
            else:
                m=(c+a)/2;triangle(a,b,m);triangle(m,b,c)
        else:dest.extend((face_vertex(a),face_vertex(c),face_vertex(b)))
    for i in range(0,len(triangles),3):triangle(*(pts[int(triangles[i+j])] for j in (0,1,2)))
    back=len(vertices)
    for px,py in pts:
        x,y=xyz(px,py);add((x,y,depth(x,y)-thickness),(0,0,-1),(0,0))
    for i in range(0,len(triangles),3):gold_idx.extend(back+int(triangles[i+j]) for j in (0,1,2))
    for contour in contours:
        for i in range(len(contour)):
            a=contour[i];b=contour[(i+1)%len(contour)];x,y=xyz(*a);X,Y=xyz(*b)
            # Outward right-hand normal for the reversed screen-coordinate ring.
            n=np.array([Y-y,x-X,0.]);n/=max(np.linalg.norm(n),1e-9)
            at=len(vertices)
            for px,py,z in [(x,y,depth(x,y)),(X,Y,depth(X,Y)),(x,y,depth(x,y)-thickness),(X,Y,depth(X,Y)-thickness)]:add((px,py,z),n,(0,0))
            gold_idx.extend((at,at+2,at+1,at+1,at+2,at+3))
for poly in getattr(letters,'geoms',[letters]):
    if poly.area>3:mesh_polygon(poly,lambda x,y:1.01-.07*x*x,.075,front_indices)
# A curved Catmull-Rom outline follows the source's large upper curl and lower
# ribbon. Their relief is separated from the globe and lettering in depth.
def smooth_outline(points):
    p=np.asarray(points,float);out=[]
    for i in range(len(p)):
        a,b,c,d=p[(i-1)%len(p)],p[i],p[(i+1)%len(p)],p[(i+2)%len(p)]
        for t in np.linspace(0,1,8,endpoint=False):out.append(.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t))
    return Polygon(out).buffer(0)
upper=[(90,380),(180,270),(300,215),(430,211),(510,250),(550,320),(530,350),(510,347),(517,319),(490,300),(470,330),(475,380),(540,410),(650,420),(780,423),(820,429),(670,439),(565,430),(470,416),(415,388),(393,349),(401,304),(431,278),(445,270),(380,278),(320,310),(250,340),(190,363)]
lower=[(155,692),(245,651),(335,650),(430,678),(525,741),(615,800),(710,835),(810,818),(761,851),(679,864),(598,842),(508,790),(420,729),(327,690),(245,680)]
# Subdivide face triangles for a truly curved sculpture, rather than flat decals.
# Lettering stays a rigid marquee; curled wave faces follow the spherical body.
for outline in (upper,lower):
    poly=smooth_outline(outline)
    for part in getattr(poly,'geoms',[poly]):
        mesh_polygon(part,lambda x,y:math.sqrt(max(.02,.87**2-x*x-y*y))+.105,.06,wave_indices)
groups[1]=gold_idx;low[1]=gold_idx
groups.extend([front_indices,wave_indices]);low.extend([front_indices,wave_indices])
assert len(vertices)<65536, len(vertices)

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
images=[{'bufferView':view(b),'mimeType':'image/webp'} for b in (texture_bytes.getvalue(),gold_bytes.getvalue(),FRONT.read_bytes())]
model=dict(asset={'version':'2.0','generator':'OLA HQ sculpted marquee globe v5'},extensionsUsed=['EXT_texture_webp'],extensionsRequired=['EXT_texture_webp'],scene=0,scenes=[{'nodes':[0]}],nodes=[{'mesh':0,'name':'OLA ocean, floating marquee and raised wave sculpture'}],meshes=[{'primitives':prims}],bufferViews=views,accessors=accessors,images=images,samplers=[{'magFilter':9729,'minFilter':9729,'wrapS':10497,'wrapT':33071}],textures=[{'sampler':0,'extensions':{'EXT_texture_webp':{'source':i}}} for i in range(3)],materials=[{'name':name,'pbrMetallicRoughness':{'baseColorTexture':{'index':min(i,2)},'metallicFactor':.20 if i==0 else .75,'roughnessFactor':.42 if i==0 else .25},'alphaMode':'OPAQUE','doubleSided':False} for i,name in enumerate(('Text-free continuous ocean','Sculpted gold edges and orbit','Exact original raised marquee','Raised original wave curls'))],buffers=[{'byteLength':len(raw)}],extras={'originalSource':str(FRONT.relative_to(ROOT)),'originalSourceSHA256':hashlib.sha256(FRONT.read_bytes()).hexdigest(),'rearSource':str(BACK.relative_to(ROOT)),'continuousBody':True,'radius':.87,'bodyGrid':[S,T],'blendNormalZ':[.35,.75],'alphaSafeBody':True,'sourceFit':{'cx':float(cx),'cy':float(cy),'radius':float(safe_radius)},'textureSize':[W,H],'singleViewReconstruction':True,'sculptedMarquee':True,'marqueeDepth':.075,'waveRelief':.105,'bodyHasPaintedLettering':False,'cleanBodySource':'assets/models/ola-hq-clean-body-v4.webp'})
js=json.dumps(model,separators=(',',':')).encode();js+=b' '*(-len(js)%4);raw+=b'\0'*(-len(raw)%4)
body=struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(raw),0x004e4942)+raw
OUT.write_bytes(struct.pack('<III',0x46546c67,2,len(body)+12)+body)
print(f'{OUT.name}: {len(vertices)} vertices, {sum(len(i)//3 for i in groups)} triangles, {OUT.stat().st_size} bytes')
