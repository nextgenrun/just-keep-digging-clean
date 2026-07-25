"""Browse, load, and preview the isolated animation catalog by readable groups."""

from __future__ import annotations

import json

import bpy
from bpy.props import IntProperty
from bpy.types import Operator

from .paths import DEFAULT_CONFIG
from .session_ops import refresh_catalog


# The values contract can override these with ``animationBrowser.categories``.
# These safe defaults keep older lab copies understandable until that optional
# presentation data is added to the values-owned contract.
_FALLBACK_CATEGORIES = (
    ("Standing & Movement", ("idle", "idle-talk", "walk", "run", "crouch")),
    ("Air & Travel", ("airborne", "falling", "fly", "climb", "landing")),
    ("Combat & Mining", ("punch-jab", "punch-cross", "ground-strike")),
    ("Abilities", ("wall-push", "teleport", "thunder-charge")),
    ("Reactions", ("hit-react", "death")),
)
_DEFAULT_UNCATEGORIZED_LABEL = "Other Animations"


def _friendly(value: str) -> str:
    return str(value).replace("_", " ").replace("-", " ").title()


def _browser_values() -> dict:
    """Read optional presentation labels without making the add-on depend on them."""
    try:
        data = json.loads(DEFAULT_CONFIG.read_text(encoding="utf-8"))
    except (OSError, ValueError, json.JSONDecodeError):
        return {}
    browser = data.get("animationBrowser", {})
    return browser if isinstance(browser, dict) else {}


def _category_definitions() -> tuple[tuple[str, tuple[str, ...]], ...]:
    """Use values-owned categories when present, otherwise provide safe defaults."""
    configured = _browser_values().get("categories", [])
    definitions = []
    if isinstance(configured, list):
        for entry in configured:
            if not isinstance(entry, dict):
                continue
            label = str(entry.get("label", "")).strip()
            actions = tuple(str(action) for action in entry.get("actions", []) if action)
            if label and actions:
                definitions.append((label, actions))
    return tuple(definitions) or _FALLBACK_CATEGORIES


def _uncategorized_label() -> str:
    value = _browser_values().get("uncategorizedLabel", _DEFAULT_UNCATEGORIZED_LABEL)
    return str(value).strip() or _DEFAULT_UNCATEGORIZED_LABEL


def _display_label(clip) -> str:
    labels = _browser_values().get("displayNames", {})
    if isinstance(labels, dict) and labels.get(clip.clip_id):
        return str(labels[clip.clip_id])
    return _friendly(clip.clip_id)


def grouped_clip_indices(state) -> tuple[tuple[str, tuple[int, ...]], ...]:
    """Return every catalog item exactly once in values-configured display groups."""
    remaining = set(range(len(state.clips)))
    groups = []
    for label, action_ids in _category_definitions():
        wanted = {action.casefold() for action in action_ids}
        indices = tuple(
            index for index, clip in enumerate(state.clips)
            if index in remaining and str(clip.clip_id).casefold() in wanted
        )
        if indices:
            groups.append((label, indices))
            remaining.difference_update(indices)
    if remaining:
        groups.append((_uncategorized_label(), tuple(sorted(remaining))))
    return tuple(groups)


def _selected_clip(state):
    if not state.clips or not 0 <= state.clip_index < len(state.clips):
        return None
    return state.clips[state.clip_index]


def _finished(result) -> bool:
    return "FINISHED" in result


class DGAL_OT_browser_refresh_catalog(Operator):
    bl_idname = "dgal.browser_refresh_catalog"
    bl_label = "Load Animation List"
    bl_description = "Read the safe animation catalog so every action can be previewed separately"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        state = context.scene.dgal
        count = refresh_catalog(state)
        state.simple_status = f"{count} animations ready to preview"
        self.report({"INFO"}, state.simple_status)
        return {"FINISHED"}


