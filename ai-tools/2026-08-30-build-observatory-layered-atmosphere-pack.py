"""Build a review-only Observatory layer pack from the original source pixels."""

from __future__ import annotations

import hashlib
import json
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "sprites/backgrounds/world-visual-v2/far/sky-cohesion-v1/2026-07-28-sky-13-level2-lower-iron-forge-haze-v1.webp"
TOWN_VIDEO = ROOT / "sprites/backgrounds/start-zone-scenic-v1/living-background-v1/surface-town-air-v1.mp4"
PACK = ROOT / "testing/animation-sandbox/2026-08-30-observatory-realtime-depth-motion-v1/pack"
CLEAN_SKY = PACK / "clean-sky-underplate-v2.png"
ARCHITECTURE_CARRIER = PACK / "architecture-mask-carrier-v2.png"
UPPER_CARRIER = PACK / "upper-cloud-mask-carrier-v2.png"
LOWER_CARRIER = PACK / "lower-cloud-mask-carrier-v2.png"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def smoothstep(low: float, high: float, values: np.ndarray) -> np.ndarray:
    amount = np.clip((values - low) / max(high - low, 1e-6), 0.0, 1.0)
    return amount * amount * (3.0 - 2.0 * amount)


def blur_gray(values: np.ndarray, radius: float) -> np.ndarray:
    image = Image.fromarray(np.uint8(np.clip(values, 0.0, 1.0) * 255.0), "L")
    return np.asarray(image.filter(ImageFilter.GaussianBlur(radius)), dtype=np.float32) / 255.0


def dilate(values: np.ndarray, size: int) -> np.ndarray:
    image = Image.fromarray(np.uint8(np.clip(values, 0.0, 1.0) * 255.0), "L")
    return np.asarray(image.filter(ImageFilter.MaxFilter(size)), dtype=np.float32) / 255.0


def blur_rgb(values: np.ndarray, radius: float) -> np.ndarray:
    image = Image.fromarray(np.uint8(np.clip(values, 0.0, 1.0) * 255.0), "RGB")
    return np.asarray(image.filter(ImageFilter.GaussianBlur(radius)), dtype=np.float32) / 255.0


def carrier_mask(path: Path) -> np.ndarray:
    rgb = np.asarray(Image.open(path).convert("RGB"), dtype=np.float32) / 255.0
    chroma = rgb.max(axis=2) - rgb.min(axis=2)
    luma = rgb @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    confidence = smoothstep(0.025, 0.16, chroma) * smoothstep(0.06, 0.48, 1.0 - luma)
    return blur_gray(dilate(confidence, 5), 1.4)


def save_rgba(name: str, rgb: np.ndarray, alpha: np.ndarray) -> Path:
    rgba = np.dstack([np.clip(rgb, 0.0, 1.0), np.clip(alpha, 0.0, 1.0)])
    path = PACK / name
    Image.fromarray(np.uint8(np.round(rgba * 255.0)), "RGBA").save(path, optimize=True)
    return path


def save_gray(name: str, values: np.ndarray) -> Path:
    path = PACK / name
    Image.fromarray(np.uint8(np.round(np.clip(values, 0.0, 1.0) * 255.0)), "L").save(path, optimize=True)
    return path


def label_components(mask: np.ndarray) -> tuple[np.ndarray, int]:
    height, width = mask.shape
    visited = np.zeros_like(mask, dtype=bool)
    labels = np.zeros_like(mask, dtype=np.uint16)
    component = 0
    for start_y, start_x in np.argwhere(mask):
        if visited[start_y, start_x]:
            continue
        queue = deque([(int(start_y), int(start_x))])
        visited[start_y, start_x] = True
        pixels: list[tuple[int, int]] = []
        while queue:
            y, x = queue.popleft()
            pixels.append((y, x))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < height and 0 <= nx < width and mask[ny, nx] and not visited[ny, nx]:
                        visited[ny, nx] = True
                        queue.append((ny, nx))
        component += 1
        for y, x in pixels:
            labels[y, x] = component
    return labels, component


