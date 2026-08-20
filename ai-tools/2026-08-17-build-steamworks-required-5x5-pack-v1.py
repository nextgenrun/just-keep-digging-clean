"""Build and validate the Steam screenshot + library upload pack."""

from __future__ import annotations

from pathlib import Path
import shutil

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE_CAPTURES = ROOT / "output" / "2026-08-17-steam-screenshot-source-captures-v1"
SOURCE_LIBRARY = (
    ROOT
    / "steam-marketing"
    / "2026-08-17-steamworks-clean-upload-pack-v1"
    / "02-library-assets"
)
SOURCE_ICONS = (
    ROOT
    / "steam-marketing"
    / "2026-08-17-steamworks-clean-upload-pack-v1"
    / "05-client-icons"
)
OUTPUT = (
    ROOT
    / "steam-marketing"
    / "2026-08-17-steamworks-required-5x5-pack-v1"
)
SCREENSHOTS = OUTPUT / "01-screenshots"
LIBRARY = OUTPUT / "02-library-assets"
CLIENT_ICONS = OUTPUT / "03-community-client-icons"
CONTACT_SHEET = (
    ROOT
    / "steam-marketing"
    / "2026-08-17-steamworks-required-5x5-pack-v1-review.png"
)


SCREENSHOT_FILES = (
    ("01-surface-town.png", "screenshot_01_surface_town_english.png"),
    ("02-celestial-talents.png", "screenshot_02_celestial_talents_english.png"),
    ("03-titan-archive.png", "screenshot_03_titan_archive_english.png"),
    ("04-field-inventory.png", "screenshot_04_field_inventory_english.png"),
    ("05-title-menu.png", "screenshot_05_title_menu_english.png"),
)

LIBRARY_FILES = (
    (SOURCE_LIBRARY / "library_capsule_english.png", "01_library_capsule_600x900_english.png"),
    (SOURCE_LIBRARY / "library_hero.png", "02_library_hero_3840x1240.png"),
    (SOURCE_LIBRARY / "library_logo.png", "03_library_logo_transparent.png"),
    (SOURCE_LIBRARY / "library_header_english.png", "04_library_header_920x430_english.png"),
)

CLIENT_ICON_FILES = (
    (SOURCE_ICONS / "app_icon.jpg", "app_icon_184x184.jpg"),
    (SOURCE_ICONS / "shortcut_icon.png", "shortcut_icon_256x256.png"),
)

EXPECTED_LIBRARY = {
    "01_library_capsule_600x900_english.png": ((600, 900), {"RGB", "RGBA"}),
    "02_library_hero_3840x1240.png": ((3840, 1240), {"RGB", "RGBA"}),
    "03_library_logo_transparent.png": ((1280, 352), {"RGBA"}),
    "04_library_header_920x430_english.png": ((920, 430), {"RGB", "RGBA"}),
}

EXPECTED_CLIENT_ICONS = {
    "app_icon_184x184.jpg": ((184, 184), {"RGB"}),
    "shortcut_icon_256x256.png": ((256, 256), {"RGB", "RGBA"}),
}


def build_screenshots() -> None:
    SCREENSHOTS.mkdir(parents=True, exist_ok=True)
    for source_name, output_name in SCREENSHOT_FILES:
        source = SOURCE_CAPTURES / source_name
        with Image.open(source) as image:
            rgb = image.convert("RGB")
            resized = rgb.resize((1920, 1080), Image.Resampling.LANCZOS)
            resized.save(SCREENSHOTS / output_name, "PNG", optimize=True)


def build_library() -> None:
    LIBRARY.mkdir(parents=True, exist_ok=True)
    (LIBRARY / "05_app_icon_184x184.jpg").unlink(missing_ok=True)
    for source, output_name in LIBRARY_FILES:
        shutil.copy2(source, LIBRARY / output_name)


def build_client_icons() -> None:
    CLIENT_ICONS.mkdir(parents=True, exist_ok=True)
    for source, output_name in CLIENT_ICON_FILES:
        shutil.copy2(source, CLIENT_ICONS / output_name)


def build_contact_sheet() -> None:
    thumbs = []
    for _, output_name in SCREENSHOT_FILES:
        with Image.open(SCREENSHOTS / output_name) as image:
            thumb = image.convert("RGB").resize((640, 360), Image.Resampling.LANCZOS)
            thumbs.append((output_name, thumb))

    sheet = Image.new("RGB", (1960, 840), "#0d141b")
    draw = ImageDraw.Draw(sheet)
    positions = ((20, 50), (660, 50), (1300, 50), (340, 450), (980, 450))
    for (name, thumb), (x, y) in zip(thumbs, positions):
        sheet.paste(thumb, (x, y))
        draw.text((x, y - 24), name, fill="#dce8ef")
    CONTACT_SHEET.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(CONTACT_SHEET, "PNG", optimize=True)


def validate() -> None:
    failures = []
    for _, output_name in SCREENSHOT_FILES:
        path = SCREENSHOTS / output_name
        with Image.open(path) as image:
            if image.size != (1920, 1080):
                failures.append(f"{output_name}: expected 1920x1080, got {image.size}")
            if image.mode != "RGB":
                failures.append(f"{output_name}: expected RGB, got {image.mode}")

    for output_name, (expected_size, allowed_modes) in EXPECTED_LIBRARY.items():
        path = LIBRARY / output_name
        with Image.open(path) as image:
            if image.size != expected_size:
                failures.append(f"{output_name}: expected {expected_size}, got {image.size}")
            if image.mode not in allowed_modes:
                failures.append(f"{output_name}: unexpected mode {image.mode}")

    for output_name, (expected_size, allowed_modes) in EXPECTED_CLIENT_ICONS.items():
        path = CLIENT_ICONS / output_name
        with Image.open(path) as image:
            if image.size != expected_size:
                failures.append(f"{output_name}: expected {expected_size}, got {image.size}")
            if image.mode not in allowed_modes:
                failures.append(f"{output_name}: unexpected mode {image.mode}")

    if failures:
        raise SystemExit("VALIDATION FAILED\n" + "\n".join(failures))

    print("PASS: 5 screenshots at 1920x1080 RGB")
    print("PASS: 4 Library assets at exact required dimensions")
    print("PASS: 2 Community/Client icons at exact required dimensions")
    print(f"PACK: {OUTPUT}")
    print(f"REVIEW: {CONTACT_SHEET}")


def main() -> None:
    build_screenshots()
    build_library()
    build_client_icons()
    build_contact_sheet()
    validate()


if __name__ == "__main__":
    main()
