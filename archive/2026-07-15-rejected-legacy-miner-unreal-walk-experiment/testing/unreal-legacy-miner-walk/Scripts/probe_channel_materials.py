"""Verify the persisted texture dependency of each Unreal channel material."""

from __future__ import annotations

import json
from pathlib import Path

import unreal


project_dir = Path(unreal.Paths.project_dir()).resolve()
report = {}
for channel in ("R", "G", "B"):
    material_path = f"/Game/LegacyMinerWalk/Meshy/M_LegacyMiner_Channel_{channel}.M_LegacyMiner_Channel_{channel}"
    material = unreal.load_asset(material_path)
    if not isinstance(material, unreal.Material):
        raise RuntimeError(f"Missing material {channel}")
    textures = unreal.MaterialEditingLibrary.get_material_used_textures(material)
    node = unreal.MaterialEditingLibrary.get_material_property_input_node(material, unreal.MaterialProperty.MP_BASE_COLOR)
    report[channel] = {
        "textures": [texture.get_path_name() for texture in textures],
        "node_texture": node.get_editor_property("texture").get_path_name() if isinstance(node, unreal.MaterialExpressionTextureSample) else None,
        "output": unreal.MaterialEditingLibrary.get_material_property_input_node_output_name(material, unreal.MaterialProperty.MP_BASE_COLOR),
    }

output = project_dir / "SourceAssets" / "unreal-channel-material-probe.json"
output.write_text(json.dumps(report, indent=2), encoding="utf-8")
unreal.log(f"UNREAL_CHANNEL_PROBE_OK output={output}")
