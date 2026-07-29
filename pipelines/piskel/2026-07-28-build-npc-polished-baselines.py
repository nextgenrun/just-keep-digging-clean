"""Build chroma-cleaned calm merchant baselines without changing their motion."""

from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

import imageio_ffmpeg
from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
PISKEL_TOOLS = ROOT / "tools" / "piskel-mcp"
sys.path.insert(0, str(PISKEL_TOOLS))

from npc_sprite_cleanup import (  # noqa: E402
    chroma_leak_report,
    fixed_scale_polish,
    hidden_rgb_pixels,
    lower_body_anchor,
    normalized_main_height,
    remove_chroma_leaks,
)
from piskel_document import rel_path, write_json  # noqa: E402
from piskel_document import read_piskel  # noqa: E402


STATIC_SOURCE = (
    ROOT / "sprites" / "npc" / "npc-v5-generated"
    / "singles" / "merchant-idle"
)
VIDEO_SOURCE = (
    ROOT / "visual-approval-previews" / "npc-idle-polish-v1"
)
MAGMA_SOURCE = (
    ROOT / "sprites" / "npc" / "npc-v7-level-two"
    / "magma-money-monster.png"
)
ACTIVITY_SOURCE = (
    ROOT / "sprites" / "npc" / "npc-v12-piskel-approved-activities"
)
POLISH_VALUES = (
    ROOT / "values" / "npcActivityAssetPolish.json"
)
TARGET_ROOT = ROOT / "sprites" / "npc" / "npc-v13-polished-baselines"
STATIC_TARGET = TARGET_ROOT / "static"
VIDEO_TARGET = TARGET_ROOT / "video"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
FPS = 30
CANVAS_REFERENCE = 512
VIDEO_SLUGS = (
    "money-monster",
    "player-upgrades",
    "gear-merchant",
    "bobo-merchant",
    "gem-power-merchant",
)
ALL_SLUGS = (*VIDEO_SLUGS, "magma-money-monster")


