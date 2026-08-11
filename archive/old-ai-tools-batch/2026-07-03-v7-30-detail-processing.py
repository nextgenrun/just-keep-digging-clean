from __future__ import annotations

import hashlib
import math
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont


TILE_W = 360
TILE_H = 240
HEADER_H = 46
PAD = 14

PARAMS = {
    "strip_upscale": (0.44, 2.25, 1.38, 0.42, 0.052, 38),
    "background_upscale": (0.34, 1.82, 1.02, 0.30, 0.038, 30),
    "prop_upscale": (0.28, 1.45, 1.62, 0.48, 0.026, 24),
}


def write_readme(path: Path, title: str, body: str) -> None:
    path.mkdir(parents=True, exist_ok=True)
    (path / "readme.md").write_text(f"# {title}\n\n{body}\n", encoding="utf-8")


def font(size: int) -> ImageFont.ImageFont:
    try:
        return ImageFont.truetype("arial.ttf", size)
    except OSError:
        return ImageFont.load_default()


def alpha_safe_resize(rgba: Image.Image, size: tuple[int, int]) -> np.ndarray:
    src = np.asarray(rgba.convert("RGBA"), dtype=np.float32)
    alpha = src[:, :, 3:4] / 255.0
    premult = src[:, :, :3] * alpha
    rgb = cv2.resize(premult, size, interpolation=cv2.INTER_LANCZOS4)
    a = cv2.resize(alpha, size, interpolation=cv2.INTER_LANCZOS4)
    a = np.clip(a, 0.0, 1.0)
    if a.ndim == 2:
        a = a[:, :, None]
    rgb = np.divide(rgb, np.maximum(a, 1.0 / 255.0), out=np.zeros_like(rgb), where=a > 0.001)
    return np.clip(np.dstack([rgb, a[:, :, 0] * 255.0]), 0, 255).astype(np.uint8)


def seeded_noise(shape: tuple[int, int], seed_text: str) -> np.ndarray:
    seed = int(hashlib.sha1(seed_text.encode("utf-8")).hexdigest()[:8], 16)
    rng = np.random.default_rng(seed)
    h, w = shape
    noise = np.zeros((h, w), dtype=np.float32)
    for scale, weight in ((96, 0.45), (37, 0.34), (13, 0.21)):
        sh = max(2, math.ceil(h / scale))
        sw = max(2, math.ceil(w / scale))
        base = rng.normal(0.0, 1.0, (sh, sw)).astype(np.float32)
        noise += cv2.resize(base, (w, h), interpolation=cv2.INTER_CUBIC) * weight
    noise -= float(noise.mean())
    noise /= float(noise.std() + 1e-6)
    return noise


def enhance_rgba(rgba: np.ndarray, sample_id: str, mode: str) -> np.ndarray:
    bilateral, clahe_limit, unsharp, fine, texture, sigma_color = PARAMS.get(mode, PARAMS["background_upscale"])
    rgb = rgba[:, :, :3].astype(np.float32)
    alpha = rgba[:, :, 3].astype(np.float32) / 255.0
    base = np.clip(rgb, 0, 255).astype(np.uint8)
    smooth = cv2.bilateralFilter(base, d=7, sigmaColor=sigma_color, sigmaSpace=5).astype(np.float32)
    rgb = rgb * (1.0 - bilateral) + smooth * bilateral

    lab = cv2.cvtColor(np.clip(rgb, 0, 255).astype(np.uint8), cv2.COLOR_RGB2LAB)
    lab[:, :, 0] = cv2.createCLAHE(clipLimit=clahe_limit, tileGridSize=(8, 8)).apply(lab[:, :, 0])
    rgb = rgb * 0.58 + cv2.cvtColor(lab, cv2.COLOR_LAB2RGB).astype(np.float32) * 0.42
    rgb = rgb + (rgb - cv2.GaussianBlur(rgb, (0, 0), sigmaX=1.16)) * unsharp
    rgb = rgb + (rgb - cv2.GaussianBlur(rgb, (0, 0), sigmaX=0.55)) * fine

    lum = cv2.cvtColor(np.clip(rgb, 0, 255).astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float32) / 255.0
    midtone = 0.45 + 0.55 * (1.0 - np.minimum(1.0, np.abs(lum - 0.5) * 2.0))
    rgb += seeded_noise(lum.shape, sample_id)[:, :, None] * (texture * 255.0) * midtone[:, :, None]
    rgb = np.where((alpha > 0.02)[:, :, None], rgb, 0)
    return np.clip(np.dstack([rgb, rgba[:, :, 3]]), 0, 255).astype(np.uint8)


