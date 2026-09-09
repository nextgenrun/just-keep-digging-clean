"""Supersample approved materials on sole-grounded native traversal poses, without cloth."""
import bpy, hashlib, importlib.util, json, os, sys, time
from pathlib import Path
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
ROOT=Path(__file__).resolve().parents[1]
C=json.loads((ROOT/'values/characterGroundingPolish.json').read_text())
STYLE=json.loads((ROOT/C['styleConfig']).read_text(encoding='utf-8-sig'))
OUT=ROOT/C['workRoot'];GROUP=os.environ.get('CHARACTER_GROUNDING_GROUP','body')
def module(name,path):
 s=importlib.util.spec_from_file_location(name,ROOT/path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
U=module('grounded_native','ai-tools/2026-08-25-render-survival-unified-animation-runtime-v1.py')
D=module('grounded_materials','ai-tools/2026-09-06-character-definition-detail.py')
U.CONFIG['sheets']={k:v for k,v in C['sheets'].items() if bool(v.get('sourceBlend'))==(GROUP=='torch')}
source=next(iter(U.CONFIG['sheets'].values())).get('sourceBlend',U.CONFIG['sourceBlend'])
U.CONFIG['sourceBlend']=source;U.CONFIG['renderRoot']=str((OUT/'raw-1024').relative_to(ROOT))
if GROUP=='torch':U.CONFIG['objects']['referenceAction']=U.CONFIG['heldTorchPose']['action']
U.clear_sheet=lambda key:None;U.sheet_is_complete=lambda key,count:False
rig=bpy.data.objects[U.CONFIG['objects']['rig']];body=bpy.data.objects[U.CONFIG['objects']['body']]
indices={}
for side in ('l','r'):
 groups={g.index for g in body.vertex_groups if g.name in ('foot_'+side,'ball_'+side)}
 indices[side]=[v.index for v in body.data.vertices if sum(g.weight for g in v.groups if g.group in groups)>.65]
report={'sourceBlend':source,'sourceHash':hashlib.sha256((ROOT/source).read_bytes()).hexdigest(),'sourceSize':C['sourceSizePx'],'frameSize':512,'clothEnabled':False,'sheets':{}}
captured=[]
def soles(scene):
 evaluated=body.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=evaluated.to_mesh();feet={}
 for side,verts in indices.items():
  points=[evaluated.matrix_world@mesh.vertices[i].co for i in verts];z=min(p.z for p in points)
  bottom=[p for p in points if p.z<z+.012];point=sum(bottom,Vector())/len(bottom)
  projected=[world_to_camera_view(scene,scene.camera,p) for p in bottom]
  uv=world_to_camera_view(scene,scene.camera,point)
  feet[side]={'x':uv.x*512,'y':(1-uv.y)*512,'bottom':max((1-p.y)*512 for p in projected),'z':z}
 evaluated.to_mesh_clear();return feet
def capture(scene,key,index,secondary,count,loop):
 U.apply_held_torch_pose(scene,rig,U.ACTIVE_SHEET_SPEC,index,count,loop)
 if body.data.shape_keys:
  for block in body.data.shape_keys.key_blocks:block.value=0
 bpy.context.view_layer.update()
 feet=soles(scene)
 # Correct the source rig against the shoe sole, never trim/recenter/resize a runtime frame.
 current=max(f['bottom'] for f in feet.values())
 up_z=(scene.camera.matrix_world.to_3x3()@Vector((0,1,0))).z
 dz=(current-C['soleBaselinePx'])*scene.camera.data.ortho_scale/(512*up_z)
 U.retarget.shift_pelvis_world_z(rig,dz);bpy.context.view_layer.update()
 feet=soles(scene)
 report['sheets'].setdefault(key,[]).append({'frame':index,**{s:{v:round(n,5) for v,n in f.items()} for s,f in feet.items()}})
 captured.append((key,index,rig.matrix_world.copy(),U.poses.capture_pose(rig)))
 if index==count-1:print('GROUNDED_POSES '+key,flush=True)
U.render_frame=capture;sys.argv=[sys.argv[0],'--','--resume=0'];U.main()
scene=bpy.context.scene;camera=scene.camera
anchor=json.loads((ROOT/'testing/character-definition-v2-export/light-frame.json').read_text())
height=anchor['height'];center=Vector(anchor['center']);basis=camera.matrix_world.to_3x3()
right,up,toward=[basis@Vector(v) for v in ((1,0,0),(0,1,0),(0,0,1))]
D.configure_materials(STYLE,height)
for obj in bpy.data.objects:
 if obj.type=='LIGHT':obj.hide_render=True
for settings in STYLE['lights']:
 data=bpy.data.lights.new('Grounded'+settings['name'],'AREA');data.energy=settings['energy']*(height/STYLE['lightReferenceHeight'])**2
 data.shape='DISK';data.size=height*settings['size'];data.color=settings['color']
 light=bpy.data.objects.new(data.name,data);scene.collection.objects.link(light)
 x,y,z=settings['offset'];light.location=center+height*(right*x+up*y+toward*z);light.rotation_euler=(center-light.location).to_track_quat('-Z','Y').to_euler()
scene.render.resolution_x=scene.render.resolution_y=C['sourceSizePx'];scene.render.resolution_percentage=100
scene.render.filter_size=STYLE['filterWidth'];scene.render.image_settings.color_depth='8'
scene.view_settings.exposure=STYLE['exposure'];scene.view_settings.look=STYLE['look'];camera.data.dof.use_dof=False
report['renderer']=D.configure_render(scene,body,STYLE)
for n,(key,index,world,pose) in enumerate(captured):
 rig.matrix_world=world;U.poses.restore_pose(rig,pose)
 path=U.frame_path(key,index)
 if not path.exists():scene.render.filepath=str(path);bpy.ops.render.render(write_still=True)
 if n%20==0:print(f'GROUNDED_RENDER {GROUP} {n+1}/{len(captured)}',flush=True)
report['sourceUnchanged']=hashlib.sha256((ROOT/source).read_bytes()).hexdigest()==report['sourceHash']
report['maximumClothValue']=max((abs(b.value) for b in body.data.shape_keys.key_blocks),default=0) if body.data.shape_keys else 0
(OUT/f'export-{GROUP}.json').write_text(json.dumps(report,indent=2))
print('GROUNDED_EXPORT_OK '+GROUP+' '+str(len(captured)),flush=True)
