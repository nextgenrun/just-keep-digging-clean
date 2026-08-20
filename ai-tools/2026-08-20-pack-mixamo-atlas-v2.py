"""Gate and pack the review-only Mixamo atlas V2 renders."""

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
    base.update({
        "version": draft["version"],
        "renderRoot": draft["renderRoot"],
        "candidateRoot": draft["candidateRoot"],
        "clips": draft["clips"],
    })
    return base


def main():
    packer = load_module(
        "mixamo_atlas_v2_packer",
        ROOT / "ai-tools/2026-08-19-pack-mixamo-accepted-survival.py",
    )
    packer.CONFIG = merged_config()
    packer.main()


if __name__ == "__main__":
    main()