def expand_labels(labels: np.ndarray, component_count: int, radius: int = 3) -> np.ndarray:
    expanded = labels.copy()
    for component in range(1, component_count + 1):
        ys, xs = np.where(labels == component)
        if not len(ys):
            continue
        y0, y1 = max(int(ys.min()) - radius, 0), min(int(ys.max()) + radius + 1, labels.shape[0])
        x0, x1 = max(int(xs.min()) - radius, 0), min(int(xs.max()) + radius + 1, labels.shape[1])
        local = (labels[y0:y1, x0:x1] == component).astype(np.float32)
        grown = dilate(local, radius * 2 + 1) > 0.1
        target = expanded[y0:y1, x0:x1]
        target[grown & (target == 0)] = component
    return expanded


def encode_light_ids(labels: np.ndarray) -> np.ndarray:
    encoded = np.zeros((*labels.shape, 3), dtype=np.uint8)
    nonzero = labels > 0
    ids = labels[nonzero].astype(np.uint32)
    encoded[..., 0][nonzero] = ((ids * 73 + 19) % 251 + 1).astype(np.uint8)
    encoded[..., 1][nonzero] = ((ids * 151 + 47) % 251 + 1).astype(np.uint8)
    encoded[..., 2][nonzero] = ((ids * 211 + 83) % 251 + 1).astype(np.uint8)
    return encoded


