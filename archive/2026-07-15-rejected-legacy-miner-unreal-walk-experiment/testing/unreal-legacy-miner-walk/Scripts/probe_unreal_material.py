"""Report the saved Unreal material graph and skeletal-mesh slot bindings."""

from __future__ import annotations

import json
from pathlib import Path

import unreal


PROJECT_DIR = Path(unreal.Paths.project_dir()).resolve()
OUTPUT_PATH = PROJECT_DIR / "SourceAssets" / "unreal-material-probe.json"
MESH_PATH = "/Game/LegacyMinerWalk/Meshy/SK_LegacyMiner_Meshy_v2.SK_LegacyMiner_Meshy_v2"
MATERIAL_PATH = "/Game/LegacyMinerWalk/Meshy/M_LegacyMiner_Unreal.M_LegacyMiner_Unreal"


mesh = unreal.load_asset(MESH_PATH)
material = unreal.load_asset(MATERIAL_PATH)
texture = unreal.load_asset("/Game/LegacyMinerWalk/Meshy/T_LegacyMiner_texture_0.T_LegacyMiner_texture_0")
if not isinstance(mesh, unreal.SkeletalMesh) or not isinstance(material, unreal.Material):
    raise RuntimeError("Expected mesh and real Unreal material are unavailable")

slots = mesh.get_editor_property("materials")
report = {
    "material": material.get_path_name(),
    "material_shading_model": str(material.get_editor_property("shading_model")),
    "emissive_output_name": unreal.MaterialEditingLibrary.get_material_property_input_node_output_name(material, unreal.MaterialProperty.MP_EMISSIVE_COLOR),
    "texture": {
        "path": texture.get_path_name() if texture else None,
        "srgb": texture.get_editor_property("srgb") if texture else None,
        "compression_settings": str(texture.get_editor_property("compression_settings")) if texture else None,
        "api": [name for name in dir(texture) if "format" in name.lower() or "compress" in name.lower() or "color" in name.lower() or "size" in name.lower()] if texture else [],
    },
    "unreal_compile_api": [name for name in dir(unreal) if "compil" in name.lower() or "shader" in name.lower()],
    "material_usage_values": [name for name in dir(unreal.MaterialUsage) if not name.startswith("_")],
    "get_material_used_textures_doc": str(unreal.MaterialEditingLibrary.get_material_used_textures.__doc__),
    "material_editing_api": [name for name in dir(unreal.MaterialEditingLibrary) if "material" in name.lower() or "texture" in name.lower() or "expression" in name.lower()],
    "mesh_material_api": [name for name in dir(mesh) if "material" in name.lower()],
    "mesh_slots": [],
    "expressions": [],
}
for expression in unreal.MaterialEditingLibrary.get_material_expressions(material):
    item = {"class": expression.get_class().get_name()}
    if isinstance(expression, unreal.MaterialExpressionTextureSample):
        item["texture"] = expression.get_editor_property("texture").get_path_name()
        item["sampler_type"] = str(expression.get_editor_property("sampler_type"))
        item["outputs"] = list(unreal.MaterialEditingLibrary.get_material_expression_output_names(expression))
    report["expressions"].append(item)
for slot in slots:
    interface = slot.get_editor_property("material_interface")
    report["mesh_slots"].append(interface.get_path_name() if interface else None)

for property_name in (unreal.MaterialProperty.MP_BASE_COLOR, unreal.MaterialProperty.MP_ROUGHNESS, unreal.MaterialProperty.MP_SPECULAR):
    key = str(property_name)
    try:
        node = unreal.MaterialEditingLibrary.get_material_property_input_node(material, property_name)
        report[key] = node.get_path_name() if node else None
    except Exception as error:
        report[key] = f"ERROR: {error}"

OUTPUT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
unreal.log(f"UNREAL_MATERIAL_PROBE_OK output={OUTPUT_PATH}")
