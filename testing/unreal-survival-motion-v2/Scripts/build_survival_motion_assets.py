"""Import the approved Survival Character and retarget genuine UE5 motions."""

from __future__ import annotations

import json
from pathlib import Path

import unreal


PROJECT_DIR = Path(unreal.Paths.project_dir()).resolve()
WORKSPACE_DIR = PROJECT_DIR.parents[1]
SOURCE_FBX = (
    WORKSPACE_DIR
    / "sprites"
    / "character"
    / "survival-character-fab-v1"
    / "source"
    / "survival_character.fbx"
)
REPORT_PATH = PROJECT_DIR / "SourceAssets" / "survival-motion-build-report.json"

MESH_DIR = "/Game/SurvivalMotion/Character"
RETARGET_DIR = "/Game/SurvivalMotion/Retarget"
ANIMATION_DIR = "/Game/SurvivalMotion/Animations"

TARGET_MESH_NAME = "SK_SurvivalCharacter_Fab_v1"
TARGET_RIG_NAME = "IK_SurvivalCharacter_Fab_v1"
SOURCE_RIG_NAME = "IK_Manny_Motion_Source"
RETARGETER_NAME = "RTG_Manny_To_SurvivalCharacter_v1"

SOURCE_MESH_PATH = (
    "/Game/Characters/Mannequins/Meshes/"
    "SKM_Manny_Simple.SKM_Manny_Simple"
)
SOURCE_CLIPS = {
    "idle": "/Game/Characters/Mannequins/Anims/Unarmed/MM_Idle.MM_Idle",
    "walk": (
        "/Game/Characters/Mannequins/Anims/Unarmed/Walk/"
        "MF_Unarmed_Walk_Fwd.MF_Unarmed_Walk_Fwd"
    ),
    "run": (
        "/Game/Characters/Mannequins/Anims/Unarmed/Jog/"
        "MF_Unarmed_Jog_Fwd.MF_Unarmed_Jog_Fwd"
    ),
    "fly": (
        "/Game/Characters/Mannequins/Anims/Unarmed/Jump/"
        "MM_Fall_Loop.MM_Fall_Loop"
    ),
    "attack": (
        "/Game/Characters/Mannequins/Anims/Unarmed/Attack/"
        "MM_Attack_01.MM_Attack_01"
    ),
    "dig_up": (
        "/Game/Characters/Mannequins/Anims/Unarmed/Attack/"
        "MM_Attack_02.MM_Attack_02"
    ),
    "dig_down": (
        "/Game/Characters/Mannequins/Anims/Unarmed/Attack/"
        "MM_Attack_03.MM_Attack_03"
    ),
    "mining_strike": (
        "/Game/Characters/Mannequins/Anims/Unarmed/Attack/"
        "MM_ChargedAttack.MM_ChargedAttack"
    ),
}


def delete_if_present(asset_path: str) -> None:
    if unreal.EditorAssetLibrary.does_asset_exist(asset_path):
        unreal.EditorAssetLibrary.delete_asset(asset_path)


def import_target_mesh() -> unreal.SkeletalMesh:
    asset_path = f"{MESH_DIR}/{TARGET_MESH_NAME}.{TARGET_MESH_NAME}"
    delete_if_present(asset_path)

    options = unreal.FbxImportUI()
    options.set_editor_property("automated_import_should_detect_type", False)
    options.set_editor_property("import_as_skeletal", True)
    options.set_editor_property("import_mesh", True)
    options.set_editor_property("import_animations", False)
    options.set_editor_property("import_materials", False)
    options.set_editor_property("import_textures", False)
    options.set_editor_property("create_physics_asset", False)
    options.set_editor_property("mesh_type_to_import", unreal.FBXImportType.FBXIT_SKELETAL_MESH)

    mesh_options = options.get_editor_property("skeletal_mesh_import_data")
    for name, value in (
        ("convert_scene", True),
        ("convert_scene_unit", True),
        ("import_morph_targets", False),
        ("import_mesh_lods", False),
        ("preserve_smoothing_groups", True),
        ("use_t0_as_ref_pose", False),
    ):
        try:
            mesh_options.set_editor_property(name, value)
        except Exception:
            unreal.log_warning(f"Unavailable UE 5.8 import option: {name}")

    task = unreal.AssetImportTask()
    task.set_editor_properties(
        {
            "filename": str(SOURCE_FBX),
            "destination_path": MESH_DIR,
            "destination_name": TARGET_MESH_NAME,
            "automated": True,
            "save": True,
            "replace_existing": True,
            "options": options,
        }
    )
    unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks([task])
    imported = list(task.get_editor_property("imported_object_paths"))
    assets = [unreal.load_asset(path) for path in imported]
    target = next((asset for asset in assets if isinstance(asset, unreal.SkeletalMesh)), None)
    if not target:
        target = unreal.load_asset(asset_path)
    if not isinstance(target, unreal.SkeletalMesh):
        raise RuntimeError(f"Survival FBX did not create a SkeletalMesh; imported={imported}")
    return target


def add_epic_target_chains(controller: unreal.IKRigController) -> None:
    controller.set_retarget_root("pelvis")
    chains = (
        ("Root", "pelvis", "pelvis"),
        ("Spine", "spine_01", "spine_05"),
        ("Head", "neck_01", "head"),
        ("LeftArm", "clavicle_l", "hand_l"),
        ("RightArm", "clavicle_r", "hand_r"),
        ("LeftLeg", "thigh_l", "ball_l"),
        ("RightLeg", "thigh_r", "ball_r"),
    )
    for name, start, end in chains:
        controller.add_retarget_chain(name, start, end, "")


