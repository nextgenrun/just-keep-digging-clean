from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]


def font(size: int) -> ImageFont.ImageFont:
    for name in ("segoeui.ttf", "arial.ttf", "consola.ttf"):
        path = Path("C:/Windows/Fonts") / name
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def draw_tile(sheet: Image.Image, out_dir: Path, asset, x: int, y: int, w: int, h: int, label: str) -> None:
    draw = ImageDraw.Draw(sheet)
    draw.rectangle((x, y, x + w, y + h), fill=(8, 13, 17), outline=(28, 212, 166), width=2)
    img = Image.open(out_dir / asset.out_source).convert("RGBA")
    scale = min((w - 12) / img.width, (h - 38) / img.height)
    thumb = img.resize((max(1, int(img.width * scale)), max(1, int(img.height * scale))), Image.Resampling.LANCZOS)
    sheet.alpha_composite(thumb, (x + (w - thumb.width) // 2, y + 24 + (h - 38 - thumb.height) // 2))
    draw.text((x + 8, y + 6), label, fill=(230, 236, 232), font=font(13))


def contact_sheet(assets: list, out_dir: Path, preview_dir: Path) -> Path:
    cols, tile_w, tile_h = 4, 360, 190
    rows = math.ceil(len(assets) / cols)
    sheet = Image.new("RGBA", (cols * tile_w + 30, rows * tile_h + 70), (12, 16, 20, 255))
    draw = ImageDraw.Draw(sheet)
    draw.text((16, 14), "v14 wired backgrounds - actual v10 TMX references, alpha-safe, no grey/green matte", fill=(240, 244, 242), font=font(18))
    for index, asset in enumerate(assets):
        draw_tile(sheet, out_dir, asset, 16 + (index % cols) * tile_w, 50 + (index // cols) * tile_h, tile_w - 20, tile_h - 18, f"B{asset.out_id:03d} gid {asset.gid} x{len(asset.placements)}")
    path = preview_dir / "preview-v14-wired-backgrounds-all.png"
    sheet.convert("RGB").save(path)
    return path


def comparison_sheet(assets: list, out_dir: Path, preview_dir: Path) -> Path:
    chosen = sorted(assets, key=lambda asset: len(asset.placements), reverse=True)[:16]
    row_h, col_w = 170, 420
    sheet = Image.new("RGBA", (col_w * 2 + 40, row_h * len(chosen) + 70), (12, 16, 20, 255))
    draw = ImageDraw.Draw(sheet)
    draw.text((16, 14), "current wired source vs v14 candidate", fill=(240, 244, 242), font=font(18))
    for row, asset in enumerate(chosen):
        y = 52 + row * row_h
        for col, (title, path) in enumerate((("current", asset.image_path), ("v14", out_dir / asset.out_source))):
            img = Image.open(path).convert("RGBA")
            scale = min((col_w - 28) / img.width, 116 / img.height)
            thumb = img.resize((max(1, int(img.width * scale)), max(1, int(img.height * scale))), Image.Resampling.LANCZOS)
            x = 16 + col * col_w
            draw.rectangle((x, y, x + col_w - 20, y + row_h - 16), fill=(8, 13, 17), outline=(92, 103, 111), width=1)
            sheet.alpha_composite(thumb, (x + 10, y + 28))
            draw.text((x + 10, y + 8), f"{title} B{asset.out_id:03d} gid {asset.gid}", fill=(224, 231, 229), font=font(13))
    path = preview_dir / "preview-v14-wired-backgrounds-current-vs-new.png"
    sheet.convert("RGB").save(path)
    return path


def context_preview(assets: list, out_dir: Path, preview_dir: Path) -> Path:
    objects = []
    for asset in assets:
        for place in asset.placements:
            if 9300 <= place.y <= 10500 and 3500 <= place.x <= 15500:
                objects.append((asset, place))
    sheet = Image.new("RGBA", (2000, 520), (8, 13, 17, 255))
    draw = ImageDraw.Draw(sheet)
    draw.text((18, 12), "v14 world-context proof from real v10 TMX object placements", fill=(240, 244, 242), font=font(18))
    crop_x, crop_y, scale = 3500, 9300, 0.16
    for asset, place in objects[:120]:
        img = Image.open(out_dir / asset.out_source).convert("RGBA")
        dw, dh = max(1, int(place.w * scale)), max(1, int(place.h * scale))
        thumb = img.resize((dw, dh), Image.Resampling.LANCZOS)
        px, py = int((place.x - crop_x) * scale) + 20, int((place.y - crop_y) * scale) + 55
        if -dw < px < sheet.width and -dh < py < sheet.height:
            sheet.alpha_composite(thumb, (px, py))
            draw.rectangle((px, py, px + dw, py + dh), outline=(28, 212, 166, 180), width=1)
    path = preview_dir / "preview-v14-wired-backgrounds-world-context.png"
    sheet.convert("RGB").save(path)
    return path


def write_previews(assets: list, out_dir: Path, preview_dir: Path) -> list[Path]:
    preview_dir.mkdir(parents=True, exist_ok=True)
    return [
        contact_sheet(assets, out_dir, preview_dir),
        comparison_sheet(assets, out_dir, preview_dir),
        context_preview(assets, out_dir, preview_dir),
    ]
