"""Export every UAL-to-Survival Unreal clip with the approved preview mesh."""

from __future__ import annotations

import json
import re
from pathlib import Path

import unreal


PROJECT_DIR = Path(unreal.Paths.project_dir()).resolve()
OUTPUT_DIR = PROJECT_DIR / "SourceAssets" / "ual-exports"
REPORT_PATH = PROJECT_DIR / "SourceAssets" / "ual-survival-export-report.json"
CLIPS = (
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


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


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
        asset_name = f"Survival_UAL_{label}"
        asset_path = f"/Game/SurvivalMotion/UALAnimations/{asset_name}.{asset_name}"
        animation = unreal.load_asset(asset_path)
        if not isinstance(animation, unreal.AnimSequence):
            raise RuntimeError(f"UAL-retargeted Survival clip unavailable: {asset_path}")
        output_path = OUTPUT_DIR / f"survival-ual-{slug(label)}.fbx"
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
        unreal.log(f"UAL_SURVIVAL_FBX_OK label={label} output={output_path}")

    REPORT_PATH.write_text(json.dumps({"clips": rows}, indent=2), encoding="utf-8")
    unreal.log(f"UAL_SURVIVAL_EXPORT_OK count={len(rows)} report={REPORT_PATH}")


if __name__ == "__main__":
    main()
