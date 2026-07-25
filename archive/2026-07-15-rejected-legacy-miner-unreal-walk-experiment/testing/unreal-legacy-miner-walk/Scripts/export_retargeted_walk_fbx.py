"""Export the native Unreal-retargeted walk and preview mesh for Blender polish."""

from __future__ import annotations

from pathlib import Path

import unreal


PROJECT_DIR = Path(unreal.Paths.project_dir()).resolve()
OUTPUT_PATH = PROJECT_DIR / "SourceAssets" / "legacy-miner-unreal-walk-retargeted.fbx"
WALK_PATH = "/Game/LegacyMinerWalk/Animations/LegacyMiner_Unreal_Unarmed_Walk.LegacyMiner_Unreal_Unarmed_Walk"


walk = unreal.load_asset(WALK_PATH)
if not isinstance(walk, unreal.AnimSequence):
    raise RuntimeError("The Unreal-retargeted Legacy Miner walk is unavailable")

options = unreal.FbxExportOption()
options.set_editor_properties(
    {
        "ascii": False,
        "force_front_x_axis": True,
        "export_preview_mesh": True,
        "export_morph_targets": False,
        "level_of_detail": False,
        "vertex_color": True,
    }
)

task = unreal.AssetExportTask()
task.set_editor_properties(
    {
        "object": walk,
        "filename": str(OUTPUT_PATH),
        "automated": True,
        "prompt": False,
        "replace_identical": True,
        "write_empty_files": False,
        "exporter": unreal.AnimSequenceExporterFBX(),
        "options": options,
    }
)
if not unreal.Exporter.run_asset_export_task(task):
    raise RuntimeError("Unreal could not export the retargeted walk FBX")
if not OUTPUT_PATH.exists() or OUTPUT_PATH.stat().st_size < 100_000:
    raise RuntimeError("The exported retargeted walk FBX is missing or unexpectedly small")

unreal.log(
    f"UNREAL_WALK_FBX_OK output={OUTPUT_PATH} bytes={OUTPUT_PATH.stat().st_size} duration={walk.get_play_length():.6f}"
)
