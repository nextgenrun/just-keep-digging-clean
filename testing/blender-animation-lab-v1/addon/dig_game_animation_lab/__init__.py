"""Register the Dig Game Blender Animation Lab add-on."""

from __future__ import annotations

import bpy
from bpy.props import PointerProperty

from . import (
    arm_tween_ops,
    animation_browser,
    attachment_ops,
    bone_labels,
    bone_controls,
    ground_contact,
    hitbox_ops,
    mesh_fit_ops,
    pose_ops,
    procedural_props,
    review_ops,
    session_ops,
    simple_workspace,
    simple_ui,
    stage,
    state,
    ui,
)


bl_info = {
    "name": "Dig Game Animation Lab",
    "author": "Dig Game development workspace",
    "version": (1, 2, 0),
    "blender": (5, 1, 0),
    "location": "3D View > Sidebar > Animation Lab",
    "description": "Review-only animation, hitbox, gear, and mesh-fit authoring lab",
    "category": "Animation",
}


MODULES = (
    state,
    stage,
    session_ops,
    animation_browser,
    arm_tween_ops,
    pose_ops,
    bone_labels,
    bone_controls,
    ground_contact,
    hitbox_ops,
    attachment_ops,
    procedural_props,
    mesh_fit_ops,
    review_ops,
    simple_workspace,
    simple_ui,
    ui,
)


def register():
    for module in MODULES:
        for cls in module.CLASSES:
            bpy.utils.register_class(cls)
    bpy.types.Scene.dgal = PointerProperty(type=state.DGALSceneState)
    simple_workspace.register_header()
    simple_workspace.schedule_simple_view()
    ground_contact.schedule_contact_view()


def unregister():
    simple_workspace.unregister_header()
    if hasattr(bpy.types.Scene, "dgal"):
        del bpy.types.Scene.dgal
    for module in reversed(MODULES):
        for cls in reversed(module.CLASSES):
            bpy.utils.unregister_class(cls)


if __name__ == "__main__":
    register()
