"""Import the Legacy Miner and build a walk-only Unreal IK retarget.

The walk is sourced from UE 5.8's installed Manny unarmed template assets. All
animation retargeting is performed by the native IKRig plugin operation stack.
"""

from __future__ import annotations

import json
from pathlib import Path

import unreal


PROJECT_DIR = Path(unreal.Paths.project_dir()).resolve()
SOURCE_FBX = PROJECT_DIR / "SourceAssets" / "legacy-miner-meshy-ue.fbx"
REPORT_PATH = PROJECT_DIR / "SourceAssets" / "unreal-walk-build-report.json"

MESH_DIR = "/Game/LegacyMinerWalk/Meshy"
RETARGET_DIR = "/Game/LegacyMinerWalk/Retarget"
ANIMATION_DIR = "/Game/LegacyMinerWalk/Animations"

TARGET_MESH_NAME = "SK_LegacyMiner_Meshy_v2"
TARGET_RIG_NAME = "IK_LegacyMiner_Meshy_v2"
SOURCE_RIG_NAME = "IK_Manny_Unarmed_Source"
RETARGETER_NAME = "RTG_MannyUnarmedWalk_To_LegacyMiner_v2"
OUTPUT_WALK_NAME = "LegacyMiner_Unreal_Unarmed_Walk"

SOURCE_WALK_PATH = "/Game/Characters/Mannequins/Anims/Unarmed/Walk/MF_Unarmed_Walk_Fwd.MF_Unarmed_Walk_Fwd"
SOURCE_ASSET_DIR = "/Game/Characters/Mannequins"
SOURCE_MESH_PATH = "/Game/Characters/Mannequins/Meshes/SKM_Quinn_Simple.SKM_Quinn_Simple"


def delete_if_present(asset_path: str) -> None:
    if unreal.EditorAssetLibrary.does_asset_exist(asset_path):
        unreal.EditorAssetLibrary.delete_asset(asset_path)


def import_target_mesh() -> unreal.SkeletalMesh:
    delete_if_present(f"{MESH_DIR}/{TARGET_MESH_NAME}.{TARGET_MESH_NAME}")

    options = unreal.FbxImportUI()
    options.set_editor_property("automated_import_should_detect_type", False)
    options.set_editor_property("import_as_skeletal", True)
    options.set_editor_property("import_mesh", True)
    options.set_editor_property("import_animations", False)
    options.set_editor_property("import_materials", True)
    options.set_editor_property("import_textures", True)
    options.set_editor_property("create_physics_asset", False)
    options.set_editor_property("mesh_type_to_import", unreal.FBXImportType.FBXIT_SKELETAL_MESH)

    skeletal_options = options.get_editor_property("skeletal_mesh_import_data")
    for property_name, value in (
        ("convert_scene", True),
        ("convert_scene_unit", True),
        ("import_morph_targets", False),
        ("import_mesh_lods", False),
        ("preserve_smoothing_groups", True),
        ("use_t0_as_ref_pose", False),
    ):
        try:
            skeletal_options.set_editor_property(property_name, value)
        except Exception:
            unreal.log_warning(f"Import option unavailable in UE 5.8 wrapper: {property_name}")

    task = unreal.AssetImportTask()
    task.set_editor_property("filename", str(SOURCE_FBX))
    task.set_editor_property("destination_path", MESH_DIR)
    task.set_editor_property("destination_name", TARGET_MESH_NAME)
    task.set_editor_property("automated", True)
    task.set_editor_property("save", True)
    task.set_editor_property("replace_existing", True)
    task.set_editor_property("options", options)

    unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks([task])
    imported = list(task.get_editor_property("imported_object_paths"))
    meshes = [unreal.load_asset(path) for path in imported]
    target_mesh = next((asset for asset in meshes if isinstance(asset, unreal.SkeletalMesh)), None)
    if not target_mesh:
        target_mesh = unreal.load_asset(f"{MESH_DIR}/{TARGET_MESH_NAME}.{TARGET_MESH_NAME}")
    if not target_mesh:
        raise RuntimeError(f"FBX import did not create {TARGET_MESH_NAME}; imported={imported}")
    return target_mesh


