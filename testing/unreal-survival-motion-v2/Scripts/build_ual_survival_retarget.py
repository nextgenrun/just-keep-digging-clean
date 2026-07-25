"""Retarget the active UAL motion library onto the approved Survival character."""

from __future__ import annotations

import json
import re
from pathlib import Path

import unreal


PROJECT_DIR = Path(unreal.Paths.project_dir()).resolve()
SOURCE_FBX = PROJECT_DIR / "SourceAssets" / "ual-active-source" / "UAL_Active_Source.fbx"
REPORT_PATH = PROJECT_DIR / "SourceAssets" / "ual-survival-retarget-report.json"

SOURCE_DIR = "/Game/SurvivalMotion/UALSource"
OUTPUT_DIR = "/Game/SurvivalMotion/UALAnimations"
RETARGET_DIR = "/Game/SurvivalMotion/Retarget"
TARGET_MESH_PATH = (
    "/Game/SurvivalMotion/Character/"
    "SK_SurvivalCharacter_Fab_v1.SK_SurvivalCharacter_Fab_v1"
)
TARGET_RIG_PATH = (
    "/Game/SurvivalMotion/Retarget/"
    "IK_SurvivalCharacter_Fab_v1.IK_SurvivalCharacter_Fab_v1"
)
SOURCE_RIG_NAME = "IK_UAL_Active_Source"
RETARGETER_NAME = "RTG_UAL_To_SurvivalCharacter_v1"

ACTIVE_CLIPS = (
    "Idle_Loop",
    "Idle_Talking_Loop",
    "Jog_Fwd_Loop",
    "Jump_Start",
    "Jump_Loop",
    "Jump_Land",
    "Crouch_Idle_Loop",
    "Shield_Dash",
    "ClimbUp_1m",
    "Punch_Jab",
    "Punch_Cross",
    "TreeChopping_Loop",
    "Melee_Hook",
    "Melee_Hook_Rec",
    "TreeChopping_Loop",
    "Melee_Hook",
    "Melee_Hook_Rec",
    "OverhandThrow",
    "Push_Loop",
    "Roll",
    "Spell_Simple_Idle_Loop",
    "Hit_Chest",
    "Death01",
)


def clear_generated_assets() -> None:
    for directory in (SOURCE_DIR, OUTPUT_DIR):
        if unreal.EditorAssetLibrary.does_directory_exist(directory):
            unreal.EditorAssetLibrary.delete_directory(directory)


def configure_import_options() -> unreal.FbxImportUI:
    options = unreal.FbxImportUI()
    options.set_editor_property("automated_import_should_detect_type", False)
    options.set_editor_property("import_as_skeletal", True)
    options.set_editor_property("import_mesh", True)
    options.set_editor_property("import_animations", True)
    options.set_editor_property("import_materials", False)
    options.set_editor_property("import_textures", False)
    options.set_editor_property("create_physics_asset", False)
    options.set_editor_property("mesh_type_to_import", unreal.FBXImportType.FBXIT_SKELETAL_MESH)

    mesh_data = options.get_editor_property("skeletal_mesh_import_data")
    for name, value in (
        ("convert_scene", True),
        ("convert_scene_unit", True),
        ("preserve_smoothing_groups", True),
        ("use_t0_as_ref_pose", False),
        ("import_morph_targets", False),
    ):
        try:
            mesh_data.set_editor_property(name, value)
        except Exception:
            unreal.log_warning(f"Unavailable UE 5.8 skeletal import option: {name}")

    animation_data = options.get_editor_property("anim_sequence_import_data")
    try:
        animation_data.set_editor_property("snap_to_closest_frame_boundary", True)
    except Exception:
        unreal.log_warning("UE 5.8 closest-frame animation snapping option unavailable")
    try:
        animation_data.set_editor_property(
            "animation_length",
            unreal.FBXAnimationLengthImportType.FBXALIT_EXPORTED_TIME,
        )
    except Exception:
        unreal.log_warning("UE 5.8 exported-time animation import option unavailable")
    return options


def import_source() -> tuple[unreal.SkeletalMesh, list[unreal.AnimSequence], list[str]]:
    task = unreal.AssetImportTask()
    task.set_editor_properties(
        {
            "filename": str(SOURCE_FBX),
            "destination_path": SOURCE_DIR,
            "automated": True,
            "save": True,
            "replace_existing": True,
            "options": configure_import_options(),
        }
    )
    unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks([task])
    imported_paths = list(task.get_editor_property("imported_object_paths"))

    registry = unreal.AssetRegistryHelpers.get_asset_registry()
    asset_rows = registry.get_assets_by_path(SOURCE_DIR, recursive=True)
    assets = [row.get_asset() for row in asset_rows]
    source_mesh = next((asset for asset in assets if isinstance(asset, unreal.SkeletalMesh)), None)
    clips = [asset for asset in assets if isinstance(asset, unreal.AnimSequence)]
    if not isinstance(source_mesh, unreal.SkeletalMesh):
        raise RuntimeError(f"UAL FBX did not create a SkeletalMesh; imported={imported_paths}")
    if not clips:
        raise RuntimeError(f"UAL FBX did not create AnimSequences; imported={imported_paths}")
    return source_mesh, clips, imported_paths