class DGAL_OT_browser_choose_clip(Operator):
    bl_idname = "dgal.browser_choose_clip"
    bl_label = "Load Animation"
    bl_description = "Load this one animation into the review rig and set its exact preview range"
    bl_options = {"REGISTER", "UNDO"}

    clip_index: IntProperty(name="Animation Index", min=0)

    def execute(self, context):
        state = context.scene.dgal
        if not state.clips:
            refresh_catalog(state)
        if not 0 <= self.clip_index < len(state.clips):
            self.report({"ERROR"}, "That animation is not in the current catalog")
            return {"CANCELLED"}
        state.clip_index = self.clip_index
        result = bpy.ops.dgal.load_selected_clip()
        if not _finished(result):
            return result
        if state.simple_character == "MESHY":
            # Re-bind the review-only candidate after the rig action changes.
            # This keeps the visual comparison attached to the newly selected
            # runtime motion without changing the production character.
            bpy.ops.dgal.simple_set_character(choice="MESHY")
        clip = state.clips[state.clip_index]
        context.scene.frame_set(clip.frame_start)
        state.simple_status = f"Loaded {_display_label(clip)}: frames {clip.frame_start}-{clip.frame_end}"
        self.report({"INFO"}, state.simple_status)
        return {"FINISHED"}


class DGAL_OT_browser_restart_preview(Operator):
    bl_idname = "dgal.browser_restart_preview"
    bl_label = "Restart Preview"
    bl_description = "Jump to the first frame of the selected animation"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        state = context.scene.dgal
        clip = _selected_clip(state)
        if not clip:
            self.report({"ERROR"}, "Choose an animation first")
            return {"CANCELLED"}
        context.scene.frame_start = clip.frame_start
        context.scene.frame_end = clip.frame_end
        context.scene.frame_set(clip.frame_start)
        state.simple_status = f"Restarted {_display_label(clip)}"
        return {"FINISHED"}


def _draw_current_action(layout, context, clip) -> None:
    """Draw the one selected action's preview facts before the grouped picker."""
    box = layout.box()
    box.label(text=f"Now showing: {_display_label(clip)}", icon="ACTION")
    loop_text = "Loops continuously" if clip.loop else "Plays once"
    box.label(text=f"Frames {clip.frame_start}-{clip.frame_end}  |  {loop_text}", icon="TIME")
    if clip.source_clip:
        box.label(text=f"Source motion: {clip.source_clip}", icon="FILE_MOVIE")
    if context.scene.dgal.active_action_source:
        box.label(text=f"Blender action: {context.scene.dgal.active_action_source}", icon="ARMATURE_DATA")
    row = box.row(align=True)
    playing = bool(context.screen and context.screen.is_animation_playing)
    row.operator(
        "screen.animation_play",
        text="Pause" if playing else "Preview",
        icon="PAUSE" if playing else "PLAY",
    )
    row.operator("dgal.browser_restart_preview", text="Restart", icon="LOOP_BACK")


def draw_animation_browser(layout, context) -> None:
    """Draw a simple grouped action picker for use in any Animation Lab panel."""
    state = context.scene.dgal
    container = layout.box()
    container.label(text="1. Pick an animation to preview", icon="ACTION")
    if not state.clips:
        container.label(text="Load the list once, then choose any animation.", icon="INFO")
        container.operator("dgal.browser_refresh_catalog", icon="FILE_REFRESH")
        return

    selected = _selected_clip(state)
    if selected:
        _draw_current_action(container, context, selected)

    container.label(text="Choose an animation to inspect or tweak", icon="DOWNARROW_HLT")
    for category, indices in grouped_clip_indices(state):
        group = container.box()
        group.label(text=category, icon="FOLDER")
        for index in indices:
            clip = state.clips[index]
            row = group.row(align=True)
            label = _display_label(clip)
            operator = row.operator(
                "dgal.browser_choose_clip",
                text=label,
                icon="CHECKMARK" if index == state.clip_index else "ACTION",
                depress=index == state.clip_index,
            )
            operator.clip_index = index
            row.label(text="Loop" if clip.loop else "One-shot")
            row.label(text=f"{clip.frame_start}-{clip.frame_end}")


CLASSES = (
    DGAL_OT_browser_refresh_catalog,
    DGAL_OT_browser_choose_clip,
    DGAL_OT_browser_restart_preview,
)
