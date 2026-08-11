from __future__ import annotations

import json
import math
from pathlib import Path
from xml.etree import ElementTree as ET

from PIL import Image, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
EXPORTS = ROOT / "exports"
V8_TMX = EXPORTS / "dig-game-world-edit-v-8-GPT-29-06-2026-;layered.tmx"
V8_DIR = EXPORTS / "v8-gpt-polish-textures"
V8_TSX = V8_DIR / "dig-game-v8-gpt-polish-textures.tsx"
PLATE_DIR = V8_DIR / "composite-plates"
REPORT = V8_DIR / "2026-06-30-v8-bold-composite-report.json"

TILE_PX = 94
CROP_X = 40 * TILE_PX
CROP_Y = 40 * TILE_PX
CROP_W = 120 * TILE_PX
PLATE_H = 2048
PLATE_TOP = CROP_Y
PLATE_BOTTOM = 27000
GID_MASK = 0x1FFFFFFF
FLIP_H = 0x80000000
FLIP_V = 0x40000000
FLIP_D = 0x20000000

COMPOSITE_LAYERS = {
    "12_BG_mid_structures",
    "faded-bg-far",
    "overlay-effect",
    "v2-1-base-colour",
    "v2-2-atmosphere",
    "v2-3-far-light",
    "v2-4-distant-skyline",
    "v2-5-far-landmark-band",
    "v2-6-mid-terrein-masses",
    "v2-7-mid-structure",
}


def parse_float(value: str | None, default: float = 0.0) -> float:
    try:
        return float(value) if value is not None else default
    except ValueError:
        return default


def fmt_num(value: float) -> str:
    if abs(value - round(value)) < 0.0001:
        return str(int(round(value)))
    return f"{value:.3f}".rstrip("0").rstrip(".")


def relpath(path: Path, start: Path) -> str:
    return path.relative_to(start).as_posix()


def gid_index(root: ET.Element, tmx_path: Path) -> dict[int, Path]:
    result: dict[int, Path] = {}
    for tileset in root.findall("tileset"):
        first = int(tileset.attrib["firstgid"])
        source = tileset.attrib.get("source")
        if not source:
            continue
        tsx_path = (tmx_path.parent / source).resolve()
        if not tsx_path.exists():
            continue
        tsx_root = ET.parse(tsx_path).getroot()
        for tile in tsx_root.findall("tile"):
            image = tile.find("image")
            if image is None:
                continue
            result[first + int(tile.attrib.get("id", "0"))] = (tsx_path.parent / image.attrib["source"]).resolve()
    return result


def image_for_object(obj: ET.Element, index: dict[int, Path]) -> tuple[Path | None, int]:
    raw_gid = int(obj.attrib.get("gid", "0") or 0)
    return index.get(raw_gid & GID_MASK), raw_gid


def object_box(obj: ET.Element, offset_x: float, offset_y: float) -> tuple[float, float, float, float]:
    x = parse_float(obj.attrib.get("x")) + offset_x
    y = parse_float(obj.attrib.get("y")) + offset_y
    w = parse_float(obj.attrib.get("width"))
    h = parse_float(obj.attrib.get("height"))
    return x, y - h, x + w, y


def intersects(a: tuple[float, float, float, float], b: tuple[float, float, float, float]) -> bool:
    return not (a[2] < b[0] or a[0] > b[2] or a[3] < b[1] or a[1] > b[3])


