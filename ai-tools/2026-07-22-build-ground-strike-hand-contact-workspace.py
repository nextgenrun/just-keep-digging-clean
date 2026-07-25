"""Build and validate the isolated ground-strike hand-contact Blender workspace."""

from __future__ import annotations

import argparse
import hashlib
import importlib
import json
import sys
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG = ROOT / "values" / "blenderAnimationLab.json"


def arguments():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", default=str(DEFAULT_CONFIG))
    parser.add_argument("--validate-only", action="store_true")
    return parser.parse_args(argv)


def resolve(relative_path: str) -> Path:
    return (ROOT / relative_path).resolve()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def register_addon(config: dict):
    addon_root = resolve(config["paths"]["addonRoot"])
    if str(addon_root) not in sys.path:
        sys.path.insert(0, str(addon_root))
    module = importlib.import_module(config["paths"]["addonModule"])
    if not hasattr(bpy.types.Scene, "dgal"):
        module.register()


def assign_action(rig, action):
    rig.animation_data_create()
    rig.animation_data.action = action
    if action.slots:
        rig.animation_data.action_slot = action.slots[0]


def ensure_collection(name: str):
    collection = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if collection.name not in {child.name for child in bpy.context.scene.collection.children}:
        bpy.context.scene.collection.children.link(collection)
    return collection


def create_ground_guide(settings: dict, collection):
    name = "DGAL_CONTACT_GROUND"
    old = bpy.data.objects.get(name)
    if old:
        bpy.data.objects.remove(old, do_unlink=True)
    size = float(settings["groundGuideSize"])
    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(
        [(-size, -size, 0), (size, -size, 0), (size, size, 0), (-size, size, 0)],
        [],
        [(0, 1, 2, 3)],
    )
    mesh.update()
    guide = bpy.data.objects.new(name, mesh)
    collection.objects.link(guide)
    guide.location.z = float(settings["groundWorldZ"])
    guide.hide_render = True
    guide.hide_select = True
    guide["dgal_role"] = "ground-contact-guide"
    material = bpy.data.materials.get("DGAL_Ground_Contact_Green") or bpy.data.materials.new("DGAL_Ground_Contact_Green")
    material.diffuse_color = (0.04, 0.75, 0.18, 0.42)
    material.metallic = 0.0
    material.roughness = 0.8
    guide.data.materials.append(material)
    return guide


def create_hand_shape(settings: dict, collection):
    name = "DGAL_RIGHT_HAND_GREEN_CONTROL"
    old = bpy.data.objects.get(name)
    if old:
        bpy.data.objects.remove(old, do_unlink=True)
    radius = float(settings["controlShapeRadius"])
    vertices = [(radius, 0, 0), (-radius, 0, 0), (0, radius, 0), (0, -radius, 0), (0, 0, radius), (0, 0, -radius)]
    faces = [(0, 2, 4), (2, 1, 4), (1, 3, 4), (3, 0, 4), (2, 0, 5), (1, 2, 5), (3, 1, 5), (0, 3, 5)]
    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    shape = bpy.data.objects.new(name, mesh)
    collection.objects.link(shape)
    shape.hide_render = True
    shape.hide_set(True)
    shape["dgal_role"] = "right-hand-contact-control-shape"
    return shape


def configure_workspace(settings: dict):
    keep = bpy.data.workspaces.get("Layout") or next(iter(bpy.data.workspaces))
    keep.name = settings["workspaceName"]
    screen = bpy.data.screens.get("Layout") or next(iter(bpy.data.screens))
    screen.name = settings["workspaceName"]
    for area in screen.areas:
        if area.type == "VIEW_3D":
            space = area.spaces.active
            space.shading.type = "MATERIAL"
            space.overlay.show_bones = True
            space.overlay.show_floor = True
            space.overlay.show_axis_x = True
            space.overlay.show_axis_z = True
            space.show_region_ui = True
            space.show_gizmo = True
            space.show_gizmo_tool = True
            if space.region_3d:
                space.region_3d.view_perspective = "CAMERA"
        elif area.type == "DOPESHEET_EDITOR":
            area.ui_type = "TIMELINE"
    return keep


