"""Render the runtime-authorized Mixamo ledge clip on Survival V4."""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "values/mixamoLedgeAssistRuntime.json"


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def merged_config():
    ledge = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    base = json.loads((ROOT / ledge["baseConfig"]).read_text(encoding="utf-8"))
    base.update({
        "version": ledge["version"],
        "sourceRoot": ledge["sourceRoot"],
        "renderRoot": ledge["renderRoot"],
        "candidateRoot": ledge["candidateRoot"],
        "clips": ledge["clips"],
    })
    return base


def main():
    renderer = load_module(
        "mixamo_ledge_assist_renderer",
        ROOT / "ai-tools/2026-08-19-render-mixamo-accepted-survival.py",
    )
    renderer.CONFIG = merged_config()
    renderer.main()


if __name__ == "__main__":
    main()
