"""Validate and promote scenic, identity, boundary, and landmark variants."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
REVIEW_DIR = ROOT / "visual-approval-previews" / "level-one-biome-depth-diversity-v1"
JOBS_PATH = REVIEW_DIR / "2026-08-30-level-one-biome-depth-imagegen-jobs-v1.json"
CORRECTIONS_PATH = REVIEW_DIR / "2026-08-30-level-one-biome-identity-corrections-v1.json"
MANIFEST_PATH = REVIEW_DIR / "2026-08-30-level-one-biome-depth-variant-manifest-v1.json"
EXPECTED_SIZE = (1536, 1024)
EDGE_FEATHER_PX = 28
RUNTIME_DIRS = {
    "identity": ROOT / "sprites/backgrounds/world-visual-v2/depth/level1-biome-identity-kits-v1",
    "scenic": ROOT / "sprites/backgrounds/world-visual-v2/depth/level1-biome-scenic-alternates-v1",
    "boundary": ROOT / "sprites/backgrounds/world-visual-v2/depth/level1-biome-boundaries-v2",
    "landmark": ROOT / "sprites/backgrounds/world-visual-v2/depth/level1-biome-rare-landmarks-v1",
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def smoothstep(values: np.ndarray) -> np.ndarray:
    clipped = np.clip(values, 0.0, 1.0)
    return clipped * clipped * (3.0 - 2.0 * clipped)


def edge_feather(image: Image.Image) -> Image.Image:
    rgba = np.asarray(image.convert("RGBA"), dtype=np.uint8).copy()
    height, width = rgba.shape[:2]
    x_edge = np.minimum(np.arange(width), np.arange(width)[::-1]).astype(np.float32)
    y_edge = np.minimum(np.arange(height), np.arange(height)[::-1]).astype(np.float32)
    edge = np.minimum(y_edge[:, None], x_edge[None, :]) / float(EDGE_FEATHER_PX)
    alpha = rgba[..., 3].astype(np.float32) / 255.0
    alpha *= smoothstep(edge)
    rgba[..., 3] = np.round(alpha * 255).astype(np.uint8)
    rgba[rgba[..., 3] < 3] = 0
    return Image.fromarray(rgba, "RGBA")


def source_metrics(image: Image.Image, job: dict[str, object]) -> dict[str, object]:
    if image.size != EXPECTED_SIZE:
        raise RuntimeError(f"{job['id']}: expected {EXPECTED_SIZE}, got {image.size}")
    alpha = np.asarray(image.convert("RGBA").getchannel("A"), dtype=np.uint8)
    occupied = float(np.count_nonzero(alpha >= 16) / alpha.size)
    transparent = float(np.count_nonzero(alpha < 8) / alpha.size)
    corners = [int(alpha[y, x]) for x, y in ((0, 0), (1535, 0), (0, 1023), (1535, 1023))]
    if transparent < 0.08 or not 0.04 <= occupied <= 0.88 or max(corners) > 3 or int(alpha.max()) < 240:
        raise RuntimeError(f"{job['id']}: invalid alpha transparent={transparent:.4f} occupied={occupied:.4f} corners={corners}")
    metrics = {"sourceTransparentCoverage": round(transparent, 6), "sourceOccupiedCoverage": round(occupied, 6), "sourceCornerAlpha": corners}
    if job["category"] == "identity":
        mask = alpha >= 16
        quadrants = [float(mask[y:y + 512, x:x + 768].mean()) for y in (0, 512) for x in (0, 768)]
        gutter = float(np.concatenate((mask[:, 748:788].ravel(), mask[492:532, :].ravel())).mean())
        if min(quadrants) < 0.03 or max(quadrants) > 0.70 or gutter > 0.12:
            raise RuntimeError(f"{job['id']}: invalid atlas quadrants={quadrants} gutter={gutter:.4f}")
        metrics.update({"quadrantOccupiedCoverage": [round(value, 6) for value in quadrants], "centerGutterOccupiedCoverage": round(gutter, 6)})
    return metrics


def runtime_path(job: dict[str, object]) -> Path:
    category = job["category"]
    if category == "identity":
        stem = f"{job['familyId']}-identity-kit-v1.webp"
    elif category == "scenic":
        stem = f"{job['familyId']}-{job['roleId']}-alternate-v1.webp"
    elif category == "boundary":
        stem = f"{job['joinId']}-transition-{job['variantIndex']}-v2.webp"
    else:
        stem = f"{job['landmarkId']}-v1.webp"
    return RUNTIME_DIRS[category] / stem


def build_entry(job: dict[str, object], corrections: dict[str, object]) -> dict[str, object]:
    source = ROOT / job["targetRelativePath"]
    with Image.open(source) as opened:
        metrics = source_metrics(opened, job)
        runtime_image = edge_feather(opened)
    runtime = runtime_path(job)
    runtime_image.save(runtime, "WEBP", quality=92, method=6, exact=True)
    correction = corrections.get(job["id"])
    final_prompt = job["prompt"] + (f"\n{correction['appendPrompt']}" if correction else "")
    return {
        "id": job["id"], "category": job["category"],
        "source": source.relative_to(ROOT).as_posix(), "runtime": runtime.relative_to(ROOT).as_posix(),
        "width": EXPECTED_SIZE[0], "height": EXPECTED_SIZE[1], "promptSha256": hashlib.sha256(final_prompt.encode()).hexdigest(),
        "sourceSha256": sha256(source), "runtimeSha256": sha256(runtime), "runtimeBytes": runtime.stat().st_size,
        "correctionApplied": bool(correction), **{key: value for key, value in job.items() if key not in {"prompt", "targetRelativePath", "category"}}, **metrics,
    }


def checker(size: tuple[int, int], step: int = 18) -> Image.Image:
    canvas = Image.new("RGB", size, (43, 48, 57))
    draw = ImageDraw.Draw(canvas)
    for y in range(0, size[1], step):
        for x in range(0, size[0], step):
            if (x // step + y // step) % 2:
                draw.rectangle((x, y, x + step - 1, y + step - 1), fill=(61, 67, 77))
    return canvas


def contact_sheet(entries: list[dict[str, object]], path: Path, columns: int, cell_w: int = 320, cell_h: int = 220) -> None:
    rows = math.ceil(len(entries) / columns)
    sheet = Image.new("RGB", (columns * cell_w, rows * cell_h), (13, 16, 21))
    draw, font = ImageDraw.Draw(sheet), ImageFont.load_default()
    for index, entry in enumerate(entries):
        with Image.open(ROOT / entry["runtime"]) as opened:
            image = opened.convert("RGBA")
        image.thumbnail((cell_w - 12, cell_h - 28), Image.Resampling.LANCZOS)
        tile = checker(image.size)
        tile.paste(image, (0, 0), image)
        x = (index % columns) * cell_w + (cell_w - image.width) // 2
        y = (index // columns) * cell_h + 2
        sheet.paste(tile, (x, y))
        draw.text(((index % columns) * cell_w + 5, (index // columns) * cell_h + cell_h - 18), entry["id"].split(":", 1)[-1][:44], fill=(236, 239, 244), font=font)
    sheet.save(path, "JPEG", quality=91, optimize=True)


def main() -> None:
    jobs = [entry for entry in json.loads(JOBS_PATH.read_text(encoding="utf-8"))["jobs"] if entry["category"] in RUNTIME_DIRS]
    corrections_file = json.loads(CORRECTIONS_PATH.read_text(encoding="utf-8"))
    corrections = corrections_file["corrections"]
    expected = {"identity": 30, "scenic": 50, "boundary": 14, "landmark": 12}
    counts = {category: sum(job["category"] == category for job in jobs) for category in expected}
    if counts != expected:
        raise RuntimeError(f"Invalid variant job inventory: {counts}")
    for directory in RUNTIME_DIRS.values():
        directory.mkdir(parents=True, exist_ok=True)
    entries = [build_entry(job, corrections) for job in jobs]
    if len({entry["sourceSha256"] for entry in entries}) != 106 or len({entry["runtimeSha256"] for entry in entries}) != 106:
        raise RuntimeError("All 106 canonical variant sources and runtimes must be unique")
    contacts = {}
    for category, columns in (("identity", 5), ("scenic", 5), ("boundary", 2), ("landmark", 4)):
        selected = [entry for entry in entries if entry["category"] == category]
        path = REVIEW_DIR / f"2026-08-30-level-one-biome-{category}-contact-v1.jpg"
        contact_sheet(selected, path, columns)
        contacts[category] = path.relative_to(ROOT).as_posix()
    experimental = [entry for entry in entries if entry["category"] == "scenic" and entry.get("experimental")]
    experimental_path = REVIEW_DIR / "2026-08-30-level-one-biome-hard-swap-experiments-contact-v1.jpg"
    contact_sheet(experimental, experimental_path, 5)
    contacts["hardSwapExperiments"] = experimental_path.relative_to(ROOT).as_posix()
    manifest = {
        "version": 1, "date": "2026-08-30", "generationMode": "built-in ImageGen, one independent call per source; two rejected atlas candidates regenerated and retained",
        "counts": {**counts, "identityEffectivePieces": 120, "hardSwapBackgrounds": len(experimental), "canonicalSources": len(entries), "rejectedCandidates": len(corrections)},
        "frameContract": {"atlasSize": list(EXPECTED_SIZE), "frameSize": [768, 512], "order": ["terrainButtress", "embeddedStructure", "foregroundCluster", "propGroup"]},
        "runtimeContract": "visual-only deterministic replacement selection; generated-role and boundary placement counts unchanged",
        "rollback": {"families": "?levelOneSourceFamilies=0", "boundaries": "?levelOneBiomeField=0"},
        "contacts": contacts, "corrections": corrections_file, "entries": entries,
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest["counts"], indent=2))
    print(json.dumps(contacts, indent=2))


if __name__ == "__main__":
    main()
