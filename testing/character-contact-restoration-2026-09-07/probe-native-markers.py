"""Read native pose markers without rendering or modifying the source blend."""
from pathlib import Path
import json, importlib.util, sys
import bpy
from bpy_extras.object_utils import world_to_camera_view
ROOT=Path.cwd(); OUT=ROOT/"testing/character-contact-restoration-2026-09-07"
spec=importlib.util.spec_from_file_location("contact_native", ROOT/"ai-tools/2026-08-25-render-survival-unified-animation-runtime-v1.py")
U=importlib.util.module_from_spec(spec);spec.loader.exec_module(U)
keys=["survival-ual-player-v1-"+v+"-sheet" for v in ("moving-side-dig-jab","moving-side-dig-cross","moving-side-dig-phase-handoff","animation-polish-diagonal-dig")]
U.CONFIG["sheets"].update(json.loads((ROOT/"values/characterDefinitionRuntimeV2.json").read_text())["extraSheets"])
keys.append("survival-mixamo-v3-downward-dig-body-low-sheet")
U.CONFIG["sheets"]={k:v for k,v in U.CONFIG["sheets"].items() if k in keys}
U.CONFIG["renderRoot"]=str(OUT.relative_to(ROOT));U.sheet_is_complete=lambda *a:False;U.clear_sheet=lambda *a:None
rig=bpy.data.objects[U.CONFIG["objects"]["rig"]]; points={}
def capture(scene,key,index,*args):
 bpy.context.view_layer.update()
 result={}
 for bone in rig.pose.bones:
  if not bone.name.startswith(("hand_","index_","middle_")):continue
  for end in ("head","tail"):
   co=world_to_camera_view(scene,scene.camera,rig.matrix_world@getattr(bone,end))
   result[bone.name+"."+end]=[round(co.x*512,2),round((1-co.y)*512,2)]
 points.setdefault(key,{})[index]=result
U.render_frame=capture
sys.argv=[sys.argv[0],"--","--resume=0"];U.main()
(OUT/"native-hand-markers.json").write_text(json.dumps(points))
print("NATIVE_CONTACT_MARKERS_OK",sum(len(v) for v in points.values()),flush=True)
