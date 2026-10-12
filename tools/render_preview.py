"""Native EGL inspection of the supplied glTF meshes. Not a model-viewer/browser screenshot.
Uses the actual normals, indices, PBR base colour and QR texture. Studio lighting is approximate.
"""
import ctypes as C,sys,json,math,io
from pathlib import Path
import numpy as np
from PIL import Image,ImageOps
from glb_geometry import read_glb,accessor
P=C.c_void_p;I=C.c_int;U=C.c_uint;F=C.c_float
E=C.CDLL('libEGL.so.1');E.eglGetProcAddress.restype=P;E.eglGetProcAddress.argtypes=[C.c_char_p]
def api(name,result,args):
    pointer=E.eglGetProcAddress(name.encode())
    if not pointer:raise RuntimeError(name)
    return C.CFUNCTYPE(result,*args)(pointer)
display=api('eglGetPlatformDisplayEXT',P,[U,P,C.POINTER(I)])(0x31DD,None,None)
E.eglInitialize.argtypes=[P,C.POINTER(I),C.POINTER(I)];major=I();minor=I();assert E.eglInitialize(display,C.byref(major),C.byref(minor))
E.eglBindAPI.argtypes=[U];assert E.eglBindAPI(0x30A0)
config=P();n=I();attrs=(I*15)(0x3033,1,0x3040,4,0x3024,8,0x3023,8,0x3022,8,0x3021,8,0x3025,24,0x3038)
E.eglChooseConfig.argtypes=[P,C.POINTER(I),C.POINTER(P),I,C.POINTER(I)];assert E.eglChooseConfig(display,attrs,C.byref(config),1,C.byref(n))
mode=sys.argv[3] if len(sys.argv)>3 else 'wide'
w,h=(768,1200) if mode=='mobile' else (1200,1200)
E.eglCreatePbufferSurface.argtypes=[P,P,C.POINTER(I)];E.eglCreatePbufferSurface.restype=P;surface=E.eglCreatePbufferSurface(display,config,(I*5)(0x3057,w,0x3056,h,0x3038))
E.eglCreateContext.argtypes=[P,P,P,C.POINTER(I)];E.eglCreateContext.restype=P;context=E.eglCreateContext(display,config,None,(I*3)(0x3098,2,0x3038))
E.eglMakeCurrent.argtypes=[P,P,P,P];assert E.eglMakeCurrent(display,surface,surface,context)
vertex='''attribute vec3 position,normal;attribute vec2 uv;uniform mat4 matrix;varying vec3 p,n;varying vec2 tex;void main(){p=position;n=normal;tex=uv;gl_Position=matrix*vec4(position,1.0);}'''
fragment='''precision highp float;varying vec3 p,n;varying vec2 tex;uniform vec3 eye,colour;uniform float textured,roughness,opacity;uniform sampler2D image;
void main(){vec3 N=normalize(n),V=normalize(eye-p);vec3 base=colour;float alpha=opacity;if(textured>.5){vec4 sampleColour=texture2D(image,tex);base*=pow(sampleColour.rgb,vec3(2.2));alpha*=sampleColour.a;}if(alpha<.004)discard;
vec3 key=normalize(vec3(-3.,5.,4.)),fill=normalize(vec3(4.,2.,1.)),rim=normalize(vec3(1.,3.,-4.));
vec3 light=vec3(.42,.40,.38)+vec3(1.2,1.1,.96)*max(dot(N,key),0.)+vec3(.32,.36,.42)*max(dot(N,fill),0.);
float gloss=pow(max(dot(N,normalize(key+V)),0.),mix(64.,13.,roughness))*.045+pow(max(dot(N,normalize(rim+V)),0.),18.)*.06;
float ao=1.;if(abs(p.y)<.00001&&length(p.xz)<.15){ao=1.-.50*exp(-dot(p.xz,p.xz)/.0022);}
vec3 result=base*light*ao+gloss;result=result/(vec3(1.)+result*.22);gl_FragColor=vec4(pow(max(result,vec3(0.)),vec3(1./2.2)),alpha);}'''
def compile(kind,source):
    s=api('glCreateShader',U,[U])(kind);raw=C.c_char_p(source.encode());api('glShaderSource',None,[U,I,C.POINTER(C.c_char_p),P])(s,1,C.byref(raw),None);api('glCompileShader',None,[U])(s);status=I();api('glGetShaderiv',None,[U,U,C.POINTER(I)])(s,0x8B81,C.byref(status));assert status.value
    return s
