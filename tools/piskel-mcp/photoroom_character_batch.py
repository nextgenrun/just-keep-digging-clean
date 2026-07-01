#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import time
import urllib.error
import urllib.request
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageDraw

from character_piskel_pipeline import (
    ROOT,
    load_manifest,
    load_runtime_frames,
    make_piskel,
    rel_path,
    repo_path,
    save_runtime_frames,
    select_entries,
    validate_piskel_frames,
    write_artifacts,
    write_json,
)


API_URL = "https://image-api.photoroom.com/v2/edit"
DEFAULT_SEED = 20260623
DEFAULT_MARGIN = 24
BACKGROUND_RGB = (238, 238, 238)
WORK_ROOT = ROOT / "sprites" / "character" / "photoroom"
CACHE_ROOT = WORK_ROOT / "cache"
CANDIDATE_ROOT = WORK_ROOT / "candidates"
REVIEW_ROOT = ROOT / "visual-approval-previews" / "photoroom-character"
PROBE_FRAMES = {
    "walk": [0, 50],
    "idle": [17],
    "dig-sideways": [12],
    "fly-climb": [12],
    "quickslash": [0],
}


class PhotoroomError(RuntimeError):
    pass


def parse_ids(raw: str | None) -> list[str] | None:
    if not raw:
        return None
    return [part.strip() for part in raw.split(",") if part.strip()]


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def png_bytes(image: Image.Image) -> bytes:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def flatten_for_api(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    background = Image.new("RGBA", rgba.size, (*BACKGROUND_RGB, 255))
    background.alpha_composite(rgba)
    return background.convert("RGB")


def alpha_bbox(image: Image.Image, margin: int) -> tuple[int, int, int, int] | None:
    alpha = image.convert("RGBA").getchannel("A")
    bbox = alpha.point(lambda value: 255 if value > 0 else 0).getbbox()
    if bbox is None:
        return None
    x0, y0, x1, y1 = bbox
    return (
        max(0, x0 - margin),
        max(0, y0 - margin),
        min(image.width, x1 + margin),
        min(image.height, y1 + margin),
    )


def halo_metric(image: Image.Image) -> dict[str, Any]:
    rgba = np.asarray(image.convert("RGBA"), dtype=np.uint8)
    alpha = rgba[:, :, 3]
    rgb = rgba[:, :, :3].astype(np.int16)
    soft = (alpha > 0) & (alpha < 180)
    saturation = rgb.max(axis=2) - rgb.min(axis=2)
    luminance = rgb.mean(axis=2)
    pale_soft = soft & (saturation < 38) & (luminance > 55)
    visible = alpha > 0
    visible_count = int(visible.sum())
    pale_count = int(pale_soft.sum())
    return {
        "visiblePixels": visible_count,
        "paleSoftPixels": pale_count,
        "paleSoftRatio": round(pale_count / visible_count, 6) if visible_count else 0,
    }


def cache_key(prefix: str, image: Image.Image, fields: dict[str, str], headers: dict[str, str]) -> str:
    payload = {
        "prefix": prefix,
        "fields": fields,
        "headers": {key: value for key, value in headers.items() if key.lower() != "x-api-key"},
    }
    digest = hashlib.sha256()
    digest.update(json.dumps(payload, sort_keys=True).encode("utf-8"))
    digest.update(png_bytes(image))
    return digest.hexdigest()


def encode_multipart(fields: dict[str, str], files: dict[str, tuple[str, bytes, str]]) -> tuple[bytes, str]:
    boundary = f"----codex-photoroom-{uuid.uuid4().hex}"
    chunks: list[bytes] = []
    for name, value in fields.items():
        chunks.append(f"--{boundary}\r\n".encode("ascii"))
        chunks.append(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode("ascii"))
        chunks.append(str(value).encode("utf-8"))
        chunks.append(b"\r\n")
    for name, (filename, content, content_type) in files.items():
        chunks.append(f"--{boundary}\r\n".encode("ascii"))
        chunks.append(
            f'Content-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'.encode("ascii")
        )
        chunks.append(f"Content-Type: {content_type}\r\n\r\n".encode("ascii"))
        chunks.append(content)
        chunks.append(b"\r\n")
    chunks.append(f"--{boundary}--\r\n".encode("ascii"))
    return b"".join(chunks), boundary


def call_photoroom(
    image: Image.Image,
    fields: dict[str, str],
    api_key: str,
    cache_dir: Path,
    prefix: str,
    extra_headers: dict[str, str] | None = None,
    timeout: int = 120,
) -> Image.Image:
    headers = dict(extra_headers or {})
    key = cache_key(prefix, image, fields, headers)
    cache_path = cache_dir / f"{key}.png"
    if cache_path.is_file():
        return Image.open(cache_path).convert("RGBA")

    body, boundary = encode_multipart(
        fields,
        {"imageFile": ("frame.png", png_bytes(flatten_for_api(image)), "image/png")},
    )
    request_headers = {
        "x-api-key": api_key,
        "Accept": "image/png",
        "Content-Type": f"multipart/form-data; boundary={boundary}",
        **headers,
    }
    request = urllib.request.Request(API_URL, data=body, headers=request_headers, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            result = response.read()
    except urllib.error.HTTPError as error:
        details = error.read().decode("utf-8", errors="replace")[:800]
        raise PhotoroomError(f"Photoroom {prefix} failed with HTTP {error.code}: {details}") from error
    except urllib.error.URLError as error:
        raise PhotoroomError(f"Photoroom {prefix} request failed: {error}") from error

    ensure_parent(cache_path)
    cache_path.write_bytes(result)
    return Image.open(io.BytesIO(result)).convert("RGBA")


def enhance_crop(crop: Image.Image, api_key: str, seed: int, cache_dir: Path) -> Image.Image:
    fields = {
        "beautify.mode": "ai.auto",
        "beautify.seed": str(seed),
    }
    return call_photoroom(crop, fields, api_key, cache_dir / "enhance", "enhance")


def upscale_crop(crop: Image.Image, api_key: str, mode: str, cache_dir: Path) -> Image.Image:
    fields = {
        "referenceBox": "originalImage",
        "removeBackground": "false",
        "upscale.mode": "ai.slow" if mode == "upscale-slow" else "ai.fast",
    }
    headers = {"pr-ai-upscale-model-version": "ai-upscale-2025-07-29"} if mode == "upscale-fast-new" else {}
    return call_photoroom(crop, fields, api_key, cache_dir / mode, mode, headers)


def remove_background(crop: Image.Image, api_key: str, cache_dir: Path, use_hd: bool) -> Image.Image:
    fields = {
        "removeBackground": "true",
        "keepExistingAlphaChannel": "never",
        "referenceBox": "originalImage",
        "outputSize": "originalImage",
        "padding": "0",
        "export.format": "png",
    }
    headers = {"pr-hd-background-removal": "auto"} if use_hd else {}
    return call_photoroom(crop, fields, api_key, cache_dir / "cutout", "cutout", headers)


def process_frame(
    frame: Image.Image,
    api_key: str,
    seed: int,
    margin: int,
    cache_dir: Path,
    use_hd: bool,
    skip_enhance: bool,
    enhance_mode: str,
    use_cutout: bool,
) -> tuple[Image.Image, dict[str, Any]]:
    image = frame.convert("RGBA")
    bbox = alpha_bbox(image, margin)
    before_metric = halo_metric(image)
    if bbox is None:
        return image, {"bbox": None, "before": before_metric, "after": before_metric, "empty": True}

    crop = image.crop(bbox)
    if skip_enhance or enhance_mode == "none":
        enhanced = crop
    elif enhance_mode == "beautify":
        enhanced = enhance_crop(crop, api_key, seed, cache_dir)
    elif enhance_mode in {"upscale-fast", "upscale-fast-new", "upscale-slow"}:
        enhanced = upscale_crop(crop, api_key, enhance_mode, cache_dir)
    else:
        raise ValueError(f"unknown enhance mode: {enhance_mode}")

    if enhanced.size != crop.size:
        enhanced = enhanced.resize(crop.size, Image.Resampling.LANCZOS)

    if use_cutout:
        output_crop = remove_background(enhanced, api_key, cache_dir, use_hd)
        if output_crop.size != crop.size:
            output_crop = output_crop.resize(crop.size, Image.Resampling.LANCZOS)
    else:
        output_crop = enhanced.convert("RGBA")
        output_crop.putalpha(crop.getchannel("A"))

    normalized = Image.new("RGBA", image.size, (0, 0, 0, 0))
    normalized.alpha_composite(output_crop, (bbox[0], bbox[1]))
    after_metric = halo_metric(normalized)
    return normalized, {
        "bbox": list(bbox),
        "before": before_metric,
        "after": after_metric,
        "empty": False,
    }


def frame_indices_for_entry(entry: dict[str, Any], probe: bool) -> list[int]:
    count = int(entry["frameCount"])
    if not probe:
        return list(range(count))
    configured = PROBE_FRAMES.get(entry["id"])
    if configured:
        return [index for index in configured if 0 <= index < count]
    return sorted({0, count // 2, count - 1})


def draw_pair_cell(before: Image.Image, after: Image.Image, title: str, metric: dict[str, Any]) -> Image.Image:
    cell_w = 220
    cell_h = 250
    preview_size = 96 if max(before.size) > 400 else 128
    sheet = Image.new("RGB", (cell_w, cell_h), (28, 30, 34))
    draw = ImageDraw.Draw(sheet)
    draw.text((8, 6), title, fill=(255, 255, 255))
    before_preview = before.convert("RGBA")
    after_preview = after.convert("RGBA")
    before_preview.thumbnail((preview_size, preview_size), Image.Resampling.LANCZOS)
    after_preview.thumbnail((preview_size, preview_size), Image.Resampling.LANCZOS)
    sheet.paste(before_preview.convert("RGB"), (20, 38), before_preview)
    sheet.paste(after_preview.convert("RGB"), (120, 38), after_preview)
    draw.text((20, 172), "before", fill=(210, 210, 210))
    draw.text((120, 172), "after", fill=(210, 210, 210))
    before_ratio = metric["before"]["paleSoftRatio"]
    after_ratio = metric["after"]["paleSoftRatio"]
    draw.text((8, 204), f"halo {before_ratio:.4f} -> {after_ratio:.4f}", fill=(255, 230, 120))
    return sheet


def draw_gif_frame(before: Image.Image, after: Image.Image, title: str) -> Image.Image:
    cell_w = 360
    cell_h = 210
    preview_size = 156 if max(before.size) <= 400 else 180
    frame = Image.new("RGB", (cell_w, cell_h), (24, 26, 30))
    draw = ImageDraw.Draw(frame)
    draw.text((10, 8), title, fill=(255, 255, 255))
    draw.text((48, 188), "original", fill=(220, 220, 220))
    draw.text((224, 188), "photoroom", fill=(220, 220, 220))

    before_preview = before.convert("RGBA")
    after_preview = after.convert("RGBA")
    before_preview.thumbnail((preview_size, preview_size), Image.Resampling.LANCZOS)
    after_preview.thumbnail((preview_size, preview_size), Image.Resampling.LANCZOS)
    frame.paste(before_preview.convert("RGB"), (18, 30), before_preview)
    frame.paste(after_preview.convert("RGB"), (196, 30), after_preview)
    draw.line((180, 28, 180, 184), fill=(90, 96, 108), width=1)
    return frame


def write_review_sheet(path: Path, pairs: list[dict[str, Any]]) -> None:
    if not pairs:
        return
    ensure_parent(path)
    cells = [
        draw_pair_cell(pair["before"], pair["after"], pair["title"], pair["metric"])
        for pair in pairs
    ]
    columns = min(4, len(cells))
    rows = int(np.ceil(len(cells) / columns))
    sheet = Image.new("RGB", (columns * cells[0].width, rows * cells[0].height), (18, 20, 24))
    for index, cell in enumerate(cells):
        sheet.paste(cell, ((index % columns) * cell.width, (index // columns) * cell.height))
    sheet.save(path)


def write_review_gifs(
    run_name: str,
    grouped_pairs: dict[str, list[dict[str, Any]]],
    fps_by_id: dict[str, int],
    slowdown: float,
) -> dict[str, str]:
    paths: dict[str, str] = {}
    for animation_id, pairs in grouped_pairs.items():
        if not pairs:
            continue
        ordered = sorted(pairs, key=lambda pair: pair["index"])
        gif_frames = [
            draw_gif_frame(pair["before"], pair["after"], f"{animation_id} #{pair['index']}")
            for pair in ordered
        ]
        fps = max(1, int(fps_by_id.get(animation_id) or 8))
        duration = max(40, round((1000 / fps) * max(1.0, slowdown)))
        path = REVIEW_ROOT / f"{run_name}-{animation_id}-before-after.gif"
        ensure_parent(path)
        gif_frames[0].save(
            path,
            save_all=True,
            append_images=gif_frames[1:],
            duration=duration,
            loop=0,
            disposal=2,
        )
        paths[animation_id] = rel_path(path)
    return paths


def process_entries(args: argparse.Namespace, probe: bool) -> dict[str, Any]:
    api_key = os.environ.get("PHOTOROOM_API_KEY")
    if not api_key:
        raise PhotoroomError("PHOTOROOM_API_KEY is not set in the environment")

    manifest = load_manifest()
    entries = select_entries(manifest, parse_ids(args.ids))
    run_name = args.run if args.run != "latest" else ("probe" if probe else args.run)
    run_root = CANDIDATE_ROOT / run_name
    cache_dir = CACHE_ROOT
    pairs: list[dict[str, Any]] = []
    grouped_pairs: dict[str, list[dict[str, Any]]] = {}
    fps_by_id: dict[str, int] = {}
    results: list[dict[str, Any]] = []

    for entry in entries:
        frames = load_runtime_frames(entry)
        indices = frame_indices_for_entry(entry, probe)
        fps_by_id[entry["id"]] = int(entry["fps"])
        entry_results = []
        for index in indices:
            before = frames[index]
            after, metric = process_frame(
                before,
                api_key,
                int(args.seed),
                int(args.margin),
                cache_dir,
                not args.no_hd,
                bool(args.skip_enhance),
                args.enhance_mode,
                not args.skip_cutout,
            )
            out_path = run_root / "frames" / entry["id"] / f"frame-{index:03d}.png"
            ensure_parent(out_path)
            after.save(out_path)
            entry_results.append({
                "frame": index,
                "path": rel_path(out_path),
                "metric": metric,
            })
            pairs.append({
                "title": f"{entry['id']} #{index}",
                "index": index,
                "animationId": entry["id"],
                "before": before,
                "after": after,
                "metric": metric,
            })
            grouped_pairs.setdefault(entry["id"], []).append({
                "index": index,
                "before": before,
                "after": after,
            })
            if args.sleep > 0:
                time.sleep(float(args.sleep))

        results.append({
            "id": entry["id"],
            "frameCount": int(entry["frameCount"]),
            "processedFrames": entry_results,
            "complete": len(entry_results) == int(entry["frameCount"]),
        })

    review_path = REVIEW_ROOT / f"{run_name}-before-after-contact-sheet.png"
    write_review_sheet(review_path, pairs)
    gif_paths = write_review_gifs(run_name, grouped_pairs, fps_by_id, float(args.gif_slowdown))
    manifest_path = run_root / "photoroom-candidate-manifest.json"
    write_json(
        manifest_path,
        {
            "ok": True,
            "run": run_name,
            "probe": probe,
            "createdAt": datetime.now().isoformat(timespec="seconds"),
            "seed": int(args.seed),
            "margin": int(args.margin),
            "api": {
                "endpoint": API_URL,
                "enhancer": None if args.skip_enhance or args.enhance_mode == "none" else args.enhance_mode,
                "backgroundRemoval": None if args.skip_cutout else "removeBackground=true",
            },
            "reviewSheet": rel_path(review_path),
            "reviewGifs": gif_paths,
            "results": results,
        },
    )
    return {
        "ok": True,
        "run": run_name,
        "reviewSheet": rel_path(review_path),
        "reviewGifs": gif_paths,
        "candidateManifest": rel_path(manifest_path),
        "results": results,
    }


def apply_entries(args: argparse.Namespace) -> dict[str, Any]:
    manifest = load_manifest()
    entries = select_entries(manifest, parse_ids(args.ids))
    run_root = CANDIDATE_ROOT / args.run
    applied = []
    for entry in entries:
        frames: list[Image.Image] = []
        missing: list[str] = []
        for index in range(int(entry["frameCount"])):
            frame_path = run_root / "frames" / entry["id"] / f"frame-{index:03d}.png"
            if not frame_path.is_file():
                missing.append(rel_path(frame_path))
                continue
            frames.append(Image.open(frame_path).convert("RGBA"))
        if missing:
            raise FileNotFoundError(f"{entry['id']} is missing processed frames: {', '.join(missing[:5])}")

        width, height = entry["frameSize"]
        validation = validate_piskel_frames(entry, frames, width, height, int(entry["fps"]), f"photoroom:{args.run}")
        if not validation["ok"]:
            raise ValueError(f"{entry['id']} validation failed: {'; '.join(validation['errors'])}")

        piskel_path = repo_path(entry["sourcePiskel"])
        if piskel_path.is_file():
            backup_dir = piskel_path.parent / "_piskel-backups"
            backup_dir.mkdir(parents=True, exist_ok=True)
            backup_path = backup_dir / f"{piskel_path.stem}-pre-photoroom-{datetime.now().strftime('%Y%m%d-%H%M%S')}.piskel"
            backup_path.write_bytes(piskel_path.read_bytes())

        write_json(piskel_path, make_piskel(entry, frames))
        runtime_info = save_runtime_frames(entry, frames)
        artifacts = write_artifacts(entry, frames, runtime_info)
        applied.append({
            "id": entry["id"],
            "frameCount": len(frames),
            "validation": validation,
            "runtimeOutputs": runtime_info["outputs"],
            "artifacts": artifacts,
        })
    return {"ok": True, "run": args.run, "applied": applied}


def main() -> int:
    parser = argparse.ArgumentParser(description="Run cached Photoroom enhancement/background cleanup for character frames.")
    parser.add_argument("command", choices=["probe", "process", "apply"])
    parser.add_argument("--ids", help="Comma-separated animation ids. Defaults to all runtime-active animations.")
    parser.add_argument("--run", default="latest", help="Candidate run name for process/apply.")
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED, help="Fixed Photoroom beautify.seed.")
    parser.add_argument("--margin", type=int, default=DEFAULT_MARGIN, help="Transparent margin around the alpha bbox.")
    parser.add_argument("--sleep", type=float, default=0.1, help="Delay between API frame operations.")
    parser.add_argument("--gif-slowdown", type=float, default=6.0, help="Multiplier for before/after review GIF playback speed.")
    parser.add_argument("--no-hd", action="store_true", help="Do not send pr-hd-background-removal:auto.")
    parser.add_argument("--skip-enhance", action="store_true", help="Skip the enhancement step.")
    parser.add_argument(
        "--enhance-mode",
        choices=["beautify", "upscale-fast", "upscale-fast-new", "upscale-slow", "none"],
        default="beautify",
        help="Enhancement step to run before optional cutout.",
    )
    parser.add_argument("--skip-cutout", action="store_true", help="Preserve the original alpha mask instead of running background removal.")
    args = parser.parse_args()

    try:
        if args.command == "probe":
            result = process_entries(args, probe=True)
        elif args.command == "process":
            result = process_entries(args, probe=False)
        else:
            result = apply_entries(args)
    except Exception as error:
        result = {"ok": False, "error": str(error)}

    print(json.dumps(result, indent=2))
    return 0 if result.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