def digest(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def run(args: list[str]) -> None:
    subprocess.run(args, check=True)


def static_source(slug: str) -> Path:
    if slug == "magma-money-monster":
        return MAGMA_SOURCE
    return STATIC_SOURCE / f"{slug}.png"


def activity_height_and_cap(slug: str) -> tuple[float, float]:
    values = json.loads(POLISH_VALUES.read_text(encoding="utf-8"))
    frames, _, _, _ = read_piskel(
        ACTIVITY_SOURCE / "piskel" / f"{slug}.piskel"
    )
    heights = sorted(
        normalized_main_height(
            remove_chroma_leaks(frame)[0],
            CANVAS_REFERENCE,
        )
        for frame in frames
    )
    source_height = heights[len(heights) // 2]
    cap = values["merchantMaxUniformActivityScale"].get(
        slug,
        values["defaultMaxUniformActivityScale"],
    )
    return source_height, float(cap)


def build_static(slug: str) -> dict[str, Any]:
    source = static_source(slug)
    frame = Image.open(source).convert("RGBA")
    cleaned, cleanup = remove_chroma_leaks(frame)
    source_height = normalized_main_height(cleaned, CANVAS_REFERENCE)
    activity_height, scale_cap = activity_height_and_cap(slug)
    target_height = min(source_height, activity_height * scale_cap)
    presentation_scale = target_height / source_height
    source_anchor = lower_body_anchor(cleaned)
    if presentation_scale < 0.999999:
        cleaned = fixed_scale_polish(
            [cleaned],
            presentation_scale,
            source_anchor,
        )[0]
    target = STATIC_TARGET / f"{slug}.webp"
    cleaned.save(
        target,
        "WEBP",
        lossless=True,
        quality=100,
        method=6,
        exact=True,
    )
    exported = Image.open(target).convert("RGBA")
    after = chroma_leak_report(exported)
    hidden = hidden_rgb_pixels(exported)
    if after["largeGreenLeakPixels"] or hidden:
        raise ValueError(f"{slug} static baseline still has matte leakage")
    exported_anchor = lower_body_anchor(exported)
    return {
        "source": rel_path(source),
        "path": rel_path(target),
        "sha256": digest(target),
        "dimensions": list(cleaned.size),
        "sourceMainSilhouetteHeightAt512": round(source_height, 3),
        "mainSilhouetteHeightAt512": round(
            normalized_main_height(exported, CANVAS_REFERENCE),
            3,
        ),
        "presentationScale": round(presentation_scale, 6),
        "rootAnchorAt512": [
            round(exported_anchor[0] * CANVAS_REFERENCE / exported.width, 3),
            round(exported_anchor[1] * CANVAS_REFERENCE / exported.height, 3),
        ],
        "sourceAnchorPixels": [
            round(source_anchor[0], 3),
            round(source_anchor[1], 3),
        ],
        "hiddenRgbPixels": hidden,
        "cleanup": cleanup,
    }


def decode_video(source: Path, folder: Path) -> list[Path]:
    folder.mkdir(parents=True, exist_ok=True)
    run([
        FFMPEG,
        "-hide_banner",
        "-loglevel",
        "error",
        "-c:v",
        "libvpx-vp9",
        "-i",
        str(source),
        "-vsync",
        "0",
        "-start_number",
        "0",
        "-y",
        str(folder / "%03d.png"),
    ])
    return sorted(folder.glob("*.png"))


def encode_video(folder: Path, target: Path) -> None:
    run([
        FFMPEG,
        "-hide_banner",
        "-loglevel",
        "error",
        "-framerate",
        str(FPS),
        "-start_number",
        "0",
        "-i",
        str(folder / "%03d.png"),
        "-c:v",
        "libvpx-vp9",
        "-pix_fmt",
        "yuva420p",
        "-auto-alt-ref",
        "0",
        "-crf",
        "24",
        "-b:v",
        "0",
        "-metadata:s:v:0",
        "alpha_mode=1",
        "-an",
        "-y",
        str(target),
    ])


def verify_video_alpha(target: Path, folder: Path) -> dict[str, Any]:
    frames = decode_video(target, folder)
    if not frames:
        raise ValueError(f"{target.name} produced no verification frame")
    sample = Image.open(frames[0]).convert("RGBA")
    alpha_bounds = sample.getchannel("A").getbbox()
    if not alpha_bounds or alpha_bounds == (0, 0, *sample.size):
        raise ValueError(f"{target.name} lost transparent alpha")
    green_leaks = sum(
        chroma_leak_report(Image.open(path).convert("RGBA"))[
            "largeGreenLeakPixels"
        ]
        for path in frames
    )
    if green_leaks:
        raise ValueError(f"{target.name} reintroduced green leakage")
    return {
        "alphaBounds": list(alpha_bounds),
        "frames": len(frames),
        "largeGreenLeakPixels": green_leaks,
    }


def build_video(
    slug: str,
    temp_root: Path,
    static_record: dict[str, Any],
) -> dict[str, Any]:
    source = VIDEO_SOURCE / f"{slug}-idle-alpha.webm"
    source_frames = decode_video(source, temp_root / f"{slug}-source")
    clean_folder = temp_root / f"{slug}-clean"
    clean_folder.mkdir(parents=True, exist_ok=True)
    cleanup_records = []
    cleaned_frames = []
    for index, frame_path in enumerate(source_frames):
        frame = Image.open(frame_path).convert("RGBA")
        cleaned, cleanup = remove_chroma_leaks(frame)
        cleaned_frames.append(cleaned)
        cleanup_records.append(cleanup)
    presentation_scale = float(static_record["presentationScale"])
    if presentation_scale < 0.999999:
        anchor_x, anchor_y = static_record["sourceAnchorPixels"]
        cleaned_frames = fixed_scale_polish(
            cleaned_frames,
            presentation_scale,
            (anchor_x, anchor_y),
        )
    for index, cleaned in enumerate(cleaned_frames):
        cleaned.save(clean_folder / f"{index:03d}.png", compress_level=2)
    target = VIDEO_TARGET / f"{slug}-idle-alpha.webm"
    leak_before = sum(
        record["largeGreenLeakPixelsBefore"] for record in cleanup_records
    )
    removed = sum(record["removedPixels"] for record in cleanup_records)
    if leak_before or presentation_scale < 0.999999:
        encode_video(clean_folder, target)
    else:
        shutil.copyfile(source, target)
    output_verification = verify_video_alpha(
        target,
        temp_root / f"{slug}-verify",
    )
    remaining = sum(
        record["largeGreenLeakPixelsAfter"] for record in cleanup_records
    )
    if remaining:
        raise ValueError(f"{slug} video frames still have green leakage")
    return {
        "source": rel_path(source),
        "path": rel_path(target),
        "sha256": digest(target),
        "fps": FPS,
        "frames": len(source_frames),
        "presentationScale": presentation_scale,
        "outputVerification": output_verification,
        "cleanup": {
            "framesWithLeakage": sum(
                bool(record["largeGreenLeakPixelsBefore"])
                for record in cleanup_records
            ),
            "largeGreenLeakPixelsBefore": leak_before,
            "removedPixels": removed,
            "largeGreenLeakPixelsAfter": remaining,
        },
    }


def main() -> None:
    STATIC_TARGET.mkdir(parents=True, exist_ok=True)
    VIDEO_TARGET.mkdir(parents=True, exist_ok=True)
    requested_video = next(
        (
            argument.split("=", 1)[1]
            for argument in sys.argv[1:]
            if argument.startswith("--video-slug=")
        ),
        None,
    )
    static_records = {
        slug: build_static(slug)
        for slug in ALL_SLUGS
    }
    prior_manifest_path = TARGET_ROOT / "manifest.json"
    prior_video = {}
    if requested_video and prior_manifest_path.exists():
        prior_video = json.loads(
            prior_manifest_path.read_text(encoding="utf-8")
        ).get("video", {})
    with tempfile.TemporaryDirectory(prefix="npc-baseline-polish-") as temp:
        temp_root = Path(temp)
        video_records = {
            slug: (
                build_video(slug, temp_root, static_records[slug])
                if not requested_video or slug == requested_video
                else prior_video[slug]
            )
            for slug in VIDEO_SLUGS
        }
    manifest = {
        "created": "2026-07-28",
        "runtimeApproved": True,
        "sourceAssetsPreserved": True,
        "motionTimingChanged": False,
        "presentationNormalized": True,
        "chromaLeakRemoved": True,
        "generator": rel_path(Path(__file__)),
        "static": static_records,
        "video": video_records,
    }
    write_json(TARGET_ROOT / "manifest.json", manifest)
    print(f"Built {len(static_records)} static and {len(video_records)} video baselines")
    print(rel_path(TARGET_ROOT / "manifest.json"))


if __name__ == "__main__":
    main()
