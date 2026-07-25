"""Draw the beginner whole-arm start/end interpolation controls."""

from .arm_tween_ops import endpoint_is_saved, labels as arm_tween_labels


def draw_arm_tween(layout, state) -> None:
    """Draw the approachable two-pose whole-arm motion workflow."""
    text = arm_tween_labels()
    box = layout.box()
    box.label(text=text["section"], icon="ARMATURE_DATA")
    box.label(text=text["intro"], icon="INFO")
    row = box.row(align=True)
    row.prop(state, "arm_tween_side", text=text["side"])
    row.prop(state, "arm_tween_start", text=text["start"])
    row.prop(state, "arm_tween_end", text=text["end"])
    box.label(text=text["rangeHint"], icon="TIME")
    for endpoint, edit_key, save_key in (
        ("START", "editStart", "saveStart"),
        ("END", "editEnd", "saveEnd"),
    ):
        row = box.row(align=True)
        edit = row.operator("dgal.arm_tween_edit_pose", text=text[edit_key], icon="POSE_HLT")
        edit.endpoint = endpoint
        saved = endpoint_is_saved(state, endpoint)
        save = row.operator(
            "dgal.arm_tween_save_pose",
            text=f"{text[save_key]} {'✓' if saved else ''}",
            icon="KEY_HLT",
            depress=saved,
        )
        save.endpoint = endpoint
    row = box.row()
    row.scale_y = 1.25
    row.operator("dgal.arm_tween_generate", text=text["generate"], icon="IPO_BEZIER")
    box.label(text=text["hint"], icon="INFO")
