"""Create a no-controls, review-only horizontal idle from the approved idle snapshot."""

from __future__ import annotations

import json
import math
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "values" / "supermanHorizontalIdleReview.json"


def load_config():
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))


def review_root(config):
    path = (ROOT / config["output"]["root"]).resolve()
    allowed = (ROOT / "testing" / "blender-animation-lab-v1" / "review-drafts").resolve()
    if allowed not in path.parents:
        raise RuntimeError(f"Horizontal idle output must remain under {allowed}: {path}")
    return path


def remove_editor_helpers(bpy, scene, rig, root):
    controls = bpy.data.collections.get("SUPERHERO_POSE_CONTROLS")
    if controls:
        for obj in list(controls.objects):
            if obj != root:
                bpy.data.objects.remove(obj, do_unlink=True)
        if root.name not in scene.collection.objects:
            scene.collection.objects.link(root)
        controls.objects.unlink(root)
        bpy.data.collections.remove(controls)
    for obj in list(bpy.data.objects):
        if obj.name.startswith("LABEL_"):
            bpy.data.objects.remove(obj, do_unlink=True)
    for bone in rig.pose.bones:
        for constraint in list(bone.constraints):
            if constraint.name.startswith("CTRL_"):
                bone.constraints.remove(constraint)


def configure_simple_idle(bpy, scene, rig, camera, root, config):
    source = config["source"]
    action = bpy.data.actions.get(source["idleAction"])
    if action is None:
        raise RuntimeError(f"Missing frozen idle action: {source['idleAction']}")
    rig.animation_data_create()
    rig.animation_data.action = action
    if action.slots:
        rig.animation_data.action_slot = action.slots[0]
    frame = source["idleFrame"]
    scene.frame_set(frame)
    root.rotation_mode = "XYZ"
    root.rotation_euler.rotate_axis("Z", math.radians(config["pose"]["horizontalRotationDegrees"]))
    root.name = config["pose"]["rootName"]
    root.empty_display_size = config["pose"]["rootDisplaySize"]
    root.show_name = False
    root.hide_render = True
    for bone in rig.data.bones:
        bone.hide = True
    rig.show_in_front = False
    scene.frame_start = config["pose"]["frameStart"]
    scene.frame_end = config["pose"]["frameEnd"]
    scene.camera = camera
    scene["supermanHorizontalIdle"] = config["version"]
    scene["productionChanged"] = False
    bpy.context.view_layer.update()


def configure_view(bpy, camera, rig):
    mesh = next((obj for obj in rig.children_recursive if obj.type == "MESH"), rig)
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == "VIEW_3D":
                space = area.spaces.active
                space.region_3d.view_perspective = "CAMERA"
                space.shading.type = "MATERIAL"
                space.overlay.show_relationship_lines = False
    bpy.ops.object.select_all(action="DESELECT")
    mesh.select_set(True)
    bpy.context.view_layer.objects.active = mesh
    return mesh


def render_preview(bpy, scene, config, root):
    scene.render.resolution_x = config["preview"]["sizePx"]
    scene.render.resolution_y = config["preview"]["sizePx"]
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = config["preview"]["transparent"]
    scene.render.filepath = str(root / config["output"]["preview"])
    bpy.ops.render.render(write_still=True)


def write_readme(root):
    text = """# Superman horizontal idle review\n\nReview-only Blender preset. It is the approved idle snapshot rotated flat into a horizontal flying baseline.\n\nThere are no pose controls, visible bones, or game-runtime changes. Open it to inspect the simple flat idle. Reopen the file to reset it.\n"""
    (root / "readme.md").write_text(text, encoding="utf-8")


def build():
    import bpy

    config = load_config()
    root_path = review_root(config)
    root_path.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    source = config["source"]
    rig = bpy.data.objects.get(source["rig"])
    camera = bpy.data.objects.get(source["camera"])
    transform_root = bpy.data.objects.get(source["root"])
    if rig is None or rig.type != "ARMATURE" or camera is None or transform_root is None:
        raise RuntimeError("The approved idle snapshot is missing its rig, camera, or transform root")
    remove_editor_helpers(bpy, scene, rig, transform_root)
    configure_simple_idle(bpy, scene, rig, camera, transform_root, config)
    configure_view(bpy, camera, rig)
    render_preview(bpy, scene, config, root_path)
    manifest = {
        "version": config["version"],
        "productionChanged": False,
        "source": source,
        "orientation": "approved idle snapshot rotated 90 degrees horizontal",
        "policy": "review-only visual preset; no game asset or collision change",
    }
    (root_path / config["output"]["manifest"]).write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    write_readme(root_path)
    bpy.ops.wm.save_as_mainfile(filepath=str(root_path / config["output"]["blend"]), copy=True)
    print(f"SUPERMAN_HORIZONTAL_IDLE_OK root={root_path}")


if __name__ == "__main__":
    build()
