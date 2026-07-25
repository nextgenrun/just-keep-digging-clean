"""Show review-only semantic labels for the major animation bones."""

from __future__ import annotations

import json

import bpy
from bpy.props import EnumProperty, StringProperty
from bpy.types import Menu, Operator
from mathutils import Vector

from .collections import ensure_lab_collections, move_object, tag_object
from .paths import DEFAULT_CONFIG


_CONFIG = json.loads(DEFAULT_CONFIG.read_text(encoding="utf-8"))
_GUIDE = _CONFIG["boneGuide"]


def semantic_bone_entries() -> tuple[dict, ...]:
    """Return the values-owned list of friendly major-joint guides."""
    return tuple(_GUIDE["semanticBones"])


def semantic_bone_entry(semantic_id: str) -> dict | None:
    """Find one friendly guide definition without touching the real rig names."""
    return next((item for item in semantic_bone_entries() if item["id"] == semantic_id), None)


def _name_index(rig: bpy.types.Object) -> dict[str, bpy.types.PoseBone]:
    return {bone.name.rsplit(":", 1)[-1].casefold(): bone for bone in rig.pose.bones}


def resolve_semantic_pose_bone(rig: bpy.types.Object, semantic_id: str) -> bpy.types.PoseBone | None:
    """Resolve an approved semantic id to its actual, never-renamed pose bone."""
    entry = semantic_bone_entry(semantic_id)
    if not entry:
        return None
    names = _name_index(rig)
    for candidate in entry["bones"]:
        direct = rig.pose.bones.get(candidate)
        if direct:
            return direct
        resolved = names.get(candidate.casefold())
        if resolved:
            return resolved
    return None


def friendly_bone_label(semantic_id: str) -> str:
    """Return a user-facing joint name for simple-mode controls."""
    entry = semantic_bone_entry(semantic_id)
    return entry["label"] if entry else semantic_id


def bone_adjustment_hint(semantic_id: str) -> str:
    """Return a short values-owned description of what a joint is useful for."""
    entry = semantic_bone_entry(semantic_id)
    return entry["hint"] if entry else ""


def set_semantic_bone_visibility(rig: bpy.types.Object, technical: bool = False) -> int:
    """Show only the semantic bones in Simple Mode, or restore raw bones for advanced work."""
    visible = {bone.bone.name for entry in semantic_bone_entries() if (bone := resolve_semantic_pose_bone(rig, entry["id"]))}
    for bone in rig.data.bones:
        bone.hide = not technical and bone.name not in visible
    rig.data.show_names = bool(_GUIDE["advancedShowTechnicalBoneNames"] if technical else _GUIDE["showTechnicalBoneNames"])
    rig.data.display_type = _GUIDE["armatureDisplayType"]
    return len(visible)


def _resolve_rig(context, rig: bpy.types.Object | None = None) -> bpy.types.Object | None:
    if rig and rig.type == "ARMATURE":
        return rig
    state = getattr(context.scene, "dgal", None) if context else None
    active = getattr(state, "active_rig", None) if state else None
    if active and active.type == "ARMATURE":
        return active
    master = bpy.data.objects.get(_CONFIG["master"]["armatureObject"])
    return master if master and master.type == "ARMATURE" else None


def _material() -> bpy.types.Material:
    name = _GUIDE["materialName"]
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.diffuse_color = tuple(_GUIDE["materialColor"])
    return material


def _owned_labels() -> list[bpy.types.Object]:
    prefix = _GUIDE["objectPrefix"]
    return [
        obj for obj in bpy.data.objects
        if obj.get("dgal_role") == "bone-label" or obj.name.startswith(prefix)
    ]


def _remove_label(obj: bpy.types.Object) -> None:
    data = obj.data if obj.type == "FONT" else None
    bpy.data.objects.remove(obj, do_unlink=True)
    if data and data.users == 0:
        bpy.data.curves.remove(data)


def clear_bone_labels() -> int:
    """Remove only this lab's semantic text labels, never rig or hitbox data."""
    labels = _owned_labels()
    for label in labels:
        _remove_label(label)
    return len(labels)


def _label_object(entry: dict, collection: bpy.types.Collection) -> bpy.types.Object:
    name = f'{_GUIDE["objectPrefix"]}{entry["id"]}'
    label = bpy.data.objects.get(name)
    if label and label.type != "FONT":
        raise ValueError(f"Bone label name is already used by {label.type}: {name}")
    if not label:
        label = bpy.data.objects.new(name, bpy.data.curves.new(name, type="FONT"))
        collection.objects.link(label)
    else:
        move_object(label, collection)
    return label


def _set_location_constraint(label: bpy.types.Object, rig: bpy.types.Object, bone_name: str) -> None:
    name = _GUIDE["locationConstraintName"]
    constraint = label.constraints.get(name) or label.constraints.new("COPY_LOCATION")
    constraint.name = name
    constraint.target = rig
    constraint.subtarget = bone_name
    constraint.owner_space = "WORLD"
    constraint.target_space = "WORLD"
    if hasattr(constraint, "use_offset"):
        constraint.use_offset = True
    elif hasattr(constraint, "mix_mode"):
        constraint.mix_mode = "ADD"


def _set_facing_constraint(label: bpy.types.Object) -> None:
    name = _GUIDE["facingConstraintName"]
    camera = bpy.data.objects.get(_GUIDE["reviewCameraName"])
    current = label.constraints.get(name)
    if not camera:
        if current:
            label.constraints.remove(current)
        label.rotation_euler = tuple(_GUIDE["fallbackRotationRadians"])
        return
    constraint = current or label.constraints.new("COPY_ROTATION")
    constraint.name = name
    constraint.target = camera
    constraint.owner_space = "WORLD"
    constraint.target_space = "WORLD"


