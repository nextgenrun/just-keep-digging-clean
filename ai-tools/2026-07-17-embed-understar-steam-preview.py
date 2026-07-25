"""Embed compact project artwork into the inline UNDERSTAR Steam preview."""

from __future__ import annotations

import base64
import io
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "ai-tools" / "2026-07-17-understar-steam-assets"
TARGET = Path(
    r"C:\Users\Mila\.codex\visualizations\2026\07\15"
    r"\019f66da-9981-7151-b9b1-844dca92b65f\understar-steam-store-preview.html"
)


def jpeg_data_url(path: Path, width: int, quality: int) -> str:
    image = Image.open(path).convert("RGB")
    if image.width > width:
        height = round(image.height * width / image.width)
        image = image.resize((width, height), Image.Resampling.LANCZOS)
    output = io.BytesIO()
    image.save(output, "JPEG", quality=quality, optimize=True, progressive=True)
    encoded = base64.b64encode(output.getvalue()).decode("ascii")
    return f"data:image/jpeg;base64,{encoded}"


def main() -> None:
    replacements = {
        "__HEADER__": jpeg_data_url(ASSETS / "understar-header-capsule-920x430.png", 760, 78),
        "__HERO__": jpeg_data_url(ASSETS / "understar-library-hero-3840x1240.png", 1100, 72),
    }
    for index in range(1, 6):
        replacements[f"__SHOT_{index}__"] = jpeg_data_url(
            ASSETS / f"understar-screenshot-{index:02d}-1920x1080.png",
            860,
            68,
        )

    fragment = TARGET.read_text(encoding="utf-8")
    for placeholder, data_url in replacements.items():
        fragment = fragment.replace(placeholder, data_url)
    TARGET.write_text(fragment, encoding="utf-8", newline="\n")

    remaining = [placeholder for placeholder in replacements if placeholder in fragment]
    if remaining:
        raise RuntimeError(f"Unreplaced placeholders: {remaining}")
    if TARGET.stat().st_size >= 2_000_000:
        raise RuntimeError(f"Preview exceeds 2 MB: {TARGET.stat().st_size} bytes")
    print(f"Embedded preview images: {TARGET.stat().st_size} bytes")


if __name__ == "__main__":
    main()