def find_source_mesh(source_walk: unreal.AnimSequence) -> unreal.SkeletalMesh:
    source_skeleton = source_walk.get_skeleton()
    direct_mesh = unreal.load_asset(SOURCE_MESH_PATH)
    if isinstance(direct_mesh, unreal.SkeletalMesh):
        return direct_mesh
    for path in unreal.EditorAssetLibrary.list_assets(SOURCE_ASSET_DIR, recursive=True, include_folder=False):
        asset = unreal.load_asset(path)
        if not isinstance(asset, unreal.SkeletalMesh):
            continue
        try:
            if asset.get_skeleton() == source_skeleton:
                return asset
        except Exception:
            try:
                if asset.get_editor_property("skeleton") == source_skeleton:
                    return asset
            except Exception:
                pass
    raise RuntimeError(f"No installed source SkeletalMesh uses {source_skeleton.get_path_name()}")


def chain_report(controller: unreal.IKRigController) -> list[dict[str, str]]:
    rows = []
    for chain in controller.get_retarget_chains():
        rows.append(
            {
                "name": str(chain.get_editor_property("chain_name")),
                "start": str(chain.get_editor_property("start_bone")),
                "end": str(chain.get_editor_property("end_bone")),
            }
        )
    return rows


def add_target_chains(controller: unreal.IKRigController) -> None:
    controller.set_retarget_root("Hips")
    for name, start, end in (
        ("Root", "Hips", "Hips"),
        ("Spine", "Spine02", "Spine"),
        ("Head", "neck", "Head"),
        ("LeftArm", "LeftShoulder", "LeftHand"),
        ("RightArm", "RightShoulder", "RightHand"),
        ("LeftLeg", "LeftUpLeg", "LeftToeBase"),
        ("RightLeg", "RightUpLeg", "RightToeBase"),
    ):
        controller.add_retarget_chain(name, start, end, "")


def make_ik_rig(asset_name: str, skeletal_mesh: unreal.SkeletalMesh, target: bool) -> tuple[unreal.IKRigDefinition, bool]:
    asset_path = f"{RETARGET_DIR}/{asset_name}.{asset_name}"
    delete_if_present(asset_path)
    rig = unreal.IKRigDefinitionFactory.create_new_ik_rig_asset(RETARGET_DIR, asset_name)
    if not rig:
        raise RuntimeError(f"Could not create IK Rig {asset_name}")
    controller = unreal.IKRigController.get_controller(rig)
    if not controller.set_skeletal_mesh(skeletal_mesh):
        raise RuntimeError(f"Could not assign {skeletal_mesh.get_name()} to {asset_name}")
    auto_generated = controller.apply_auto_generated_retarget_definition()
    if target and not auto_generated:
        add_target_chains(controller)
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
    delete_if_present(asset_path)
    factory = unreal.IKRetargetFactory()
    retargeter = unreal.AssetToolsHelpers.get_asset_tools().create_asset(
        RETARGETER_NAME,
        RETARGET_DIR,
        unreal.IKRetargeter,
        factory,
    )
    if not retargeter:
        raise RuntimeError("Could not create IK Retargeter asset")

    controller = unreal.IKRetargeterController.get_controller(retargeter)
    controller.set_ik_rig(unreal.RetargetSourceOrTarget.SOURCE, source_rig)
    controller.set_ik_rig(unreal.RetargetSourceOrTarget.TARGET, target_rig)
    controller.set_preview_mesh(unreal.RetargetSourceOrTarget.SOURCE, source_mesh)
    controller.set_preview_mesh(unreal.RetargetSourceOrTarget.TARGET, target_mesh)
    controller.add_default_ops()
    for op_index in range(controller.get_num_retarget_ops()):
        controller.run_op_initial_setup(op_index)
    controller.auto_map_chains(unreal.AutoMapChainType.FUZZY, True)
    unreal.EditorAssetLibrary.save_loaded_asset(retargeter, only_if_is_dirty=False)
    return retargeter


