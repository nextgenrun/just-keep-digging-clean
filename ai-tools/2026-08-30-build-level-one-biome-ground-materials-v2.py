"""Validate and promote fifty tertiary Level One terrain plates."""

from __future__ import annotations

import hashlib
import json
import math
import random
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
REVIEW_DIR = ROOT / "visual-approval-previews" / "level-one-biome-depth-diversity-v1"
JOBS_PATH = REVIEW_DIR / "2026-08-30-level-one-biome-depth-imagegen-jobs-v1.json"
RUNTIME_DIR = ROOT / "sprites" / "backgrounds" / "world-visual-v2" / "depth" / "level1-biome-ground-materials-v2"
MANIFEST_PATH = REVIEW_DIR / "2026-08-30-level-one-biome-ground-material-manifest-v2.json"
CONTACT_PATH = REVIEW_DIR / "2026-08-30-level-one-biome-ground-material-contact-v2.jpg"
EXPECTED_SIZE = (1536, 1024)
FADE_PX = (320, 128)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def smoothstep(values: np.ndarray) -> np.ndarray:
    clipped = np.clip(values, 0.0, 1.0)
    return clipped * clipped * (3.0 - 2.0 * clipped)


def wave(length: int, period_a: float, period_b: float, phase: float) -> np.ndarray:
    positions = np.arange(length, dtype=np.float32)
    return np.sin(positions * math.tau / period_a + phase) + 0.42 * np.sin(positions * math.tau / period_b + phase * 1.73)


def incoming_alpha(seed: int) -> np.ndarray:
    width, height = EXPECTED_SIZE
    rng = random.Random(seed)
    vertical = wave(height, rng.uniform(181, 279), rng.uniform(67, 119), rng.uniform(0, math.tau))
    horizontal = wave(width, rng.uniform(271, 419), rng.uniform(97, 173), rng.uniform(0, math.tau))
    left_width = np.clip(FADE_PX[0] * (1 + vertical * 0.14), FADE_PX[0] * 0.68, FADE_PX[0] * 1.32)
    top_width = np.clip(FADE_PX[1] * (1 + horizontal * 0.16), FADE_PX[1] * 0.64, FADE_PX[1] * 1.36)
    x = np.arange(width, dtype=np.float32)
    y = np.arange(height, dtype=np.float32)
    return smoothstep(x[None, :] / left_width[:, None]) * smoothstep(y[:, None] / top_width[None, :])


def source_metrics(image: Image.Image, asset_id: str) -> dict[str, object]:
    rgba = np.asarray(image.convert("RGBA"), dtype=np.uint8)
    alpha = rgba[..., 3]
    edge = np.concatenate((alpha[:12].ravel(), alpha[-12:].ravel(), alpha[:, :12].ravel(), alpha[:, -12:].ravel()))
    opaque = float(np.count_nonzero(alpha >= 248) / alpha.size)
    edge_opaque = float(np.count_nonzero(edge >= 248) / edge.size)
    rgb_std = float(rgba[..., :3].std())
    if image.size != EXPECTED_SIZE or opaque < 0.97 or edge_opaque < 0.95 or rgb_std < 18:
        raise RuntimeError(f"{asset_id}: invalid ground source size={image.size} opaque={opaque:.4f} edge={edge_opaque:.4f} std={rgb_std:.2f}")
    return {"sourceOpaqueCoverage": round(opaque, 6), "sourceOpaqueEdgeCoverage": round(edge_opaque, 6), "sourceRgbStd": round(rgb_std, 4)}


def runtime_path(family_id: str) -> Path:
    return RUNTIME_DIR / f"{family_id}-ground-material-tertiary-v2.webp"


def build_entry(job: dict[str, object]) -> dict[str, object]:
    source = ROOT / job["targetRelativePath"]
    with Image.open(source) as opened:
        metrics = source_metrics(opened, job["id"])
        rgb = np.asarray(opened.convert("RGB"), dtype=np.uint8)
    seed = int(hashlib.sha256(job["id"].encode()).hexdigest()[:8], 16)
    alpha = np.round(incoming_alpha(seed) * 255).astype(np.uint8)
    runtime = runtime_path(job["familyId"])
    Image.fromarray(np.dstack((rgb, alpha)), "RGBA").save(runtime, "WEBP", quality=92, method=6, exact=True)
    return {
        "id": job["id"], "familyId": job["familyId"], "parentRegionId": job["parentRegionId"],
        "source": source.relative_to(ROOT).as_posix(), "runtime": runtime.relative_to(ROOT).as_posix(),
        "width": EXPECTED_SIZE[0], "height": EXPECTED_SIZE[1], "incomingFadePx": list(FADE_PX),
        "promptSha256": hashlib.sha256(job["prompt"].encode()).hexdigest(), "sourceSha256": sha256(source),
        "runtimeSha256": sha256(runtime), "runtimeBytes": runtime.stat().st_size,
        "runtimeAlphaMin": int(alpha.min()), "runtimeAlphaMax": int(alpha.max()), **metrics,
    }


def contact_sheet(entries: list[dict[str, object]]) -> None:
    columns, cell_w, cell_h = 5, 320, 220
    rows = math.ceil(len(entries) / columns)
    sheet = Image.new("RGB", (columns * cell_w, rows * cell_h), (15, 18, 24))
    draw, font = ImageDraw.Draw(sheet), ImageFont.load_default()
    for index, entry in enumerate(entries):
        with Image.open(ROOT / entry["runtime"]) as opened:
            image = opened.convert("RGBA")
        image.thumbnail((cell_w - 12, cell_h - 26), Image.Resampling.LANCZOS)
        checker = Image.new("RGB", image.size, (42, 47, 55))
        checker.paste(image, (0, 0), image)
        left = (index % columns) * cell_w + (cell_w - image.width) // 2
        top = (index // columns) * cell_h + 2
        sheet.paste(checker, (left, top))
        draw.text(((index % columns) * cell_w + 6, (index // columns) * cell_h + cell_h - 18), entry["familyId"], fill=(236, 239, 244), font=font)
    sheet.save(CONTACT_PATH, "JPEG", quality=91, optimize=True)


def main() -> None:
    jobs = [entry for entry in json.loads(JOBS_PATH.read_text(encoding="utf-8"))["jobs"] if entry["category"] == "ground"]
    if len(jobs) != 50:
        raise RuntimeError("Expected fifty tertiary ground jobs")
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    entries = [build_entry(job) for job in jobs]
    if len({entry["sourceSha256"] for entry in entries}) != 50 or len({entry["runtimeSha256"] for entry in entries}) != 50:
        raise RuntimeError("Ground sources and runtime files must remain unique")
    contact_sheet(entries)
    manifest = {
        "version": 2, "date": "2026-08-30", "generationMode": "built-in ImageGen, one independent call per final source",
        "counts": {"newSources": 50, "newRuntimeAssets": 50, "previousGroundConcepts": 96, "totalGroundConcepts": 146},
        "dimensions": list(EXPECTED_SIZE), "alphaContract": "left/top incoming feather; right/bottom coverage retained",
        "runtimeContract": "visual-only demand-streamed solid-tile-masked family terrain plates; existing plate density unchanged",
        "rollback": "?levelOneSourceFamilies=0", "contactSheet": CONTACT_PATH.relative_to(ROOT).as_posix(), "entries": entries,
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest["counts"], indent=2))
    print(CONTACT_PATH.relative_to(ROOT).as_posix())


if __name__ == "__main__":
    main()
