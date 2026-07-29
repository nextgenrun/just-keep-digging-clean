from __future__ import annotations

from pathlib import Path
import importlib.util


ROOT = Path(__file__).resolve().parents[1]
BASE_BUILDER = ROOT / "ai-tools" / "2026-07-28-build-demon-mist-baked-motion-variant-v3.py"
STEM = "2026-07-28-demon-mist-baked-motion-variant-v4"


def load_builder():
    spec = importlib.util.spec_from_file_location("demon_mist_baked_motion_v3", BASE_BUILDER)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load base builder: {BASE_BUILDER}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def configure_outputs(builder) -> None:
    builder.STEM = STEM
    builder.FAR_PLATE = ROOT / "ai-tools" / f"{STEM}-far-plate.png"
    builder.MID_PLATE = ROOT / "ai-tools" / f"{STEM}-mist-demon-plate.png"
    builder.FORE_PLATE = ROOT / "ai-tools" / f"{STEM}-foreground-trees-plate.png"
    builder.POSTER = ROOT / "ai-tools" / f"{STEM}-poster.png"
    builder.OUTPUT = ROOT / "ai-tools" / f"{STEM}.mp4"
    builder.MANIFEST = ROOT / "ai-tools" / f"{STEM}-manifest.json"


def configure_visible_motion(builder) -> None:
    builder.DURATION_SECONDS = 6
    builder.FRAME_COUNT = builder.FRAME_RATE * builder.DURATION_SECONDS
    builder.FAR_ZOOM = 1.012
    builder.MID_ZOOM = 1.012
    builder.FAR_XY = (1.2, 0.6)
    builder.MID_XY = (9.0, 2.8)
    builder.MID_ZOOM_AMPLITUDE = 0.004
    builder.FORE_XY = (1.4, 0.55)
    builder.FORE_SHEAR = 0.0032


def main() -> None:
    builder = load_builder()
    configure_outputs(builder)
    configure_visible_motion(builder)
    builder.main()


if __name__ == "__main__":
    main()
