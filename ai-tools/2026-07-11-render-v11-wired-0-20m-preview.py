from __future__ import annotations

import xml.etree.ElementTree as ET
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
TMX = ROOT / "exports" / "dig-game-world-edit-v-11-08-07-2026-;1-img-test.tmx"
OUTPUT = ROOT / "exports" / "dig-game-world-v11-wired-0-20m-preview.png"
GROUPS = {"V11_LEVEL1_COMPOSITION_MASTER", "V11_SCALE_CORRECT_SKY_GROUND_0_20M_V3"}
TILE = 94
VIEW_TILES = (0.0, 0.0, 347.0, 118.0)
SCALE = 0.10


def load_image_tilesets(root: ET.Element) -> list[tuple[int, dict[int, Path]]]:
    result: list[tuple[int, dict[int, Path]]] = []
    for entry in root.findall("tileset"):
        source = entry.get("source")
        if not source:
            continue
        tsx_path = (TMX.parent / source).resolve()
        if not tsx_path.exists():
            continue
        tsx = ET.parse(tsx_path).getroot()
        images: dict[int, Path] = {}
        for tile in tsx.findall("tile"):
            image = tile.find("image")
            if image is not None and image.get("source"):
                images[int(tile.get("id", "0"))] = (tsx_path.parent / image.get("source", "")).resolve()
        if images:
            result.append((int(entry.get("firstgid", "0")), images))
    return sorted(result, reverse=True)


def image_for_gid(gid: int, tilesets: list[tuple[int, dict[int, Path]]]) -> Path | None:
    gid &= 0x1FFFFFFF
    for first_gid, images in tilesets:
        if gid >= first_gid:
            return images.get(gid - first_gid)
    return None


def render() -> None:
    root = ET.parse(TMX).getroot()
    tilesets = load_image_tilesets(root)
    left, top, right, bottom = (value * TILE for value in VIEW_TILES)
    canvas = Image.new("RGBA", (round((right - left) * SCALE), round((bottom - top) * SCALE)), (7, 10, 15, 255))
    for group in root.findall("objectgroup"):
        if group.get("name") not in GROUPS or group.get("visible", "1") == "0":
            continue
        group_opacity = float(group.get("opacity", "1"))
        for obj in group.findall("object"):
            image_path = image_for_gid(int(obj.get("gid", "0")), tilesets)
            if image_path is None or not image_path.exists():
                continue
            with Image.open(image_path) as source:
                source = source.convert("RGBA")
                width = float(obj.get("width", source.width))
                height = float(obj.get("height", source.height))
                object_left = float(obj.get("x", "0"))
                object_top = float(obj.get("y", "0")) - height
                clip_left = max(left, object_left)
                clip_top = max(top, object_top)
                clip_right = min(right, object_left + width)
                clip_bottom = min(bottom, object_top + height)
                if clip_right <= clip_left or clip_bottom <= clip_top:
                    continue
                source_box = (
                    round((clip_left - object_left) / width * source.width),
                    round((clip_top - object_top) / height * source.height),
                    round((clip_right - object_left) / width * source.width),
                    round((clip_bottom - object_top) / height * source.height),
                )
                piece = source.crop(source_box).resize(
                    (max(1, round((clip_right - clip_left) * SCALE)), max(1, round((clip_bottom - clip_top) * SCALE))),
                    Image.Resampling.LANCZOS,
                )
                if group_opacity < 1:
                    piece.putalpha(piece.getchannel("A").point(lambda value: round(value * group_opacity)))
                destination = (round((clip_left - left) * SCALE), round((clip_top - top) * SCALE))
                canvas.alpha_composite(piece, destination)
    canvas.convert("RGB").save(OUTPUT, quality=96)
    print(OUTPUT)


if __name__ == "__main__":
    render()
