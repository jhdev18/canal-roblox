import bpy, bmesh, json, math, sys, time
from mathutils import Matrix, Euler, Vector
C=json.load(open('cena.json')); modo=sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
sc=bpy.context.scene; col=sc.collection
def lin(h):
    h=h.lstrip('#'); h=''.join(ch*2 for ch in h) if len(h)==3 else h; c=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    return [x/12.92 if x<=0.04045 else ((x+0.055)/1.055)**2.4 for x in c]+[1]
mats={}
def mat(h,rough=0.6):
    if h in mats: return mats[h]
    m=bpy.data.materials.new(h); m.use_nodes=True; b=m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value=lin(h); b.inputs['Roughness'].default_value=rough
    mats[h]=m; return m
root=bpy.data.objects.new('root',None); col.objects.link(root); root.rotation_euler=(math.pi/2,0,0)
def obj(nome,bm,M,m,round=0,smooth=False):
    me=bpy.data.meshes.new(nome); bm.to_mesh(me); bm.free()
    if smooth: me.shade_smooth()
    o=bpy.data.objects.new(nome,me); col.objects.link(o); o.parent=root; o.matrix_basis=M; me.materials.append(m)
    if round:
        b=o.modifiers.new('bv','BEVEL'); b.width=round; b.segments=6; b.harden_normals=True
    return o
for i,o in enumerate(C['obj']):
    p=Vector(o['p']); R=Euler([math.radians(a) for a in o.get('r') or (0,0,0)],'ZYX').to_matrix().to_4x4()
    M=(Matrix.Translation(Vector(o['pivot']))@R@Matrix.Translation(p-Vector(o['pivot']))) if o.get('pivot') else Matrix.Translation(p)@R
    bm=bmesh.new()
    if o['t']=='box':
        bmesh.ops.create_cube(bm,size=1); [setattr(v,'co',Vector((v.co.x*o['s'][0],v.co.y*o['s'][1],v.co.z*o['s'][2]))) for v in bm.verts]
        obj(f'b{i}',bm,M,mat(o['c']),o['round'],smooth=bool(o['round']))
    elif o['t']=='cyl':
        bmesh.ops.create_cone(bm,cap_ends=True,segments=24,radius1=o['rad'],radius2=o['rad'],depth=o['h'],matrix=Matrix.Rotation(-math.pi/2,4,'X'))
        obj(f'c{i}',bm,M,mat(o['c']),smooth=True)
    elif o['t']=='sph':
        nuvem=o['p'][1]>30
        bmesh.ops.create_uvsphere(bm,u_segments=32,v_segments=16,radius=o['rad'])
        x=obj(f's{i}',bm,M,mat('#ffffff',1) if nuvem else mat(o['c']),smooth=True)
        if nuvem: x.visible_shadow=False
    elif o['t']=='face':
        h=o['s']/2; me=bpy.data.meshes.new('face'); me.from_pydata([(-h,-h,0),(h,-h,0),(h,h,0),(-h,h,0)],[],[(0,1,2,3)])
        uv=me.uv_layers.new(); [setattr(uv.data[k],'uv',c) for k,c in enumerate([(0,0),(1,0),(1,1),(0,1)])]
        m=bpy.data.materials.new('face'); m.use_nodes=True; nt=m.node_tree; b=nt.nodes['Principled BSDF']
        t=nt.nodes.new('ShaderNodeTexImage'); t.image=bpy.data.images.load(bpy.path.abspath('//')+o['tex'] if bpy.data.filepath else __import__('os').path.abspath(o['tex']))
        nt.links.new(t.outputs['Color'],b.inputs['Base Color']); nt.links.new(t.outputs['Alpha'],b.inputs['Alpha'])
        b.inputs['Roughness'].default_value=0.8
        try: m.surface_render_method='DITHERED'
        except Exception: pass
        me.materials.append(m); f=bpy.data.objects.new('face',me); col.objects.link(f); f.parent=root; f.matrix_basis=M; f.visible_shadow=False
# câmera
def yup(v): return Vector((v[0],-v[2],v[1]))
cd=bpy.data.cameras.new('cam'); cd.sensor_fit='VERTICAL'; cd.angle=math.radians(C['cam']['fov'])
cam=bpy.data.objects.new('cam',cd); col.objects.link(cam); sc.camera=cam
cam.location=yup(C['cam']['pos']); cam.rotation_euler=(yup(C['cam']['alvo'])-cam.location).to_track_quat('-Z','Y').to_euler()
# sol + céu
ld=bpy.data.lights.new('sol','SUN'); ld.energy=4.2 if modo=='bonito' else 3.2; ld.color=lin(C['sol']['cor'])[:3]; ld.angle=math.radians(4 if modo=='bonito' else 1.5)
sun=bpy.data.objects.new('sol',ld); col.objects.link(sun); sun.rotation_euler=(-yup(C['sol']['dir'])).to_track_quat('-Z','Y').to_euler()
w=bpy.data.worlds.new('w'); sc.world=w; w.use_nodes=True; bg=w.node_tree.nodes['Background']; bg.inputs['Color'].default_value=lin(C['ceu']); bg.inputs['Strength'].default_value=1.0
r=sc.render; r.engine='BLENDER_EEVEE'; r.resolution_x=C['w']*2; r.resolution_y=C['h']*2; r.film_transparent=False
sc.eevee.taa_render_samples=32
sc.view_settings.view_transform='Standard'
if modo=='bonito':
    sc.view_settings.look='Medium High Contrast'; bg.inputs['Strength'].default_value=0.85
    try: sc.eevee.use_raytracing=True
    except Exception as e: print(e)
r.filepath=__import__('os').path.abspath(f'blender_{modo}.png'); t=time.time()
bpy.ops.render.render(write_still=True); print(modo,'render s',round(time.time()-t,1))
