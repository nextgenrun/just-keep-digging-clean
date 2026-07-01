from __future__ import annotations

import hashlib
import json
import math
import shutil
from pathlib import Path
from xml.etree import ElementTree as ET

from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
EXPORTS = ROOT / "exports"
SOURCE_TMX = EXPORTS / "dig-game-world-edit-v-7-29-06-2026-;layered.tmx"
V8_TMX = EXPORTS / "dig-game-world-edit-v-8-GPT-29-06-2026-;layered.tmx"
V8_DIR = EXPORTS / "v8-gpt-polish-textures"
V8_IMAGE_DIR = V8_DIR / "images"
V8_TSX = V8_DIR / "dig-game-v8-gpt-polish-textures.tsx"
REPORT_PATH = V8_DIR / "2026-06-30-v8-polish-report.json"

TILE_PX = 94
CROP_X = 40 * TILE_PX
CROP_Y = 40 * TILE_PX
CROP_RIGHT = (40 + 120) * TILE_PX
CROP_BOTTOM = (40 + 2000) * TILE_PX
GID_MASK = 0x1FFFFFFF
FLIP_MASK = 0xE0000000

TARGET_LAYERS = {
    "v2-1-base-colour",
    "v2-2-atmosphere",
    "v2-3-far-light",
    "v2-4-distant-skyline",
    "overlay-effect",
    "faded-bg-far",
}
SOFT_LAYERS = {
    "v2-2-atmosphere",
    "v2-3-far-light",
    "overlay-effect",
    "faded-bg-far",
}
FOREGROUND_SNAP_LAYERS = {
    "v2-8-overhang-ceiling",
    "v2-11-near-probs-seambreakers",
    "over-tile",
}
OPACITY_OVERRIDES = {
    "v2-1-base-colour": "0.82",
    "v2-2-atmosphere": "0.38",
    "v2-3-far-light": "0.42",
    "overlay-effect": "0.78",
}


def relpath(path: Path, start: Path) -> str:
    return path.relative_to(start).as_posix()


def parse_float(value: str | None, default: float = 0.0) -> float:
    try:
        return float(value) if value is not None else default
    except ValueError:
        return default


def fmt_num(value: float) -> str:
    if abs(value - round(value)) < 0.0001:
        return str(int(round(value)))
    return f"{value:.3f}".rstrip("0").rstrip(".")


def intersects_crop(obj: ET.Element, offset_x: float = 0.0, offset_y: float = 0.0) -> bool:
    x = parse_float(obj.attrib.get("x")) + offset_x
    y = parse_float(obj.attrib.get("y")) + offset_y
    w = parse_float(obj.attrib.get("width"))
    h = parse_float(obj.attrib.get("height"))
    left = x
    right = x + w
    top = y - h
    bottom = y
    return not (right < CROP_X or left > CROP_RIGHT or bottom < CROP_Y or top > CROP_BOTTOM)


def load_gid_image_index(root: ET.Element, tmx_path: Path) -> dict[int, Path]:
    gid_to_image: dict[int, Path] = {}
    for tileset in root.findall("tileset"):
        source = tileset.attrib.get("source")
        if not source:
            continue
        first_gid = int(tileset.attrib["firstgid"])
        tsx_path = (tmx_path.parent / source).resolve()
        if not tsx_path.exists():
            continue
        tsx_root = ET.parse(tsx_path).getroot()
        for tile in tsx_root.findall("tile"):
            image = tile.find("image")
            if image is None:
                continue
            tile_id = int(tile.attrib.get("id", "0"))
            image_path = (tsx_path.parent / image.attrib["source"]).resolve()
            gid_to_image[first_gid + tile_id] = image_path
    return gid_to_image


