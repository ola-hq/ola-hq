"""Build the native, reusable OLA HQ globe GLB. Run with Blender --background --python."""
import bpy, math, struct, json, pathlib
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
COLORS={'navy':(11,40,59),'teal':(20,109,117),'light':(41,152,153),'foam':(237,225,194),'gold':(219,174,85)}
objects=[]
def register(obj,color):
    objects.append((obj,COLORS[color]));return obj

def sphere(name,location,radius,color,segments=48,rings=24):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,radius=radius,location=location)
    ob=bpy.context.object;ob.name=name
    for p in ob.data.polygons:p.use_smooth=True
    return register(ob,color)

def point(lon,lat,r=1):
    return Vector((r*math.cos(lat)*math.sin(lon),-r*math.cos(lat)*math.cos(lon),r*math.sin(lat)))

def tube(name,pts,radius,color,sides=5,closed=False):
    vertices=[];faces=[];n=len(pts)
    for i,p in enumerate(pts):
        tangent=(pts[(i+1)%n]-pts[(i-1)%n]).normalized() if closed else (pts[min(n-1,i+1)]-pts[max(0,i-1)]).normalized()
        ref=Vector((0,0,1)) if abs(tangent.z)<.9 else Vector((1,0,0))
        normal=tangent.cross(ref).normalized();binormal=tangent.cross(normal).normalized()
        for j in range(sides):vertices.append(p+radius*(normal*math.cos(j*math.tau/sides)+binormal*math.sin(j*math.tau/sides)))
    for i in range(n if closed else n-1):
        k=(i+1)%n
        for j in range(sides):faces.append((i*sides+j,i*sides+(j+1)%sides,k*sides+(j+1)%sides,k*sides+j))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],faces);mesh.update()
    for p in mesh.polygons:p.use_smooth=True
    ob=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(ob);return register(ob,color)

sphere('Midnight ocean globe',(0,0,0),1,'navy',64,32)
for lat in [-.72,0,.72]:tube('Gold latitude',[point(j*math.tau/96,lat,1.008) for j in range(96)],.0048,'gold',closed=True)
for lon in [j*math.pi/4 for j in range(4)]:
    tube('Gold meridian',[Vector((math.sin(j*math.tau/128)*math.sin(lon),-math.sin(j*math.tau/128)*math.cos(lon),math.cos(j*math.tau/128)))*1.01 for j in range(128)],.0048,'gold',closed=True)
for band,center in enumerate([-.72,-.12,.5]):
    vertices=[];faces=[];edges=[[],[]]
    for j in range(129):
        lon=j*math.tau/128
        wave=center+.17*math.sin(lon*2+band*1.3)+.075*math.sin(lon*3-band)
        for k in range(5):
            f=k/4;lat=wave+(f-.5)*.24
            r=1.013+.035*math.sin(f*math.pi)**2
            vertices.append(point(lon,lat,r))
        edges[0].append(point(lon,wave-.12,1.022));edges[1].append(point(lon,wave+.12,1.029))
    for j in range(128):
        for k in range(4):faces.append((j*5+k,(j+1)*5+k,(j+1)*5+k+1,j*5+k+1))
    mesh=bpy.data.meshes.new('Raised ocean ribbon');mesh.from_pydata(vertices,[],faces);mesh.update()
    for p in mesh.polygons:p.use_smooth=True
    ob=bpy.data.objects.new('Raised ocean ribbon',mesh);bpy.context.collection.objects.link(ob);register(ob,'teal' if band!=1 else 'light')
    tube('Gold wave lip',edges[1],.011,'gold');tube('Cream foam trace',edges[0],.007,'foam')
# A sculpted curling crest on the visible ocean surface.
crest=[]
for j in range(100):
    t=j/99*math.pi*2.15;radius=.29*(1-j/125)
    crest.append(point(-.43+radius*math.cos(t),.43+radius*math.sin(t),1.06+.015*math.sin(t)))
tube('Curling wave crest',crest,.017,'foam',sides=7)
# Gold orbital ribbon and small physical satellites keep the world-logo silhouette.
orbit=[]
for j in range(128):
    a=j*math.tau/128;p=Vector((1.19*math.cos(a),1.12*math.sin(a),0));angle=.42
    orbit.append(Vector((p.x,p.y*math.cos(angle),p.y*math.sin(angle))))
