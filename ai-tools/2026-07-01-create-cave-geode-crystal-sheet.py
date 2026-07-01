from __future__ import annotations

import json
import math
import random
import re
from pathlib import Path
from xml.etree import ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
EXPORTS = ROOT / "exports"
SOURCE_TMX = EXPORTS / "dig-game-world-edit-v-7-30-06-2026-;layered.tmx"
OUT_DIR = EXPORTS / "cave-geode-crystal"
OUT_TMX = OUT_DIR / "cave-geode-crystal.tmx"
REPORT = OUT_DIR / "2026-07-01-cave-geode-crystal-report.json"
WORLD_GEN_JS = ROOT / "values" / "worldGen.js"

TILE_PX = 94
MAP_W = 160
MAP_H = 150
RUNTIME_FIRSTGID = 145
GID_CAVE_WALL = RUNTIME_FIRSTGID + 951
GID_CAVE_CEILING = RUNTIME_FIRSTGID + 952
GID_GEODE_WALL = RUNTIME_FIRSTGID + 954
GID_CHEST = RUNTIME_FIRSTGID + 956
GID_GEM_POWER = RUNTIME_FIRSTGID + 962
GID_GEODE_INTERIOR = RUNTIME_FIRSTGID + 972

TEXTURE_BY_KIND = {
    "caveWall": "tile-approved-cave-wall",
    "caveCeiling": "tile-approved-cave-ceiling",
    "geodeWall": "tile-bedrock",
    "geodeInterior": "tile-geode-interior",
    "chest": "tile-approved-chest-normal",
    "gemPower": "gempower-block",
    "glowCrystal": "tile-geode-interior",
}


def section(text: str, key: str) -> str:
    match = re.search(rf"{re.escape(key)}:\s*\{{(?P<body>.*?)\n\s*\}},", text, re.S)
    if not match:
        raise ValueError(f"Missing WORLD_GEN_CONFIG.{key}")
    return match.group("body")


def number(body: str, key: str, default: float | None = None) -> float:
    match = re.search(rf"{re.escape(key)}:\s*([0-9.]+)", body)
    if match:
        raw = match.group(1)
        return float(raw) if "." in raw else int(raw)
    if default is not None:
        return default
    raise ValueError(f"Missing config key {key}")


def load_generation_config() -> dict:
    text = WORLD_GEN_JS.read_text(encoding="utf-8")
    caves = section(text, "caves")
    geodes = section(text, "geodes")
    crystals = section(text, "glowCrystals")
    palette = [int(v, 16) for v in re.findall(r"0x[0-9A-Fa-f]{6}", crystals)]
    return {
        "caves": {
            "radiusXMin": number(caves, "radiusXMin"),
            "radiusXMax": number(caves, "radiusXMax"),
            "radiusYMin": number(caves, "radiusYMin"),
            "radiusYMax": number(caves, "radiusYMax"),
            "wallThickness": number(caves, "wallThickness"),
            "entranceMin": number(caves, "entranceMin"),
            "entranceMax": number(caves, "entranceMax"),
            "hiddenRadiusXMin": number(caves, "hiddenRadiusXMin"),
            "hiddenRadiusXMax": number(caves, "hiddenRadiusXMax"),
            "hiddenRadiusYMin": number(caves, "hiddenRadiusYMin"),
            "hiddenRadiusYMax": number(caves, "hiddenRadiusYMax"),
            "treasureRoomWidth": number(caves, "treasureRoomWidth"),
            "treasureRoomHeight": number(caves, "treasureRoomHeight"),
        },
        "geodes": {
            "radiusXMin": number(geodes, "radiusXMin"),
            "radiusXMax": number(geodes, "radiusXMax"),
            "radiusYMin": number(geodes, "radiusYMin"),
            "radiusYMax": number(geodes, "radiusYMax"),
            "wallThickness": number(geodes, "wallThickness"),
        },
        "glowCrystals": {
            "radiusXMin": number(crystals, "radiusXMin"),
            "radiusXMax": number(crystals, "radiusXMax"),
            "radiusYMin": number(crystals, "radiusYMin"),
            "radiusYMax": number(crystals, "radiusYMax"),
            "alphaMin": number(crystals, "alphaMin"),
            "alphaMax": number(crystals, "alphaMax"),
            "palette": palette or [0x66E8FF],
        },
    }


def rel_tileset_source(source: str) -> str:
    return f"../{source}".replace("\\", "/")


def copy_tilesets(source_root: ET.Element, out_root: ET.Element) -> None:
    for tileset in source_root.findall("tileset"):
        copied = ET.SubElement(out_root, "tileset", dict(tileset.attrib))
        if "source" in copied.attrib:
            copied.attrib["source"] = rel_tileset_source(copied.attrib["source"])