def _configure_label(label: bpy.types.Object, entry: dict, rig: bpy.types.Object, bone) -> None:
    curve = label.data
    curve.body = entry["label"]
    curve.align_x = "LEFT"
    curve.align_y = "CENTER"
    curve.size = _GUIDE["labelSize"]
    curve.extrude = _GUIDE["labelExtrude"]
    material = _material()
    curve.materials.clear()
    curve.materials.append(material)
    label.location = Vector(entry["offset"])
    label.delta_location.zero()
    label.show_in_front = bool(_GUIDE["showInFront"])
    label.color = tuple(_GUIDE["materialColor"])
    _set_location_constraint(label, rig, bone.name)
    _set_facing_constraint(label)
    tag_object(label, "bone-label", getattr(getattr(bpy.context.scene, "dgal", None), "session_name", "bone-guide"))
    label["dgal_semantic_id"] = entry["id"]
    label["dgal_bone_name"] = bone.name
    label["dgal_hint"] = entry["hint"]


def refresh_bone_labels(context=None, rig: bpy.types.Object | None = None) -> list[bpy.types.Object]:
    """Create or update friendly guide labels beside canonical major joints."""
    context = context or bpy.context
    rig = _resolve_rig(context, rig)
    if not rig:
        raise ValueError("No animation armature is available for semantic bone labels")
    set_semantic_bone_visibility(rig)
    collection = ensure_lab_collections()[_GUIDE["collection"]]
    expected, labels = set(), []
    for entry in semantic_bone_entries():
        bone = resolve_semantic_pose_bone(rig, entry["id"])
        if not bone:
            continue
        label = _label_object(entry, collection)
        _configure_label(label, entry, rig, bone)
        expected.add(label.name)
        labels.append(label)
    for label in _owned_labels():
        if label.name not in expected:
            _remove_label(label)
    context.view_layer.update()
    return labels


class DGAL_OT_refresh_bone_labels(Operator):
    bl_idname = "dgal.refresh_bone_labels"
    bl_label = "Show named bone guides"
    bl_description = "Show readable review-only labels for the major character joints"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        try:
            labels = refresh_bone_labels(context)
        except ValueError as error:
            self.report({"ERROR"}, str(error))
            return {"CANCELLED"}
        self.report({"INFO"}, f"Showing {len(labels)} readable bone labels")
        return {"FINISHED"}


class DGAL_OT_select_named_bone(Operator):
    bl_idname = "dgal.select_named_bone"
    bl_label = "Select named bone"
    bl_description = "Select a major character joint without exposing its technical rig name"
    bl_options = {"REGISTER", "UNDO"}

    semantic_id: StringProperty(name="Named joint")

    def execute(self, context):
        rig = _resolve_rig(context)
        bone = resolve_semantic_pose_bone(rig, self.semantic_id) if rig else None
        if not bone:
            self.report({"ERROR"}, f"Named joint is not available: {self.semantic_id}")
            return {"CANCELLED"}
        if context.view_layer.objects.active != rig:
            for selected in context.selected_objects:
                selected.select_set(False)
            rig.select_set(True)
            context.view_layer.objects.active = rig
        if rig.mode != "POSE":
            if context.mode != "OBJECT":
                bpy.ops.object.mode_set(mode="OBJECT")
            bpy.ops.object.mode_set(mode="POSE")
        for pose_bone in rig.pose.bones:
            pose_bone.select = False
        bone.select = True
        rig.data.bones.active = bone.bone
        state = getattr(context.scene, "dgal", None)
        if state and hasattr(state, "simple_status"):
            state.simple_status = f"{friendly_bone_label(self.semantic_id)} — {bone_adjustment_hint(self.semantic_id)}"
        self.report({"INFO"}, f"Selected {friendly_bone_label(self.semantic_id)}")
        return {"FINISHED"}


class DGAL_OT_set_bone_view(Operator):
    bl_idname = "dgal.set_bone_view"
    bl_label = "Set bone view"
    bl_description = "Show only named joints or restore the complete technical rig"
    bl_options = {"REGISTER", "UNDO"}

    mode: EnumProperty(items=(("SIMPLE", "Named bones", "Show only the readable major joints"), ("TECHNICAL", "Technical rig", "Restore every animation bone")))

    def execute(self, context):
        rig = _resolve_rig(context)
        if not rig:
            self.report({"ERROR"}, "Choose an animation first")
            return {"CANCELLED"}
        if self.mode == "SIMPLE":
            refresh_bone_labels(context, rig)
            message = "Showing only readable named bones"
        else:
            set_semantic_bone_visibility(rig, technical=True)
            clear_bone_labels()
            message = "Restored the complete technical rig"
        state = getattr(context.scene, "dgal", None)
        if state and hasattr(state, "simple_status"):
            state.simple_status = message
        self.report({"INFO"}, message)
        return {"FINISHED"}


class DGAL_MT_named_bones(Menu):
    bl_idname = "DGAL_MT_named_bones"
    bl_label = "Named character bones"

    def draw(self, _context):
        for entry in semantic_bone_entries():
            operator = self.layout.operator("dgal.select_named_bone", text=entry["label"], icon="BONE_DATA")
            operator.semantic_id = entry["id"]


CLASSES = (
    DGAL_OT_refresh_bone_labels,
    DGAL_OT_select_named_bone,
    DGAL_OT_set_bone_view,
    DGAL_MT_named_bones,
)