def composite(base: np.ndarray, layer_rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    return layer_rgb * alpha[..., None] + base * (1.0 - alpha[..., None])


def build() -> dict:
    PACK.mkdir(parents=True, exist_ok=True)
    source_image = Image.open(SOURCE).convert("RGB")
    source = np.asarray(source_image, dtype=np.float32) / 255.0
    clean = np.asarray(Image.open(CLEAN_SKY).convert("RGB"), dtype=np.float32) / 255.0
    if clean.shape != source.shape:
        raise ValueError("Clean sky and source dimensions differ")

    architecture = np.asarray(Image.open(ARCHITECTURE_CARRIER).convert("RGBA"), dtype=np.float32)[..., 3] / 255.0
    architecture = blur_gray(dilate(architecture, 3), 0.65)
    upper = carrier_mask(UPPER_CARRIER)
    lower = carrier_mask(LOWER_CARRIER)
    architecture_guard = dilate(architecture, 9)
    upper *= 1.0 - architecture_guard * 0.94
    lower *= 1.0 - architecture_guard * 0.98

    height, width = architecture.shape
    x = np.linspace(0.0, 1.0, width, dtype=np.float32)[None, :]
    y = np.linspace(0.0, 1.0, height, dtype=np.float32)[:, None]
    edge = smoothstep(0.19, 0.43, np.abs(x - 0.5))
    categories = [
        upper * (1.0 - edge),
        upper * edge,
        lower * (1.0 - smoothstep(0.64, 0.71, y)),
        lower * smoothstep(0.64, 0.72, y) * (1.0 - smoothstep(0.79, 0.86, y)),
        lower * smoothstep(0.79, 0.87, y),
    ]
    layer_names = ["upper-wisps", "upper-crown", "horizon-mist", "cloud-sea-far", "cloud-sea-near"]
    cloud_layers: list[tuple[str, np.ndarray]] = []
    for name, alpha in zip(layer_names, categories):
        refined = blur_gray(np.clip(alpha, 0.0, 1.0), 0.8)
        save_rgba(f"{name}-v2.png", source, refined)
        cloud_layers.append((name, refined))
    cloud_union = np.clip(np.maximum(upper, lower), 0.0, 1.0)

    r, g, b = source[..., 0], source[..., 1], source[..., 2]
    luma = source @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    local_luma = blur_gray(luma, 5.5)
    lower_scene = smoothstep(0.50, 0.58, y)
    warm = smoothstep(0.004, 0.105, r - b) * smoothstep(-0.006, 0.055, r - g)
    bright = np.maximum(smoothstep(0.001, 0.045, luma - local_luma), smoothstep(0.035, 0.28, r))
    light_region = np.maximum(architecture, dilate(architecture, 7) * 0.72)
    light_confidence = np.clip(warm * bright * lower_scene * light_region, 0.0, 1.0)
    light_seed = light_confidence > 0.018
    labels, light_count = label_components(light_seed)
    expanded_labels = expand_labels(labels, light_count, radius=3)
    light_ids = encode_light_ids(expanded_labels)
    Image.fromarray(light_ids, "RGB").save(PACK / "architecture-light-id-v2.png", optimize=True)

    light_mask = np.maximum(light_confidence, blur_gray((expanded_labels > 0).astype(np.float32), 1.8))
    light_mask = np.clip(light_mask, 0.0, 1.0)
    neutral = blur_rgb(source, 8.0) * np.array([0.50, 0.57, 0.74], dtype=np.float32)
    architecture_rgb = source * (1.0 - light_mask[..., None]) + neutral * light_mask[..., None]
    emissive_delta = np.maximum(source - architecture_rgb, 0.0)
    emissive_rgb = np.divide(emissive_delta, np.maximum(light_mask[..., None], 0.05), out=np.zeros_like(source), where=light_mask[..., None] > 0.0)
    save_rgba("architecture-diffuse-v2.png", architecture_rgb, architecture)
    save_rgba("architecture-emissive-v2.png", emissive_rgb, light_mask)
    save_gray("architecture-light-mask-v2.png", light_mask)

    replacement = np.clip(np.maximum(cloud_union, architecture), 0.0, 1.0)
    static_sky = source * (1.0 - replacement[..., None]) + clean * replacement[..., None]
    Image.fromarray(np.uint8(np.round(static_sky * 255.0)), "RGB").save(PACK / "static-sky-v2.png", optimize=True)

    reconstruction = static_sky.copy()
    for _, alpha in cloud_layers:
        reconstruction = composite(reconstruction, source, alpha)
    reconstruction = composite(reconstruction, architecture_rgb, architecture)
    reconstruction = np.clip(reconstruction + emissive_delta * light_mask[..., None], 0.0, 1.0)
    Image.fromarray(np.uint8(np.round(reconstruction * 255.0)), "RGB").save(PACK / "reconstruction-v2.png", optimize=True)

    review = source.copy()
    colors = np.array([[0.16, 0.82, 1.0], [0.35, 0.42, 1.0], [0.30, 1.0, 0.70], [0.65, 0.92, 0.22], [1.0, 0.55, 0.18]])
    for (_, alpha), color in zip(cloud_layers, colors):
        review = review * (1.0 - alpha[..., None] * 0.34) + color * alpha[..., None] * 0.34
    review = review * (1.0 - architecture[..., None] * 0.35) + np.array([0.95, 0.20, 0.32]) * architecture[..., None] * 0.35
    Image.fromarray(np.uint8(np.round(np.clip(review, 0.0, 1.0) * 255.0)), "RGB").save(PACK / "segmentation-review-v2.png", optimize=True)

    generated = sorted(path for path in PACK.glob("*-v2.png") if "carrier" not in path.name)
    error = np.abs(source - reconstruction)
    manifest = {
        "status": "review-only",
        "version": 2,
        "source": {"path": SOURCE.relative_to(ROOT).as_posix(), "sha256": sha256(SOURCE), "width": width, "height": height},
        "townSquareGuard": {"path": TOWN_VIDEO.relative_to(ROOT).as_posix(), "sha256": sha256(TOWN_VIDEO), "modified": False},
        "decomposition": {"cloudLayerCount": len(cloud_layers), "lightClusterCount": light_count, "architectureSeparated": True, "lightsSeparated": True},
        "reconstruction": {"meanAbsoluteRgb": round(float(error.mean()), 6), "pixelsOver12": round(float((error.max(axis=2) > 12 / 255).mean()), 6)},
        "generatedInputs": {path.name: sha256(path) for path in (CLEAN_SKY, ARCHITECTURE_CARRIER, UPPER_CARRIER, LOWER_CARRIER)},
        "assets": {path.name: sha256(path) for path in generated},
    }
    (PACK / "manifest-v2.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return manifest


if __name__ == "__main__":
    print(json.dumps(build(), indent=2))
