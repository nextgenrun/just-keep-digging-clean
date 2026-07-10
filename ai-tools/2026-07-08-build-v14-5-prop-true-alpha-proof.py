from __future__ import annotations

import json
import re
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "exports" / "pallet-v14" / "dig_game_hq_props_backgrounds_v14"
PROOF_DIR = OUT / "approval-5-props-true-alpha"
PREVIEW_DIR = OUT / "previews"
PROP_W, PROP_H = 303, 313

PROP_SOURCE_DIRS = [
    ROOT / "exports" / "pallet-v10" / "dig_game_full_non_tile_runtime_assets_v10_08_07_2026" / "sprites" / "props" / "near_props_seam_breakers",
    ROOT / "exports" / "pallet-v9" / "dig_game_empty_backgrounds_and_separate_props_v1" / "sprites" / "props" / "near_props_seam_breakers",
]

SELECTED_PROP_STEMS = [
    "industrial_magma_sanctum__l11__13",
    "frozen_prism_abyss__l11__13",
    "void_realm__l11__03",
    "deep_cave_biome__l11__07",
    "bioluminescent_root_caverns__l11__01",
]

LABELS = {
    "industrial_magma_sanctum__l11__13": "magma reactor",
    "frozen_prism_abyss__l11__13": "frozen gate",
    "void_realm__l11__03": "void altar",
    "deep_cave_biome__l11__07": "deep portal",
    "bioluminescent_root_caverns__l11__01": "bio mushrooms",
}