def fmt(value: float) -> str:
    if abs(value - round(value)) < 0.001:
        return str(int(round(value)))
    return f"{value:.3f}".rstrip("0").rstrip(".")


def add_props(el: ET.Element, props: dict) -> None:
    props_el = ET.SubElement(el, "properties")
    for key, value in props.items():
        attrib = {"name": key, "value": str(value)}
        if isinstance(value, bool):
            attrib["type"] = "bool"
            attrib["value"] = "true" if value else "false"
        elif isinstance(value, int):
            attrib["type"] = "int"
        elif isinstance(value, float):
            attrib["type"] = "float"
            attrib["value"] = fmt(value)
        ET.SubElement(props_el, "property", attrib)


def is_inside(tx: int, ty: int, cx: int, cy: int, rx: float, ry: float) -> bool:
    return ((tx - cx) / max(0.001, rx)) ** 2 + ((ty - cy) / max(0.001, ry)) ** 2 <= 1


def add_anchor(group: ET.Element, next_id: int, template: dict, x: int, y: int, w: int, h: int) -> int:
    obj = ET.SubElement(group, "object", {
        "id": str(next_id), "name": template["name"], "type": "cave-geode-crystal-template",
        "x": fmt(x), "y": fmt(y), "width": fmt(w), "height": fmt(h),
    })
    add_props(obj, {
        "templateRole": "anchor",
        "templateId": template["id"],
        "templateType": template["type"],
        "sourceOccurrenceIndex": template["index"],
        "cx": template["cx"], "cy": template["cy"], "rx": template["rx"], "ry": template["ry"],
        "wallThickness": template.get("wallThickness", 0),
        "runtimeEligible": True,
        "copyInstruction": "Copy this anchor and its matching visual children into dig-game-world-edit-v-7-30-06-2026-;layered.tmx.",
    })
    return next_id + 1


def add_tile_obj(group: ET.Element, next_id: int, template: dict, x: int, y: int, gid: int, kind: str, opacity: float = 1, tint: int | None = None) -> int:
    obj = ET.SubElement(group, "object", {
        "id": str(next_id), "name": f"{template['id']}__{kind}", "type": "template-visual",
        "gid": str(gid), "x": fmt(x), "y": fmt(y + TILE_PX),
        "width": str(TILE_PX), "height": str(TILE_PX),
    })
    if opacity < 1:
        obj.attrib["opacity"] = fmt(opacity)
    props = {
        "templateRole": "visual",
        "templateId": template["id"],
        "templateType": template["type"],
        "textureKey": TEXTURE_BY_KIND.get(kind, ""),
        "visualKind": kind,
    }
    if tint is not None:
        props["tint"] = f"#{tint:06X}"
    add_props(obj, props)
    return next_id + 1


def build_templates(cfg: dict) -> list[dict]:
    rng = random.Random(20260701)
    templates = []
    specs = [
        ("normalCaves", 7),
        ("hiddenCaves", 5),
        ("hiddenCaveTreasureRooms", 4),
        ("geodes", 6),
        ("glowCrystals", 6),
        ("combinedExamples", 4),
    ]
    for template_type, count in specs:
        for index in range(count):
            if template_type in {"normalCaves", "combinedExamples"}:
                c = cfg["caves"]
                rx = rng.randint(c["radiusXMin"], c["radiusXMax"])
                ry = rng.randint(c["radiusYMin"], c["radiusYMax"])
                wall = c["wallThickness"]
            elif template_type == "hiddenCaves":
                c = cfg["caves"]
                rx = rng.randint(c["hiddenRadiusXMin"], c["hiddenRadiusXMax"])
                ry = rng.randint(c["hiddenRadiusYMin"], c["hiddenRadiusYMax"])
                wall = 0
            elif template_type == "hiddenCaveTreasureRooms":
                c = cfg["caves"]
                rx = c["treasureRoomWidth"]
                ry = c["treasureRoomHeight"]
                wall = 0
            elif template_type == "geodes":
                c = cfg["geodes"]
                rx = rng.randint(c["radiusXMin"], c["radiusXMax"])
                ry = rng.randint(c["radiusYMin"], c["radiusYMax"])
                wall = c["wallThickness"]
            else:
                c = cfg["glowCrystals"]
                rx = rng.randint(c["radiusXMin"], c["radiusXMax"])
                ry = rng.randint(c["radiusYMin"], c["radiusYMax"])
                wall = 0
            templates.append({
                "id": f"{template_type}-{index + 1:02d}",
                "name": f"{template_type} template {index + 1:02d}",
                "type": template_type,
                "index": index,
                "cx": 0, "cy": 0, "rx": rx, "ry": ry, "wallThickness": wall,
                "color": rng.choice(cfg["glowCrystals"]["palette"]),
            })
    return templates


