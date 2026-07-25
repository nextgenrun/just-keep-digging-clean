"""Create isolated sessions and import the approved animation carriers."""

from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path

import bpy
from bpy.types import Operator

from .action_api import assign_action, ensure_lab_action
from .collections import ensure_lab_collections, move_object, tag_object
from .paths import DEFAULT_CONFIG, ensure_session_output_root, resolve_path
from .stage import ensure_review_stage


def _source_filename(source_clip: str) -> str:
    token = re.sub(r"[^a-z0-9]+", "-", source_clip.lower()).strip("-")
    return f"survival-ual-{token}.fbx"


def _baseline_action(action_id: str):
    for action in bpy.data.actions:
        if not bool(action.get("dgal_managed")) or bool(action.get("dgal_editable")):
            continue
        try:
            runtime_actions = json.loads(str(action.get("dgal_runtime_actions", "[]")))
        except json.JSONDecodeError:
            runtime_actions = []
        if action_id in runtime_actions:
            return action
    return None


def initialize_contract_state(state) -> None:
    """Load scale and hitbox defaults from the values-owned lab contract."""
    config = json.loads(DEFAULT_CONFIG.read_text(encoding="utf-8"))
    render = config["renderContract"]
    state.tile_size_game_px = float(render["tileSizePx"])
    state.display_size_game_px = float(render["displaySizePx"])
    state.packed_frame_size_px = float(render["packedFrameSizePx"])
    state.source_render_size_px = float(render["sourceRenderSizePx"])
    state.source_crop_window_px = float(render["sourceWindowPx"])
    state.target_visible_height_tiles = float(render["targetVisibleHeightTiles"])
    if state.hitboxes:
        return
    hitbox = config["hitboxContract"]
    tile = state.tile_size_game_px
    body = hitbox["playerBodyPx"]
    entries = [
        ("Player body", "BODY", body["width"], body["height"], "pelvis"),
        ("Side contact", "CONTACT", hitbox["contactsTiles"]["side"]["width"] * tile,
         hitbox["contactsTiles"]["side"]["height"] * tile, "hand_r"),
        ("Vertical contact", "CONTACT", hitbox["contactsTiles"]["vertical"]["width"] * tile,
         hitbox["contactsTiles"]["vertical"]["height"] * tile, "hand_r"),
        ("Diagonal contact", "CONTACT", hitbox["contactsTiles"]["diagonal"]["width"] * tile,
         hitbox["contactsTiles"]["diagonal"]["height"] * tile, "hand_r"),
    ]
    for label, kind, width, height, anchor in entries:
        item = state.hitboxes.add()
        item.label, item.kind = label, kind
        item.width_game_px, item.height_game_px = float(width), float(height)
        item.frame_start, item.frame_end = state.frame_start, state.frame_end
        item.anchor_bone = anchor


def refresh_catalog(state) -> int:
    manifest_path = resolve_path(state.runtime_manifest_path, state.repo_root)
    source_root = resolve_path(state.source_fbx_directory, state.repo_root)
    state.clips.clear()
    if manifest_path.is_file():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        for action_id, metadata in manifest.get("actions", {}).items():
            source_clip = str(metadata.get("source_clip", action_id))
            item = state.clips.add()
            item.clip_id = str(action_id)
            item.source_clip = source_clip
            item.source_path = str(source_root / _source_filename(source_clip))
            item.frame_start = 1
            item.frame_end = max(2, int(metadata.get("frame_count", 2)))
            item.loop = bool(metadata.get("loop"))
            if _baseline_action(item.clip_id):
                item.status = "Master ready"
                item.loaded = True
            else:
                item.status = "Ready" if Path(item.source_path).is_file() else "FBX missing"
    else:
        for path in sorted(source_root.glob("*.fbx")):
            item = state.clips.add()
            item.clip_id = path.stem.removeprefix("survival-ual-")
            item.source_clip = item.clip_id
            item.source_path = str(path)
            item.status = "Ready"
    active_action = state.active_rig.animation_data.action if (
        state.active_rig and state.active_rig.animation_data
    ) else None
    active_index = next(
        (index for index, item in enumerate(state.clips) if _baseline_action(item.clip_id) == active_action),
        None,
    )
    state.clip_index = active_index if active_index is not None else min(
        max(0, state.clip_index), max(0, len(state.clips) - 1)
    )
    return len(state.clips)


def _import_fbx(path: Path) -> list[bpy.types.Object]:
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.fbx(filepath=str(path), automatic_bone_orientation=False)
    return [obj for obj in bpy.context.scene.objects if obj not in before]


