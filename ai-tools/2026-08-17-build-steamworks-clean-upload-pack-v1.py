"""Build a sectioned, metadata-stripped Steamworks upload pack."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "steam-marketing" / "2026-08-16-static-upload-pack-v1"
OUTPUT = ROOT / "steam-marketing" / "2026-08-17-steamworks-clean-upload-pack-v1"

SECTIONS = {
    "01-store-assets": (
        ("store-header-capsule-920x430.png", "header_english.png", "RGB"),
        ("store-small-capsule-462x174.png", "small_capsule_english.png", "RGB"),
        ("store-main-capsule-1232x706.png", "main_capsule_english.png", "RGB"),
        ("store-vertical-capsule-748x896.png", "vertical_capsule_english.png", "RGB"),
    ),
    "02-library-assets": (
        ("library-capsule-600x900.png", "library_capsule_english.png", "RGB"),
        ("library-header-capsule-920x430.png", "library_header_english.png", "RGB"),
        ("library-hero-artwork-only-3840x1240.png", "library_hero.png", "RGB"),
        ("library-logo-transparent-1280px-wide.png", "library_logo.png", "RGBA"),
    ),
    "03-page-background": (
        ("store-page-background-1438x810.png", "page_background.png", "RGB"),
    ),
    "04-screenshots-review-only": (
        ("review-only-screenshot-01-surface-town-1920x1080.png", "screenshot_01_surface_town_english.png", "RGB"),
        ("review-only-screenshot-02-first-dig-1920x1080.png", "screenshot_02_first_dig_english.png", "RGB"),
        ("review-only-screenshot-03-celestial-talents-1920x1080.png", "screenshot_03_celestial_talents_english.png", "RGB"),
    ),
    "05-client-icons": (
        ("client-shortcut-icon-256x256.png", "shortcut_icon.png", "RGB"),
        ("client-app-icon-184x184.jpg", "app_icon.jpg", "RGB"),
    ),
    "06-broadcast-review-only": (
        ("broadcast-slate-1920x1080.png", "broadcast_slate.png", "RGB"),
    ),
}

SECTION_NOTES = {
    "01-store-assets": "Select only the four PNG files in this directory for the four Store Asset fields. If the generic drop-zone still rejects them, upload each file through its named field.",
    "02-library-assets": "Upload these only in the Library Assets section. The hero contains artwork only; the logo is the only intentionally transparent PNG.",
    "03-page-background": "Upload this through the Page Background field, not the generic store-capsule drop-zone.",
    "04-screenshots-review-only": "Review-only. Do not upload as the final five-image rail: two more gameplay captures are missing and the first-dig frame still exposes rendering seams.",
    "05-client-icons": "Upload through Community and Client Icons, not the Graphical Assets drop-zone.",
    "06-broadcast-review-only": "Optional review slate. Upload only through the broadcast asset control if Steam requests this exact format.",
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def export_image(source_name: str, target: Path, mode: str) -> dict[str, object]:
    source = SOURCE / source_name
    if not source.is_file():
        raise FileNotFoundError(source)

    image = Image.open(source).convert(mode)
    if target.suffix.lower() == ".jpg":
        image.convert("RGB").save(target, "JPEG", quality=96, optimize=True, subsampling=0)
    else:
        image.save(target, "PNG", optimize=True)

    verified = Image.open(target)
    return {
        "section": target.parent.name,
        "file": target.name,
        "width": verified.width,
        "height": verified.height,
        "mode": verified.mode,
        "sha256": sha256(target),
    }


def build() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest: list[dict[str, object]] = []

    for section, entries in SECTIONS.items():
        directory = OUTPUT / section
        directory.mkdir(parents=True, exist_ok=True)
        for source_name, target_name, mode in entries:
            manifest.append(export_image(source_name, directory / target_name, mode))
        (directory / "readme.md").write_text(
            f"# {section}\n\n{SECTION_NOTES[section]}\n",
            encoding="utf-8",
        )

    (OUTPUT / "manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    build()
