from __future__ import annotations

import json
import math
from collections import defaultdict
from pathlib import Path
from xml.etree import ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
SOURCE_TMX = ROOT / "exports" / "cave-geode-crystal" / "cave-geode-crystal.tmx"
OUTPUT_JS = ROOT / "values" / "caveGeodeCrystalTemplates.js"
TILE_PX = 94
TILED_GID_FLAG_MASK = 0x0FFFFFFF


def parse_properties(el: ET.Element) -> dict:
    out = {}
    props = el.find("properties")
    if props is None:
        return out
    for prop in props.findall("property"):
        name = prop.attrib.get("name")
        if not name:
            continue
        value = prop.attrib.get("value", prop.text or "")
        typ = prop.attrib.get("type", "string")
        if typ == "bool":
            out[name] = value == "true"
        elif typ == "int":
            out[name] = int(value or 0)
        elif typ == "float":
            out[name] = float(value or 0)
        else:
            out[name] = value
    return out


def object_rect(obj: ET.Element) -> dict:
    x = float(obj.attrib.get("x", 0))
    y = float(obj.attrib.get("y", 0))
    w = float(obj.attrib.get("width", TILE_PX))
    h = float(obj.attrib.get("height", TILE_PX))
    if "gid" in obj.attrib:
        top = y - h
    else:
        top = y
    return {
        "left": x,
        "top": top,
        "right": x + w,
        "bottom": top + h,
        "cx": x + w / 2,
        "cy": top + h / 2,
        "w": w,
        "h": h,
    }


def js_value(value) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        if isinstance(value, float) and value.is_integer():
            return str(int(value))
        return str(round(value, 3))
    if isinstance(value, list):
        return "Object.freeze([" + ", ".join(js_value(v) for v in value) + "])"
    if isinstance(value, dict):
        return js_object(value)
    return json.dumps(value)


def js_object(obj: dict, indent: int = 0) -> str:
    pad = " " * indent
    inner = " " * (indent + 2)
    lines = ["Object.freeze({"]
    for key, value in obj.items():
        lines.append(f"{inner}{key}: {js_value(value)},")
    lines.append(f"{pad}}})")
    return "\n".join(lines)


def template_size_bucket(width_tiles: float, height_tiles: float) -> str:
    area = width_tiles * height_tiles
    if area < 40:
        return "small"
    if area < 130:
        return "medium"
    return "large"


def extract_templates() -> dict:
    root = ET.parse(SOURCE_TMX).getroot()
    anchors = {}
    children = defaultdict(list)

    for group in root.findall("objectgroup"):
        for obj in group.findall("object"):
            props = parse_properties(obj)
            template_id = props.get("templateId")
            role = props.get("templateRole")
            if not template_id or not role:
                continue
            rect = object_rect(obj)
            if role == "anchor":
                anchors[template_id] = {"obj": obj, "props": props, "rect": rect}
            elif role == "visual":
                children[template_id].append({"obj": obj, "props": props, "rect": rect})

    groups = defaultdict(list)
    for template_id, anchor in sorted(anchors.items()):
        props = anchor["props"]
        rect = anchor["rect"]
        center_x = rect["cx"]
        center_y = rect["cy"]
        rx = float(props.get("rx", 0) or 0)
        ry = float(props.get("ry", 0) or 0)
        wall = float(props.get("wallThickness", 0) or 0)
        width_tiles = (math.ceil(rx + wall) + 2) * 2 + 1
        height_tiles = (math.ceil(ry + wall) + 2) * 2 + 1
        visual_objects = []

        for child in children.get(template_id, []):
            obj = child["obj"]
            cprops = child["props"]
            crect = child["rect"]
            raw_gid = int(obj.attrib.get("gid", 0) or 0)
            visual_objects.append({
                "name": obj.attrib.get("name", ""),
                "gid": raw_gid & TILED_GID_FLAG_MASK,
                "gidRaw": raw_gid,
                "textureKey": cprops.get("textureKey", ""),
                "sourcePath": cprops.get("sourcePath", ""),
                "resolvedFilename": cprops.get("resolvedFilename", ""),
                "visualKind": cprops.get("visualKind", ""),
                "localX": round(crect["cx"] - center_x, 3),
                "localY": round(crect["cy"] - center_y, 3),
                "w": round(crect["w"], 3),
                "h": round(crect["h"], 3),
                "opacity": float(obj.attrib.get("opacity", 1)),
                "rotation": float(obj.attrib.get("rotation", 0)),
                "tint": cprops.get("tint", ""),
            })

        groups[props["templateType"]].append({
            "id": template_id,
            "name": anchor["obj"].attrib.get("name", template_id),
            "templateType": props["templateType"],
            "sizeBucket": template_size_bucket(width_tiles, height_tiles),
            "sizeBand": props.get("sizeBand", ""),
            "widthTiles": round(width_tiles, 3),
            "heightTiles": round(height_tiles, 3),
            "rx": rx,
            "ry": ry,
            "wallThickness": wall,
            "objects": visual_objects,
        })

    return dict(groups)


def write_js(groups: dict) -> None:
    all_group_names = ["normalCaves", "hiddenCaves", "hiddenCaveTreasureRooms", "geodes", "glowCrystals", "combinedExamples"]
    lines = [
        "// Auto-generated by tools/export_cave_geode_crystal_templates.py.",
        "// Source: exports/cave-geode-crystal/cave-geode-crystal.tmx",
        "// Set enabled to true after reviewing authored templates in-game.",
        "",
        "export const CAVE_GEODE_CRYSTAL_TEMPLATES = Object.freeze({",
        "  enabled: false,",
        "  source: \"exports/cave-geode-crystal/cave-geode-crystal.tmx\",",
        "  tilePx: 94,",
        "  templateGroups: Object.freeze({",
    ]
    for group_name in all_group_names:
        lines.append(f"    {group_name}: Object.freeze([")
        for template in groups.get(group_name, []):
            lines.append("      " + js_object(template, 6).replace("\n", "\n      ") + ",")
        lines.append("    ]),")
    lines += [
        "  }),",
        "});",
        "",
    ]
    OUTPUT_JS.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {OUTPUT_JS.relative_to(ROOT)}")


def main() -> None:
    groups = extract_templates()
    write_js(groups)
    print("Template counts:", {key: len(value) for key, value in groups.items()})


if __name__ == "__main__":
    main()
