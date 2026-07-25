#!/usr/bin/env python3
"""Offline contract checks for the scenic-world Meshy and Blender pipeline."""

from __future__ import annotations

import ast
import hashlib
import importlib.util
import json
import re
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PIPELINE = ROOT / "pipelines" / "scenic-world"
sys.dont_write_bytecode = True


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


profile = json.loads((PIPELINE / "bake_profile.json").read_text(encoding="utf-8"))
reference = profile["referenceViewport"]
master = profile["masterViewport"]
require(profile["tileSizePx"] == 94, "tile scale drifted from 94 px per world unit")
require(
    abs(profile["camera"]["orthoHeightWorldUnits"] - reference["heightPx"] / 94) < 1e-9,
    "orthographic camera no longer preserves the 94 px contract",
)
require(master["widthPx"] == reference["widthPx"] * profile["masterScale"], "master width mismatch")
require(master["heightPx"] == reference["heightPx"] * profile["masterScale"], "master height mismatch")
require(profile["render"]["engine"] == "BLENDER_EEVEE", "Blender 5.1 Eevee engine enum mismatch")
require(profile["render"]["viewTransform"] == "AgX", "beauty view transform drifted")
require(profile["promotionRules"]["optionalNeutralPasses"] == [], "neutral pass promotion became implicit")
require(
    profile["passes"] == ["beauty", "albedo", "normal", "depth", "ao", "emissive"],
    "required bake pass contract changed",
)

sources = {}
for filename in ("meshy_ingest.py", "blender_bake.py"):
    source = (PIPELINE / filename).read_text(encoding="utf-8")
    ast.parse(source, filename=filename)
    sources[filename] = source

combined = "\n".join(path.read_text(encoding="utf-8") for path in PIPELINE.iterdir() if path.is_file())
require(not re.search(r"msy_[A-Za-z0-9]+", combined), "a Meshy-like secret was committed to the pipeline")
require("MESHY_API_KEY" in sources["meshy_ingest.py"], "environment-only authentication is missing")
require("--api-key" not in sources["meshy_ingest.py"], "an unsafe command-line key option was added")
require("--confirm-spend" in sources["meshy_ingest.py"], "explicit spend confirmation is missing")
require("--max-credits" in sources["meshy_ingest.py"], "operator credit ceiling is missing")
require("--required-credits" not in sources["meshy_ingest.py"], "caller-trusted credit estimate remains")
require("automaticDownload" in sources["meshy_ingest.py"], "manual community fallback is missing")
require("https://www.meshy.ai/terms-of-use" in sources["meshy_ingest.py"], "official terms URL drifted")
require("linear_colorspace_settings.name = \"Non-Color\"" in sources["blender_bake.py"], "data passes are not non-color")
require("provenanceAudit" in sources["blender_bake.py"], "bake provenance audit is missing")
require("\"promotion\": promotion" in sources["blender_bake.py"], "promotion readiness is missing")

spec = importlib.util.spec_from_file_location("scenic_meshy_ingest", PIPELINE / "meshy_ingest.py")
require(spec is not None and spec.loader is not None, "could not load Meshy intake module")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
require(module.estimate_credits("text-to-3d", {"mode": "preview", "prompt": "mine", "ai_model": "latest"}) == 20, "Meshy-6 preview price mismatch")
require(module.estimate_credits("text-to-3d", {"mode": "refine", "preview_task_id": "task"}) == 10, "refine price mismatch")
require(module.estimate_credits("multi-image-to-3d", {"image_urls": ["data:image/png;base64,x"], "ai_model": "meshy-5", "should_texture": False}) == 5, "legacy untextured multi-image price mismatch")
try:
    module.estimate_credits("multi-image-to-3d", {"image_urls": ["x"], "should_texture": False, "enable_pbr": True})
except module.PipelineError:
    pass
else:
    raise AssertionError("ambiguous texture pricing combination was accepted")

with tempfile.TemporaryDirectory() as directory:
    temp = Path(directory)
    sample = temp / "sample.bin"
    sample.write_bytes(b"scenic-world-contract")
    require(module.sha256_file(sample) == hashlib.sha256(sample.read_bytes()).hexdigest(), "SHA-256 mismatch")
    request_path = module.write_community_review_request(temp, "Medieval Mine", "offline smoke test")
    request = json.loads(request_path.read_text(encoding="utf-8"))
    require(request["automaticDownload"] is False, "community fallback must never auto-download")
    require(request["status"] == "manual-review-required", "community fallback is not review-gated")
    require(request["suggestedSearchUrl"].endswith("/medieval-mine"), "community category URL mismatch")

print("scenic-world pipeline smoke: PASS")