def render_object(plate: Image.Image, obj: ET.Element, path: Path, raw_gid: int, layer_alpha: float, offset_x: float, offset_y: float, seg_top: int) -> None:
    x, top, _right, bottom = object_box(obj, offset_x, offset_y)
    w = max(1, int(round(parse_float(obj.attrib.get("width")))))
    h = max(1, int(round(parse_float(obj.attrib.get("height")))))
    with Image.open(path) as source:
        img = source.convert("RGBA")

    if raw_gid & FLIP_H:
        img = img.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    if raw_gid & FLIP_V:
        img = img.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
    if raw_gid & FLIP_D:
        img = img.transpose(Image.Transpose.TRANSPOSE)

    img = img.resize((w, h), Image.Resampling.LANCZOS)
    rotation = parse_float(obj.attrib.get("rotation"))
    if abs(rotation) > 0.001:
        img = img.rotate(-rotation, expand=True, resample=Image.Resampling.BICUBIC)

    object_alpha = parse_float(obj.attrib.get("opacity"), 1.0)
    alpha = max(0.0, min(1.0, layer_alpha * object_alpha))
    if alpha < 0.999:
        a = img.getchannel("A").point(lambda px: int(px * alpha))
        img.putalpha(a)

    px = int(round(x - CROP_X))
    py = int(round(top - seg_top))
    plate.alpha_composite(img, (px, py))


def post_process_plate(img: Image.Image) -> Image.Image:
    soft = img.filter(ImageFilter.GaussianBlur(radius=1.1))
    img = Image.blend(img, soft, 0.42)
    img = ImageEnhance.Contrast(img).enhance(0.92)
    img = ImageEnhance.Color(img).enhance(1.06)

    veil = Image.new("RGBA", img.size, (0, 0, 0, 0))
    vp = veil.load()
    h = max(1, img.height - 1)
    for y in range(img.height):
        t = y / h
        alpha = int(22 + 34 * t)
        for x in range(img.width):
            edge = min(x / 900, (img.width - 1 - x) / 900, 1)
            edge_alpha = int((1 - edge) * 24)
            vp[x, y] = (8, 43, 50, min(82, alpha + edge_alpha))
    return Image.alpha_composite(img, veil)


def append_tiles_to_tsx(paths: list[Path]) -> tuple[int, int]:
    tree = ET.parse(V8_TSX)
    root = tree.getroot()
    start_id = int(root.attrib.get("tilecount", "0"))
    max_w = int(root.attrib.get("tilewidth", "1"))
    max_h = int(root.attrib.get("tileheight", "1"))
    for i, path in enumerate(paths):
        with Image.open(path) as img:
            w, h = img.size
        tile = ET.SubElement(root, "tile", {"id": str(start_id + i), "type": "v8_composite_plate"})
        props = ET.SubElement(tile, "properties")
        ET.SubElement(props, "property", {"name": "mode", "value": "bold-composite"})
        ET.SubElement(props, "property", {"name": "note", "value": "Flattened visible background stack to reduce box seams and low-res tiling"})
        ET.SubElement(tile, "image", {"width": str(w), "height": str(h), "source": relpath(path, V8_TSX.parent)})
        max_w = max(max_w, w)
        max_h = max(max_h, h)
    root.attrib["tilecount"] = str(start_id + len(paths))
    root.attrib["tilewidth"] = str(max_w)
    root.attrib["tileheight"] = str(max_h)
    ET.indent(root, space=" ")
    tree.write(V8_TSX, encoding="UTF-8", xml_declaration=True)
    return start_id, len(paths)