def imported_action_name(value: str) -> str:
    marker = "SK_UAL_Active_Source_"
    if marker in value:
        return value.rsplit(marker, 1)[1]
    return re.sub(r"^UAL_Active_Source", "", value).lstrip("_|")


def match_active_clips(imported: list[unreal.AnimSequence]) -> dict[str, unreal.AnimSequence]:
    matched: dict[str, unreal.AnimSequence] = {}
    for label in ACTIVE_CLIPS:
        candidates = [
            clip
            for clip in imported
            if imported_action_name(clip.get_name()).lower() == label.lower()
        ]
        if len(candidates) != 1:
            names = [clip.get_name() for clip in imported]
            raise RuntimeError(f"Expected one imported clip for {label}, got {len(candidates)}: {names}")
        matched[label] = candidates[0]
    return matched


def add_epic_chains(controller: unreal.IKRigController) -> None:
    controller.set_retarget_root("pelvis")
    for name, start, end in (
        ("Root", "pelvis", "pelvis"),
        ("Spine", "spine_01", "spine_03"),
        ("Head", "neck_01", "Head"),
        ("LeftArm", "clavicle_l", "hand_l"),
        ("RightArm", "clavicle_r", "hand_r"),
        ("LeftLeg", "thigh_l", "ball_l"),
        ("RightLeg", "thigh_r", "ball_r"),
    ):
        controller.add_retarget_chain(name, start, end, "")


def create_source_rig(source_mesh: unreal.SkeletalMesh) -> tuple[unreal.IKRigDefinition, bool]:
    asset_path = f"{RETARGET_DIR}/{SOURCE_RIG_NAME}.{SOURCE_RIG_NAME}"
    rig = unreal.load_asset(asset_path)
    if not isinstance(rig, unreal.IKRigDefinition):
        rig = unreal.IKRigDefinitionFactory.create_new_ik_rig_asset(RETARGET_DIR, SOURCE_RIG_NAME)
    if not isinstance(rig, unreal.IKRigDefinition):
        raise RuntimeError("Could not create the UAL source IK Rig")
    controller = unreal.IKRigController.get_controller(rig)
    if not controller.set_skeletal_mesh(source_mesh):
        raise RuntimeError("Could not assign the UAL mesh to its IK Rig")
    auto_generated = False
    if not controller.get_retarget_chains():
        auto_generated = controller.apply_auto_generated_retarget_definition()
    if not controller.get_retarget_chains():
        add_epic_chains(controller)
    if not controller.get_retarget_chains():
        raise RuntimeError("UAL source IK Rig has no retarget chains")
    unreal.EditorAssetLibrary.save_loaded_asset(rig, only_if_is_dirty=False)
    return rig, auto_generated


def create_retargeter(
    source_rig: unreal.IKRigDefinition,
    target_rig: unreal.IKRigDefinition,
    source_mesh: unreal.SkeletalMesh,
    target_mesh: unreal.SkeletalMesh,
) -> unreal.IKRetargeter:
    asset_path = f"{RETARGET_DIR}/{RETARGETER_NAME}.{RETARGETER_NAME}"
    retargeter = unreal.load_asset(asset_path)
    if not isinstance(retargeter, unreal.IKRetargeter):
        retargeter = unreal.AssetToolsHelpers.get_asset_tools().create_asset(
            RETARGETER_NAME,
            RETARGET_DIR,
            unreal.IKRetargeter,
            unreal.IKRetargetFactory(),
        )
    if not isinstance(retargeter, unreal.IKRetargeter):
        raise RuntimeError("Could not create the UAL-to-Survival IK Retargeter")
    controller = unreal.IKRetargeterController.get_controller(retargeter)
    controller.set_ik_rig(unreal.RetargetSourceOrTarget.SOURCE, source_rig)
    controller.set_ik_rig(unreal.RetargetSourceOrTarget.TARGET, target_rig)
    controller.set_preview_mesh(unreal.RetargetSourceOrTarget.SOURCE, source_mesh)
    controller.set_preview_mesh(unreal.RetargetSourceOrTarget.TARGET, target_mesh)
    if controller.get_num_retarget_ops() == 0:
        controller.add_default_ops()
    for index in range(controller.get_num_retarget_ops()):
        controller.run_op_initial_setup(index)
    controller.auto_map_chains(unreal.AutoMapChainType.EXACT, True)
    critical_chains = (
        "Spine",
        "Neck",
        "Head",
        "LeftLeg",
        "LeftFoot",
        "LeftClavicle",
        "LeftArm",
        "RightLeg",
        "RightFoot",
        "RightClavicle",
        "RightArm",
    )
    chain_map = {}
    for chain_name in critical_chains:
        controller.set_source_chain(chain_name, chain_name)
        source_chain = str(controller.get_source_chain(chain_name))
        if source_chain != chain_name:
            raise RuntimeError(
                f"Critical retarget chain {chain_name} mapped to {source_chain or '<none>'}"
            )
        chain_map[chain_name] = source_chain

    pose_name = "UAL_SourceAligned"
    target_side = unreal.RetargetSourceOrTarget.TARGET
    if pose_name in controller.get_retarget_poses(target_side):
        controller.remove_retarget_pose(pose_name, target_side)
    controller.create_retarget_pose(pose_name, target_side)
    controller.set_current_retarget_pose(pose_name, target_side)
    controller.auto_align_all_bones(target_side)
    controller.snap_bone_to_ground("ball_l", target_side)
    unreal.EditorAssetLibrary.save_loaded_asset(retargeter, only_if_is_dirty=False)
    return retargeter


