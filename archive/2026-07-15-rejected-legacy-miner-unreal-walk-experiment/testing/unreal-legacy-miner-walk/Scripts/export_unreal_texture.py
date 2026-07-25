"""Export the Unreal-imported Meshy texture for payload verification."""

from __future__ import annotations

from pathlib import Path

import unreal


PROJECT_DIR = Path(unreal.Paths.project_dir()).resolve()
TEXTURES = {
    "color": "/Game/LegacyMinerWalk/Meshy/T_LegacyMiner_texture_0.T_LegacyMiner_texture_0",
    "R": "/Game/LegacyMinerWalk/Meshy/T_LegacyMiner_channel_R.T_LegacyMiner_channel_R",
    "G": "/Game/LegacyMinerWalk/Meshy/T_LegacyMiner_channel_G.T_LegacyMiner_channel_G",
    "B": "/Game/LegacyMinerWalk/Meshy/T_LegacyMiner_channel_B.T_LegacyMiner_channel_B",
}


for label, texture_path in TEXTURES.items():
    texture = unreal.load_asset(texture_path)
    if not isinstance(texture, unreal.Texture2D):
        raise RuntimeError(f"The Unreal-imported texture {label} is unavailable")
    output_path = PROJECT_DIR / "SourceAssets" / f"unreal-exported-legacy-miner-{label}.png"
    task = unreal.AssetExportTask()
    task.set_editor_properties(
        {
            "object": texture,
            "filename": str(output_path),
            "automated": True,
            "prompt": False,
            "replace_identical": True,
            "write_empty_files": False,
            "exporter": unreal.TextureExporterPNG(),
        }
    )
    if not unreal.Exporter.run_asset_export_task(task):
        raise RuntimeError(f"Unreal could not export texture payload {label}")
    unreal.log(f"UNREAL_TEXTURE_EXPORT_OK label={label} output={output_path}")
