"""Visual QA boards for Fire Light Piskel drift and anchor consistency."""

from __future__ import annotations

import importlib.util
import math
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


CORE = load_module(
    ROOT / "ai-tools/2026-07-30-fire-light-piskel-core.py",
    "fire_light_piskel_core_visuals",
)


def font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    name = "segoeuib.ttf" if bold else "segoeui.ttf"
    path = Path("C:/Windows/Fonts") / name
    return ImageFont.truetype(str(path), size) if path.is_file() else ImageFont.load_default()


def _marked_frame(
    frame: Image.Image,
    measured: tuple[float, float],
    target: tuple[int, int],
    size: int,
    fixed: bool,
) -> Image.Image:
    output = frame.convert("RGB").resize((size, size), Image.Resampling.LANCZOS)
    draw = ImageDraw.Draw(output)
    scale = size / frame.width
    measured_px = (round(measured[0] * scale), round(measured[1] * scale))
    target_px = (round(target[0] * scale), round(target[1] * scale))
    draw.line((*measured_px, *target_px), fill="#f6a75f", width=1)
    radius = 3
    draw.ellipse(
        (
            measured_px[0] - radius,
            measured_px[1] - radius,
            measured_px[0] + radius,
            measured_px[1] + radius,
        ),
        outline="#77e0a7" if fixed else "#ff9d63",
        width=1,
    )
    draw.line(
        (target_px[0], target_px[1] - 5, target_px[0], target_px[1] + 5),
        fill="#ff4c91",
        width=1,
    )
    draw.line(
        (target_px[0] - 5, target_px[1], target_px[0] + 5, target_px[1]),
        fill="#ff4c91",
        width=1,
    )
    return output


def build_before_after(
    assets: list[dict[str, Any]],
    original_frames: dict[str, list[Image.Image]],
    polished_frames: dict[str, list[Image.Image]],
    reports: dict[str, dict[str, Any]],
    output_root: Path,
) -> list[Path]:
    thumb = 72
    label_width = 248
    header_height = 82
    asset_height = thumb * 2 + 56
    width = label_width + thumb * 16 + 24
    height = header_height + asset_height * len(assets)
    canvas = Image.new("RGB", (width, height), "#07090d")
    draw = ImageDraw.Draw(canvas)
    draw.text((18, 12), "FIRE LIGHT V3 - PISKEL ANCHOR POLISH", fill="#ffe1ae", font=font(28, True))
    draw.text(
        (18, 48),
        "orange = measured anchor, pink = group target, green = registered after polish",
        fill="#aeb8c8",
        font=font(15),
    )
    for asset_index, asset in enumerate(assets):
        top = header_height + asset_index * asset_height
        report = reports[asset["id"]]
        target_by_frame = {
            entry["frame"]: tuple(entry["targetAnchorPx"])
            for entry in report["frames"]
        }
        before_by_frame = {
            entry["frame"]: tuple(entry["sourceAnchorPx"])
            for entry in report["frames"]
        }
        after_by_frame = {
            entry["frame"]: tuple(entry["polishedAnchorPx"])
            for entry in report["frames"]
        }
        draw.text((14, top + 13), asset["displayName"], fill="#edf1f7", font=font(16, True))
        draw.text(
            (14, top + 36),
            f"{asset['anchorMode']} / {asset['grouping']}",
            fill="#8fa1b8",
            font=font(12),
        )
        draw.text((184, top + 12), "BEFORE", fill="#ff9d63", font=font(11, True))
        draw.text((184, top + thumb + 22), "PISKEL", fill="#77e0a7", font=font(11, True))
        for frame_index in range(16):
            left = label_width + frame_index * thumb
            before = _marked_frame(
                original_frames[asset["id"]][frame_index],
                before_by_frame[frame_index],
                target_by_frame[frame_index],
                thumb,
                False,
            )
            after = _marked_frame(
                polished_frames[asset["id"]][frame_index],
                after_by_frame[frame_index],
                target_by_frame[frame_index],
                thumb,
                True,
            )
            canvas.paste(before, (left, top))
            canvas.paste(after, (left, top + thumb + 10))
            draw.text((left + 4, top + thumb * 2 + 14), f"{frame_index:02d}", fill="#7e8998", font=font(10))
    output_root.mkdir(parents=True, exist_ok=True)
    main_path = output_root / "01-before-after-anchor-grid.png"
    canvas.save(main_path, "PNG", optimize=True)
    small = canvas.resize(
        (620, round(canvas.height * 620 / canvas.width)),
        Image.Resampling.LANCZOS,
    )
    small_path = output_root / "01-before-after-anchor-grid-small.jpg"
    small.save(small_path, "JPEG", quality=42, optimize=True, progressive=True)
    return [main_path, small_path]


def build_drift_summary(
    assets: list[dict[str, Any]],
    reports: dict[str, dict[str, Any]],
    output_root: Path,
) -> Path:
    width = 1280
    row_height = 72
    height = 112 + row_height * len(assets)
    canvas = Image.new("RGB", (width, height), "#080b10")
    draw = ImageDraw.Draw(canvas)
    draw.text((18, 13), "FIRE LIGHT FRAME DRIFT - BEFORE / AFTER", fill="#ffe1ae", font=font(27, True))
    draw.text(
        (18, 49),
        "Maximum group anchor range in source pixels; the polished target is <= 2.25 px.",
        fill="#aeb8c8",
        font=font(15),
    )
    graph_left = 400
    graph_width = 780
    maximum = max(
        max(group["rangeXPx"], group["rangeYPx"])
        for report in reports.values()
        for group in report["beforeGroups"]
    )
    for index, asset in enumerate(assets):
        top = 96 + index * row_height
        report = reports[asset["id"]]
        before = max(
            max(group["rangeXPx"], group["rangeYPx"])
            for group in report["beforeGroups"]
        )
        after = max(
            max(group["rangeXPx"], group["rangeYPx"])
            for group in report["afterGroups"]
        )
        draw.text((18, top + 13), asset["displayName"], fill="#e7edf5", font=font(15, True))
        draw.text(
            (246, top + 14),
            f"{before:5.1f}px -> {after:4.2f}px",
            fill="#c9d2df",
            font=font(14),
        )
        before_width = round(graph_width * before / max(maximum, 1))
        after_width = round(graph_width * after / max(maximum, 1))
        draw.rectangle((graph_left, top + 10, graph_left + before_width, top + 29), fill="#a55245")
        draw.rectangle((graph_left, top + 37, graph_left + after_width, top + 56), fill="#4fba82")
        draw.line((graph_left, top + 60, graph_left + graph_width, top + 60), fill="#252d39")
    path = output_root / "02-drift-summary.png"
    canvas.save(path, "PNG", optimize=True)
    return path


def build_all(
    assets: list[dict[str, Any]],
    original_frames: dict[str, list[Image.Image]],
    polished_frames: dict[str, list[Image.Image]],
    reports: dict[str, dict[str, Any]],
    output_root: Path,
) -> list[Path]:
    return [
        *build_before_after(
            assets,
            original_frames,
            polished_frames,
            reports,
            output_root,
        ),
        build_drift_summary(assets, reports, output_root),
    ]
