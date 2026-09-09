"""Render approved V2 surfaces on existing animation poses without cloth deformation."""
import bpy, hashlib, importlib.util, json, os, shutil, struct, sys, time
from pathlib import Path
from mathutils import Vector
ROOT = Path(__file__).resolve().parents[1]
C = json.loads((ROOT/'values/characterDefinitionRuntimeV2.json').read_text())
STYLE = json.loads((ROOT/C['styleConfig']).read_text(encoding='utf-8-sig'))
OUT = ROOT/C['workRoot']; OUT.mkdir(parents=True, exist_ok=True)
def module(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT/path)
    value = importlib.util.module_from_spec(spec); spec.loader.exec_module(value)
    return value
U = module('definition_runtime_unified', 'ai-tools/2026-08-25-render-survival-unified-animation-runtime-v1.py')
D = module('definition_runtime_detail', 'ai-tools/2026-09-06-character-definition-detail.py')
inventory = json.loads((OUT/'inventory.json').read_text())
entries = {s['key']:s for s in inventory['sheets']}
U.CONFIG['sheets'].update(C['extraSheets'])
group = os.environ.get('CHARACTER_EXPORT_GROUP', 'body')
selected = {k:v for k,v in U.CONFIG['sheets'].items() if k in entries and bool(v.get('sourceBlend')) == (group=='torch')}
if group=='body': selected = {STYLE['sheet']:selected[STYLE['sheet']], **selected}
source = next(iter(selected.values())).get('sourceBlend', U.CONFIG['sourceBlend'])
U.CONFIG['sourceBlend'] = source
U.CONFIG['sheets'] = selected
if group=='torch':U.CONFIG['objects']['referenceAction']=U.CONFIG['heldTorchPose']['action']
U.CONFIG['renderRoot'] = str((OUT/f'raw-{C["sourceSizePx"]}').relative_to(ROOT)).replace(chr(92), '/')
U.clear_sheet = lambda key: None
U.sheet_is_complete = lambda key,count: all(U.frame_path(key,i).is_file() for i in entries[key]['frames'])
body = bpy.data.objects[U.CONFIG['objects']['body']]
rig = bpy.data.objects[U.CONFIG['objects']['rig']]
reportPath=OUT/f'export-{group}.json'
cachePath=OUT/f'pose-cache-{group}-{C["sourceSizePx"]}.json'
cache=json.loads(cachePath.read_text()) if cachePath.exists() else {}
report={'group':group,'sourceBlend':source,'sourceHash':hashlib.sha256((ROOT/source).read_bytes()).hexdigest(),'clothEnabled':False,'rendered':0,'reused':0,'skipped':0,'frames':{}}
setupDone=False; started=time.monotonic(); limit=int(os.environ.get('CHARACTER_EXPORT_LIMIT','0'))
class ExportLimit(Exception): pass

def setup(scene):
    global setupDone
    camera=scene.camera
    corners=[body.matrix_world@Vector(p) for p in body.bound_box]
    lightFile=OUT/'light-frame.json'
    if lightFile.exists():
        anchor=json.loads(lightFile.read_text());height=anchor['height'];center=Vector(anchor['center'])
    else:
        height=max(p.z for p in corners)-min(p.z for p in corners)
        center=sum(corners,Vector())/len(corners)
        lightFile.write_text(json.dumps({'height':height,'center':list(center)}))
    basis=camera.matrix_world.to_3x3()
    right,up,toward=[basis@Vector(v) for v in ((1,0,0),(0,1,0),(0,0,1))]
    report['materials']=D.configure_materials(STYLE,height)
    for obj in bpy.data.objects:
        if obj.type=='LIGHT':obj.hide_render=True
    for settings in STYLE['lights']:
        data=bpy.data.lights.new('DefinitionRuntime'+settings['name'],'AREA')
        data.energy=settings['energy']*(height/STYLE['lightReferenceHeight'])**2
        data.shape='DISK';data.size=height*settings['size'];data.color=settings['color']
        light=bpy.data.objects.new(data.name,data);scene.collection.objects.link(light)
        x,y,z=settings['offset'];light.location=center+height*(right*x+up*y+toward*z)
        light.rotation_euler=(center-light.location).to_track_quat('-Z','Y').to_euler()
    scene.render.resolution_x=scene.render.resolution_y=C['sourceSizePx']
    scene.render.resolution_percentage=100;scene.render.filter_size=STYLE['filterWidth']
    scene.render.image_settings.color_depth='8'
    scene.view_settings.exposure=STYLE['exposure'];scene.view_settings.look=STYLE['look']
    camera.data.dof.use_dof=False
    report['renderer']=D.configure_render(scene,body,STYLE)
    report['camera']={'orthoScale':camera.data.ortho_scale,'matrix':[list(row) for row in camera.matrix_world]}
    setupDone=True