program=api('glCreateProgram',U,[])();attach=api('glAttachShader',None,[U,U]);attach(program,compile(0x8B31,vertex));attach(program,compile(0x8B30,fragment));api('glLinkProgram',None,[U])(program);api('glUseProgram',None,[U])(program)
loc=lambda name:api('glGetUniformLocation',I,[U,C.c_char_p])(program,name.encode())
def unit(v):return v/np.linalg.norm(v)
def matrix(eye,target):
    z=unit(eye-target);x=unit(np.cross([0,1,0],z));y=np.cross(z,x);view=np.eye(4);view[:3,:3]=[x,y,z];view[:3,3]=-view[:3,:3]@eye
    f=1/math.tan(math.radians(36)/2);near=.001;far=3;p=np.zeros((4,4));p[0,0]=f/(w/h);p[1,1]=f;p[2,2]=(far+near)/(near-far);p[2,3]=2*far*near/(near-far);p[3,2]=-1
    return np.asarray(p@view,dtype='<f4').T.copy()
root=Path(__file__).resolve().parents[1];models=root/'public/models';ident=sys.argv[1];mode=sys.argv[3] if len(sys.argv)>3 else 'default';path=next(models.glob(ident+'.*.glb'));g,b=read_glb(path)
height=max(a.get('max',[0,0,0])[1] for a in g['accessors'] if a.get('type')=='VEC3' and a.get('max',[0,0,0])[1]<.1)
height=.065 if ident in ['boho','chonaki'] else .025
product=mode in ['product','hero']
r=.14 if mode=='top' else (.20 if height>.04 else .155) if product else (.49 if height>.04 else .43) if mode in ['wide','mobile'] else (.26 if height>.04 else .22)
if mode in ['wide','mobile']:r*=max(1,.75/(w/h))
phi=math.radians(24 if mode=='top' else 56 if product else 67);theta=math.radians(0 if mode=='top' else 24)
target=np.array([0,height*(.8 if mode=='top' else .43 if product else .35),0]);eye=target+np.array([r*math.sin(phi)*math.sin(theta),r*math.cos(phi),r*math.sin(phi)*math.cos(theta)])
api('glUniformMatrix4fv',None,[I,I,U,C.POINTER(F)])(loc('matrix'),1,0,matrix(eye,target).ctypes.data_as(C.POINTER(F)));api('glUniform3fv',None,[I,I,C.POINTER(F)])(loc('eye'),1,(F*3)(*eye));api('glUniform1i',None,[I,I])(loc('image'),0)
api('glEnable',None,[U])(0x0B71);api('glViewport',None,[I,I,I,I])(0,0,w,h);api('glClearColor',None,[F,F,F,F])(0,0,0,0);api('glClear',None,[U])(0x4000|0x0100)
api('glBlendFuncSeparate',None,[U,U,U,U])(0x0302,0x0303,1,0x0303)
for file in ([path] if product else [next(models.glob('cafe-table.*.glb')),path]):
    g,b=read_glb(file)
    for mesh in g['meshes']:
        for prim in mesh['primitives']:
            pos=accessor(g,b,prim['attributes']['POSITION']);normal=accessor(g,b,prim['attributes']['NORMAL']);idx=accessor(g,b,prim['indices']).reshape(-1)
            uv=accessor(g,b,prim['attributes']['TEXCOORD_0']) if 'TEXCOORD_0'in prim['attributes'] else np.zeros((len(pos),2));vertices=np.concatenate([pos,normal,uv],axis=1)[idx].astype('<f4');data=vertices.tobytes();vbo=U();api('glGenBuffers',None,[I,C.POINTER(U)])(1,C.byref(vbo));api('glBindBuffer',None,[U,U])(0x8892,vbo);blob=C.create_string_buffer(data);api('glBufferData',None,[U,C.c_ssize_t,P,U])(0x8892,len(data),blob,0x88E4)
            for name,size,offset in [('position',3,0),('normal',3,12),('uv',2,24)]:
                a=api('glGetAttribLocation',I,[U,C.c_char_p])(program,name.encode());api('glEnableVertexAttribArray',None,[U])(a);api('glVertexAttribPointer',None,[U,I,U,U,I,P])(a,size,0x1406,0,32,P(offset))
            material=g['materials'][prim['material']];pbr=material['pbrMetallicRoughness'];blend=material.get('alphaMode')=='BLEND';api('glEnable' if blend else 'glDisable',None,[U])(0x0BE2);api('glDepthMask',None,[U])(0 if blend else 1);api('glUniform1f',None,[I,F])(loc('opacity'),pbr.get('baseColorFactor',[1,1,1,1])[3]);colour=pbr.get('baseColorFactor',[1,1,1,1]);api('glUniform3fv',None,[I,I,C.POINTER(F)])(loc('colour'),1,(F*3)(*colour[:3]));api('glUniform1f',None,[I,F])(loc('roughness'),pbr.get('roughnessFactor',1));textured='baseColorTexture'in pbr;api('glUniform1f',None,[I,F])(loc('textured'),1 if textured else 0)
            texture=U();api('glGenTextures',None,[I,C.POINTER(U)])(1,C.byref(texture));api('glBindTexture',None,[U,U])(0x0DE1,texture)
            if textured:
                im=g['images'][g['textures'][pbr['baseColorTexture']['index']]['source']];v=g['bufferViews'][im['bufferView']];img=Image.open(io.BytesIO(b[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']])).convert('RGBA')
            else:img=Image.new('RGBA',(1,1),'white')
            raw=C.create_string_buffer(img.tobytes());api('glTexImage2D',None,[U,I,I,I,I,I,U,U,P])(0x0DE1,0,0x1908,img.width,img.height,0,0x1908,0x1401,raw)
            for name,value in [(0x2801,0x2601),(0x2800,0x2601),(0x2802,0x812F),(0x2803,0x812F)]:api('glTexParameteri',None,[U,U,I])(0x0DE1,name,value)
            api('glDrawArrays',None,[U,I,I])(4,0,len(vertices));api('glDeleteBuffers',None,[I,C.POINTER(U)])(1,C.byref(vbo));api('glDeleteTextures',None,[I,C.POINTER(U)])(1,C.byref(texture))
api('glFinish',None,[])();pixels=(C.c_ubyte*(w*h*4))();api('glReadPixels',None,[I,I,I,I,U,U,P])(0,0,w,h,0x1908,0x1401,pixels);error=api('glGetError',U,[])();assert error==0,error
foreground=Image.frombytes('RGBA',(w,h),bytes(pixels)).transpose(Image.Transpose.FLIP_TOP_BOTTOM)
if product:
    bounds=foreground.getbbox();foreground=foreground.crop(bounds)
    if mode=='hero':foreground.thumbnail((650,650),Image.Resampling.LANCZOS);foreground.save(sys.argv[2],lossless=True)
    else:
        foreground.thumbnail((540,490),Image.Resampling.LANCZOS);canvas=Image.new('RGBA',(600,600));canvas.alpha_composite(foreground,((600-foreground.width)//2,(600-foreground.height)//2));canvas.save(sys.argv[2],lossless=True)
else:
    background=ImageOps.fit(Image.open(root/'public/media/cafe.webp').convert('RGBA'),(w,h))
    background.alpha_composite(foreground);background.convert('RGB').save(sys.argv[2],quality=90)
print(json.dumps({'model':ident,'mode':mode,'GL_error':error,'output':sys.argv[2]}))
