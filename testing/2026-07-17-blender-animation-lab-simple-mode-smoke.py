"""Smoke-test the beginner-safe controls in the Blender animation lab."""

from __future__ import annotations

import sys
from pathlib import Path

import bpy
from mathutils import Euler


ROOT = Path(__file__).resolve().parents[1]
ADDON_ROOT = ROOT / "testing" / "blender-animation-lab-v1" / "addon"
BONE_GUIDE_MODULE = ADDON_ROOT / "dig_game_animation_lab" / "bone_labels.py"


def require(result, label: str) -> None:
    if "FINISHED" not in result:
        raise RuntimeError(f"{label} failed: {result}")


def find_clip_index(state, clip_id: str) -> int:
    """Find one catalog animation by its stable runtime id."""
    for index, clip in enumerate(state.clips):
        if clip.clip_id == clip_id:
            return index
    raise RuntimeError(f"Animation catalog is missing {clip_id}")


def assert_animation_browser(lab, state) -> None:
    """Every catalog animation must be reachable through one readable browser group."""
    groups = lab.animation_browser.grouped_clip_indices(state)
    grouped_indices = [index for _label, indices in groups for index in indices]
    expected_indices = list(range(len(state.clips)))
    if sorted(grouped_indices) != expected_indices:
        raise RuntimeError("Animation browser did not expose every catalog animation exactly once")
    if len(grouped_indices) != len(set(grouped_indices)):
        raise RuntimeError("Animation browser placed an animation in more than one group")


def assert_named_bone_guide(lab, state) -> None:
    """Verify values-owned semantic labels only when the guide module is present."""
    if not BONE_GUIDE_MODULE.is_file():
        return
    from dig_game_animation_lab import bone_labels

    entries = bone_labels.semantic_bone_entries()
    if not entries or not {"hips", "right-hand"}.issubset({entry["id"] for entry in entries}):
        raise RuntimeError("Named bone guide is missing the major beginner controls")
    if state.active_rig.data.show_names:
        raise RuntimeError("Beginner view must hide raw technical bone names by default")
    require(bpy.ops.dgal.refresh_bone_labels(), "show named bone guides")
    expected_ids = {
        entry["id"]
        for entry in entries
        if bone_labels.resolve_semantic_pose_bone(state.active_rig, entry["id"])
    }
    actual_ids = {
        str(obj.get("dgal_semantic_id"))
        for obj in bpy.data.objects
        if obj.get("dgal_role") == "bone-label"
    }
    if actual_ids != expected_ids:
        raise RuntimeError("Named bone guide labels do not match the selectable semantic joints")
    if state.active_rig.data.show_names:
        raise RuntimeError("Showing semantic labels must not reveal raw technical bone names")
    require(bpy.ops.dgal.select_named_bone(semantic_id="hips"), "select named hips")
    active = state.active_rig.data.bones.active
    if not active or active.name != "pelvis":
        raise RuntimeError("Named hips control did not select the canonical pelvis bone")
    require(bpy.ops.dgal.select_named_bone(semantic_id="right-hand"), "select named right hand")
    active = state.active_rig.data.bones.active
    if not active or active.name != "hand_r":
        raise RuntimeError("Named right-hand control did not select the canonical hand_r bone")


def assert_whole_arm_tween(lab, state, clip) -> None:
    """Prove an explicit right-arm endpoint pair produces one baked pose per frame."""
    rig = state.active_rig
    state.arm_tween_side = "RIGHT"
    state.arm_tween_start = clip.frame_start
    state.arm_tween_end = min(clip.frame_end, clip.frame_start + 6)
    require(bpy.ops.dgal.arm_tween_edit_pose(endpoint="START"), "open arm start pose")
    bones = lab.arm_tween_ops.arm_bones(rig, state.arm_tween_side)
    if len(bones) != 4 or not all(bone.select for bone in bones):
        raise RuntimeError("Whole-arm start pose did not select shoulder through hand")
    require(bpy.ops.dgal.arm_tween_save_pose(endpoint="START"), "save arm start pose")

    require(bpy.ops.dgal.arm_tween_edit_pose(endpoint="END"), "open arm end pose")
    upper_arm = rig.pose.bones["upperarm_r"]
    if upper_arm.rotation_mode == "QUATERNION":
        upper_arm.rotation_quaternion.rotate(Euler((0.0, 0.0, 0.15)))
    elif upper_arm.rotation_mode == "AXIS_ANGLE":
        upper_arm.rotation_axis_angle[0] += 0.15
    else:
        upper_arm.rotation_euler.rotate(Euler((0.0, 0.0, 0.15)))
    require(bpy.ops.dgal.arm_tween_save_pose(endpoint="END"), "save arm end pose")
    require(bpy.ops.dgal.arm_tween_generate(), "generate arm in-between frames")

    first, last = state.arm_tween_start, state.arm_tween_end
    action = rig.animation_data.action
    if not action.get("dgal_arm_tween_baked") or list(action.get("dgal_arm_tween_range", [])) != [first, last]:
        raise RuntimeError("Whole-arm tween did not record its isolated baked range")
    expected_frames = set(range(first, last + 1))
    curves = lab.arm_tween_ops._arm_curves(rig, action, bones)
    if not curves or any(
        {round(point.co.x) for point in curve.keyframe_points if first <= point.co.x <= last} != expected_frames
        for curve in curves
    ):
        raise RuntimeError("Whole-arm tween did not create a key at every requested frame")


