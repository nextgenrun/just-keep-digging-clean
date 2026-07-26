from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
PACKAGE = ROOT / "sprites" / "vehicles" / "arc-core-v3"
PISKEL = PACKAGE / "piskel"
RUNTIME = PACKAGE / "runtime"
PACK_PATH = ROOT / "values" / "arcCoreVisuals.sprite.json"
PISKEL_TOOLS = ROOT / "tools" / "piskel-mcp"
sys.path.insert(0, str(PISKEL_TOOLS))

from piskel_document import read_piskel  # noqa: E402


BODY_AND_FX = (
    ("small.body", "small-arc-master-v3.png"),
    ("small.ring", "small-arc-gyro-ring-v2.png"),
    ("small.cloud", "small-arc-cloud-v2.png"),
    ("small.beam", "small-arc-twin-beam-v3.png"),
    ("small.impact", "small-arc-impact-v3.png"),
    ("omega.body", "omega-arc-master-v2.png"),
    ("omega.sigil", "omega-arc-lattice-sigil-v2.png"),
    ("omega.cloud", "omega-arc-cloud-v2.png"),
    ("omega.beam", "omega-arc-lattice-beam-v3.png"),
    ("omega.impact", "omega-arc-impact-v3.png"),
)
BACKGROUND = ("stage.background", "arc-stage-background-v3.png")
BODY_PROJECT = PISKEL / "arc-core-body-and-fx-v3.piskel"
BACKGROUND_PROJECT = PISKEL / "arc-core-stage-background-v3.piskel"


def pixel_digest(image: Image.Image) -> str:
    return hashlib.sha256(image.convert("RGBA").tobytes()).hexdigest()


def file_digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_validated_project(
    path: Path,
    definitions: tuple[tuple[str, str], ...],
    expected_size: tuple[int, int],
) -> list[Image.Image]:
    document = json.loads(path.read_text(encoding="utf-8"))
    frames, width, height, _ = read_piskel(path)
    alignment = document.get("jkdAlignment") or {}
    role_entries = alignment.get("roles") or []
    expected_roles = [role for role, _ in definitions]
    actual_roles = [entry.get("role") for entry in role_entries]
    if document.get("modelVersion") != 2:
        raise ValueError(f"Unsupported Piskel model version: {path}")
    if (width, height) != expected_size or len(frames) != len(definitions):
        raise ValueError(f"Piskel project shape mismatch: {path}")
    if alignment.get("policy") != "fixed-canvas-zero-drift":
        raise ValueError(f"Piskel alignment policy mismatch: {path}")
    if alignment.get("driftTolerancePx") != 0:
        raise ValueError(f"Piskel drift tolerance must be zero: {path}")
    if alignment.get("anchorPx") != [width // 2, height // 2]:
        raise ValueError(f"Piskel anchor mismatch: {path}")
    if actual_roles != expected_roles:
        raise ValueError(f"Piskel role order mismatch: {path}")
    for index, (entry, frame) in enumerate(zip(role_entries, frames)):
        if entry.get("frameIndex") != index:
            raise ValueError(f"Piskel frame index mismatch: {path}")
        if entry.get("pixelSha256") != pixel_digest(frame):
            raise ValueError(f"Piskel round-trip pixel mismatch: {path}")
    return frames


def write_runtime(
    frames: list[Image.Image],
    definitions: tuple[tuple[str, str], ...],
) -> list[dict]:
    files = []
    for frame, (role, filename) in zip(frames, definitions):
        output = RUNTIME / filename
        frame.convert("RGBA").save(output, "PNG", optimize=True)
        files.append({
            "type": "image",
            "key": f"arc-core-v3-{role.replace('.', '-')}",
            "url": filename,
            "role": role,
            "sha256": file_digest(output),
        })
    return files


def update_pack(files: list[dict], background: dict) -> None:
    pack = json.loads(PACK_PATH.read_text(encoding="utf-8"))
    pack.pop("arcCoreReviewV3", None)
    pack["arcCoreV3"] = {
        "path": "/sprites/vehicles/arc-core-v3/runtime/",
        "files": files,
    }
    meta = pack["spriteMeta"]
    meta.update({
        "schemaVersion": 3,
        "packageId": "arc-core-v3",
        "approved": True,
        "reviewOnly": False,
        "productionChanged": True,
        "pipeline": "piskel-roundtrip",
        "piskelSources": [
            str(BODY_PROJECT.relative_to(ROOT)).replace("\\", "/"),
            str(BACKGROUND_PROJECT.relative_to(ROOT)).replace("\\", "/"),
        ],
        "canvasSizePx": 512,
        "anchorPx": [256, 256],
        "reviewStage": {
            **background,
            "depth": -2,
        },
        "renderTuning": {
            "idleGhostPhaseRatio": 0.72,
            "chargeGhostAlpha": 0.16,
            "secondaryRotationBoostRatio": 0.72,
            "secondaryChargeBoostRatio": 0.72,
            "cloudEmergenceMin": 0.28,
            "cloudEmergenceRange": 0.72,
            "cloudFrontCounterRotationRatio": 0.62,
            "visibleAlphaThreshold": 0.002,
            "beamPulseTimeScale": 0.035,
            "impactRotationRatio": 0.18,
        },
    })
    meta.pop("stageRoles", None)
    meta.pop("stage", None)
    meta.pop("hudRole", None)
    for mode_id, prefix in (
        ("arcCoreSmall", "small"),
        ("arcCoreOmega", "omega"),
    ):
        meta["modes"][mode_id]["beamRole"] = f"{prefix}.beam"
        meta["modes"][mode_id]["impactRole"] = f"{prefix}.impact"
    PACK_PATH.write_text(json.dumps(pack, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.parse_args()
    RUNTIME.mkdir(parents=True, exist_ok=True)
    body_frames = read_validated_project(
        BODY_PROJECT,
        BODY_AND_FX,
        (512, 512),
    )
    background_frames = read_validated_project(
        BACKGROUND_PROJECT,
        (BACKGROUND,),
        (1280, 720),
    )
    files = write_runtime(body_frames, BODY_AND_FX)
    background_file = write_runtime(background_frames, (BACKGROUND,))[0]
    background_file["piskelSource"] = str(
        BACKGROUND_PROJECT.relative_to(ROOT),
    ).replace("\\", "/")
    update_pack(files, background_file)
    print("Built 10 production Arc roles plus 1 review-stage role through Piskel")


if __name__ == "__main__":
    main()
