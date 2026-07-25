"""Render and export review-only session evidence."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import bpy
from bpy.types import Operator

from .collections import COLLECTION_NAMES
from .paths import ensure_session_output_root, resolve_path, session_output_root
from .pose_ops import active_rig


def _configure_render(scene, state):
    previous = {
        "x": scene.render.resolution_x,
        "y": scene.render.resolution_y,
        "percentage": scene.render.resolution_percentage,
        "format": scene.render.image_settings.file_format,
        "color": scene.render.image_settings.color_mode,
        "transparent": scene.render.film_transparent,
        "filepath": scene.render.filepath,
    }
    scene.render.resolution_x = state.render_resolution
    scene.render.resolution_y = state.render_resolution
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    return previous


def _restore_render(scene, previous):
    scene.render.resolution_x = previous["x"]
    scene.render.resolution_y = previous["y"]
    scene.render.resolution_percentage = previous["percentage"]
    scene.render.image_settings.file_format = previous["format"]
    scene.render.image_settings.color_mode = previous["color"]
    scene.render.film_transparent = previous["transparent"]
    scene.render.filepath = previous["filepath"]


def _action_label(rig):
    action = rig.animation_data.action if rig and rig.animation_data else None
    return action.name if action else "no-action"


def _safe_token(value: str):
    return "".join(character if character.isalnum() or character in "-_" else "-" for character in value)


def _render_output(state, rig) -> Path:
    render_root = ensure_session_output_root(state) / "renders"
    output = render_root / _safe_token(_action_label(rig))
    output.mkdir(parents=True, exist_ok=True)
    for folder, title in ((render_root, "Review renders"), (output, "Action review frames")):
        readme = folder / "readme.md"
        if not readme.exists():
            readme.write_text(
                f"# {title}\n\nGenerated Blender animation-lab evidence; not loaded by game runtime.\n",
                encoding="utf-8",
            )
    return output


def _sha256(path: Path):
    if not path.is_file():
        return None
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _hitboxes(state):
    return [
        {
            "label": item.label,
            "kind": item.kind,
            "sizeGamePx": [item.width_game_px, item.height_game_px],
            "offsetGamePx": [item.offset_x_game_px, item.offset_y_game_px],
            "frameRange": [item.frame_start, item.frame_end],
            "anchorBone": item.anchor_bone,
        }
        for item in state.hitboxes
    ]


def _source_records(state):
    candidates = {
        "runtimeManifest": resolve_path(state.runtime_manifest_path, state.repo_root),
        "prop": resolve_path(state.prop_path, state.repo_root) if state.prop_path else None,
        "meshCandidate": resolve_path(state.mesh_candidate_path, state.repo_root) if state.mesh_candidate_path else None,
    }
    if state.clips:
        candidates["selectedClip"] = Path(state.clips[state.clip_index].source_path)
    return {
        name: {"path": str(path), "sha256": _sha256(path)}
        for name, path in candidates.items()
        if path is not None
    }


class DGAL_OT_validate_session(Operator):
    bl_idname = "dgal.validate_session"
    bl_label = "Validate lab session"
    bl_options = {"REGISTER"}

    def execute(self, context):
        scene, state = context.scene, context.scene.dgal
        errors = []
        missing = [name for name in COLLECTION_NAMES if bpy.data.collections.get(name) is None]
        if missing:
            errors.append(f"missing collections {missing}")
        rig = active_rig(context)
        if not rig:
            errors.append("no editable rig")
        elif not rig.animation_data or not rig.animation_data.action:
            errors.append("rig has no action")
        elif not rig.animation_data.action.name.startswith("DGAL_"):
            errors.append("active action is not a lab duplicate")
        if not scene.camera or scene.camera.data.type != "ORTHO":
            errors.append("fixed orthographic camera missing")
        try:
            session_output_root(state)
        except ValueError as error:
            errors.append(str(error))
        if scene.get("productionChanged") is not False:
            errors.append("scene productionChanged flag drifted")
        if errors:
            self.report({"ERROR"}, "; ".join(errors))
            return {"CANCELLED"}
        self.report({"INFO"}, f"Session valid: {len(state.clips)} catalog actions, {len(state.hitboxes)} hitboxes")
        return {"FINISHED"}


class DGAL_OT_render_current_review(Operator):
    bl_idname = "dgal.render_current_review"
    bl_label = "Render current review frame"
    bl_options = {"REGISTER"}

    def execute(self, context):
        scene, state, rig = context.scene, context.scene.dgal, active_rig(context)
        if not scene.camera:
            self.report({"ERROR"}, "Assign a review camera")
            return {"CANCELLED"}
        output = _render_output(state, rig)
        path = output / f"frame-{scene.frame_current:04d}.png"
        previous = _configure_render(scene, state)
        try:
            scene.render.filepath = str(path)
            bpy.ops.render.render(write_still=True)
        except RuntimeError as error:
            self.report({"ERROR"}, f"Render failed: {error}")
            return {"CANCELLED"}
        finally:
            _restore_render(scene, previous)
        state.last_review_path = str(path)
        self.report({"INFO"}, f"Rendered {path.name}")
        return {"FINISHED"}


class DGAL_OT_render_sequence_review(Operator):
    bl_idname = "dgal.render_sequence_review"
    bl_label = "Render review sequence"
    bl_description = "Render the configured range into the isolated session folder"
    bl_options = {"REGISTER"}

    def execute(self, context):
        scene, state, rig = context.scene, context.scene.dgal, active_rig(context)
        if not scene.camera:
            self.report({"ERROR"}, "Assign a review camera")
            return {"CANCELLED"}
        first, last = sorted((state.frame_start, state.frame_end))
        frames = list(range(first, last + 1, state.render_frame_step))
        if not frames or frames[-1] != last:
            frames.append(last)
        output = _render_output(state, rig)
        previous_render = _configure_render(scene, state)
        previous_frame = scene.frame_current
        try:
            for frame in frames:
                scene.frame_set(frame)
                scene.render.filepath = str(output / f"frame-{frame:04d}.png")
                bpy.ops.render.render(write_still=True)
        except RuntimeError as error:
            self.report({"ERROR"}, f"Sequence failed: {error}")
            return {"CANCELLED"}
        finally:
            scene.frame_set(previous_frame)
            _restore_render(scene, previous_render)
        state.last_review_path = str(output)
        self.report({"INFO"}, f"Rendered {len(frames)} review frames")
        return {"FINISHED"}


class DGAL_OT_export_review_bundle(Operator):
    bl_idname = "dgal.export_review_bundle"
    bl_label = "Export review bundle"
    bl_description = "Write manifest and a Blender copy under review-drafts only"
    bl_options = {"REGISTER"}

    def execute(self, context):
        scene, state, rig = context.scene, context.scene.dgal, active_rig(context)
        output = ensure_session_output_root(state)
        action = rig.animation_data.action if rig and rig.animation_data else None
        payload = {
            "schema": "dig-game-blender-animation-lab-review-v1",
            "createdUtc": datetime.now(timezone.utc).isoformat(),
            "session": state.session_name,
            "productionChanged": False,
            "blenderVersion": bpy.app.version_string,
            "action": {
                "name": action.name if action else None,
                "source": state.active_action_source or None,
                "frameRange": [state.frame_start, state.frame_end],
                "interpolation": state.interpolation,
            },
            "gamePresentation": {
                "tileSizePx": state.tile_size_game_px,
                "packedFramePx": state.packed_frame_size_px,
                "displaySizePx": state.display_size_game_px,
                "targetVisibleHeightTiles": state.target_visible_height_tiles,
            },
            "hitboxes": _hitboxes(state),
            "attachmentReport": state.attachment_report,
            "meshAudit": state.mesh_audit_report,
            "meshFitMode": state.mesh_fit_mode if state.candidate_root else None,
            "sources": _source_records(state),
        }
        manifest = output / "review-manifest.json"
        blend = output / "blender-animation-lab.blend"
        try:
            manifest.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
            bpy.ops.wm.save_as_mainfile(filepath=str(blend), copy=True)
        except (OSError, RuntimeError) as error:
            self.report({"ERROR"}, str(error))
            return {"CANCELLED"}
        state.last_review_path = str(manifest)
        self.report({"INFO"}, f"Exported review bundle: {output}")
        return {"FINISHED"}


CLASSES = (
    DGAL_OT_validate_session,
    DGAL_OT_render_current_review,
    DGAL_OT_render_sequence_review,
    DGAL_OT_export_review_bundle,
)
