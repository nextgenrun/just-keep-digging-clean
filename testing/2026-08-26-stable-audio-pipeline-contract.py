"""Focused contract for the review-only Stable Audio generation pipeline."""

from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PIPELINE_DIR = ROOT / "pipelines/audio"
GENERATOR_PATH = PIPELINE_DIR / "2026-08-26-generate-stable-audio-library.py"
CONFIG_PATH = PIPELINE_DIR / "2026-08-26-stable-audio-pipeline.json"


def load_generator():
    sys.path.insert(0, str(PIPELINE_DIR))
    spec = importlib.util.spec_from_file_location("stable_audio_generator", GENERATOR_PATH)
    if not spec or not spec.loader:
        raise AssertionError("Unable to load Stable Audio generator")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> int:
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    generator = load_generator()
    assets = generator.load_assets(ROOT / config["sourceCsv"])

    require(len(assets) == 200, "GX prompt corpus must retain 200 assets")
    require(len({asset["id"] for asset in assets}) == 200, "GX ids must remain unique")
    require(set(config["models"]) == {"stable-audio-3", "stable-audio-2.5"}, "Expected both guarded models")
    require(config["models"]["stable-audio-3"]["creditsPerGeneration"] == 26, "Stable Audio 3 credit price drifted")
    require(config["models"]["stable-audio-2.5"]["creditsPerGeneration"] == 20, "Stable Audio 2.5 credit price drifted")

    one_shot = next(asset for asset in assets if asset["type"] == "One Shot")
    loop = next(asset for asset in assets if asset["type"] == "Loop")
    one_shot_jobs = generator.build_jobs([one_shot], config, 1, None)
    loop_jobs = generator.build_jobs([loop], config, 1, None)
    full_jobs = generator.build_jobs(assets, config, 1, None)
    require([job["layer"] for job in one_shot_jobs] == ["onset", "body", "debris", "tail"], "One-shot layer contract drifted")
    require([job["layer"] for job in loop_jobs] == ["low-bed", "mid-texture", "high-detail", "accent-events"], "Loop layer contract drifted")
    require(all(job["file"].startswith(one_shot["id"] + "_") for job in one_shot_jobs), "Asset id must lead filenames")
    require(all(job["file"].endswith("__UNTESTED.wav") for job in one_shot_jobs), "Raw files must remain UNTESTED")
    require(len({job["seed"] for job in one_shot_jobs + loop_jobs}) == 8, "Layer seeds must be deterministic and distinct")
    require(len(full_jobs) == 800, "Full one-take corpus must plan exactly 800 layered generations")
    require(len(full_jobs) * 26 == 20_800, "Full Stable Audio 3 plan must remain 20,800 credits")

    api_module = sys.modules["stableAudioApi"]
    multipart, content_type = api_module.encode_multipart({"prompt": "stone impact", "model": "stable-audio-3"})
    require(content_type.startswith("multipart/form-data; boundary="), "API body must be multipart")
    require(b'name="prompt"' in multipart and b"stone impact" in multipart, "Multipart prompt is missing")
    require(b'name="none"; filename=""' in multipart, "Stability multipart sentinel is missing")

    dry_run = subprocess.run(
        [sys.executable, str(GENERATOR_PATH), "--ids", one_shot["id"], "--layers", "onset"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    require(dry_run.returncode == 0, dry_run.stderr or "Dry run failed")
    require("1 generations, 26 credits ($0.26)" in dry_run.stdout, "Dry-run cost gate drifted")
    require("Dry run only" in dry_run.stdout, "Dry-run default must remain explicit")

    execute_guard = subprocess.run(
        [sys.executable, str(GENERATOR_PATH), "--ids", one_shot["id"], "--layers", "onset", "--execute"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    require(execute_guard.returncode == 2, "Paid execution without a credit ceiling must fail")
    require("--max-credits must be at least" in execute_guard.stderr, "Credit ceiling failure must be clear")

    source = GENERATOR_PATH.read_text(encoding="utf-8")
    require("STABILITY_API_KEY" in source, "Generator must use the environment key")
    require("--api-key" not in source, "Generator must not accept secrets on the command line")
    require("runtimeWired\": False" in source, "Generated manifest must remain review-only")

    print("Stable Audio pipeline contract: ok (200 prompts; layered dry-run; paid guard; review-only output)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