def configure_scene(config: dict, settings: dict):
    scene = bpy.context.scene
    rig = bpy.data.objects.get(settings["rigObject"])
    source = bpy.data.actions.get(settings["sourceAction"])
    if not rig or not source:
        raise RuntimeError("Ground-strike source rig/action is missing")
    prior = bpy.data.actions.get(settings["editableAction"])
    if prior:
        bpy.data.actions.remove(prior)
    editable = source.copy()
    editable.name = settings["editableAction"]
    editable["dgal_editable"] = True
    editable["dgal_source_action"] = source.name
    editable["productionChanged"] = False
    editable.use_fake_user = True
    assign_action(rig, editable)

    scene.frame_start = int(settings["sourceFrameStart"])
    scene.frame_end = int(settings["sourceFrameEnd"])
    scene.frame_set(int(settings["sourceContactFrame"]))
    rig.pose.use_auto_ik = True
    scene.tool_settings.use_keyframe_insert_auto = False
    scene["dgal_ground_contact_workspace"] = settings["id"]
    scene["dgal_contact_runtime_key"] = settings["runtimeAnimationKey"]
    scene["dgal_contact_source_clip"] = settings["sourceClip"]
    scene["dgal_contact_source_action"] = source.name
    scene["dgal_contact_edit_action"] = editable.name
    scene["dgal_contact_rig"] = rig.name
    scene["dgal_contact_hand_bone"] = settings["handBone"]
    scene["dgal_contact_source_frame"] = int(settings["sourceContactFrame"])
    scene["dgal_contact_runtime_frame"] = int(settings["runtimeContactFrame"])
    scene["dgal_contact_workspace_name"] = settings["workspaceName"]
    scene["dgal_contact_status"] = "Ready - drag the green right hand down"
    scene["productionChanged"] = False

    if hasattr(scene, "dgal"):
        from dig_game_animation_lab.session_ops import refresh_catalog

        state = scene.dgal
        refresh_catalog(state)
        state.active_rig = rig
        state.active_action_source = source.name
        state.pose_role = "CONTACT"
        state.pose_scope = "ALL"
        state.frame_start = int(settings["sourceFrameStart"])
        state.frame_anticipation = max(state.frame_start, int(settings["sourceContactFrame"]) - 6)
        state.frame_contact = int(settings["sourceContactFrame"])
        state.frame_recovery = min(int(settings["sourceFrameEnd"]), int(settings["sourceContactFrame"]) + 6)
        state.frame_end = int(settings["sourceFrameEnd"])
        state.simple_status = "Ground strike loaded - move the green right hand to the floor"
        for index, clip in enumerate(state.clips):
            if clip.clip_id == "ground-strike":
                state.clip_index = index
                break

    controls = ensure_collection("DGAL_HAND_CONTACT_GUIDES")
    create_ground_guide(settings, controls)
    hand_shape = create_hand_shape(settings, controls)
    hand = rig.pose.bones.get(settings["handBone"])
    if not hand:
        raise RuntimeError(f"Missing hand bone: {settings['handBone']}")
    hand.custom_shape = hand_shape
    hand.custom_shape_scale_xyz = (1.0, 1.0, 1.0)
    visible = set(settings["visibleBones"])
    for pose_bone in rig.pose.bones:
        pose_bone.bone.hide = pose_bone.name not in visible
        pose_bone.select = False
    hand.bone.hide = False
    hand.select = True
    rig.data.bones.active = hand.bone
    rig.data.display_type = "STICK"
    rig.show_in_front = True
    for obj in bpy.context.selected_objects:
        obj.select_set(False)
    rig.hide_set(False)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    if rig.mode != "POSE":
        bpy.ops.object.mode_set(mode="POSE")
    configure_workspace(settings)
    return rig, source, editable


def validate(settings: dict):
    scene = bpy.context.scene
    rig = bpy.data.objects.get(settings["rigObject"])
    source = bpy.data.actions.get(settings["sourceAction"])
    editable = bpy.data.actions.get(str(scene.get("dgal_contact_edit_action", settings["editableAction"])))
    hand = rig.pose.bones.get(settings["handBone"]) if rig else None
    checks = {
        "review_only": scene.get("productionChanged") is False,
        "runtime_key": scene.get("dgal_contact_runtime_key") == settings["runtimeAnimationKey"],
        "source_preserved": bool(source and not source.get("dgal_editable")),
        "editable_copy": bool(editable and editable != source and editable.get("dgal_editable")),
        "action_assigned": bool(rig and rig.animation_data and rig.animation_data.action == editable),
        "contact_frame": scene.frame_current == int(settings["sourceContactFrame"]),
        "auto_ik": bool(rig and rig.pose.use_auto_ik),
        "hand_control": bool(hand and hand.custom_shape),
        "ground_guide": bpy.data.objects.get("DGAL_CONTACT_GROUND") is not None,
        "simple_workspace": settings["workspaceName"] in bpy.data.workspaces,
    }
    failed = [name for name, passed in checks.items() if not passed]
    if failed:
        raise RuntimeError(f"Ground-contact workspace validation failed: {failed}")
    print(f"GROUND_STRIKE_HAND_CONTACT_OK checks={len(checks)} action={editable.name} frame={scene.frame_current}")


def main():
    args = arguments()
    config_path = Path(args.config).resolve()
    config = json.loads(config_path.read_text(encoding="utf-8"))
    settings = config["groundContactWorkspace"]
    register_addon(config)
    if args.validate_only:
        validate(settings)
        return
    master = resolve(config["paths"]["outputBlend"])
    master_hash = sha256(master)
    _rig, _source, _editable = configure_scene(config, settings)
    bpy.context.scene["dgal_protected_master_sha256"] = master_hash
    output = resolve(settings["outputBlend"])
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(output), check_existing=False)
    if sha256(master) != master_hash:
        raise RuntimeError("Protected animation lab master changed during workspace build")
    validate(settings)
    print(f"GROUND_STRIKE_HAND_CONTACT_BUILD_OK output={output}")


if __name__ == "__main__":
    main()