class DGAL_OT_create_session(Operator):
    bl_idname = "dgal.create_session"
    bl_label = "Create isolated session"
    bl_description = "Create lab collections and load the action catalog without touching production"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        state = context.scene.dgal
        if not state.session_name:
            state.session_name = datetime.now().strftime("%Y%m%d-%H%M%S")
        ensure_lab_collections()
        ensure_review_stage(context.scene)
        context.scene["dgal_contract"] = "review-only Blender animation lab"
        context.scene["productionChanged"] = False
        initialize_contract_state(state)
        master = bpy.data.objects.get("root")
        if master and master.type == "ARMATURE":
            state.active_rig = master
            state.reference_mesh = bpy.data.objects.get("Body3")
        count = refresh_catalog(state)
        self.report({"INFO"}, f"Created {state.session_name}; catalog has {count} actions")
        return {"FINISHED"}


class DGAL_OT_refresh_catalog(Operator):
    bl_idname = "dgal.refresh_catalog"
    bl_label = "Refresh action catalog"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        count = refresh_catalog(context.scene.dgal)
        self.report({"INFO"}, f"Loaded {count} action records")
        return {"FINISHED"}


class DGAL_OT_load_selected_clip(Operator):
    bl_idname = "dgal.load_selected_clip"
    bl_label = "Use selected action"
    bl_description = "Use the consolidated master action, or import a fallback carrier when unavailable"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        state = context.scene.dgal
        if not state.clips:
            self.report({"ERROR"}, "Refresh the catalog first")
            return {"CANCELLED"}
        item = state.clips[state.clip_index]
        baseline = _baseline_action(item.clip_id)
        master = bpy.data.objects.get("root")
        if baseline and master and master.type == "ARMATURE":
            assign_action(master, baseline)
            state.active_rig = master
            state.reference_mesh = bpy.data.objects.get("Body3")
            state.active_action_source = baseline.name
            item.loaded = True
            item.status = f"Using {baseline.name}"
            self._finish_activation(context, item, master)
            self.report({"INFO"}, f"Activated protected baseline {baseline.name}")
            return {"FINISHED"}
        path = Path(item.source_path)
        if not path.is_file():
            self.report({"ERROR"}, f"Missing FBX: {path}")
            return {"CANCELLED"}
        collections = ensure_lab_collections()
        imported = _import_fbx(path)
        for obj in imported:
            move_object(obj, collections["DGAL_EDITED"])
            tag_object(obj, "edited", state.session_name)
        rigs = [obj for obj in imported if obj.type == "ARMATURE"]
        meshes = [obj for obj in imported if obj.type == "MESH"]
        if not rigs:
            self.report({"ERROR"}, "Imported carrier contains no armature")
            return {"CANCELLED"}
        rig = rigs[0]
        source = rig.animation_data.action.name if rig.animation_data and rig.animation_data.action else "untitled"
        ensure_lab_action(rig, item.clip_id)
        state.active_rig = rig
        state.reference_mesh = meshes[0] if meshes else None
        state.active_action_source = source
        action = rig.animation_data.action
        item.loaded = True
        item.status = f"Loaded as {action.name}"
        self._finish_activation(context, item, rig)
        self.report({"INFO"}, f"Imported {item.clip_id} into the isolated session")
        return {"FINISHED"}

    @staticmethod
    def _finish_activation(context, item, rig):
        state = context.scene.dgal
        action = rig.animation_data.action
        item.frame_start = int(action.frame_range[0])
        item.frame_end = int(action.frame_range[1])
        state.frame_start, state.frame_end = item.frame_start, item.frame_end
        state.frame_anticipation = round(item.frame_start + (item.frame_end - item.frame_start) * 0.2)
        state.frame_contact = round(item.frame_start + (item.frame_end - item.frame_start) * 0.5)
        state.frame_recovery = round(item.frame_start + (item.frame_end - item.frame_start) * 0.78)
        state.arm_tween_start, state.arm_tween_end = item.frame_start, item.frame_end
        unset_frame = int(json.loads(DEFAULT_CONFIG.read_text(encoding="utf-8"))["armTween"]["unsetFrame"])
        state.arm_tween_start_keyed_at = unset_frame
        state.arm_tween_end_keyed_at = unset_frame
        context.scene.frame_start, context.scene.frame_end = item.frame_start, item.frame_end
        context.scene.frame_set(item.frame_start)
        context.view_layer.objects.active = rig
        rig.select_set(True)


class DGAL_OT_save_session_copy(Operator):
    bl_idname = "dgal.save_session_copy"
    bl_label = "Save lab copy"
    bl_description = "Save a copy below review-drafts without changing production source files"
    bl_options = {"REGISTER"}

    def execute(self, context):
        try:
            output = ensure_session_output_root(context.scene.dgal)
            path = output / "blender-animation-lab.blend"
            bpy.ops.wm.save_as_mainfile(filepath=str(path), copy=True)
            context.scene.dgal.last_review_path = str(path)
        except (OSError, ValueError, RuntimeError) as error:
            self.report({"ERROR"}, str(error))
            return {"CANCELLED"}
        self.report({"INFO"}, f"Saved isolated copy: {path}")
        return {"FINISHED"}


CLASSES = (
    DGAL_OT_create_session,
    DGAL_OT_refresh_catalog,
    DGAL_OT_load_selected_clip,
    DGAL_OT_save_session_copy,
)
