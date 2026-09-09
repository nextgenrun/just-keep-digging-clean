"""Measure current rendered gait soles through the unchanged native camera; no art edits."""
import bpy, importlib.util, json, sys
from pathlib import Path
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT/'testing/character-grounding-2026-09-07'
spec=importlib.util.spec_from_file_location('grounding_native',ROOT/'ai-tools/2026-08-25-render-survival-unified-animation-runtime-v1.py')
U=importlib.util.module_from_spec(spec);spec.loader.exec_module(U)
keys=['survival-blender-v2-idle-sheet','survival-blender-v2-walk-sheet','survival-mixamo-v1-walk-loop-sheet','survival-ual-player-v1-animation-polish-run-sheet']
U.CONFIG['sheets']={k:v for k,v in U.CONFIG['sheets'].items() if k in keys}
template=U.CONFIG['sheets']['survival-mixamo-v1-walk-loop-sheet']
for name in ['standard-run-123560901','slow-run-128630901','medium-run-128630903','fast-run-128630905','unarmed-run-forward-128650943']:
    carrier,action,imported,actions=U.poses.import_fbx(ROOT/U.CONFIG['paths'][template['root']]/('mixamo-'+name+'.fbx'))
    prefix=next(b.name[:-4] for b in carrier.data.bones if b.name.endswith('Hips'))
    U.poses.cleanup(imported,actions)
    U.CONFIG['sheets'][name]={**template,'source':'mixamo-'+name+'.fbx','sourceBonePrefix':prefix}
    print('RUN_PREFIX '+name+' '+prefix,flush=True)
U.CONFIG['renderRoot']=str(OUT.relative_to(ROOT))+'/native-audit'
U.clear_sheet=lambda key:None
U.sheet_is_complete=lambda key,count:False
rig=bpy.data.objects[U.CONFIG['objects']['rig']];body=bpy.data.objects[U.CONFIG['objects']['body']]
indices={}
for side in ('l','r'):
    groups={g.index for g in body.vertex_groups if g.name in ('foot_'+side,'ball_'+side)}
    indices[side]=[v.index for v in body.data.vertices if sum(g.weight for g in v.groups if g.group in groups)>.65]
result={'sourceSize':512,'sourceBlend':U.CONFIG['sourceBlend'],'sheets':{},'shoeVertices':{k:len(v) for k,v in indices.items()}}
def capture(scene,key,index,secondary,count,loop):
    for block in body.data.shape_keys.key_blocks if body.data.shape_keys else []:block.value=0
    bpy.context.view_layer.update()
    scene.render.resolution_x=scene.render.resolution_y=512;scene.render.resolution_percentage=100
    evaluated=body.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=evaluated.to_mesh()
    feet={}
    for side,verts in indices.items():
        points=[evaluated.matrix_world@mesh.vertices[i].co for i in verts]
        bottom=min(p.z for p in points)
        sole=[p for p in points if p.z<bottom+.012]
        point=sum(sole,Vector())/len(sole)
        pixel=world_to_camera_view(scene,scene.camera,point)
        feet[side]={'x':round(pixel.x*512,3),'y':round((1-pixel.y)*512,3),'z':round(bottom,5)}
    evaluated.to_mesh_clear()
    result['sheets'].setdefault(key,[]).append({'frame':index,**feet})
    if index==count-1:print('MEASURED '+key,flush=True)
U.render_frame=capture
sys.argv=[sys.argv[0],'--','--resume=0']
U.main()
(OUT/'native-run-candidates.json').write_text(json.dumps(result,indent=2))
print('NATIVE_FEET_OK',flush=True)