def main() -> None:
    tree = ET.parse(V8_TMX)
    root = tree.getroot()
    index = gid_index(root, V8_TMX)
    PLATE_DIR.mkdir(parents=True, exist_ok=True)

    plate_paths: list[Path] = []
    hidden_object_count = 0
    rendered_object_count = 0
    plate_bounds: list[dict] = []

    segment_tops = list(range(PLATE_TOP, PLATE_BOTTOM, PLATE_H))
    for seg_top in segment_tops:
        seg_bottom = min(seg_top + PLATE_H, PLATE_BOTTOM)
        plate_box = (CROP_X, seg_top, CROP_X + CROP_W, seg_bottom)
        plate = Image.new("RGBA", (CROP_W, seg_bottom - seg_top), (0, 0, 0, 0))
        rendered_this_plate = 0

        for group in root.findall("objectgroup"):
            layer_name = group.attrib.get("name", "")
            if layer_name not in COMPOSITE_LAYERS or group.attrib.get("visible", "1") == "0":
                continue
            offset_x = parse_float(group.attrib.get("offsetx"))
            offset_y = parse_float(group.attrib.get("offsety"))
            layer_alpha = parse_float(group.attrib.get("opacity"), 1.0)
            for obj in group.findall("object"):
                box = object_box(obj, offset_x, offset_y)
                if not intersects(box, plate_box):
                    continue
                image_path, raw_gid = image_for_object(obj, index)
                if not image_path or not image_path.exists():
                    continue
                render_object(plate, obj, image_path, raw_gid, layer_alpha, offset_x, offset_y, seg_top)
                rendered_this_plate += 1

        if rendered_this_plate:
            plate = post_process_plate(plate)
            out_path = PLATE_DIR / f"v8_bold_composite_y{seg_top}_h{seg_bottom - seg_top}.png"
            plate.save(out_path)
            plate_paths.append(out_path)
            rendered_object_count += rendered_this_plate
            plate_bounds.append({"top": seg_top, "bottom": seg_bottom, "objects": rendered_this_plate, "image": out_path.name})

    if not plate_paths:
        raise RuntimeError("No composite plates were generated")

    start_tile_id, plate_count = append_tiles_to_tsx(plate_paths)
    v8_tileset = None
    for tileset in root.findall("tileset"):
        if tileset.attrib.get("source") == relpath(V8_TSX, V8_TMX.parent):
            v8_tileset = tileset
            break
    if v8_tileset is None:
        raise RuntimeError("Could not find v8 tileset in TMX")
    first_gid = int(v8_tileset.attrib["firstgid"])

    for group in root.findall("objectgroup"):
        layer_name = group.attrib.get("name", "")
        if layer_name not in COMPOSITE_LAYERS:
            continue
        offset_x = parse_float(group.attrib.get("offsetx"))
        offset_y = parse_float(group.attrib.get("offsety"))
        for obj in group.findall("object"):
            box = object_box(obj, offset_x, offset_y)
            if intersects(box, (CROP_X, PLATE_TOP, CROP_X + CROP_W, PLATE_BOTTOM)):
                if obj.attrib.get("visible", "1") != "0":
                    obj.attrib["visible"] = "0"
                    hidden_object_count += 1

    composite_group = ET.Element("objectgroup", {
        "id": "9001",
        "name": "v8-GPT-polished-composite-plates",
        "opacity": "1",
    })
    next_id = int(root.attrib.get("nextobjectid", "1421"))
    for i, path in enumerate(plate_paths):
        seg_top = plate_bounds[i]["top"]
        with Image.open(path) as img:
            w, h = img.size
        ET.SubElement(composite_group, "object", {
            "id": str(next_id + i),
            "gid": str(first_gid + start_tile_id + i),
            "name": path.name,
            "x": fmt_num(CROP_X),
            "y": fmt_num(seg_top + h),
            "width": fmt_num(w),
            "height": fmt_num(h),
        })
    root.attrib["nextobjectid"] = str(next_id + len(plate_paths))
    root.attrib["nextlayerid"] = str(max(int(root.attrib.get("nextlayerid", "24")), 9002))

    insert_at = 0
    for i, child in enumerate(list(root)):
        if child.tag == "objectgroup" and child.attrib.get("name") == "overlay-effect":
            insert_at = i + 1
            break
    root.insert(insert_at, composite_group)

    ET.indent(root, space=" ")
    tree.write(V8_TMX, encoding="UTF-8", xml_declaration=True)

    report = {
        "tmx": str(V8_TMX),
        "plateCount": plate_count,
        "plateWidth": CROP_W,
        "plateTop": PLATE_TOP,
        "plateBottom": PLATE_BOTTOM,
        "renderedObjectReferences": rendered_object_count,
        "hiddenOriginalObjects": hidden_object_count,
        "compositedLayers": sorted(COMPOSITE_LAYERS),
        "plates": plate_bounds,
    }
    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Wrote {plate_count} composite plates")
    print(f"Rendered object references: {rendered_object_count}")
    print(f"Hidden original objects in composite region: {hidden_object_count}")
    print(f"Wrote {REPORT}")


if __name__ == "__main__":
    main()