def retarget_clip(
    label: str,
    source: unreal.AnimSequence,
    source_mesh: unreal.SkeletalMesh,
    target_mesh: unreal.SkeletalMesh,
    retargeter: unreal.IKRetargeter,
) -> unreal.AnimSequence:
    output_name = f"Survival_UAL_{label}"
    source_data = unreal.AssetRegistryHelpers.get_asset_registry().get_asset_by_object_path(
        source.get_path_name()
    )
    results = unreal.IKRetargetBatchOperation.duplicate_and_retarget(
        [source_data],
        source_mesh,
        target_mesh,
        retargeter,
        search=source.get_name(),
        replace=output_name,
        target_path=OUTPUT_DIR,
        use_source_path=False,
        include_referenced_assets=False,
        overwrite_existing_files=True,
    )
    output = next(
        (row.get_asset() for row in results if isinstance(row.get_asset(), unreal.AnimSequence)),
        None,
    )
    if not isinstance(output, unreal.AnimSequence):
        raise RuntimeError(f"UAL-to-Survival retarget failed for {label}")
    if output.get_name() != output_name:
        destination = f"{OUTPUT_DIR}/{output_name}"
        if not unreal.EditorAssetLibrary.rename_loaded_asset(output, destination):
            raise RuntimeError(f"Could not rename the retargeted {label} clip")
    output.set_preview_skeletal_mesh(target_mesh)
    unreal.EditorAssetLibrary.save_loaded_asset(output, only_if_is_dirty=False)
    return output


def main() -> None:
    if not SOURCE_FBX.exists():
        raise RuntimeError(f"Generated UAL source FBX not found: {SOURCE_FBX}")
    target_mesh = unreal.load_asset(TARGET_MESH_PATH)
    target_rig = unreal.load_asset(TARGET_RIG_PATH)
    if not isinstance(target_mesh, unreal.SkeletalMesh):
        raise RuntimeError(f"Approved Survival target mesh missing: {TARGET_MESH_PATH}")
    if not isinstance(target_rig, unreal.IKRigDefinition):
        raise RuntimeError(f"Approved Survival target IK Rig missing: {TARGET_RIG_PATH}")

    clear_generated_assets()
    source_mesh, imported_clips, imported_paths = import_source()
    source_clips = match_active_clips(imported_clips)
    source_rig, source_auto = create_source_rig(source_mesh)
    retargeter = create_retargeter(source_rig, target_rig, source_mesh, target_mesh)
    outputs = {
        label: retarget_clip(label, clip, source_mesh, target_mesh, retargeter)
        for label, clip in source_clips.items()
    }

    report = {
        "engine": unreal.SystemLibrary.get_engine_version(),
        "source_fbx": str(SOURCE_FBX),
        "source_mesh": source_mesh.get_path_name(),
        "target_mesh": target_mesh.get_path_name(),
        "source_auto_definition": source_auto,
        "source_ik_rig": source_rig.get_path_name(),
        "target_ik_rig": target_rig.get_path_name(),
        "retargeter": retargeter.get_path_name(),
        "imported_object_paths": imported_paths,
        "rejected_sources_excluded": ["Authored_Grounded_Side_Kick_v1", "Sword_Regular_C"],
        "clips": {
            label: {
                "source": source_clips[label].get_path_name(),
                "output": output.get_path_name(),
                "seconds": output.get_play_length(),
            }
            for label, output in outputs.items()
        },
        "retargeted_in_unreal": True,
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")
    unreal.log(f"UAL_SURVIVAL_RETARGET_OK clips={len(outputs)} report={REPORT_PATH}")


if __name__ == "__main__":
    main()
