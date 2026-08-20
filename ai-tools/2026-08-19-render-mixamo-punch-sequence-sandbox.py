"""Render the review-only Mixamo punch library through the Survival V4 rig."""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


renderer = load_module(
    "mixamo_survival_renderer",
    ROOT / "ai-tools/2026-08-19-render-mixamo-accepted-survival.py",
)
base = json.loads(
    (ROOT / "values/mixamoPunchSequenceSandbox.json").read_text(encoding="utf-8")
)
expansion = json.loads(
    (ROOT / "values/mixamoCombatExpansionClips.json").read_text(encoding="utf-8")
)
base["version"] = expansion["version"]
base["clips"] = expansion["clips"]
renderer.CONFIG = base
report_path = ROOT / base["renderRoot"] / "render-report.json"
prior_report = json.loads(report_path.read_text(encoding="utf-8")) if report_path.is_file() else None
renderer.main()
if prior_report:
    current_report = json.loads(report_path.read_text(encoding="utf-8"))
    current_report["clips"] = {**prior_report.get("clips", {}), **current_report["clips"]}
    report_path.write_text(json.dumps(current_report, indent=2) + "\n", encoding="utf-8")
