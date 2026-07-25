"""Blender property groups for one isolated animation-lab session."""

from __future__ import annotations

import json

import bpy
from bpy.props import (
    BoolProperty,
    CollectionProperty,
    EnumProperty,
    FloatProperty,
    IntProperty,
    PointerProperty,
    StringProperty,
)
from bpy.types import PropertyGroup

from .paths import (
    DEFAULT_CONFIG,
    DEFAULT_REVIEW_ROOT,
    DEFAULT_RUNTIME_MANIFEST,
    DEFAULT_SOURCE_FBX_ROOT,
    LAB_ROOT,
    REPO_ROOT,
)


SIMPLE_UI = json.loads(DEFAULT_CONFIG.read_text(encoding="utf-8"))["simpleUi"]
ARM_TWEEN = json.loads(DEFAULT_CONFIG.read_text(encoding="utf-8"))["armTween"]
SIMPLE_CHARACTER_ITEMS = tuple(
    (item["id"], item["label"], item["description"])
    for item in SIMPLE_UI["characters"]
)
ARM_TWEEN_SIDE_ITEMS = tuple(
    (item["id"], item["label"], item["description"])
    for item in ARM_TWEEN["chains"]
)


class DGALClipItem(PropertyGroup):
    clip_id: StringProperty(name="Action id")
    source_clip: StringProperty(name="Source clip")
    source_path: StringProperty(name="FBX")
    frame_start: IntProperty(name="Start", default=1)
    frame_end: IntProperty(name="End", default=2)
    loop: BoolProperty(name="Loop")
    loaded: BoolProperty(name="Loaded")
    status: StringProperty(name="Status", default="Not loaded")


class DGALHitboxItem(PropertyGroup):
    label: StringProperty(name="Label", default="Body")
    kind: EnumProperty(
        name="Kind",
        items=(
            ("BODY", "Body", "Stable movement body"),
            ("CONTACT", "Contact", "Directional action contact"),
            ("TOOL", "Tool", "Tool-head reach volume"),
        ),
        default="BODY",
    )
    width_game_px: FloatProperty(name="Width px", default=31.0, min=1.0, max=300.0)
    height_game_px: FloatProperty(name="Height px", default=75.0, min=1.0, max=300.0)
    offset_x_game_px: FloatProperty(name="Offset X", default=0.0, min=-300.0, max=300.0)
    offset_y_game_px: FloatProperty(name="Offset Y", default=0.0, min=-300.0, max=300.0)
    frame_start: IntProperty(name="First frame", default=1)
    frame_end: IntProperty(name="Last frame", default=1)
    anchor_bone: StringProperty(name="Anchor bone", default="pelvis")
    guide_object: PointerProperty(name="Guide", type=bpy.types.Object)