def font(size: int):
    for name in ("arial.ttf", "segoeui.ttf", "consola.ttf"):
        path = Path("C:/Windows/Fonts") / name
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def checkerboard(size: tuple[int, int], step: int = 18) -> Image.Image:
    w, h = size
    img = Image.new("RGB", size, (76, 84, 91))
    draw = ImageDraw.Draw(img)
    for y in range(0, h, step):
        for x in range(0, w, step):
            color = (54, 61, 68) if ((x // step) + (y // step)) % 2 else (88, 96, 103)
            draw.rectangle((x, y, x + step - 1, y + step - 1), fill=color)
    return img


def clean_key(stem: str) -> str:
    key = re.sub(r"^[0-9a-f]{8}-", "", stem)
    return re.sub(r"__v\d+$", "", key)


def source_lookup() -> dict[str, Path]:
    files: list[Path] = []
    for root in PROP_SOURCE_DIRS:
        if not root.exists():
            continue
        files.extend(sorted(root.glob("*.png")))
        files.extend(sorted(root.glob("*.webp")))
    files.sort(key=lambda p: (0 if "pallet-v10" in str(p) else 1, -p.stat().st_size, p.name))
    lookup: dict[str, Path] = {}
    for path in files:
        lookup.setdefault(clean_key(path.stem), path)
    return lookup


def is_green_leak_pixel(r: int, g: int, b: int) -> bool:
    neon_green = g >= 108 and r <= 112 and b <= 125 and g >= max(r, b) + 34
    yellow_green = g >= 125 and r <= 145 and b <= 90 and g >= r + 18
    return neon_green or yellow_green


def is_grey_leak_pixel(r: int, g: int, b: int) -> bool:
    return abs(r - g) < 9 and abs(g - b) < 9 and 38 <= r <= 222


def clear_hidden_rgb(img: Image.Image) -> Image.Image:
    arr = np.array(img.convert("RGBA"), dtype=np.uint8)
    arr[arr[:, :, 3] == 0, :3] = 0
    return Image.fromarray(arr, "RGBA").copy()


def alpha_safe_resize(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    arr = np.array(clear_hidden_rgb(img), dtype=np.float32)
    alpha = arr[:, :, 3:4] / 255.0
    arr[:, :, :3] *= alpha
    premul = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA").resize(size, Image.Resampling.LANCZOS)
    out = np.array(premul, dtype=np.float32)
    alpha = out[:, :, 3:4]
    np.divide(out[:, :, :3] * 255.0, alpha, out=out[:, :, :3], where=alpha > 0)
    out[:, :, :3][alpha[:, :, 0] <= 0] = 0
    return clear_hidden_rgb(Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA"))


def has_transparent_neighbor(alpha, x: int, y: int, w: int, h: int, radius: int = 1) -> bool:
    for ny in range(max(0, y - radius), min(h, y + radius + 1)):
        for nx in range(max(0, x - radius), min(w, x + radius + 1)):
            if nx == x and ny == y:
                continue
            if alpha[nx, ny] == 0:
                return True
    return False


def remove_tiny_alpha_components(img: Image.Image, min_area: int = 120) -> Image.Image:
    img = img.copy().convert("RGBA")
    alpha = img.getchannel("A")
    apx = alpha.load()
    w, h = alpha.size
    seen = bytearray(w * h)
    kill: list[tuple[int, int]] = []
    for sy in range(h):
        for sx in range(w):
            idx = sy * w + sx
            if seen[idx] or apx[sx, sy] < 24:
                continue
            q = deque([(sx, sy)])
            seen[idx] = 1
            comp = []
            min_x = max_x = sx
            min_y = max_y = sy
            while q:
                x, y = q.popleft()
                comp.append((x, y))
                min_x, max_x = min(min_x, x), max(max_x, x)
                min_y, max_y = min(min_y, y), max(max_y, y)
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h:
                        ni = ny * w + nx
                        if not seen[ni] and apx[nx, ny] >= 24:
                            seen[ni] = 1
                            q.append((nx, ny))
            touches_edge = min_x <= 1 or min_y <= 1 or max_x >= w - 2 or max_y >= h - 2
            if len(comp) < min_area or touches_edge:
                kill.extend(comp)
    if kill:
        for x, y in kill:
            apx[x, y] = 0
        img.putalpha(alpha)
    return clear_hidden_rgb(img)


def strict_true_alpha_cell(src: Path) -> Image.Image:
    img = Image.open(src).convert("RGBA")
    px = img.load()
    alpha = img.getchannel("A")
    apx = alpha.load()
    w, h = img.size

    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 26:
                apx[x, y] = 0
                continue
            if a < 230 and (is_green_leak_pixel(r, g, b) or is_grey_leak_pixel(r, g, b)):
                apx[x, y] = 0
    img.putalpha(alpha)
    img = clear_hidden_rgb(img)
    bbox = img.getchannel("A").getbbox()
    if not bbox:
        raise RuntimeError(f"blank alpha after first clean: {src}")

    cropped = img.crop(bbox)
    cw, ch = cropped.size
    scale = min((PROP_W - 34) / cw, (PROP_H - 34) / ch, 1.65)
    resized = alpha_safe_resize(cropped, (max(1, int(cw * scale)), max(1, int(ch * scale))))
    resized = ImageEnhance.Sharpness(resized).enhance(1.14)

    cell = Image.new("RGBA", (PROP_W, PROP_H), (0, 0, 0, 0))
    x = (PROP_W - resized.width) // 2
    y = PROP_H - resized.height - 14
    cell.alpha_composite(resized, (x, max(10, y)))
    cell = remove_tiny_alpha_components(cell)

    cpx = cell.load()
    for x in range(PROP_W):
        for y in (0, 1, 2, PROP_H - 3, PROP_H - 2, PROP_H - 1):
            cpx[x, y] = (0, 0, 0, 0)
    for y in range(PROP_H):
        for x in (0, 1, 2, PROP_W - 3, PROP_W - 2, PROP_W - 1):
            cpx[x, y] = (0, 0, 0, 0)

    for _ in range(14):
        alpha = cell.getchannel("A")
        apx = alpha.load()
        removals: list[tuple[int, int]] = []
        despill: list[tuple[int, int, tuple[int, int, int, int]]] = []
        for y in range(3, PROP_H - 3):
            for x in range(3, PROP_W - 3):
                r, g, b, a = cpx[x, y]
                if a == 0:
                    continue
                edge = a < 245 or has_transparent_neighbor(apx, x, y, PROP_W, PROP_H, radius=2)
                if not edge:
                    continue
                if is_grey_leak_pixel(r, g, b) and a < 225:
                    removals.append((x, y))
                    continue
                if is_green_leak_pixel(r, g, b):
                    if a < 245 or has_transparent_neighbor(apx, x, y, PROP_W, PROP_H, radius=3):
                        removals.append((x, y))
                    else:
                        capped_g = min(g, max(r, b) + 16)
                        despill.append((x, y, (r, capped_g, b, a)))
                elif a < 46:
                    removals.append((x, y))
        if not removals and not despill:
            break
        for x, y in removals:
            cpx[x, y] = (0, 0, 0, 0)
        for x, y, color in despill:
            if cpx[x, y][3] != 0:
                cpx[x, y] = color
    return clear_hidden_rgb(remove_tiny_alpha_components(cell, min_area=80))


def validate_cell(cell: Image.Image) -> dict:
    alpha = cell.getchannel("A")
    apx = alpha.load()
    cpx = cell.load()
    bbox = alpha.getbbox()
    green_edge = 0
    grey_edge = 0
    border_alpha = 0
    hidden_rgb = 0
    for y in range(PROP_H):
        for x in range(PROP_W):
            r, g, b, a = cpx[x, y]
            if a == 0:
                if r or g or b:
                    hidden_rgb += 1
                continue
            if x < 3 or y < 3 or x >= PROP_W - 3 or y >= PROP_H - 3:
                border_alpha += 1
            edge = x < 3 or y < 3 or x >= PROP_W - 3 or y >= PROP_H - 3 or a < 245 or has_transparent_neighbor(apx, x, y, PROP_W, PROP_H, radius=2)
            if not edge:
                continue
            if is_green_leak_pixel(r, g, b):
                green_edge += 1
            if is_grey_leak_pixel(r, g, b) and a < 230:
                grey_edge += 1
    return {
        "bbox": bbox,
        "transparentCorners": all(cell.getpixel(pt)[3] == 0 for pt in ((0, 0), (PROP_W - 1, 0), (0, PROP_H - 1), (PROP_W - 1, PROP_H - 1))),
        "borderAlphaPixels": border_alpha,
        "greenLeakEdgePixels": green_edge,
        "greyLeakEdgePixels": grey_edge,
        "hiddenRgbTransparentPixels": hidden_rgb,
    }


def main() -> None:
    PROOF_DIR.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    lookup = source_lookup()
    cells = []
    manifest = []
    for index, stem in enumerate(SELECTED_PROP_STEMS, start=1):
        src = lookup.get(stem)
        if not src:
            raise RuntimeError(f"missing source prop: {stem}")
        cell = strict_true_alpha_cell(src)
        file_name = f"A{index:02d}_{LABELS[stem].replace(' ', '_')}_303x313.png"
        cell.save(PROOF_DIR / file_name)
        result = validate_cell(cell)
        result.update(
            {
                "approvalId": f"A{index:02d}",
                "name": LABELS[stem],
                "source": src.relative_to(ROOT).as_posix(),
                "file": file_name,
            }
        )
        manifest.append(result)
        cells.append((LABELS[stem], cell))

    grid = Image.new("RGBA", (PROP_W * len(cells), PROP_H), (0, 0, 0, 0))
    for i, (_, cell) in enumerate(cells):
        grid.alpha_composite(cell, (i * PROP_W, 0))
    grid_path = PROOF_DIR / "v14_approval_5_props_true_alpha_grid_303x313.png"
    grid.save(grid_path)

    pad, label_h = 18, 34
    preview = Image.new("RGB", (pad + len(cells) * (PROP_W + pad), pad * 2 + label_h + PROP_H), (8, 12, 18))
    draw = ImageDraw.Draw(preview)
    f = font(18)
    for i, (label, cell) in enumerate(cells):
        x = pad + i * (PROP_W + pad)
        y = pad
        draw.rectangle((x, y, x + PROP_W, y + label_h), fill=(20, 25, 31), outline=(236, 180, 44))
        draw.text((x + 8, y + 7), f"A{i + 1:02d} {label}", fill=(246, 228, 156), font=f)
        preview.paste(checkerboard((PROP_W, PROP_H)), (x, y + label_h))
        draw.rectangle((x, y + label_h, x + PROP_W, y + label_h + PROP_H), outline=(236, 180, 44))
        preview.paste(cell, (x, y + label_h), cell)
    preview_path = PREVIEW_DIR / "preview-v14-5-props-true-alpha-approval.png"
    preview.save(preview_path)

    validation_ok = all(
        item["transparentCorners"]
        and item["borderAlphaPixels"] == 0
        and item["greenLeakEdgePixels"] == 0
        and item["greyLeakEdgePixels"] == 0
        and item["hiddenRgbTransparentPixels"] == 0
        for item in manifest
    )
    payload = {
        "scope": "5 prop approval only; no background rebuild; no runtime wiring",
        "cell": {"width": PROP_W, "height": PROP_H},
        "grid": grid_path.relative_to(OUT).as_posix(),
        "preview": preview_path.relative_to(OUT).as_posix(),
        "validationOk": validation_ok,
        "props": manifest,
    }
    (PROOF_DIR / "manifest_5_props_true_alpha_approval.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2))
    if not validation_ok:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
