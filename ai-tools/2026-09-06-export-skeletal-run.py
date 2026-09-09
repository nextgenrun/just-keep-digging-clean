"""Export the retained jog on the approved Survival skeleton as a live GLB."""
import bpy, json, hashlib, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "sprites/character/survival-skeletal-run-v1"
SOURCE = ROOT / "testing/blender-animation-lab-v1/blender-animation-lab-v1.blend"
SOURCE_HASH = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
rig = bpy.data.objects["root"]
action = bpy.data.actions["DGAL_locomotion-jog"]
rig.animation_data_create()
rig.animation_data.action = action
rig.animation_data.action_slot = action.slots[0]
for track in list(rig.animation_data.nla_tracks):
    rig.animation_data.nla_tracks.remove(track)
for other in list(bpy.data.actions):
    if other != action:
        bpy.data.actions.remove(other)
action.name = "Legacy_Jog_Run"
bpy.context.scene.render.fps = 30
bpy.context.scene.frame_start = int(action.frame_range[0])
bpy.context.scene.frame_end = int(action.frame_range[1])
bpy.context.scene.frame_set(bpy.context.scene.frame_start)
# Export only the already-weighted character and its real skeleton.
bpy.ops.object.select_all(action="DESELECT")
meshes = [obj for obj in bpy.data.objects if obj.type == "MESH"]
for obj in [rig, *meshes]:
    obj.hide_set(False)
    obj.hide_viewport = False
    obj.hide_render = False
    obj.select_set(True)
bpy.context.view_layer.objects.active = rig
# Retain the PBR appearance in a compact runtime derivative; never save the source blend.
for image in bpy.data.images:
    if image.source == "FILE" and image.size[0] and max(image.size) > 1024:
        width, height = image.size
        ratio = 1024 / max(width, height)
        image.scale(max(1, round(width * ratio)), max(1, round(height * ratio)))
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=str(OUT / "survival-legacy-jog.glb"), export_format="GLB",
    use_selection=True, export_animations=True, export_animation_mode="ACTIVE_ACTIONS",
    export_frame_range=True, export_force_sampling=True, export_skins=True,
    export_all_influences=False, export_def_bones=False, export_morph=False,
    export_yup=True, export_cameras=False, export_lights=False,
    export_image_format="AUTO",
)
report = {
    "sourceMesh": "Survival Character by Arberry",
    "sourceUrl": "https://www.fab.com/listings/11d20d01-b764-4936-8163-cb20d05c369e",
    "sourceBlend": str(SOURCE.relative_to(ROOT)).replace("\\", "/"),
    "sourceSha256": SOURCE_HASH,
    "motion": "Quaternius Jog_Fwd_Loop retargeted to the Survival Epic skeleton",
    "animation": action.name, "frameRange": list(action.frame_range),
    "fps": bpy.context.scene.render.fps, "bones": len(rig.data.bones),
    "meshVertices": sum(len(obj.data.vertices) for obj in meshes),
    "sourceUnchanged": hashlib.sha256(SOURCE.read_bytes()).hexdigest() == SOURCE_HASH,
    "glbBytes": (OUT / "survival-legacy-jog.glb").stat().st_size,
}
(OUT / "manifest.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print("SKELETAL_RUN_EXPORT " + json.dumps(report))