class DGALSceneState(PropertyGroup):
    show_advanced: BoolProperty(
        name="Show advanced tools",
        description="Show the full technical animation-lab controls",
        default=bool(SIMPLE_UI["showAdvanced"]),
    )
    simple_character: EnumProperty(
        name="Character",
        description="Character shown by the beginner workspace",
        items=SIMPLE_CHARACTER_ITEMS,
        default=str(SIMPLE_UI["defaultCharacter"]),
    )
    simple_hitbox_visible: BoolProperty(
        name="Show player hitbox",
        default=bool(SIMPLE_UI["defaultHitboxVisible"]),
    )
    simple_pickaxe_visible: BoolProperty(
        name="Show pickaxe",
        default=bool(SIMPLE_UI["defaultPickaxeVisible"]),
    )
    simple_gear_visible: BoolProperty(
        name="Show gear",
        default=bool(SIMPLE_UI["defaultGearVisible"]),
    )
    simple_status: StringProperty(
        name="Status",
        default=str(SIMPLE_UI["startMessage"]),
    )
    session_name: StringProperty(name="Session", default="")
    repo_root: StringProperty(name="Repository", subtype="DIR_PATH", default=str(REPO_ROOT))
    source_fbx_directory: StringProperty(
        name="Retargeted FBX directory", subtype="DIR_PATH", default=str(DEFAULT_SOURCE_FBX_ROOT)
    )
    runtime_manifest_path: StringProperty(
        name="Runtime manifest", subtype="FILE_PATH", default=str(DEFAULT_RUNTIME_MANIFEST)
    )
    review_output_root: StringProperty(
        name="Review drafts", subtype="DIR_PATH", default=str(DEFAULT_REVIEW_ROOT)
    )
    clips: CollectionProperty(type=DGALClipItem)
    clip_index: IntProperty(default=0)
    active_rig: PointerProperty(name="Editable rig", type=bpy.types.Object)
    reference_mesh: PointerProperty(name="Reference mesh", type=bpy.types.Object)
    active_action_source: StringProperty(name="Source action")
    pose_scope: EnumProperty(
        name="Bones",
        items=(("SELECTED", "Selected", "Key selected pose bones"), ("ALL", "All", "Key every pose bone")),
        default="SELECTED",
    )
    pose_role: EnumProperty(
        name="Key role",
        items=(
            ("START", "Start", "Opening pose"),
            ("ANTICIPATION", "Anticipation", "Wind-up pose"),
            ("CONTACT", "Contact", "Impact/contact pose"),
            ("RECOVERY", "Recovery", "Recovery pose"),
            ("END", "End", "Closing pose"),
        ),
        default="START",
    )
    frame_start: IntProperty(name="Start", default=1, min=-100000, max=100000)
    frame_anticipation: IntProperty(name="Anticipation", default=6, min=-100000, max=100000)
    frame_contact: IntProperty(name="Contact", default=12, min=-100000, max=100000)
    frame_recovery: IntProperty(name="Recovery", default=18, min=-100000, max=100000)
    frame_end: IntProperty(name="End", default=24, min=-100000, max=100000)
    interpolation: EnumProperty(
        name="Interpolation",
        items=(("BEZIER", "Bezier", "Smooth authored transition"), ("LINEAR", "Linear", "Constant rate"), ("CONSTANT", "Constant", "Stepped pose")),
        default="BEZIER",
    )
    arm_tween_side: EnumProperty(
        name=str(ARM_TWEEN["labels"]["side"]),
        description="Choose the full arm chain to pose and generate",
        items=ARM_TWEEN_SIDE_ITEMS,
        default=str(ARM_TWEEN["defaultSide"]),
    )
    arm_tween_start: IntProperty(
        name=str(ARM_TWEEN["labels"]["start"]),
        default=int(ARM_TWEEN["defaultStartFrame"]),
        min=-100000,
        max=100000,
    )
    arm_tween_end: IntProperty(
        name=str(ARM_TWEEN["labels"]["end"]),
        default=int(ARM_TWEEN["defaultEndFrame"]),
        min=-100000,
        max=100000,
    )
    arm_tween_start_keyed_at: IntProperty(
        name="Arm start saved at",
        default=int(ARM_TWEEN["unsetFrame"]),
        min=-100000,
        max=100000,
    )
    arm_tween_end_keyed_at: IntProperty(
        name="Arm end saved at",
        default=int(ARM_TWEEN["unsetFrame"]),
        min=-100000,
        max=100000,
    )
    hitboxes: CollectionProperty(type=DGALHitboxItem)
    hitbox_index: IntProperty(default=0)
    tile_size_game_px: FloatProperty(name="Tile px", default=94.0, min=1.0)
    packed_frame_size_px: FloatProperty(name="Packed frame px", default=256.0, min=1.0)
    source_render_size_px: FloatProperty(name="Source render px", default=512.0, min=1.0)
    source_crop_window_px: FloatProperty(name="Crop window px", default=448.0, min=1.0)
    display_size_game_px: FloatProperty(name="Display px", default=109.0, min=1.0)
    target_visible_height_tiles: FloatProperty(name="Visible height tiles", default=0.8, min=0.1, max=4.0)
    tile_grid_radius: IntProperty(name="Grid radius", default=2, min=1, max=12)
    hitbox_sample_step: IntProperty(name="Audit frame step", default=2, min=1, max=30)
    prop_path: StringProperty(name="Prop file", subtype="FILE_PATH")
    prop_object: PointerProperty(name="Prop", type=bpy.types.Object)
    attachment_bone: StringProperty(name="Attach bone", default="hand_r")
    offhand_bone: StringProperty(name="Off-hand bone", default="hand_l")
    offhand_chain_count: IntProperty(name="IK chain", default=3, min=1, max=8)
    attachment_report: StringProperty(name="Attachment report", default="Not validated")
    mesh_candidate_path: StringProperty(
        name="Mesh candidate",
        subtype="FILE_PATH",
        default=str(LAB_ROOT / "source-assets" / "meshy-warrior-demo-blender.glb"),
    )
    candidate_root: PointerProperty(name="Candidate root", type=bpy.types.Object)
    candidate_mesh: PointerProperty(name="Candidate mesh", type=bpy.types.Object)
    mesh_fit_mode: EnumProperty(
        name="Fit mode",
        items=(
            ("WEIGHT_TRANSFER", "Weight transfer", "Transfer reference vertex-group weights"),
            ("SURFACE_DEFORM", "Surface deform", "Bind candidate to reference surface"),
            ("AUTO_WEIGHTS", "Automatic weights", "Blender automatic armature weights"),
            ("RIG_RETARGET", "Mapped rig retarget", "Drive the candidate's native weighted rig from the Survival bone map"),
        ),
        default="RIG_RETARGET",
    )
    mesh_audit_report: StringProperty(name="Mesh audit", default="No candidate audited")
    render_resolution: IntProperty(name="Review resolution", default=512, min=64, max=4096)
    render_frame_step: IntProperty(name="Frame step", default=1, min=1, max=30)
    last_review_path: StringProperty(name="Last review path")


CLASSES = (DGALClipItem, DGALHitboxItem, DGALSceneState)
