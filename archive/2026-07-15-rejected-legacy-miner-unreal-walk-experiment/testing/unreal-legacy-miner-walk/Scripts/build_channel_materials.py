"""Build R/G/B channel materials for deterministic headless Unreal capture."""

from __future__ import annotations

from pathlib import Path

import unreal


PROJECT_DIR = Path(unreal.Paths.project_dir()).resolve()
MATERIAL_DIR = "/Game/LegacyMinerWalk/Meshy"
CHANNELS = ("R", "G", "B")


for channel in CHANNELS:
    texture_name = f"T_LegacyMiner_channel_{channel}"
    texture_path = f"{MATERIAL_DIR}/{texture_name}.{texture_name}"
    source_path = PROJECT_DIR / "SourceAssets" / "Textures" / f"{texture_name}.png"
    if not source_path.exists():
        raise RuntimeError(f"Missing prepared texture channel: {source_path}")

    import_task = unreal.AssetImportTask()
    import_task.set_editor_properties(
        {
            "filename": str(source_path),
            "destination_path": MATERIAL_DIR,
            "destination_name": texture_name,
            "automated": True,
            "replace_existing": True,
            "replace_existing_settings": False,
            "save": True,
        }
    )
    unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks([import_task])
    texture = unreal.load_asset(texture_path)
    if not isinstance(texture, unreal.Texture2D):
        raise RuntimeError(f"Could not import Unreal texture channel {channel}")
    texture.set_editor_property("srgb", True)
    texture.set_editor_property("compression_settings", unreal.TextureCompressionSettings.TC_DEFAULT)
    unreal.EditorAssetLibrary.save_loaded_asset(texture, only_if_is_dirty=False)

    asset_name = f"M_LegacyMiner_Channel_{channel}"
    asset_path = f"{MATERIAL_DIR}/{asset_name}.{asset_name}"
    material = unreal.load_asset(asset_path)
    if not isinstance(material, unreal.Material):
        material = unreal.AssetToolsHelpers.get_asset_tools().create_asset(
            asset_name,
            MATERIAL_DIR,
            unreal.Material,
            unreal.MaterialFactoryNew(),
        )
    if not isinstance(material, unreal.Material):
        raise RuntimeError(f"Could not create channel material {channel}")

    unreal.MaterialEditingLibrary.delete_all_material_expressions(material)
    texture_sample = unreal.MaterialEditingLibrary.create_material_expression(
        material,
        unreal.MaterialExpressionTextureSample,
        -300,
        0,
    )
    texture_sample.set_editor_property("texture", texture)
    if not unreal.MaterialEditingLibrary.connect_material_property(
        texture_sample,
        channel,
        unreal.MaterialProperty.MP_BASE_COLOR,
    ):
        raise RuntimeError(f"Could not connect texture channel {channel}")
    material.set_editor_property("two_sided", False)
    material.set_editor_property("shading_model", unreal.MaterialShadingModel.MSM_DEFAULT_LIT)
    unreal.MaterialEditingLibrary.set_material_usage(
        material,
        unreal.MaterialUsage.MATUSAGE_SKELETAL_MESH,
    )
    unreal.MaterialEditingLibrary.layout_material_expressions(material)
    unreal.MaterialEditingLibrary.recompile_material(material)
    unreal.EditorAssetLibrary.save_loaded_asset(material, only_if_is_dirty=False)

    node = unreal.MaterialEditingLibrary.get_material_property_input_node(
        material,
        unreal.MaterialProperty.MP_BASE_COLOR,
    )
    output = unreal.MaterialEditingLibrary.get_material_property_input_node_output_name(
        material,
        unreal.MaterialProperty.MP_BASE_COLOR,
    )
    if not isinstance(node, unreal.MaterialExpressionTextureSample) or output != channel:
        raise RuntimeError(f"Channel material {channel} did not persist correctly")
    unreal.log(f"UNREAL_CHANNEL_MATERIAL_OK channel={channel} asset={material.get_path_name()}")

unreal.log("UNREAL_CHANNEL_MATERIALS_OK count=3")