def make_ik_rig(
    asset_name: str,
    skeletal_mesh: unreal.SkeletalMesh,
    target: bool,
) -> tuple[unreal.IKRigDefinition, bool]:
    asset_path = f"{RETARGET_DIR}/{asset_name}.{asset_name}"
    rig = unreal.load_asset(asset_path)
    if not isinstance(rig, unreal.IKRigDefinition):
        rig = unreal.IKRigDefinitionFactory.create_new_ik_rig_asset(RETARGET_DIR, asset_name)
    if not rig:
        raise RuntimeError(f"Could not create IK Rig {asset_name}")
    controller = unreal.IKRigController.get_controller(rig)
    if not controller.set_skeletal_mesh(skeletal_mesh):
        raise RuntimeError(f"Could not assign {skeletal_mesh.get_name()} to {asset_name}")
    auto_generated = controller.apply_auto_generated_retarget_definition()
    if target and not controller.get_retarget_chains():
        add_epic_target_chains(controller)
    if not controller.get_retarget_chains():
        raise RuntimeError(f"IK Rig {asset_name} has no retarget chains")
    unreal.EditorAssetLibrary.save_loaded_asset(rig, only_if_is_dirty=False)
    return rig, auto_generated


def make_retargeter(
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
    if not retargeter:
        raise RuntimeError("Could not create Survival IK Retargeter")
    controller = unreal.IKRetargeterController.get_controller(retargeter)
    controller.set_ik_rig(unreal.RetargetSourceOrTarget.SOURCE, source_rig)
    controller.set_ik_rig(unreal.RetargetSourceOrTarget.TARGET, target_rig)
    controller.set_preview_mesh(unreal.RetargetSourceOrTarget.SOURCE, source_mesh)
    controller.set_preview_mesh(unreal.RetargetSourceOrTarget.TARGET, target_mesh)
    if controller.get_num_retarget_ops() == 0:
        controller.add_default_ops()
    for index in range(controller.get_num_retarget_ops()):
        controller.run_op_initial_setup(index)
    controller.auto_map_chains(unreal.AutoMapChainType.FUZZY, True)
    unreal.EditorAssetLibrary.save_loaded_asset(retargeter, only_if_is_dirty=False)
    return retargeter


def retarget_clip(
    label: str,
    source: unreal.AnimSequence,
    source_mesh: unreal.SkeletalMesh,
    target_mesh: unreal.SkeletalMesh,
    retargeter: unreal.IKRetargeter,
) -> unreal.AnimSequence:
    output_name = f"Survival_{label}"
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
        target_path=ANIMATION_DIR,
        use_source_path=False,
        include_referenced_assets=False,
        overwrite_existing_files=True,
    )
    output = next(
        (row.get_asset() for row in results if isinstance(row.get_asset(), unreal.AnimSequence)),
        None,
    )
    if not output:
        raise RuntimeError(f"Retarget failed for {label}: {source.get_path_name()}")
    if output.get_name() != output_name:
        if not unreal.EditorAssetLibrary.rename_loaded_asset(output, f"{ANIMATION_DIR}/{output_name}"):
            raise RuntimeError(f"Could not rename retargeted clip {label}")
    output.set_preview_skeletal_mesh(target_mesh)
    unreal.EditorAssetLibrary.save_loaded_asset(output, only_if_is_dirty=False)
    return output


def main() -> None:
    if not SOURCE_FBX.exists():
        raise RuntimeError(f"Approved Fab FBX not found: {SOURCE_FBX}")
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)

    source_mesh = unreal.load_asset(SOURCE_MESH_PATH)
    if not isinstance(source_mesh, unreal.SkeletalMesh):
        raise RuntimeError(f"UE5 Manny source mesh unavailable: {SOURCE_MESH_PATH}")
    source_clips = {label: unreal.load_asset(path) for label, path in SOURCE_CLIPS.items()}
    missing = [label for label, clip in source_clips.items() if not isinstance(clip, unreal.AnimSequence)]
    if missing:
        raise RuntimeError(f"Missing UE5 source AnimSequences: {missing}")

    target_mesh = import_target_mesh()
    source_rig, source_auto = make_ik_rig(SOURCE_RIG_NAME, source_mesh, target=False)
    target_rig, target_auto = make_ik_rig(TARGET_RIG_NAME, target_mesh, target=True)
    retargeter = make_retargeter(source_rig, target_rig, source_mesh, target_mesh)
    outputs = {
        label: retarget_clip(label, clip, source_mesh, target_mesh, retargeter)
        for label, clip in source_clips.items()
    }

    bounds = target_mesh.get_bounds()
    report = {
        "engine": unreal.SystemLibrary.get_engine_version(),
        "source_character": str(SOURCE_FBX),
        "source_mesh": source_mesh.get_path_name(),
        "target_mesh": target_mesh.get_path_name(),
        "target_bounds_extent_cm": [
            bounds.box_extent.x,
            bounds.box_extent.y,
            bounds.box_extent.z,
        ],
        "source_auto_definition": source_auto,
        "target_auto_definition": target_auto,
        "retargeter": retargeter.get_path_name(),
        "clips": {
            label: {
                "source": source_clips[label].get_path_name(),
                "output": output.get_path_name(),
                "seconds": output.get_play_length(),
            }
            for label, output in outputs.items()
        },
        "retargeted_in_unreal": True,
        "animation_authored_in_blender": False,
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")
    unreal.log(f"SURVIVAL_MOTION_BUILD_OK clips={len(outputs)} report={REPORT_PATH}")


if __name__ == "__main__":
    main()
