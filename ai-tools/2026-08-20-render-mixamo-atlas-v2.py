"""Render the review-only Mixamo atlas V2 shortlist on Survival V4."""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DRAFT_PATH = ROOT / (
    "testing/blender-animation-lab-v1/review-drafts/mixamo-atlas-v2/config.json"
)


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def merged_config():
    draft = json.loads(DRAFT_PATH.read_text(encoding="utf-8"))
    base = json.loads((ROOT / draft["baseConfig"]).read_text(encoding="utf-8"))
    prefix = draft["sourceBonePrefix"]
    old_prefix = "mixamorig:"
    retarget = base["retarget"]
    retarget["boneMap"] = {
        target: source.replace(old_prefix, prefix, 1)
        for target, source in retarget["boneMap"].items()
    }
    retarget["driverChildren"] = {
        target: [
            [child_target, child_source.replace(old_prefix, prefix, 1)]
            for child_target, child_source in children
        ]
        for target, children in retarget["driverChildren"].items()
    }
    retarget["worldDeltaBones"] = {
        target: source.replace(old_prefix, prefix, 1)
        for target, source in retarget["worldDeltaBones"].items()
    }
    retarget["sourceHipBone"] = f"{prefix}Hips"
    base.update({
        "version": draft["version"],
        "renderRoot": draft["renderRoot"],
        "candidateRoot": draft["candidateRoot"],
        "clips": draft["clips"],
    })
    return base


def main():
    renderer = load_module(
        "mixamo_atlas_v2_renderer",
        ROOT / "ai-tools/2026-08-19-render-mixamo-accepted-survival.py",
    )
    renderer.CONFIG = merged_config()
    renderer.main()


if __name__ == "__main__":
    main()
