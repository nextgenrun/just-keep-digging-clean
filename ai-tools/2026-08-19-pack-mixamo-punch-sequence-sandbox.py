"""Gate and pack the review-only Mixamo punch library without runtime writes."""

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


packer = load_module(
    "mixamo_survival_packer",
    ROOT / "ai-tools/2026-08-19-pack-mixamo-accepted-survival.py",
)
base = json.loads(
    (ROOT / "values/mixamoPunchSequenceSandbox.json").read_text(encoding="utf-8")
)
expansion = json.loads(
    (ROOT / "values/mixamoCombatExpansionClips.json").read_text(encoding="utf-8")
)
base["version"] = expansion["version"]
base["clips"] = {**base["clips"], **expansion["clips"]}
packer.CONFIG = base
report_root = ROOT / base["renderRoot"]
base_report_path = report_root / "render-report-base-v1.json"
report_path = report_root / "render-report.json"
if base_report_path.is_file() and report_path.is_file():
    prior_report = json.loads(base_report_path.read_text(encoding="utf-8"))
    current_report = json.loads(report_path.read_text(encoding="utf-8"))
    current_report["clips"] = {**prior_report.get("clips", {}), **current_report["clips"]}
    report_path.write_text(json.dumps(current_report, indent=2) + "\n", encoding="utf-8")
packer.main()
