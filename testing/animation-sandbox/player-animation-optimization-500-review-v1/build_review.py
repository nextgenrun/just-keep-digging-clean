"""Build the review-only 500-point animation atlas and comparison artifacts."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

from PIL import Image


REVIEW_DIR = Path(__file__).resolve().parent
ROOT = REVIEW_DIR.parents[2]
PIPELINE_DIR = ROOT / "pipelines" / "piskel"
CONFIG_PATH = ROOT / "values" / "playerAnimationOptimization500Review.json"
sys.path.insert(0, str(PIPELINE_DIR))

from optimization_candidates import (  # noqa: E402
    build_landing_candidate,
    build_recovery_candidate,
    build_wall_candidate,
    pack_candidates,
)
from optimization_catalog import materialize_catalog, write_catalog  # noqa: E402
from optimization_metrics import build_metrics  # noqa: E402
from optimization_renderer import build_contact_sheet, save_comparison_gif  # noqa: E402
from optimization_sequences import build_scenarios  # noqa: E402


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _resolve_output(config: dict[str, Any], key: str) -> Path:
    return REVIEW_DIR / config["outputs"][key]


def _load_sheets(config: dict[str, Any]) -> dict[str, Image.Image]:
    sheets = {}
    for key, source in config["sources"].items():
        path = ROOT / source["file"]
        if not path.is_file():
            raise FileNotFoundError(f"missing {key} source: {path}")
        sheets[key] = Image.open(path).convert("RGBA")
    return sheets


def _assert_review_isolation(config: dict[str, Any]) -> None:
    if config.get("reviewOnly") is not True:
        raise ValueError("review config must remain reviewOnly")
    if config.get("productionChanged") is not False:
        raise ValueError("review build cannot mark production as changed")
    if len(config["families"]) != int(config["catalog"]["expectedFamilyCount"]):
        raise ValueError("animation-family count does not match the review contract")
    if len(config["lenses"]) != int(config["catalog"]["expectedLensCount"]):
        raise ValueError("optimization-lens count does not match the review contract")


def _save_metrics(metrics: dict[str, Any], path: Path) -> None:
    path.write_text(
        json.dumps(metrics, separators=(",", ":"), ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    config = _load_json(CONFIG_PATH)
    _assert_review_isolation(config)
    generated = REVIEW_DIR / "generated"
    generated.mkdir(parents=True, exist_ok=True)
    sheets = _load_sheets(config)

    catalog = materialize_catalog(config)
    catalog_path = _resolve_output(config, "catalog")
    write_catalog(catalog, catalog_path)

    recovery = build_recovery_candidate(sheets, config)
    landing = build_landing_candidate(sheets, config)
    wall = build_wall_candidate(sheets, config)
    candidates = {"recovery": recovery, "landing": landing, "wall": wall}
    candidate_sheet, candidate_layout = pack_candidates(
        recovery,
        landing,
        wall,
        config["geometry"],
    )
    candidate_path = _resolve_output(config, "candidateSheet")
    candidate_sheet.save(candidate_path, "WEBP", lossless=True, quality=100, method=6)

    scenarios = build_scenarios(sheets, candidates, config)
    scenario_meta = {item["id"]: item for item in config["scenarios"]}
    rendered = {}
    for scenario in scenarios:
        meta = scenario_meta[scenario["id"]]
        rendered[scenario["id"]] = save_comparison_gif(
            scenario,
            meta,
            config,
            REVIEW_DIR / meta["output"],
        )

    contact_sheet = build_contact_sheet(rendered, scenarios, config)
    contact_path = _resolve_output(config, "contactSheet")
    contact_sheet.save(contact_path, "PNG", optimize=True)

    metrics = build_metrics(scenarios, config)
    metrics["catalog"] = {
        "pointCount": catalog["pointCount"],
        "familyCount": catalog["familyCount"],
        "lensCount": catalog["lensCount"],
        "verifiedHotspotCount": catalog["verifiedHotspotCount"],
        "priorityCounts": catalog["priorityCounts"],
    }
    metrics["candidateLayout"] = candidate_layout
    metrics["artifacts"] = {
        "catalogBytes": catalog_path.stat().st_size,
        "candidateSheetBytes": candidate_path.stat().st_size,
        "contactSheetBytes": contact_path.stat().st_size,
        "comparisonGifBytes": {
            item["id"]: (REVIEW_DIR / item["output"]).stat().st_size
            for item in config["scenarios"]
        },
    }
    _save_metrics(metrics, _resolve_output(config, "metrics"))

    print(json.dumps({
        "reviewOnly": True,
        "productionChanged": False,
        "optimizationPoints": catalog["pointCount"],
        "families": catalog["familyCount"],
        "lenses": catalog["lensCount"],
        "comparisons": len(scenarios),
        "metrics": metrics,
    }, indent=2))


if __name__ == "__main__":
    main()
