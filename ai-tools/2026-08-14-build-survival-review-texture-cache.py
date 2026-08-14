"""Build a mirrored 2K texture cache for isolated Survival review renders."""

from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path

from PIL import Image, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "sprites" / "character" / "survival-character-fab-v1" / "source" / "Textures"
OUTPUT = (
    ROOT
    / "visual-approval-previews"
    / "2026-08-14-survival-global-benchmark-v1"
    / "texture-cache-2k"
)
LIMIT = 2048


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def polish_review_variant(image: Image.Image, relative: Path) -> tuple[Image.Image, str | None]:
    if relative.as_posix().endswith("Gloves/Gloves_BaseColor.jpg"):
        rgb = image.convert("RGB")
        luminance = ImageOps.grayscale(rgb)
        mask = luminance.point(lambda value: 255 if value >= 150 else 0)
        mask = mask.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.GaussianBlur(3.0))
        dark_leather = Image.new("RGB", rgb.size, (38, 36, 34))
        return Image.composite(dark_leather, rgb, mask), "suppress near-white glove patches"
    return image, None


def save_resized(source: Path, target: Path, relative: Path) -> tuple[list[int], list[int], str | None]:
    with Image.open(source) as image:
        original = list(image.size)
        if max(image.size) <= LIMIT:
            size = image.size
            resized = image.copy()
        else:
            ratio = LIMIT / max(image.size)
            size = (max(1, round(image.width * ratio)), max(1, round(image.height * ratio)))
            resized = image.resize(size, Image.Resampling.LANCZOS)
        resized, polish = polish_review_variant(resized, relative)
        if tuple(size) == tuple(original) and polish is None:
            shutil.copy2(source, target)
            return original, original, None
        if source.suffix.lower() in {".jpg", ".jpeg"}:
            if resized.mode not in {"RGB", "L"}:
                resized = resized.convert("RGB")
            resized.save(target, "JPEG", quality=95, subsampling=0, optimize=True)
        else:
            resized.save(target, "PNG", compress_level=4)
        return original, list(size), polish


def main() -> None:
    if not SOURCE.is_dir():
        raise FileNotFoundError(SOURCE)
    records = []
    for source in sorted(path for path in SOURCE.rglob("*") if path.is_file()):
        relative = source.relative_to(SOURCE)
        target = OUTPUT / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        original, cached, polish = save_resized(source, target, relative)
        records.append({
            "relative": relative.as_posix(),
            "source_size": original,
            "cached_size": cached,
            "source_sha256": sha256(source),
            "cached_sha256": sha256(target),
            "review_polish": polish,
        })
        print(f"SURVIVAL_REVIEW_TEXTURE {relative} {original}->{cached}")
    manifest = {
        "version": 1,
        "reviewOnly": True,
        "productionChanged": False,
        "limit": LIMIT,
        "files": records,
    }
    (OUTPUT / "texture-cache-manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"SURVIVAL_REVIEW_TEXTURE_CACHE_OK files={len(records)} output={OUTPUT}")


if __name__ == "__main__":
    main()
