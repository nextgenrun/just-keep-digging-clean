from __future__ import annotations

import hashlib
import sys
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
PACKAGE = ROOT / "sprites" / "vehicles" / "arc-core-v3"
SOURCE = PACKAGE / "source"
PISKEL = PACKAGE / "piskel"
PISKEL_TOOLS = ROOT / "tools" / "piskel-mcp"
sys.path.insert(0, str(PISKEL_TOOLS))

from piskel_document import make_piskel, read_piskel, write_json  # noqa: E402


INPUT_PROJECT = PISKEL / "arc-core-body-and-fx-v3.piskel"
OUTPUT_PROJECT = PISKEL / "arc-core-body-and-fx-v4.piskel"
SMALL_IMPACT = SOURCE / "2026-07-28-small-arc-impact-v4-alpha.png"
OMEGA_IMPACT = SOURCE / "2026-07-28-omega-arc-impact-v4-alpha.png"
ROLES = (
    "small.body",
    "small.ring",
    "small.cloud",
    "small.beam",
    "small.impact",
    "omega.body",
    "omega.sigil",
    "omega.cloud",
    "omega.beam",
    "omega.impact",
)
CANVAS_SIZE = 512
ANCHOR = (CANVAS_SIZE // 2, CANVAS_SIZE // 2)


def pixel_digest(image: Image.Image) -> str:
    return hashlib.sha256(image.convert("RGBA").tobytes()).hexdigest()


def normalize_impact(path: Path, content_size_px: int) -> Image.Image:
    source = Image.open(path).convert("RGBA")
    bounds = source.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError(f"Impact source has no visible pixels: {path}")
    cropped = source.crop(bounds)
    scale = min(content_size_px / cropped.width, content_size_px / cropped.height)
    resized = cropped.resize(
        (
            max(1, round(cropped.width * scale)),
            max(1, round(cropped.height * scale)),
        ),
        Image.Resampling.LANCZOS,
    )
    frame = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    frame.alpha_composite(
        resized,
        (
            ANCHOR[0] - resized.width // 2,
            ANCHOR[1] - resized.height // 2,
        ),
    )
    return frame


def alignment_entry(frame_index: int, role: str, frame: Image.Image) -> dict:
    bounds = frame.getbbox()
    return {
        "frameIndex": frame_index,
        "role": role,
        "alphaBounds": list(bounds) if bounds else [0, 0, 0, 0],
        "pixelSha256": pixel_digest(frame),
    }


def main() -> None:
    frames, width, height, _fps = read_piskel(INPUT_PROJECT)
    if (width, height) != (CANVAS_SIZE, CANVAS_SIZE):
        raise ValueError("Arc Core source Piskel canvas is not 512x512")
    if len(frames) != len(ROLES):
        raise ValueError("Arc Core source Piskel role count changed")

    frames[4] = normalize_impact(SMALL_IMPACT, 424)
    frames[9] = normalize_impact(OMEGA_IMPACT, 456)

    document = make_piskel(
        {
            "id": "arc-core-body-and-fx-v4",
            "displayName": "Arc Core Body And Fx V4",
            "fps": 12,
            "frameSize": [CANVAS_SIZE, CANVAS_SIZE],
            "sheetColumns": 5,
        },
        frames,
    )
    document["jkdAlignment"] = {
        "policy": "fixed-canvas-zero-drift",
        "anchorPx": list(ANCHOR),
        "origin": [0.5, 0.5],
        "driftTolerancePx": 0,
        "roles": [
            alignment_entry(index, role, frame)
            for index, (role, frame) in enumerate(zip(ROLES, frames))
        ],
    }
    document["jkdSourceReplacements"] = {
        "small.impact": str(SMALL_IMPACT.relative_to(ROOT)).replace("\\", "/"),
        "omega.impact": str(OMEGA_IMPACT.relative_to(ROOT)).replace("\\", "/"),
    }
    write_json(OUTPUT_PROJECT, document)

    roundtrip, roundtrip_width, roundtrip_height, _ = read_piskel(OUTPUT_PROJECT)
    if (roundtrip_width, roundtrip_height) != (CANVAS_SIZE, CANVAS_SIZE):
        raise ValueError("Arc Core output Piskel canvas changed on round-trip")
    if [pixel_digest(frame) for frame in roundtrip] != [
        pixel_digest(frame) for frame in frames
    ]:
        raise ValueError("Arc Core output Piskel pixels changed on round-trip")
    print(
        "Updated Small and Omega fracture impacts in a centered, zero-drift "
        "Arc Core V4 Piskel project"
    )


if __name__ == "__main__":
    main()
