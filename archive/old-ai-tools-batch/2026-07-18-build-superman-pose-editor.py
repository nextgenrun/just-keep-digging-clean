"""Build a simple, review-only Blender pose editor from the approved Survivor rig."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "values" / "supermanPoseEditor.json"


def load_config():
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))


def review_root(config):
    path = (ROOT / config["output"]["root"]).resolve()
    allowed = (ROOT / "testing" / "blender-animation-lab-v1" / "review-drafts").resolve()
    if allowed not in path.parents:
        raise RuntimeError(f"Pose editor must remain under {allowed}: {path}")
    return path


def assign_action(obj, action):
    obj.animation_data_create()
    obj.animation_data.action = action
    if action.slots:
        obj.animation_data.action_slot = action.slots[0]


def capture_static_idle(bpy, scene, rig, config):
    source = bpy.data.actions.get(config["source"]["idleAction"])
    if source is None:
        raise RuntimeError(f"Missing approved idle action: {config['source']['idleAction']}")
    assign_action(rig, source)
    frame = config["source"]["idleFrame"]
    scene.frame_set(frame)
    bpy.context.view_layer.update()
    samples = {}
    for bone in rig.pose.bones:
        samples[bone.name] = {
            "mode": bone.rotation_mode,
            "location": bone.location.copy(),
            "quaternion": bone.rotation_quaternion.copy(),
            "euler": bone.rotation_euler.copy(),
            "axis": tuple(bone.rotation_axis_angle),
            "scale": bone.scale.copy(),
        }
    previous = bpy.data.actions.get(config["pose"]["actionName"])
    if previous:
        bpy.data.actions.remove(previous, do_unlink=True)
    action = bpy.data.actions.new(config["pose"]["actionName"])
    action.use_fake_user = True
    action["dgal_editable"] = True
    action["productionChanged"] = False
    action["purpose"] = "One-pose Superman flight silhouette editor; not a runtime action"
    assign_action(rig, action)
    for name, sample in samples.items():
        bone = rig.pose.bones[name]
        bone.rotation_mode = sample["mode"]
        bone.location = sample["location"]
        bone.rotation_quaternion = sample["quaternion"]
        bone.rotation_euler = sample["euler"]
        bone.rotation_axis_angle = sample["axis"]
        bone.scale = sample["scale"]
        bone.keyframe_insert("location", frame=frame, group=name)
        bone.keyframe_insert("scale", frame=frame, group=name)
        if bone.rotation_mode == "QUATERNION":
            bone.keyframe_insert("rotation_quaternion", frame=frame, group=name)
        elif bone.rotation_mode == "AXIS_ANGLE":
            bone.keyframe_insert("rotation_axis_angle", frame=frame, group=name)
        else:
            bone.keyframe_insert("rotation_euler", frame=frame, group=name)
    scene.frame_start = frame
    scene.frame_end = frame
    return action


def camera_axes(camera):
    from mathutils import Vector

    rotation = camera.matrix_world.to_3x3()
    return (
        (rotation @ Vector((1, 0, 0))).normalized(),
        (rotation @ Vector((0, 1, 0))).normalized(),
        (rotation @ Vector((0, 0, -1))).normalized(),
    )


def offset_point(point, axes, offset):
    return point + axes[0] * offset[0] + axes[1] * offset[1] + axes[2] * offset[2]


def parent_keep_world(bpy, obj, parent):
    bpy.context.view_layer.update()
    world = obj.matrix_world.copy()
    obj.parent = parent
    bpy.context.view_layer.update()
    obj.matrix_parent_inverse = parent.matrix_world.inverted()
    obj.matrix_world = world
    bpy.context.view_layer.update()


def make_handle(bpy, collection, item, position, camera):
    handle = bpy.data.objects.new(item["name"], None)
    collection.objects.link(handle)
    handle.empty_display_type = "CIRCLE"
    handle.empty_display_size = item["size"]
    handle.color = item["color"]
    handle.show_name = True
    handle.show_in_front = True
    handle.location = position
    handle.rotation_euler = camera.rotation_euler
    handle["poseEditorRole"] = item["label"]
    return handle


def make_label(bpy, collection, camera, text, position, size):
    curve = bpy.data.curves.new(f"LABEL_{text[:18]}", "FONT")
    curve.body = text
    curve.align_x = "CENTER"
    curve.size = size
    curve.extrude = 0.002
    label = bpy.data.objects.new(f"LABEL_{text[:18]}", curve)
    collection.objects.link(label)
    label.location = position
    label.rotation_euler = (camera.location - position).to_track_quat("Z", "Y").to_euler()
    label.hide_render = True
    label.show_in_front = True
    return label


def configure_limb_ik(bpy, bone, item, handle, config):
    constraint = bone.constraints.new("IK")
    constraint.name = f"{item['name']}_IK"
    constraint.target = handle
    constraint.pole_target = None
    constraint.chain_count = item["chainCount"]
    constraint.iterations = config["pose"]["ikIterations"]
    constraint.use_stretch = False
    constraint.use_tail = True
    constraint.use_rotation = False
    constraint.influence = 1.0


def add_controls(bpy, scene, rig, camera, config):
    from mathutils import Vector

    controls = bpy.data.collections.new("SUPERHERO_POSE_CONTROLS")
    scene.collection.children.link(controls)
    axes = camera_axes(camera)
    pelvis = rig.matrix_world @ rig.pose.bones["pelvis"].tail
    body_spec = config["pose"]["bodyControl"]
    body = make_handle(bpy, controls, body_spec, pelvis, camera)
    body.empty_display_type = "CIRCLE"
    body["usage"] = "Select this orange ring in Object Mode, then use R to rotate the entire silhouette. G moves it."
    parent_keep_world(bpy, rig, body)
    body_label = make_label(
        bpy, controls, camera, body_spec["label"],
        offset_point(pelvis, axes, body_spec["labelOffset"]), config["pose"]["labelSize"],
    )
    parent_keep_world(bpy, body_label, body)
    limb_positions = {
        item["bone"]: rig.matrix_world @ rig.pose.bones[item["bone"]].tail
        for item in config["pose"]["limbControls"]
    }
    for item in config["pose"]["limbControls"]:
        bone = rig.pose.bones.get(item["bone"])
        if bone is None:
            raise RuntimeError(f"Missing limb bone: {item['bone']}")
        position = limb_positions[item["bone"]]
        handle = make_handle(bpy, controls, item, position, camera)
        parent_keep_world(bpy, handle, body)
        configure_limb_ik(bpy, bone, item, handle, config)
        handle["usage"] = f"Select in Object Mode, then G to move the {item['bone']} chain."
        label = make_label(
            bpy, controls, camera, item["label"],
            offset_point(position, axes, item["labelOffset"]), config["pose"]["labelSize"],
        )
        parent_keep_world(bpy, label, body)
    for item in config["pose"]["bodyLabels"]:
        bone = rig.pose.bones.get(item["bone"])
        if bone is None:
            raise RuntimeError(f"Missing body bone: {item['bone']}")
        point = rig.matrix_world @ bone.tail
        label = make_label(bpy, controls, camera, item["label"], offset_point(point, axes, item["offset"]), config["pose"]["labelSize"])
        parent_keep_world(bpy, label, body)
    instruction = make_label(
        bpy, controls, camera, config["pose"]["instructionLabel"],
        offset_point(pelvis, axes, config["pose"]["instructionOffset"]), config["pose"]["labelSize"],
    )
    parent_keep_world(bpy, instruction, body)
    for bone in rig.data.bones:
        bone.hide = bone.name not in config["pose"]["visibleBodyBones"]
    for name in ("IK_Hand_R", "IK_Hand_L"):
        target = bpy.data.objects.get(name)
        if target:
            target.hide_set(True)
            target.hide_render = True
    rig.show_in_front = True
    rig["poseEditorMode"] = "Object Mode: rings; Pose Mode: only pelvis, chest, and head"
    return body


def configure_viewports(bpy, scene, camera, active):
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == "VIEW_3D":
                space = area.spaces.active
                space.region_3d.view_perspective = "CAMERA"
                space.shading.type = "MATERIAL"
                space.overlay.show_relationship_lines = False
    bpy.ops.object.select_all(action="DESELECT")
    active.select_set(True)
    bpy.context.view_layer.objects.active = active
    scene.camera = camera


def render_preview(bpy, scene, config, root):
    scene.render.resolution_x = config["preview"]["sizePx"]
    scene.render.resolution_y = config["preview"]["sizePx"]
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = config["preview"]["transparent"]
    scene.render.filepath = str(root / config["output"]["preview"])
    bpy.ops.render.render(write_still=True)


def write_readme(root):
    text = """# Superman pose editor v1\n\nReview-only Blender pose workbook. It is not loaded by the game runtime.\n\n1. Open the file in **Object Mode**.\n2. Select a coloured ring and press **G** to move a whole arm or leg.\n3. Select the orange **BODY TILT** ring and press **R** to make the whole body fly.\n4. Switch to **Pose Mode** only for the three visible bones: hips, chest, and head.\n5. Use **Save As** to keep a pose variant. Reopen the original file to reset.\n\nThe file begins as a frozen upright idle pose. A later approved pose can be baked into flight frames; no gameplay asset or collider changes here.\n"""
    (root / "readme.md").write_text(text, encoding="utf-8")


