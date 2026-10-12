"""Offline GLB I/O, crease-aware normals and a planar square recess.
Dependencies: NumPy. Public output is glTF 2.0 in metres, Y-up.
"""
import hashlib, json, math, struct
from pathlib import Path
import numpy as np

DTYPES={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}
DIMS={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}

def read_glb(path):
    data=Path(path).read_bytes();magic,version,size=struct.unpack_from('<III',data)
    if magic!=0x46546c67 or version!=2 or size!=len(data):raise ValueError('Invalid GLB header')
    length,kind=struct.unpack_from('<II',data,12)
    if kind!=0x4e4f534a:raise ValueError('Expected JSON chunk')
    g=json.loads(data[20:20+length]);offset=20+length
    blen,btype=struct.unpack_from('<II',data,offset)
    if btype!=0x004e4942 or offset+8+blen!=size:raise ValueError('Invalid binary chunk')
    return g,data[offset+8:]

def accessor(g,b,index):
    a=g['accessors'][index];view=g['bufferViews'][a['bufferView']];dtype=np.dtype(DTYPES[a['componentType']]);n=DIMS[a['type']]
    start=view.get('byteOffset',0)+a.get('byteOffset',0);stride=view.get('byteStride',n*dtype.itemsize)
    return np.ndarray((a['count'],n),dtype=dtype,buffer=b,offset=start,strides=(stride,dtype.itemsize)).copy()

def clip(poly,axis,bound,sign):
    inside=[];outside=[]
    for p,q in zip(poly,poly[1:]+poly[:1]):
        d=(p[axis]-bound)*sign;e=(q[axis]-bound)*sign
        a=d>=-1e-10;b=e>=-1e-10
        (inside if a else outside).append(p)
        if a!=b:
            v=p+(q-p)*(d/(d-e));inside.append(v);outside.append(v)
    return inside,outside

def cut_recess(v,f,side=.041,depth=.003):
    top=float(v[:,1].max());floor=top-depth;half=side/2
    positions=v[f];lo=positions.min(axis=1);hi=positions.max(axis=1)
    mask=(hi[:,0]>-half)&(lo[:,0]<half)&(hi[:,2]>-half)&(lo[:,2]<half)&(hi[:,1]>floor)
    kept=[positions[~mask]];parts=[]
    planes=[(0,-half,1),(0,half,-1),(2,-half,1),(2,half,-1),(1,floor,1)]
    for tri in positions[mask]:
        remaining=list(tri)
        for axis,bound,sign in planes:
            if len(remaining)<3:break
            remaining,out=clip(remaining,axis,bound,sign)
            if len(out)>=3:parts.extend([[out[0],out[i],out[i+1]] for i in range(1,len(out)-1)])
    # Explicit floor and four inner walls. The source's flat crown contains the square.
    floor_points=np.array([[-half,floor,-half],[half,floor,-half],[half,floor,half],[-half,floor,half]])
    upper=floor_points.copy();upper[:,1]=top
    parts.extend([[floor_points[0],floor_points[2],floor_points[1]],[floor_points[0],floor_points[3],floor_points[2]]])
    for i in range(4):
        j=(i+1)%4
        parts.extend([[floor_points[i],floor_points[j],upper[j]],[floor_points[i],upper[j],upper[i]]])
    kept.append(np.asarray(parts));triangles=np.concatenate(kept)
    v,inv=np.unique(np.round(triangles.reshape(-1,3),9),axis=0,return_inverse=True);f=inv.reshape(-1,3)
    return v,f,top,floor