tube('Orbital gold ribbon',orbit,.012,'gold',sides=6,closed=True)
for j in [8,38,77,105]:sphere('Gold satellite',orbit[j]*1.045,.022,'gold',12,8)
# Real extruded lettering, rather than a flat logo projected on a sphere.
font_path=pathlib.Path('/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf')
if not font_path.exists():font_path=pathlib.Path('/usr/share/fonts/truetype/liberation2/LiberationSerif-Bold.ttf')
curve=bpy.data.curves.new('OLA HQ lettering','FONT');curve.body='OLA HQ';curve.align_x='CENTER';curve.align_y='CENTER';curve.size=.43;curve.extrude=.018;curve.bevel_depth=.004;curve.bevel_resolution=2;curve.resolution_u=5
if font_path.exists():curve.font=bpy.data.fonts.load(str(font_path))
text=bpy.data.objects.new('Solid gold OLA HQ lettering',curve);bpy.context.collection.objects.link(text);text.rotation_euler=(math.pi/2,0,0);text.location=(0,-1.06,-.14);register(text,'gold')
# Standard glTF 2.0 binary, one mesh with vertex colors, no renderer dependency.
bpy.context.view_layer.update()
depsgraph=bpy.context.evaluated_depsgraph_get();vertex_data=bytearray();indices=[];mins=[1e9]*3;maxs=[-1e9]*3;count=0
for ob,color in objects:
    evaluated=ob.evaluated_get(depsgraph);mesh=evaluated.to_mesh();mesh.calc_loop_triangles();matrix=ob.matrix_world;normal_matrix=matrix.to_3x3().inverted().transposed()
    for v in mesh.vertices:
        p=matrix@v.co;n=(normal_matrix@v.normal).normalized();pos=(p.x,p.z,-p.y);normal=(n.x,n.z,-n.y)
        vertex_data.extend(struct.pack('<6f4B',*pos,*normal,*color,255))
        for k in range(3):mins[k]=min(mins[k],pos[k]);maxs[k]=max(maxs[k],pos[k])
    for tri in mesh.loop_triangles:indices.extend(count+i for i in tri.vertices)
    count+=len(mesh.vertices);evaluated.to_mesh_clear()
component=5123 if count<65536 else 5125;fmt='<'+('H' if component==5123 else 'I')*len(indices)
index_data=struct.pack(fmt,*indices);binary=vertex_data+index_data
while len(binary)%4:binary.append(0)
model={'asset':{'version':'2.0','generator':'OLA HQ native globe builder / Blender'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'mesh':0,'name':'OLA HQ ocean globe'}],'meshes':[{'name':'Raised waves, globe lines, orbit and solid OLA HQ lettering','primitives':[{'attributes':{'POSITION':0,'NORMAL':1,'COLOR_0':2},'indices':3,'mode':4}]}],'buffers':[{'byteLength':len(binary)}],'bufferViews':[{'buffer':0,'byteOffset':0,'byteLength':len(vertex_data),'byteStride':28,'target':34962},{'buffer':0,'byteOffset':len(vertex_data),'byteLength':len(index_data),'target':34963}],'accessors':[{'bufferView':0,'byteOffset':0,'componentType':5126,'count':count,'type':'VEC3','min':mins,'max':maxs},{'bufferView':0,'byteOffset':12,'componentType':5126,'count':count,'type':'VEC3'},{'bufferView':0,'byteOffset':24,'componentType':5121,'normalized':True,'count':count,'type':'VEC4'},{'bufferView':1,'componentType':component,'count':len(indices),'type':'SCALAR'}],'extras':{'identity':'OLA HQ','features':['ocean sphere','raised wave ribbons','gold latitude and longitude','gold orbit','extruded OLA HQ text'],'source':'scripts/build-hq-globe.py'}}
metadata=json.dumps(model,separators=(',',':')).encode();metadata+=b' '*((-len(metadata))%4)
output=struct.pack('<III',0x46546c67,2,12+8+len(metadata)+8+len(binary))+struct.pack('<II',len(metadata),0x4e4f534a)+metadata+struct.pack('<II',len(binary),0x004e4942)+binary
out=ROOT/'assets/models/ola-hq-ocean-globe-v1.glb';out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(output)
print('HQ_GLOBE_BUILT',out,count,'vertices',len(indices)//3,'triangles',len(output),'bytes')
