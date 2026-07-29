"""Crop the approved notification control sheet into runtime PNG buttons."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "ai-tools" / "2026-07-28-notification-controls-transparent-v1.png"
OUTPUT_DIR = ROOT / "sprites" / "UI" / "notification-controls-v1"
OUTPUT_SIZE = (128, 128)

# Equal 384 px crops centered on the three generated controls.
CONTROL_CROPS = {
    "notification-previous-v1.png": (38, 419, 422, 803),
    "notification-next-v1.png": (438, 419, 822, 803),
    "notification-clear-v1.png": (833, 419, 1217, 803),
}


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with Image.open(SOURCE) as source:
        rgba = source.convert("RGBA")
        for filename, crop_box in CONTROL_CROPS.items():
            control = rgba.crop(crop_box)
            control = control.resize(OUTPUT_SIZE, Image.Resampling.LANCZOS)
            control.save(OUTPUT_DIR / filename, "PNG", optimize=True)
            print(f"Wrote {OUTPUT_DIR / filename}")


if __name__ == "__main__":
    main()
