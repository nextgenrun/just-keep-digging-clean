"""Build cropped organic module atlases from clean authored RGBA layers."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


ATLAS_WIDTH = 2048
ATLAS_PADDING = 2
MODULE_ALPHA_THRESHOLD = 3


def _next_power_of_two(value: int) -> int:
    return 1 << max(0, value - 1).bit_length()


def _pack_atlas(module_images: list[Image.Image], modules: list[dict], texture_name: str, atlas_name: str, output_dir: Path) -> None:
    placements: list[tuple[int, int]] = []
    cursor_x = cursor_y = ATLAS_PADDING
    shelf_height = 0
    for module_image in module_images:
        if cursor_x + module_image.width + ATLAS_PADDING > ATLAS_WIDTH:
            cursor_x = ATLAS_PADDING
            cursor_y += shelf_height + ATLAS_PADDING
            shelf_height = 0
        placements.append((cursor_x, cursor_y))
        cursor_x += module_image.width + ATLAS_PADDING
        shelf_height = max(shelf_height, module_image.height)

    atlas_height = _next_power_of_two(cursor_y + shelf_height + ATLAS_PADDING)
    atlas = Image.new("RGBA", (ATLAS_WIDTH, atlas_height))
    frames = {}
    for module, module_image, (atlas_x, atlas_y) in zip(modules, module_images, placements):
        atlas.alpha_composite(module_image, (atlas_x, atlas_y))
        frame = {"x": atlas_x, "y": atlas_y, "w": module_image.width, "h": module_image.height}
        frames[module["frame"]] = {
            "frame": frame,
            "rotated": False,
            "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": module_image.width, "h": module_image.height},
            "sourceSize": {"w": module_image.width, "h": module_image.height},
        }
    atlas.save(output_dir / texture_name, optimize=True)
    payload = {"frames": frames, "meta": {"image": texture_name, "format": "RGBA8888", "size": {"w": ATLAS_WIDTH, "h": atlas_height}, "scale": "1"}}
    (output_dir / atlas_name).write_text(json.dumps(payload, separators=(",", ":")) + "\n", encoding="utf-8")


def _organic_labels(width: int, height: int, columns: int, rows: int, layer_key: str) -> np.ndarray:
    seed = sum((index + 1) * ord(char) for index, char in enumerate(layer_key)) + columns * 101 + rows * 37
    rng = np.random.default_rng(seed)
    cell_width, cell_height = width / columns, height / rows
    yy, xx = np.indices((height, width), dtype=np.float32)
    warped_x = xx + np.sin(yy / cell_height * 1.37 + seed * 0.01) * cell_width * 0.11
    warped_y = yy + np.sin(xx / cell_width * 1.19 + seed * 0.017) * cell_height * 0.07
    labels = np.zeros((height, width), dtype=np.int16)
    nearest = np.full((height, width), np.inf, dtype=np.float32)
    for row in range(rows):
        for column in range(columns):
            index = row * columns + column
            center_x = (column + 0.5 + rng.uniform(-0.22, 0.22)) * cell_width
            center_y = (row + 0.5 + rng.uniform(-0.22, 0.22)) * cell_height
            distance = ((warped_x - center_x) / cell_width) ** 2 + ((warped_y - center_y) / cell_height) ** 2
            closer = distance < nearest
            labels[closer] = index
            nearest[closer] = distance[closer]
    return labels


def _masked_module(source: np.ndarray, mask: np.ndarray, overlap: int) -> tuple[Image.Image, tuple[int, int, int, int]] | None:
    feather = Image.fromarray(np.uint8(mask) * 255, "L").filter(ImageFilter.GaussianBlur(max(2.0, overlap * 0.62)))
    weight = np.clip(np.asarray(feather, dtype=np.float32) / 255.0 * 2.35, 0.0, 1.0)
    alpha = source[:, :, 3].astype(np.float32) * weight
    visible = alpha > MODULE_ALPHA_THRESHOLD
    if not visible.any():
        return None
    ys, xs = np.nonzero(visible)
    crop = (max(0, int(xs.min()) - 2), max(0, int(ys.min()) - 2), min(source.shape[1], int(xs.max()) + 3), min(source.shape[0], int(ys.max()) + 3))
    rgba = source.copy()
    rgba[:, :, 3] = np.uint8(np.clip(alpha, 0, 255))
    return Image.fromarray(rgba, "RGBA").crop(crop), crop


def build_cloud_atlas(image: Image.Image, layer_key: str, columns: int, rows: int, output_dir: Path) -> dict:
    source = np.asarray(image.convert("RGBA"))
    width, height = image.size
    labels = _organic_labels(width, height, columns, rows, layer_key)
    overlap = max(18, min(34, round(min(width / columns, height / rows) * 0.12)))
    stream_padding = max(20, min(34, overlap))
    modules: list[dict] = []
    module_images: list[Image.Image] = []
    for index in range(columns * rows):
        result = _masked_module(source, labels == index, overlap)
        if result is None:
            continue
        module_image, crop = result
        padded = Image.new("RGBA", (module_image.width + stream_padding * 2, module_image.height + stream_padding * 2))
        padded.alpha_composite(module_image, (stream_padding, stream_padding))
        frame_name = f"{layer_key}-{len(modules):02d}"
        modules.append({"frame": frame_name, "x": crop[0] - stream_padding, "y": crop[1] - stream_padding, "width": padded.width, "height": padded.height, "padding": stream_padding, "segment": "feathered-organic-wisp-v5"})
        module_images.append(padded)
    texture_name = f"{layer_key}-cloud-wisps-v5.png"
    atlas_name = f"{layer_key}-cloud-wisps-v5.json"
    _pack_atlas(module_images, modules, texture_name, atlas_name, output_dir)
    return {"texturePath": texture_name, "atlasPath": atlas_name, "modules": modules}


def build_box_atlas(image: Image.Image, frame_key: str, output_key: str, boxes: list[tuple[int, int, int, int]], output_dir: Path) -> dict:
    modules: list[dict] = []
    module_images: list[Image.Image] = []
    for index, (x0, y0, x1, y1) in enumerate(boxes):
        frame_name = f"{frame_key}-{index:02d}"
        module_image = image.crop((x0, y0, x1, y1))
        modules.append({"frame": frame_name, "x": x0, "y": y0, "width": module_image.width, "height": module_image.height, "segment": "connected-component"})
        module_images.append(module_image)
    texture_name = f"{output_key}-modules-v4.png"
    atlas_name = f"{output_key}-modules-v4.json"
    _pack_atlas(module_images, modules, texture_name, atlas_name, output_dir)
    return {"texturePath": texture_name, "atlasPath": atlas_name, "modules": modules}