def normal_mesh(v,f,crease=35):
    # Preserve designed creases while smoothing neighbouring curved triangles.
    cross=np.cross(v[f[:,1]]-v[f[:,0]],v[f[:,2]]-v[f[:,0]])
    length=np.linalg.norm(cross,axis=1);valid=length>1e-14;f=f[valid];cross=cross[valid];length=length[valid]
    normal=cross/length[:,None];adj=[[] for _ in range(len(v))]
    for i,face in enumerate(f):
        for vertex in face:adj[vertex].append(i)
    outv=[];outn=[];outf=[];limit=math.cos(math.radians(crease));memo={}
    for i,face in enumerate(f):
        ids=[]
        for vertex in face:
            neighbours=np.array(adj[vertex]);agree=(normal[neighbours]@normal[i])>limit
            n=cross[neighbours[agree]].sum(axis=0);n/=max(float(np.linalg.norm(n)),1e-20)
            key=(int(vertex),*np.round(n,5))
            if key not in memo:memo[key]=len(outv);outv.append(v[vertex]);outn.append(n)
            ids.append(memo[key])
        outf.append(ids)
    return np.asarray(outv,dtype='<f4'),np.asarray(outn,dtype='<f4'),np.asarray(outf,dtype='<u4')

class GLB:
    def __init__(self):
        self.binary=bytearray();self.g={'asset':{'version':'2.0','generator':'MENNOO public proxy refinement 2026-10-11'},'scene':0,'scenes':[{'nodes':[]}],'nodes':[],'meshes':[],'materials':[],'accessors':[],'bufferViews':[],'buffers':[{'byteLength':0}]}
    def view(self,blob,target=None):
        while len(self.binary)%4:self.binary.append(0)
        view={'buffer':0,'byteOffset':len(self.binary),'byteLength':len(blob)}
        if target:view['target']=target
        self.binary.extend(blob);self.g['bufferViews'].append(view);return len(self.g['bufferViews'])-1
    def attr(self,array,kind,component=5126,target=34962):
        dtype=DTYPES[component];a=np.asarray(array,dtype=dtype).reshape(-1,DIMS[kind]);view=self.view(a.tobytes(),target)
        record={'bufferView':view,'componentType':component,'count':len(a),'type':kind}
        if kind=='VEC3':record.update(min=a.min(axis=0).tolist(),max=a.max(axis=0).tolist())
        self.g['accessors'].append(record);return len(self.g['accessors'])-1
    def material(self,definition):self.g['materials'].append(definition);return len(self.g['materials'])-1
    def texture(self,blob,mime):
        view=self.view(blob);images=self.g.setdefault('images',[]);images.append({'bufferView':view,'mimeType':mime})
        self.g.setdefault('samplers',[{'magFilter':9729,'minFilter':9987,'wrapS':33071,'wrapT':33071}]);textures=self.g.setdefault('textures',[]);textures.append({'source':len(images)-1,'sampler':0});return len(textures)-1
    def mesh(self,name,v,n,f,material,uv=None):
        attributes={'POSITION':self.attr(v,'VEC3'),'NORMAL':self.attr(n,'VEC3')}
        if uv is not None:attributes['TEXCOORD_0']=self.attr(uv,'VEC2')
        component=5123 if len(v)<65536 else 5125
        mesh={'name':name,'primitives':[{'attributes':attributes,'indices':self.attr(f,'SCALAR',component,34963),'material':material}]}
        self.g['meshes'].append(mesh);self.g['nodes'].append({'name':name,'mesh':len(self.g['meshes'])-1});self.g['scenes'][0]['nodes'].append(len(self.g['nodes'])-1)
    def save(self,path):
        while len(self.binary)%4:self.binary.append(0)
        self.g['buffers'][0]['byteLength']=len(self.binary);doc=json.dumps(self.g,separators=(',',':')).encode();doc+=b' '*((-len(doc))%4)
        result=struct.pack('<III',0x46546c67,2,28+len(doc)+len(self.binary))+struct.pack('<II',len(doc),0x4e4f534a)+doc+struct.pack('<II',len(self.binary),0x004e4942)+self.binary
        Path(path).write_bytes(result);return hashlib.sha256(result).hexdigest()[:12]