def save():
    report['elapsedSeconds']=round(time.monotonic()-started,2)
    reportPath.write_text(json.dumps(report,indent=2))
    cachePath.write_text(json.dumps(cache))

def render(scene,key,index,secondary,count,loop):
    if index not in entries[key]['frames']:return
    U.apply_held_torch_pose(scene,rig,U.ACTIVE_SHEET_SPEC or {},index,count,loop)
    if body.data.shape_keys:
        for block in body.data.shape_keys.key_blocks:block.value=0
    bpy.context.view_layer.update()
    if not setupDone:setup(scene)
    path=U.frame_path(key,index)
    values=[v for matrix in [rig.matrix_world,body.matrix_world,*[b.matrix_basis for b in rig.pose.bones]] for row in matrix for v in row]
    digest=hashlib.sha256(struct.pack(f'{len(values)}f',*[round(v,6) for v in values])).hexdigest()
    if path.exists():report['skipped']+=1
    elif digest in cache and (ROOT/cache[digest]).is_file():
        shutil.copyfile(ROOT/cache[digest],path);report['reused']+=1
    else:
        scene.render.filepath=str(path);bpy.ops.render.render(write_still=True)
        report['rendered']+=1
    cache[digest]=str(path.relative_to(ROOT)).replace(chr(92),'/')
    report['frames'][f'{key}:{index}']=digest
    if index%8==0 or index==count-1:save()
    print(f'DEFINITION_RUNTIME_FRAME {key} {index+1}/{count} rendered={report["rendered"]} reused={report["reused"]} elapsed={time.monotonic()-started:.1f}',flush=True)
    if limit and report['rendered']>=limit:raise ExportLimit()
# Sample native poses before path tracing; repeated rig evaluation stays inexpensive.
captured=[]
def capture(scene,key,index,secondary,count,loop):
    if index not in entries[key]['frames'] or U.frame_path(key,index).exists():return
    U.apply_held_torch_pose(scene,rig,U.ACTIVE_SHEET_SPEC or {},index,count,loop)
    if body.data.shape_keys:
        for block in body.data.shape_keys.key_blocks:block.value=0
    bpy.context.view_layer.update()
    captured.append((key,index,count,loop,rig.matrix_world.copy(),U.poses.capture_pose(rig)))
    if len(captured)%50==0:print(f'DEFINITION_POSES_CAPTURED {len(captured)}',flush=True)
U.render_frame=capture
sys.argv=[sys.argv[0],'--','--resume=1']
try:
    U.main()
    for key,index,count,loop,world,pose in captured:
        rig.matrix_world=world
        U.poses.restore_pose(rig,pose)
        render(bpy.context.scene,key,index,{},count,loop)
    report['complete']=True
except ExportLimit:report['complete']=False
finally:
    report['sourceUnchanged']=hashlib.sha256((ROOT/source).read_bytes()).hexdigest()==report['sourceHash']
    report['maximumClothValue']=max((abs(b.value) for b in body.data.shape_keys.key_blocks),default=0) if body.data.shape_keys else 0
    save()
print('DEFINITION_RUNTIME_EXPORT_OK '+json.dumps({k:v for k,v in report.items() if k not in ('materials','frames','camera')}),flush=True)