def retarget_walk(
    source_walk: unreal.AnimSequence,
    source_mesh: unreal.SkeletalMesh,
    target_mesh: unreal.SkeletalMesh,
    retargeter: unreal.IKRetargeter,
) -> unreal.AnimSequence:
    delete_if_present(f"{ANIMATION_DIR}/{OUTPUT_WALK_NAME}.{OUTPUT_WALK_NAME}")
    registry = unreal.AssetRegistryHelpers.get_asset_registry()
    source_data = registry.get_asset_by_object_path(source_walk.get_path_name())
    results = unreal.IKRetargetBatchOperation.duplicate_and_retarget(
        [source_data],
        source_mesh,
        target_mesh,
        retargeter,
        search="MF_Unarmed_Walk_Fwd",
        replace=OUTPUT_WALK_NAME,
        target_path=ANIMATION_DIR,
        use_source_path=False,
        include_referenced_assets=False,
        overwrite_existing_files=True,
    )
    if not results:
        raise RuntimeError("Unreal IK Retargeter did not create a walk AnimSequence")
    walk = next((result.get_asset() for result in results if isinstance(result.get_asset(), unreal.AnimSequence)), None)
    if not walk:
        raise RuntimeError(f"Retarget result contained no AnimSequence: {[str(result) for result in results]}")
    if walk.get_name() != OUTPUT_WALK_NAME:
        desired = f"{ANIMATION_DIR}/{OUTPUT_WALK_NAME}"
        if not unreal.EditorAssetLibrary.rename_loaded_asset(walk, desired):
            raise RuntimeError(f"Could not rename retarget output to {OUTPUT_WALK_NAME}")
    walk.set_preview_skeletal_mesh(target_mesh)
    unreal.EditorAssetLibrary.save_loaded_asset(walk, only_if_is_dirty=False)
    return walk


def main() -> None:
    if not SOURCE_FBX.exists():
        raise RuntimeError(f"Prepared FBX not found: {SOURCE_FBX}")

    source_walk = unreal.load_asset(SOURCE_WALK_PATH)
    if not isinstance(source_walk, unreal.AnimSequence):
        raise RuntimeError(f"Installed Unreal walk not found: {SOURCE_WALK_PATH}")

    target_mesh = import_target_mesh()
    source_mesh = find_source_mesh(source_walk)
    target_rig, target_auto = make_ik_rig(TARGET_RIG_NAME, target_mesh, target=True)
    source_rig, source_auto = make_ik_rig(SOURCE_RIG_NAME, source_mesh, target=False)
    retargeter = make_retargeter(source_rig, target_rig, source_mesh, target_mesh)
    output_walk = retarget_walk(source_walk, source_mesh, target_mesh, retargeter)

    target_bounds = target_mesh.get_bounds()
    report = {
        "engine": unreal.SystemLibrary.get_engine_version(),
        "source_walk": source_walk.get_path_name(),
        "source_walk_seconds": source_walk.get_play_length(),
        "source_mesh": source_mesh.get_path_name(),
        "target_mesh": target_mesh.get_path_name(),
        "target_bounds_extent_cm": [target_bounds.box_extent.x, target_bounds.box_extent.y, target_bounds.box_extent.z],
        "source_ik_rig": source_rig.get_path_name(),
        "target_ik_rig": target_rig.get_path_name(),
        "source_auto_definition": source_auto,
        "target_auto_definition": target_auto,
        "source_chains": chain_report(unreal.IKRigController.get_controller(source_rig)),
        "target_chains": chain_report(unreal.IKRigController.get_controller(target_rig)),
        "retargeter": retargeter.get_path_name(),
        "retarget_operation_count": unreal.IKRetargeterController.get_controller(retargeter).get_num_retarget_ops(),
        "output_walk": output_walk.get_path_name(),
        "output_walk_seconds": output_walk.get_play_length(),
        "animation_authored_in_blender": False,
        "retargeted_in_unreal": True,
        "scope": "walk-only",
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")
    unreal.log(f"UNREAL_WALK_BUILD_OK output={output_walk.get_path_name()}")


if __name__ == "__main__":
    main()
