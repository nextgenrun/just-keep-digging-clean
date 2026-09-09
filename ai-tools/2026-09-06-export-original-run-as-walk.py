"""Export the exact original Standard Walk motion onto the existing public rig."""
import bpy, hashlib, importlib.util, json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "sprites/character/survival-skeletal-walk-v1"
SOURCE = ROOT / "testing/blender-animation-lab-v1/blender-animation-lab-v1.blend"
def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module
pipeline = load_module("standard_walk_pipeline", ROOT / "ai-tools/2026-08-25-render-survival-unified-animation-runtime-v1.py")
spec = pipeline.CONFIG["sheets"]["survival-mixamo-v1-walk-loop-sheet"]
carrier = ROOT / pipeline.CONFIG["paths"][spec["root"]] / spec["source"]
hashes = {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in [SOURCE, carrier]}
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
scene = bpy.context.scene
rig = bpy.data.objects["root"]
for track in list(rig.animation_data.nla_tracks):
    rig.animation_data.nla_tracks.remove(track)
# Use the same approved neutral fingers as the original Standard Walk render.
reference_blend = ROOT / pipeline.CONFIG["sourceBlend"]
with bpy.data.libraries.load(str(reference_blend), link=False) as (available, imported):
    imported.actions = ["MINER_idle"]
reference = imported.actions[0]
if reference is None:
    raise RuntimeError("Original Standard Walk reference action is missing")
fingers = pipeline.retarget.capture_reference_fingers(
    scene, rig, reference, pipeline.RETARGET_CONFIG["retarget"]["fingerPosePrefixes"])
captured = []
pipeline.render_frame = lambda *_args: captured.append(pipeline.poses.capture_pose(rig))
report = pipeline.render_mixamo(scene, rig, fingers, {}, "survival-mixamo-v1-walk-loop-sheet", spec)
if len(captured) != spec["frames"]:
    raise RuntimeError("Unexpected Standard Walk sample count")
action = bpy.data.actions.new("Original_Run_Standard_Walk")
for index, pose in enumerate([*captured, captured[0]]):
    pipeline.poses.assign_action(rig, None)
    scene.frame_set(index)
    for bone in rig.pose.bones:
        bone.rotation_mode = "QUATERNION"
        bone.matrix_basis = pose[bone.name]
    pipeline.poses.assign_action(rig, action)
    for bone in rig.pose.bones:
        for path in ["location", "rotation_quaternion", "scale"]:
            bone.keyframe_insert(data_path=path, frame=index, group=bone.name)
for layer in action.layers:
    for strip in layer.strips:
        for bag in strip.channelbags:
            for curve in bag.fcurves:
                for point in curve.keyframe_points:
                    point.interpolation = "LINEAR"
for other in list(bpy.data.actions):
    if other != action:
        bpy.data.actions.remove(other)
pipeline.poses.assign_action(rig, action)
scene.render.fps = 24
scene.frame_start, scene.frame_end = 0, len(captured)
scene.frame_set(0)
bpy.ops.object.select_all(action="DESELECT")
meshes = [obj for obj in bpy.data.objects if obj.type == "MESH"]
for obj in [rig, *meshes]:
    obj.hide_set(False)
    obj.hide_viewport = False
    obj.select_set(True)
bpy.context.view_layer.objects.active = rig
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=str(OUT / "standard-walk.glb"), export_format="GLB",
    use_selection=True, export_animations=True, export_animation_mode="ACTIVE_ACTIONS",
    export_frame_range=True, export_force_sampling=True, export_skins=True,
    export_all_influences=False, export_def_bones=False, export_morph=False,
    export_yup=True, export_cameras=False, export_lights=False, export_materials="NONE",
)
manifest = {
    "motion": "Mixamo Standard Walk, the run animation used at the start of this task",
    "animation": action.name, "source": str(carrier.relative_to(ROOT)).replace("\\", "/"),
    "sourceHashes": hashes, "sourceSamples": report["samples"],
    "targetRig": "Original public Survival 160-bone rig",
    "referenceAction": "MINER_idle", "fps": 24, "frames": len(captured),
    "loopEndpoint": "First pose duplicated at 1 second for continuous wrap",
    "sourcesUnchanged": all(hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==h for p,h in hashes.items()),
}
(OUT / "manifest.json").write_text(json.dumps(manifest, indent=2)+"\n",encoding="utf-8")
print("STANDARD_WALK_EXPORT "+json.dumps(manifest),flush=True)