def draw_template(group: ET.Element, next_id: int, template: dict, origin_tx: int, origin_ty: int) -> int:
    rx, ry, wall = template["rx"], template["ry"], template.get("wallThickness", 0)
    pad = 2
    min_tx = -math.ceil(rx + wall) - pad
    max_tx = math.ceil(rx + wall) + pad
    min_ty = -math.ceil(ry + wall) - pad
    max_ty = math.ceil(ry + wall) + pad
    x = origin_tx * TILE_PX
    y = origin_ty * TILE_PX
    w = (max_tx - min_tx + 1) * TILE_PX
    h = (max_ty - min_ty + 1) * TILE_PX
    next_id = add_anchor(group, next_id, template, x, y, w, h)

    for lty in range(min_ty, max_ty + 1):
        for ltx in range(min_tx, max_tx + 1):
            sx = (origin_tx + ltx - min_tx) * TILE_PX
            sy = (origin_ty + lty - min_ty) * TILE_PX
            outer = is_inside(ltx, lty, 0, 0, rx + wall, ry + wall)
            inner = is_inside(ltx, lty, 0, 0, rx, ry)
            if template["type"] == "geodes":
                if outer and not inner:
                    next_id = add_tile_obj(group, next_id, template, sx, sy, GID_GEODE_WALL, "geodeWall")
                elif inner:
                    kind = "gemPower" if (ltx + lty) % 7 == 0 else "geodeInterior"
                    gid = GID_GEM_POWER if kind == "gemPower" else GID_GEODE_INTERIOR
                    next_id = add_tile_obj(group, next_id, template, sx, sy, gid, kind)
            elif template["type"] == "glowCrystals":
                if inner:
                    next_id = add_tile_obj(group, next_id, template, sx, sy, GID_GEODE_INTERIOR, "glowCrystal", 0.82, template["color"])
            elif template["type"] == "hiddenCaveTreasureRooms":
                if abs(ltx) <= 1 and abs(lty) <= 1:
                    kind = "chest" if ltx == 0 and lty == 0 else "caveCeiling"
                    gid = GID_CHEST if kind == "chest" else GID_CAVE_CEILING
                    next_id = add_tile_obj(group, next_id, template, sx, sy, gid, kind, 0.9)
            else:
                if outer and not inner and wall > 0:
                    next_id = add_tile_obj(group, next_id, template, sx, sy, GID_CAVE_WALL, "caveWall")
                elif inner and (lty == -math.ceil(ry) or (ltx + lty) % 11 == 0):
                    next_id = add_tile_obj(group, next_id, template, sx, sy, GID_CAVE_CEILING, "caveCeiling", 0.72)
    return next_id


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    cfg = load_generation_config()
    source_root = ET.parse(SOURCE_TMX).getroot()
    root = ET.Element("map", {
        "version": "1.10", "tiledversion": "1.12.0", "orientation": "orthogonal",
        "renderorder": "right-down", "width": str(MAP_W), "height": str(MAP_H),
        "tilewidth": str(TILE_PX), "tileheight": str(TILE_PX), "infinite": "0",
        "nextlayerid": "8", "nextobjectid": "1",
    })
    add_props(root, {
        "sourceMap": "dig-game-world-edit-v-7-30-06-2026-;layered.tmx",
        "purpose": "Copy/paste cave, geode, and glow crystal templates into the active world edit TMX.",
    })
    copy_tilesets(source_root, root)

    group = ET.SubElement(root, "objectgroup", {"id": "1", "name": "COPY_FROM_HERE_cave-geode-crystal-templates"})
    next_id = 1
    templates = build_templates(cfg)
    row_y = {
        "normalCaves": 4,
        "hiddenCaves": 30,
        "hiddenCaveTreasureRooms": 52,
        "geodes": 72,
        "glowCrystals": 96,
        "combinedExamples": 118,
    }
    cursor = {key: 4 for key in row_y}
    for template in templates:
        row = template["type"]
        next_id = draw_template(group, next_id, template, cursor[row], row_y[row])
        cursor[row] += max(14, math.ceil((template["rx"] + template.get("wallThickness", 0)) * 2) + 8)

    root.attrib["nextobjectid"] = str(next_id)
    ET.indent(root, space=" ")
    ET.ElementTree(root).write(OUT_TMX, encoding="UTF-8", xml_declaration=True)
    report = {
        "sourceMap": str(SOURCE_TMX.relative_to(ROOT)).replace("\\", "/"),
        "output": str(OUT_TMX.relative_to(ROOT)).replace("\\", "/"),
        "templateCounts": {key: sum(1 for t in templates if t["type"] == key) for key in row_y},
        "worldGenSource": str(WORLD_GEN_JS.relative_to(ROOT)).replace("\\", "/"),
    }
    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Wrote {OUT_TMX.relative_to(ROOT)}")
    print(f"Wrote {REPORT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