def main() -> None:
    if str(ADDON_ROOT) not in sys.path:
        sys.path.insert(0, str(ADDON_ROOT))
    import dig_game_animation_lab as lab

    if hasattr(bpy.types.Scene, "dgal"):
        lab.unregister()
    lab.register()
    try:
        state = bpy.context.scene.dgal
        lab.session_ops.initialize_contract_state(state)
        lab.session_ops.refresh_catalog(state)
        if not state.clips:
            raise RuntimeError("Simple Mode has no animation catalog")
        if state.show_advanced:
            raise RuntimeError("Simple Mode must hide advanced panels by default")
        if state.simple_character != "SURVIVAL":
            raise RuntimeError("Simple Mode must begin on the Survival character")
        if state.clips[state.clip_index].clip_id != "idle":
            raise RuntimeError("Simple Mode must select Idle instead of catalog order on launch")

        assert_animation_browser(lab, state)
        punch_index = find_clip_index(state, "punch-jab")
        require(bpy.ops.dgal.browser_choose_clip(clip_index=punch_index), "load punch jab animation")
        punch = state.clips[state.clip_index]
        if punch.clip_id != "punch-jab" or bpy.context.scene.frame_current != punch.frame_start:
            raise RuntimeError("Animation browser did not load the selected non-idle animation independently")
        if bpy.context.scene.frame_start != punch.frame_start or bpy.context.scene.frame_end != punch.frame_end:
            raise RuntimeError("Animation browser did not set the selected clip preview range")
        require(bpy.ops.dgal.simple_select_pose(role="START"), "select start pose")
        require(bpy.ops.dgal.simple_select_joint(bone_name="hand_r"), "select right hand")
        if not state.active_rig.pose.bones["hand_r"].select:
            raise RuntimeError("Simple right-hand selection did not select the canonical pose bone")
        assert_named_bone_guide(lab, state)
        assert_whole_arm_tween(lab, state, punch)
        require(bpy.ops.dgal.simple_save_pose(), "save pose and smooth tween")
        require(bpy.ops.dgal.simple_hitbox(action="UPDATE"), "update body hitbox")
        require(bpy.ops.dgal.simple_set_character(choice="SURVIVAL"), "show Survival character")
        require(bpy.ops.dgal.simple_set_character(choice="MESHY"), "show Meshy character")
        if state.simple_character != "MESHY":
            raise RuntimeError("Simple Mode did not activate the Meshy character")
        require(bpy.ops.dgal.simple_set_character(choice="SURVIVAL"), "return to Survival character")
        require(bpy.ops.dgal.simple_toggle_prop(group="pickaxe"), "create pickaxe preview")
        require(bpy.ops.dgal.simple_toggle_prop(group="gear"), "create gear preview")
        if not any(obj.get("dgal_attachment_group") == "pickaxe" for obj in bpy.data.objects):
            raise RuntimeError("Simple Mode did not create its pickaxe preview")
        if not any(obj.get("dgal_attachment_group") == "gear" for obj in bpy.data.objects):
            raise RuntimeError("Simple Mode did not create its gear preview")

        if lab.ui.DGAL_PT_session.poll(bpy.context):
            raise RuntimeError("Advanced panel leaked into Simple Mode")
        state.show_advanced = True
        if not lab.ui.DGAL_PT_session.poll(bpy.context):
            raise RuntimeError("Advanced switch did not reveal technical panels")
        print("BLENDER_ANIMATION_LAB_SIMPLE_MODE_SMOKE_OK")
    finally:
        lab.unregister()


if __name__ == "__main__":
    main()