def resize_alpha_safe(source_path: Path, target_w: int, target_h: int, soft: bool, sharpen: bool) -> Image.Image:
    with Image.open(source_path) as img:
        rgba = img.convert("RGBA")

    alpha = rgba.getchannel("A")
    premult = Image.new("RGBA", rgba.size)
    src = rgba.load()
    dst = premult.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = src[x, y]
            dst[x, y] = (r * a // 255, g * a // 255, b * a // 255, a)

    resized = premult.resize((target_w, target_h), Image.Resampling.LANCZOS)
    out = Image.new("RGBA", resized.size)
    rs = resized.load()
    os = out.load()
    for y in range(resized.height):
        for x in range(resized.width):
            r, g, b, a = rs[x, y]
            if a <= 0:
                os[x, y] = (0, 0, 0, 0)
            else:
                os[x, y] = (
                    min(255, round(r * 255 / a)),
                    min(255, round(g * 255 / a)),
                    min(255, round(b * 255 / a)),
                    a,
                )

    if soft:
        radius = max(0.45, min(1.4, max(target_w / max(1, rgba.width), target_h / max(1, rgba.height)) * 0.28))
        out = out.filter(ImageFilter.GaussianBlur(radius=radius))
    elif sharpen:
        out = out.filter(ImageFilter.UnsharpMask(radius=1.0, percent=90, threshold=4))

    return out


def should_repair(layer_name: str, obj: ET.Element, source_path: Path) -> tuple[bool, dict]:
    if not source_path.exists():
        return False, {"reason": "missing-source"}
    with Image.open(source_path) as img:
        native_w, native_h = img.size
    w = parse_float(obj.attrib.get("width"))
    h = parse_float(obj.attrib.get("height"))
    sx = w / native_w if native_w else 0
    sy = h / native_h if native_h else 0
    scale_max = max(sx, sy)
    anisotropy = abs(sx - sy)
    repair = layer_name in TARGET_LAYERS and (scale_max > 1.05 or anisotropy > 0.35)
    return repair, {
        "nativeWidth": native_w,
        "nativeHeight": native_h,
        "objectWidth": w,
        "objectHeight": h,
        "scaleX": sx,
        "scaleY": sy,
        "scaleMax": scale_max,
        "anisotropy": anisotropy,
    }


def main() -> None:
    if not SOURCE_TMX.exists():
        raise FileNotFoundError(SOURCE_TMX)

    source_bytes = SOURCE_TMX.read_bytes()
    root = ET.parse(SOURCE_TMX).getroot()
    gid_to_image = load_gid_image_index(root, SOURCE_TMX)

    V8_IMAGE_DIR.mkdir(parents=True, exist_ok=True)

    max_existing_gid = max(int(ts.attrib["firstgid"]) for ts in root.findall("tileset"))
    max_existing_tilecount = 0
    for tileset in root.findall("tileset"):
        if int(tileset.attrib["firstgid"]) == max_existing_gid:
            source = tileset.attrib.get("source")
            if source:
                tsx_path = (SOURCE_TMX.parent / source).resolve()
                if tsx_path.exists():
                    max_existing_tilecount = int(ET.parse(tsx_path).getroot().attrib.get("tilecount", "0"))
            break
    v8_firstgid = max_existing_gid + max_existing_tilecount

    variants: list[dict] = []
    variant_cache: dict[tuple[str, int, int, str], int] = {}
    repaired_objects: list[dict] = []
    remaining_upscaled: list[dict] = []
    snapped_objects: list[dict] = []

    for group in root.findall("objectgroup"):
        layer_name = group.attrib.get("name", "")
        offset_x = parse_float(group.attrib.get("offsetx"))
        offset_y = parse_float(group.attrib.get("offsety"))

        if layer_name == "overlay-effect" and (offset_x or offset_y):
            for obj in group.findall("object"):
                obj.attrib["x"] = fmt_num(parse_float(obj.attrib.get("x")) + offset_x)
                obj.attrib["y"] = fmt_num(parse_float(obj.attrib.get("y")) + offset_y)
            group.attrib["offsetx"] = "0"
            group.attrib["offsety"] = "0"
            offset_x = 0.0
            offset_y = 0.0

        if layer_name in OPACITY_OVERRIDES:
            group.attrib["opacity"] = OPACITY_OVERRIDES[layer_name]

        for obj in group.findall("object"):
            if not intersects_crop(obj, offset_x, offset_y):
                continue

            if layer_name in FOREGROUND_SNAP_LAYERS:
                before = {k: obj.attrib.get(k) for k in ("x", "y", "width", "height")}
                for attr in ("x", "y", "width", "height"):
                    obj.attrib[attr] = fmt_num(round(parse_float(obj.attrib.get(attr))))
                after = {k: obj.attrib.get(k) for k in ("x", "y", "width", "height")}
                if before != after:
                    snapped_objects.append({"layer": layer_name, "id": obj.attrib.get("id"), "before": before, "after": after})

            raw_gid = int(obj.attrib.get("gid", "0") or 0)
            gid = raw_gid & GID_MASK
            source_path = gid_to_image.get(gid)
            if not source_path:
                continue

            repair, stats = should_repair(layer_name, obj, source_path)
            if not repair:
                if layer_name in TARGET_LAYERS and stats.get("scaleMax", 0) > 1.05:
                    remaining_upscaled.append({"layer": layer_name, "id": obj.attrib.get("id"), "source": source_path.name, **stats})
                continue

            target_w = max(1, int(round(parse_float(obj.attrib.get("width")))))
            target_h = max(1, int(round(parse_float(obj.attrib.get("height")))))
            mode = "soft" if layer_name in SOFT_LAYERS else "crisp"
            cache_key = (str(source_path), target_w, target_h, mode)

            if cache_key not in variant_cache:
                digest = hashlib.sha1("|".join(map(str, cache_key)).encode("utf-8")).hexdigest()[:10]
                safe_stem = "".join(ch if ch.isalnum() or ch in "-_" else "_" for ch in source_path.stem)
                out_name = f"{safe_stem}__v8_{mode}_{target_w}x{target_h}_{digest}.png"
                out_path = V8_IMAGE_DIR / out_name
                image = resize_alpha_safe(source_path, target_w, target_h, soft=mode == "soft", sharpen=mode == "crisp")
                image.save(out_path)
                tile_id = len(variants)
                variants.append({
                    "id": tile_id,
                    "type": "v8_polish",
                    "source": relpath(out_path, V8_TSX.parent),
                    "width": target_w,
                    "height": target_h,
                    "mode": mode,
                    "original": source_path.name,
                    "layer": layer_name,
                })
                variant_cache[cache_key] = tile_id

            tile_id = variant_cache[cache_key]
            new_gid = (raw_gid & FLIP_MASK) | (v8_firstgid + tile_id)
            obj.attrib["gid"] = str(new_gid)
            repaired_objects.append({
                "layer": layer_name,
                "id": obj.attrib.get("id"),
                "oldGid": raw_gid,
                "newGid": new_gid,
                "source": source_path.name,
                "variantTileId": tile_id,
                **stats,
            })

    tileset_el = ET.Element("tileset", {
        "version": "1.10",
        "tiledversion": "1.12.0",
        "name": "dig-game-v8-gpt-polish-textures",
        "tilewidth": str(max((v["width"] for v in variants), default=1)),
        "tileheight": str(max((v["height"] for v in variants), default=1)),
        "tilecount": str(len(variants)),
        "columns": "0",
        "objectalignment": "bottomleft",
    })
    props = ET.SubElement(tileset_el, "properties")
    ET.SubElement(props, "property", {"name": "note", "value": "Tiled-only v8 conservative upscale/soften review variants"})
    ET.SubElement(props, "property", {"name": "sourceMap", "value": SOURCE_TMX.name})
    for variant in variants:
        tile = ET.SubElement(tileset_el, "tile", {"id": str(variant["id"]), "type": variant["type"]})
        tile_props = ET.SubElement(tile, "properties")
        for key in ("mode", "original", "layer"):
            ET.SubElement(tile_props, "property", {"name": key, "value": str(variant[key])})
        ET.SubElement(tile, "image", {
            "width": str(variant["width"]),
            "height": str(variant["height"]),
            "source": variant["source"],
        })
    ET.indent(tileset_el, space=" ")
    ET.ElementTree(tileset_el).write(V8_TSX, encoding="UTF-8", xml_declaration=True)

    tileset_insert = ET.Element("tileset", {
        "firstgid": str(v8_firstgid),
        "source": relpath(V8_TSX, SOURCE_TMX.parent),
    })
    tilesets = root.findall("tileset")
    root.insert(list(root).index(tilesets[-1]) + 1, tileset_insert)

    ET.indent(root, space=" ")
    ET.ElementTree(root).write(V8_TMX, encoding="UTF-8", xml_declaration=True)

    opacity_non_default = sum(
        1
        for group in root.findall("objectgroup")
        for obj in group.findall("object")
        if abs(parse_float(obj.attrib.get("opacity"), 1.0) - 1.0) > 0.00001
    )
    hidden_layers = [
        group.attrib.get("name")
        for group in root.findall("objectgroup")
        if group.attrib.get("visible", "1") == "0"
    ]

    report = {
        "sourceTmx": str(SOURCE_TMX),
        "v8Tmx": str(V8_TMX),
        "sourceSha1": hashlib.sha1(source_bytes).hexdigest(),
        "v8FirstGid": v8_firstgid,
        "variantCount": len(variants),
        "repairedObjectCount": len(repaired_objects),
        "snappedObjectCount": len(snapped_objects),
        "nonDefaultObjectOpacityCount": opacity_non_default,
        "hiddenObjectGroups": hidden_layers,
        "opacityOverrides": OPACITY_OVERRIDES,
        "repairedObjects": repaired_objects,
        "snappedObjects": snapped_objects,
        "remainingUpscaledTargetObjects": remaining_upscaled,
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(f"Wrote {V8_TMX}")
    print(f"Wrote {V8_TSX}")
    print(f"Wrote {len(variants)} repaired variants")
    print(f"Repaired {len(repaired_objects)} crop-visible objects")
    print(f"Snapped {len(snapped_objects)} foreground objects")
    print(f"Non-default object opacity count: {opacity_non_default}")
    print(f"Wrote {REPORT_PATH}")


if __name__ == "__main__":
    main()