def build():
    import bpy

    config = load_config()
    root = review_root(config)
    root.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    rig = bpy.data.objects.get(config["source"]["rig"])
    camera = bpy.data.objects.get(config["source"]["camera"])
    if rig is None or rig.type != "ARMATURE" or camera is None:
        raise RuntimeError("Approved Survivor pose-editor rig or camera is missing")
    action = capture_static_idle(bpy, scene, rig, config)
    active = add_controls(bpy, scene, rig, camera, config)
    scene["supermanPoseEditor"] = config["version"]
    scene["productionChanged"] = False
    configure_viewports(bpy, scene, camera, active)
    render_preview(bpy, scene, config, root)
    manifest = {
        "version": config["version"],
        "productionChanged": False,
        "source": config["source"],
        "action": action.name,
        "controls": [config["pose"]["bodyControl"]["name"]] + [item["name"] for item in config["pose"]["limbControls"]],
        "policy": "review-only pose editing; never game-loaded without explicit approval",
    }
    (root / config["output"]["manifest"]).write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    write_readme(root)
    bpy.ops.wm.save_as_mainfile(filepath=str(root / config["output"]["blend"]), copy=True)
    print(f"SUPERMAN_POSE_EDITOR_OK root={root} action={action.name}")


if __name__ == "__main__":
    build()
