"""Export each native Unreal-retargeted Survival clip with its preview mesh."""

from __future__ import annotations

import json
from pathlib import Path

import unreal


PROJECT_DIR = Path(unreal.Paths.project_dir()).resolve()
OUTPUT_DIR = PROJECT_DIR / "SourceAssets" / "exports"
REPORT_PATH = PROJECT_DIR / "SourceAssets" / "survival-motion-export-report.json"
CLIPS = (
    "idle",
    "walk",
    "run",
    "fly",
    "attack",
    "dig_up",
    "dig_down",
    "mining_strike",
)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
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

    rows = {}
    for label in CLIPS:
        asset_path = f"/Game/SurvivalMotion/Animations/Survival_{label}.Survival_{label}"
        animation = unreal.load_asset(asset_path)
        if not isinstance(animation, unreal.AnimSequence):
            raise RuntimeError(f"Retargeted Survival clip unavailable: {asset_path}")
        output_path = OUTPUT_DIR / f"survival-{label.replace('_', '-')}-retargeted.fbx"
        task = unreal.AssetExportTask()
        task.set_editor_properties(
            {
                "object": animation,
                "filename": str(output_path),
                "automated": True,
                "prompt": False,
                "replace_identical": True,
                "write_empty_files": False,
                "exporter": unreal.AnimSequenceExporterFBX(),
                "options": options,
            }
        )
        if not unreal.Exporter.run_asset_export_task(task):
            raise RuntimeError(f"Unreal could not export {label}")
        if not output_path.exists() or output_path.stat().st_size < 100_000:
            raise RuntimeError(f"Export missing or unexpectedly small: {output_path}")
        rows[label] = {
            "asset": asset_path,
            "file": str(output_path),
            "bytes": output_path.stat().st_size,
            "seconds": animation.get_play_length(),
        }
        unreal.log(f"SURVIVAL_MOTION_FBX_OK label={label} output={output_path}")

    REPORT_PATH.write_text(json.dumps({"clips": rows}, indent=2), encoding="utf-8")
    unreal.log(f"SURVIVAL_MOTION_EXPORT_OK count={len(rows)} report={REPORT_PATH}")


if __name__ == "__main__":
    main()
