"""Wire the extracted Meshy texture into a deterministic Unreal material."""

from __future__ import annotations

import unreal


MESH_PATH = "/Game/LegacyMinerWalk/Meshy/SK_LegacyMiner_Meshy_v2.SK_LegacyMiner_Meshy_v2"
MATERIAL_PATH = "/Game/LegacyMinerWalk/Meshy/M_LegacyMiner_Unreal.M_LegacyMiner_Unreal"
TEXTURE_PATH = "/Game/LegacyMinerWalk/Meshy/T_LegacyMiner_texture_0.T_LegacyMiner_texture_0"


mesh = unreal.load_asset(MESH_PATH)
material = unreal.load_asset(MATERIAL_PATH)
texture = unreal.load_asset(TEXTURE_PATH)
if not isinstance(mesh, unreal.SkeletalMesh):
    raise RuntimeError("Legacy Miner skeletal mesh is unavailable")
if not isinstance(material, unreal.Material):
    material = unreal.AssetToolsHelpers.get_asset_tools().create_asset(
        "M_LegacyMiner_Unreal",
        "/Game/LegacyMinerWalk/Meshy",
        unreal.Material,
        unreal.MaterialFactoryNew(),
    )
if not isinstance(material, unreal.Material) or not isinstance(texture, unreal.Texture2D):
    raise RuntimeError("Legacy Miner Unreal material or texture is unavailable")

unreal.MaterialEditingLibrary.delete_all_material_expressions(material)
texture_sample = unreal.MaterialEditingLibrary.create_material_expression(
    material,
    unreal.MaterialExpressionTextureSample,
    -620,
    -100,
)
texture_sample.set_editor_property("texture", texture)
append_rg = unreal.MaterialEditingLibrary.create_material_expression(
    material,
    unreal.MaterialExpressionAppendVector,
    -400,
    -120,
)
append_rgb = unreal.MaterialEditingLibrary.create_material_expression(
    material,
    unreal.MaterialExpressionAppendVector,
    -180,
    -100,
)
connections = [
    unreal.MaterialEditingLibrary.connect_material_expressions(texture_sample, "R", append_rg, "A"),
    unreal.MaterialEditingLibrary.connect_material_expressions(texture_sample, "G", append_rg, "B"),
    unreal.MaterialEditingLibrary.connect_material_expressions(append_rg, "", append_rgb, "A"),
    unreal.MaterialEditingLibrary.connect_material_expressions(texture_sample, "B", append_rgb, "B"),
    unreal.MaterialEditingLibrary.connect_material_property(append_rgb, "", unreal.MaterialProperty.MP_BASE_COLOR),
]
if not all(connections):
    raise RuntimeError(f"Could not construct explicit RGB vector: {connections}")
material.set_editor_property("two_sided", False)
material.set_editor_property("shading_model", unreal.MaterialShadingModel.MSM_DEFAULT_LIT)
unreal.MaterialEditingLibrary.set_material_usage(
    material,
    unreal.MaterialUsage.MATUSAGE_SKELETAL_MESH,
)
unreal.MaterialEditingLibrary.layout_material_expressions(material)
unreal.MaterialEditingLibrary.recompile_material(material)
unreal.EditorAssetLibrary.save_loaded_asset(material, only_if_is_dirty=False)

slots = mesh.get_editor_property("materials")
new_slots = []
for slot in slots:
    new_slot = unreal.SkeletalMaterial()
    new_slot.set_editor_property("material_interface", material)
    new_slot.set_editor_property("material_slot_name", slot.get_editor_property("material_slot_name"))
    new_slots.append(new_slot)
mesh.set_editor_property("materials", new_slots)
unreal.EditorAssetLibrary.save_loaded_asset(mesh, only_if_is_dirty=False)

base_color_node = unreal.MaterialEditingLibrary.get_material_property_input_node(
    material,
    unreal.MaterialProperty.MP_BASE_COLOR,
)
if not isinstance(base_color_node, unreal.MaterialExpressionAppendVector):
    raise RuntimeError("Material compiled without the explicit Meshy RGB vector")
if texture not in unreal.MaterialEditingLibrary.get_material_used_textures(material):
    raise RuntimeError("The explicit RGB graph lost the Meshy texture dependency")

persisted_slots = mesh.get_editor_property("materials")
if any(slot.get_editor_property("material_interface") != material for slot in persisted_slots):
    raise RuntimeError("The Unreal material did not persist on every skeletal-mesh slot")

unreal.log(f"UNREAL_MATERIAL_OK texture={texture.get_path_name()} slots={len(persisted_slots)}")
