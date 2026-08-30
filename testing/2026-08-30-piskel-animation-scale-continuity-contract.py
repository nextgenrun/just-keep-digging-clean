"""Prove the unified runtime preserves every configured Piskel frame exactly."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools/piskel-mcp"))
from piskel_document import read_piskel  # noqa: E402

CONFIG = json.loads(
    (ROOT / "values/survivalUnifiedAnimationRuntimeV1.json").read_text(encoding="utf-8")
)
MANIFEST = json.loads(
    (
        ROOT
        / CONFIG["runtimeRoot"]
        / "2026-08-25-survival-unified-animation-runtime-v1-manifest.json"
    ).read_text(encoding="utf-8")
)


def visible_height(frame: Image.Image) -> int:
    bounds = frame.getchannel("A").point(lambda alpha: 255 if alpha > 8 else 0).getbbox()
    if bounds is None:
        raise AssertionError("Piskel frame is blank")
    return bounds[3] - bounds[1]


def runtime_frames(sheet_path: Path, count: int, size: int, columns: int) -> list[Image.Image]:
    with Image.open(sheet_path) as source:
        sheet = source.convert("RGBA")
    return [
        sheet.crop(
            (
                (index % columns) * size,
                (index // columns) * size,
                ((index % columns) + 1) * size,
                ((index // columns) + 1) * size,
            )
        )
        for index in range(count)
    ]


def main() -> None:
    configured = [
        (sheet_key, spec)
        for sheet_key, spec in CONFIG["sheets"].items()
        if spec.get("piskelSource")
    ]
    assert len(configured) == 6, f"expected six Piskel-owned sheets, got {len(configured)}"
    frame_total = 0
    transition_heights = None
    for sheet_key, spec in configured:
        source_frames, width, height, fps = read_piskel(ROOT / spec["piskelSource"])
        manifest = MANIFEST["sheets"][sheet_key]
        assert len(source_frames) == int(spec["frames"])
        assert width == height == int(manifest["frameSizePx"]) == 256
        assert fps == 30
        assert manifest["sourceAuthority"] == "piskel"
        assert manifest["sourcePiskel"] == spec["piskelSource"]
        assert manifest["sourceRenderSizePx"] == 256
        assert manifest["downsamplePasses"] == 0
        output_frames = runtime_frames(
            ROOT / CONFIG["runtimeRoot"] / manifest["file"],
            len(source_frames),
            width,
            int(manifest["columns"]),
        )
        for index, (source_frame, output_frame) in enumerate(zip(source_frames, output_frames)):
            assert ImageChops.difference(source_frame, output_frame).getbbox() is None, (
                f"{sheet_key} frame {index} was resized, recolored, or repositioned"
            )
        if sheet_key.endswith("animation-polish-transitions-sheet"):
            transition_heights = [visible_height(source_frames[index]) for index in (14, 15)]
            assert transition_heights[0] == transition_heights[1]
        frame_total += len(source_frames)
    assert transition_heights is not None
    print(
        "PISKEL_SCALE_CONTINUITY_OK "
        f"sheets={len(configured)} frames={frame_total} "
        f"jogStopHeights={transition_heights[0]}/{transition_heights[1]}"
    )


if __name__ == "__main__":
    main()