def clean_halo_and_depixelate(rgba: np.ndarray, mode: str) -> np.ndarray:
    rgb = rgba[:, :, :3].astype(np.float32)
    alpha = rgba[:, :, 3].copy()
    alpha_f = alpha.astype(np.float32) / 255.0
    visible = alpha > 0
    if np.any(visible) and np.any(alpha < 250):
        rgb = _decontaminate_alpha_edges(rgb, alpha)
        if mode == "prop_upscale":
            alpha = _crisp_alpha(alpha)
            alpha_f = alpha.astype(np.float32) / 255.0
    smooth = cv2.bilateralFilter(np.clip(rgb, 0, 255).astype(np.uint8), d=7, sigmaColor=34, sigmaSpace=5)
    rgb = rgb * 0.38 + smooth.astype(np.float32) * 0.62
    detail_strength = 0.78 if mode == "prop_upscale" else 0.52
    blur = cv2.GaussianBlur(rgb, (0, 0), sigmaX=0.72)
    rgb = rgb + (rgb - blur) * detail_strength
    rgb = np.where((alpha_f > 0.001)[:, :, None], rgb, 0)
    return np.clip(np.dstack([rgb, alpha]), 0, 255).astype(np.uint8)


def _decontaminate_alpha_edges(rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    x0, y0, x1, y1 = _alpha_bbox(alpha, margin=24)
    crop_rgb = rgb[y0:y1, x0:x1].copy()
    crop_alpha = alpha[y0:y1, x0:x1]
    mask = (crop_alpha < 250).astype(np.uint8) * 255
    if np.count_nonzero(mask) == 0 or np.count_nonzero(crop_alpha > 190) < 32:
        return rgb
    fill = cv2.inpaint(np.clip(crop_rgb, 0, 255).astype(np.uint8), mask, 3, cv2.INPAINT_TELEA).astype(np.float32)
    edge = (crop_alpha > 0) & (crop_alpha < 245)
    weight = np.power(1.0 - crop_alpha.astype(np.float32) / 255.0, 0.58)
    crop_rgb = crop_rgb * (1.0 - weight[:, :, None]) + fill * weight[:, :, None]
    dark = _luma(crop_rgb) < (_luma(fill) - 10.0)
    crop_rgb[edge & dark] = crop_rgb[edge & dark] * 0.35 + fill[edge & dark] * 0.65
    green = crop_rgb[:, :, 1] - np.maximum(crop_rgb[:, :, 0], crop_rgb[:, :, 2])
    green_edge = edge & (green > 10.0) & (crop_alpha < 225)
    if np.any(green_edge):
        cap = np.maximum(crop_rgb[:, :, 0], crop_rgb[:, :, 2]) + 6.0
        crop_rgb[:, :, 1] = np.where(green_edge, np.minimum(crop_rgb[:, :, 1], cap), crop_rgb[:, :, 1])
    out = rgb.copy()
    out[y0:y1, x0:x1] = crop_rgb
    return out


def _alpha_bbox(alpha: np.ndarray, margin: int) -> tuple[int, int, int, int]:
    ys, xs = np.where(alpha > 0)
    if len(xs) == 0:
        return (0, 0, alpha.shape[1], alpha.shape[0])
    x0 = max(0, int(xs.min()) - margin)
    y0 = max(0, int(ys.min()) - margin)
    x1 = min(alpha.shape[1], int(xs.max()) + margin + 1)
    y1 = min(alpha.shape[0], int(ys.max()) + margin + 1)
    return x0, y0, x1, y1


def _crisp_alpha(alpha: np.ndarray) -> np.ndarray:
    a = alpha.astype(np.float32) / 255.0
    a = np.clip((a - 0.035) / 0.93, 0.0, 1.0)
    a = a * a * (3.0 - 2.0 * a)
    return np.clip(a * 255.0, 0, 255).astype(np.uint8)


def _luma(rgb: np.ndarray) -> np.ndarray:
    return rgb[:, :, 0] * 0.2126 + rgb[:, :, 1] * 0.7152 + rgb[:, :, 2] * 0.0722


def halo_metrics(img: np.ndarray) -> dict[str, float]:
    alpha = img[:, :, 3]
    edge = (alpha > 0) & (alpha < 245)
    if not np.any(edge):
        return {"edgePixels": 0.0, "greenEdge": 0.0, "darkEdge": 0.0}
    rgb = img[:, :, :3].astype(np.float32)
    green = np.maximum(0.0, rgb[:, :, 1] - np.maximum(rgb[:, :, 0], rgb[:, :, 2]))
    dark = np.maximum(0.0, 42.0 - _luma(rgb))
    return {
        "edgePixels": float(np.count_nonzero(edge)),
        "greenEdge": float(np.mean(green[edge])),
        "darkEdge": float(np.mean(dark[edge])),
    }


def edge_energy(img: np.ndarray) -> float:
    gray = cv2.cvtColor(img[:, :, :3], cv2.COLOR_RGB2GRAY)
    mask = img[:, :, 3] > 16
    if not np.any(mask):
        mask = np.ones_like(gray, dtype=bool)
    lap = cv2.Laplacian(gray, cv2.CV_32F, ksize=3)
    return float(np.mean(np.abs(lap[mask])))


def mean_abs_delta(a: np.ndarray, b: np.ndarray) -> float:
    h = min(a.shape[0], b.shape[0])
    w = min(a.shape[1], b.shape[1])
    ac = a[:h, :w, :3].astype(np.float32)
    bc = b[:h, :w, :3].astype(np.float32)
    mask = (a[:h, :w, 3] > 16) | (b[:h, :w, 3] > 16)
    return float(np.mean(np.abs(ac[mask] - bc[mask]))) if np.any(mask) else 0.0


def image_from_array(arr: np.ndarray) -> Image.Image:
    return Image.fromarray(arr, mode="RGBA")


def smart_crop_box(rgba: Image.Image) -> tuple[int, int, int, int]:
    w, h = rgba.size
    bbox = rgba.getchannel("A").getbbox()
    if bbox and (bbox[2] - bbox[0]) * (bbox[3] - bbox[1]) < w * h * 0.92:
        cx = (bbox[0] + bbox[2]) // 2
        cy = (bbox[1] + bbox[3]) // 2
    else:
        cx, cy = w // 2, h // 2
    cw = min(w, max(96, w // 3))
    ch = min(h, max(64, h // 3))
    left = max(0, min(w - cw, cx - cw // 2))
    top = max(0, min(h - ch, cy - ch // 2))
    return (left, top, left + cw, top + ch)


def fit_tile(img: Image.Image, label: str, resample: Image.Resampling) -> Image.Image:
    canvas = Image.new("RGB", (TILE_W, TILE_H), (20, 22, 26))
    work = img.convert("RGBA")
    work.thumbnail((TILE_W - 24, TILE_H - 52), resample)
    x = (TILE_W - work.width) // 2
    y = 34 + (TILE_H - 52 - work.height) // 2
    back = Image.new("RGBA", work.size, (34, 36, 42, 255))
    back.alpha_composite(work)
    canvas.paste(back.convert("RGB"), (x, y))
    ImageDraw.Draw(canvas).text((10, 10), label, fill=(236, 238, 242), font=font(14))
    return canvas


def fit_tile_on_background(img: Image.Image, label: str, bg: tuple[int, int, int]) -> Image.Image:
    canvas = Image.new("RGB", (TILE_W, TILE_H), bg)
    work = img.convert("RGBA")
    work.thumbnail((TILE_W - 24, TILE_H - 52), Image.Resampling.LANCZOS)
    x = (TILE_W - work.width) // 2
    y = 34 + (TILE_H - 52 - work.height) // 2
    patch = Image.new("RGBA", work.size, bg + (255,))
    patch.alpha_composite(work)
    canvas.paste(patch.convert("RGB"), (x, y))
    text_fill = (28, 30, 35) if sum(bg) > 380 else (236, 238, 242)
    ImageDraw.Draw(canvas).text((10, 10), label, fill=text_fill, font=font(14))
    return canvas


def scaled_crop(path: Path, source_box: tuple[int, int, int, int], source_size: tuple[int, int]) -> Image.Image:
    rgba = Image.open(path).convert("RGBA")
    sx = rgba.width / source_size[0]
    sy = rgba.height / source_size[1]
    box = tuple(
        int(value)
        for value in (
            source_box[0] * sx,
            source_box[1] * sy,
            source_box[2] * sx,
            source_box[3] * sy,
        )
    )
    return rgba.crop(box)


def build_contact_sheet(rows: list[dict], output_path: Path, zoom: bool) -> None:
    cols = 4 if zoom else 3
    width = PAD + cols * TILE_W + (cols - 1) * PAD + PAD
    row_h = TILE_H + HEADER_H + PAD
    sheet = Image.new("RGB", (width, PAD + len(rows) * row_h + PAD), (12, 13, 16))
    draw = ImageDraw.Draw(sheet)
    y = PAD
    for row in rows:
        draw.text((PAD, y), row["title"], fill=(250, 250, 250), font=font(17))
        draw.text((PAD, y + 23), row["subtitle"], fill=(172, 178, 188), font=font(12))
        x = PAD
        for tile in row["tiles"]:
            sheet.paste(tile, (x, y + HEADER_H))
            x += TILE_W + PAD
        y += row_h
    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_path, quality=92)
