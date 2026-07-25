"""Capture reflected UE 5.8 IK retarget method signatures and source walk data."""

from __future__ import annotations

import json
from pathlib import Path

import unreal


REPORT_PATH = Path(unreal.Paths.project_dir()) / "SourceAssets" / "unreal-retarget-signatures.json"
SOURCE_WALK_PATH = "/Engine/Tutorial/SubEditors/TutorialAssets/Character/Tutorial_Walk_Fwd.Tutorial_Walk_Fwd"


def docs(cls: object, names: list[str]) -> dict[str, str | None]:
    return {name: getattr(getattr(cls, name, None), "__doc__", None) for name in names}


report = {
    "IKRigDefinitionFactory": docs(
        unreal.IKRigDefinitionFactory,
        ["create_new_ik_rig_asset"],
    ),
    "IKRigController": docs(
        unreal.IKRigController,
        [
            "get_controller",
            "set_skeletal_mesh",
            "apply_auto_generated_retarget_definition",
            "set_retarget_root",
            "add_retarget_chain",
            "get_retarget_chains",
        ],
    ),
    "IKRetargeterController": docs(
        unreal.IKRetargeterController,
        [
            "get_controller",
            "set_ik_rig",
            "add_default_ops",
            "run_op_initial_setup",
            "auto_map_chains",
            "set_preview_mesh",
            "set_rotation_offset_for_retarget_pose_bone",
            "set_root_offset_in_retarget_pose",
        ],
    ),
    "IKRetargetBatchOperation": docs(
        unreal.IKRetargetBatchOperation,
        ["duplicate_and_retarget", "run_batch_retarget"],
    ),
    "AssetTools": docs(
        unreal.AssetTools,
        ["create_asset", "import_asset_tasks"],
    ),
}

source_walk = unreal.load_asset(SOURCE_WALK_PATH)
if source_walk:
    skeleton = source_walk.get_skeleton()
    report["source_walk"] = {
        "path": source_walk.get_path_name(),
        "class": source_walk.get_class().get_name(),
        "skeleton": skeleton.get_path_name(),
        "skeleton_methods": sorted(name for name in dir(skeleton) if "bone" in name.lower()),
        "play_length": source_walk.get_play_length(),
    }
else:
    report["source_walk"] = None

REPORT_PATH.write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")
unreal.log(f"RETARGET_SIGNATURE_PROBE_OK source_walk={bool(source_walk)}")
