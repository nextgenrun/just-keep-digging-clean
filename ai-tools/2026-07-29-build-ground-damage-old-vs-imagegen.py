"""Build the final procedural-versus-ImageGen runtime comparison plate."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OLD_PATH = ROOT / "testing/2026-07-28-ground-damage-after-v3.png"
NEW_PATH = ROOT / "testing/2026-07-29-imagegen-ground-damage-production-runtime.png"
OUTPUT_PATH = ROOT / "testing/2026-07-29-ground-damage-old-vs-imagegen-production.png"

PANEL_SIZE = (640, 360)
LABEL_HEIGHT = 48
BACKGROUND = "#07090d"
OLD_LABEL = "OLD · PROCEDURAL PHASER LINES"
NEW_LABEL = "NEW · 120 IMAGEGEN DAMAGE STATES"


def font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    path = Path("C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf")
    return ImageFont.truetype(str(path), size) if path.is_file() else ImageFont.load_default()


def panel(path: Path) -> Image.Image:
    source = Image.open(path).convert("RGB")
    return ImageOps.fit(source, PANEL_SIZE, Image.Resampling.LANCZOS)


def main() -> None:
    missing = [path for path in (OLD_PATH, NEW_PATH) if not path.is_file()]
    if missing:
        raise FileNotFoundError("\n".join(str(path) for path in missing))
    canvas = Image.new("RGB", (PANEL_SIZE[0] * 2, PANEL_SIZE[1] + LABEL_HEIGHT), BACKGROUND)
    canvas.paste(panel(OLD_PATH), (0, LABEL_HEIGHT))
    canvas.paste(panel(NEW_PATH), (PANEL_SIZE[0], LABEL_HEIGHT))
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, PANEL_SIZE[0] - 1, LABEL_HEIGHT - 1), fill="#221713")
    draw.rectangle((PANEL_SIZE[0], 0, canvas.width, LABEL_HEIGHT - 1), fill="#10221d")
    draw.text((22, 13), OLD_LABEL, fill="#e7b9a2", font=font(18, True))
    draw.text((PANEL_SIZE[0] + 22, 13), NEW_LABEL, fill="#bff0d8", font=font(18, True))
    draw.line((PANEL_SIZE[0], 0, PANEL_SIZE[0], canvas.height), fill="#f0dfbf", width=2)
    canvas.save(OUTPUT_PATH, "PNG", optimize=True)
    print(f"Built {OUTPUT_PATH.relative_to(ROOT).as_posix()}")


if __name__ == "__main__":
    main()
