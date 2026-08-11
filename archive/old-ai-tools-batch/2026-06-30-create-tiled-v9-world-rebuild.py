from __future__ import annotations

import json
from pathlib import Path
from xml.etree import ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
EXPORTS = ROOT / "exports"
SOURCE_TMX = EXPORTS / "dig-game-world-edit-v-7-29-06-2026-;layered.tmx"
V9_TMX = EXPORTS / "dig-game-world-edit-v-9-GPT-world-rebuild-30-06-2026-;layered.tmx"
REPORT = EXPORTS / "2026-06-30-v9-world-rebuild-report.json"

TILE_PX = 94
CROP_X = 40 * TILE_PX
CROP_Y = 40 * TILE_PX
CROP_W = 120 * TILE_PX
CROP_BOTTOM = (40 + 2000) * TILE_PX

BG_FIRSTGID = 1693
PROP_FIRSTGID = 1770
PROP10_FIRSTGID = 1966

OLD_BACKGROUND_GROUPS = {
    "12_BG_mid_structures",
    "faded-bg-far",
    "bg-back",
    "bg-front",
    "overlay-effect",
    "v2-1-base-colour",
    "v2-2-atmosphere",
    "v2-3-far-light",
    "v2-4-distant-skyline",
    "v2-5-far-landmark-band",
    "v2-6-mid-terrein-masses",
    "v2-7-mid-structure",
    "v2-8-overhang-ceiling",
    "v2-9-foreground",
    "v2-10-traversable-edge",
    "v2-11-near-probs-seambreakers",
    "v2-12-fx-accent",
    "over-tile",
}

LAYER_SPECS = [
    ("gpt-v9-01-base-fields", "1", 0),
    ("gpt-v9-02-atmosphere-depth", "0.62", 1),
    ("gpt-v9-03-far-light-volumes", "0.42", 2),
    ("gpt-v9-04-distant-skyline", "0.58", 3),
    ("gpt-v9-05-landmark-bands", "0.74", 4),
    ("gpt-v9-06-mid-terrain-masses", "0.82", 5),
    ("gpt-v9-07-mid-structure-accents", "0.66", 6),
    ("gpt-v9-08-overhang-ceiling", "0.72", 7),
    ("gpt-v9-09-foreground-frame", "0.48", 8),
    ("gpt-v9-10-traversable-edge-hints", "0.72", 9),
    ("gpt-v9-12-fx-accents", "0.36", 10),
]

BIOMES = [
    ("irradiated_storm_surface", 0, CROP_Y, CROP_Y + 6800),
    ("bioluminescent_root_caverns", 11, CROP_Y + 6800, CROP_Y + 27000),
    ("crystal_mirror_geode", 22, CROP_Y + 27000, CROP_Y + 56000),
    ("ancient_machine_ruins", 33, CROP_Y + 56000, CROP_Y + 92000),
    ("volcanic_core_depths", 44, CROP_Y + 92000, CROP_Y + 132000),
    ("frozen_fossil_vault", 55, CROP_Y + 132000, CROP_Y + 164000),
    ("void_metal_underdeep", 66, CROP_Y + 164000, CROP_BOTTOM),
]


def fmt(value: float) -> str:
    if abs(value - round(value)) < 0.001:
        return str(int(round(value)))
    return f"{value:.3f}".rstrip("0").rstrip(".")


def add_object(group: ET.Element, object_id: int, gid: int, x: float, bottom: float, w: float, h: float, name: str = "", opacity: str | None = None) -> int:
    attrib = {
        "id": str(object_id),
        "gid": str(gid),
        "x": fmt(x),
        "y": fmt(bottom),
        "width": fmt(w),
        "height": fmt(h),
    }
    if name:
        attrib["name"] = name
    if opacity is not None:
        attrib["opacity"] = opacity
    ET.SubElement(group, "object", attrib)
    return object_id + 1


def create_group(name: str, opacity: str, layer_id: int) -> ET.Element:
    return ET.Element("objectgroup", {
        "id": str(layer_id),
        "name": name,
        "opacity": opacity,
    })


def strip_gid(biome_offset: int, layer_index: int) -> int:
    return BG_FIRSTGID + biome_offset + layer_index


def prop_gid(biome_index: int, prop_index: int, variant: int = 0, use_10x: bool = False) -> int:
    if use_10x:
        return PROP10_FIRSTGID + (biome_index * 16 + prop_index) * 10 + variant
    return PROP_FIRSTGID + biome_index * 16 + prop_index


def main() -> None:
    tree = ET.parse(SOURCE_TMX)
    root = tree.getroot()

    hidden_old = []
    for group in root.findall("objectgroup"):
        name = group.attrib.get("name")
        if name in OLD_BACKGROUND_GROUPS:
            group.attrib["visible"] = "0"
            hidden_old.append(name)

    next_layer_id = max(int(root.attrib.get("nextlayerid", "24")), 100)
    next_object_id = int(root.attrib.get("nextobjectid", "1421"))
    new_groups: list[ET.Element] = []
    object_counts: dict[str, int] = {}

    for layer_name, opacity, layer_index in LAYER_SPECS:
        group = create_group(layer_name, opacity, next_layer_id)
        next_layer_id += 1
        count = 0

        for biome_i, (_biome_name, biome_offset, top, bottom) in enumerate(BIOMES):
            gid = strip_gid(biome_offset, layer_index)
            band_h = bottom - top

            if layer_index == 0:
                step_y = 104
                y = top + 112
                while y < bottom + 140:
                    for col in range(-1, 13):
                        x = CROP_X + col * 992
                        next_object_id = add_object(group, next_object_id, gid, x, y, 1004, 114, opacity="0.78")
                        count += 1
                    y += step_y
            elif layer_index == 1:
                step_y = 320
                y = top + 180
                while y < bottom + 220:
                    for col in range(-1, 13):
                        x = CROP_X + col * 996 + ((biome_i % 2) * 180)
                        next_object_id = add_object(group, next_object_id, gid, x, y, 996, 116, opacity="0.42")
                        count += 1
                    y += step_y
            elif layer_index == 2:
                step_y = 780
                y = top + 420
                while y < bottom:
                    for col in range(0, 10):
                        x = CROP_X + col * 1180 + ((biome_i * 137 + col * 53) % 320)
                        next_object_id = add_object(group, next_object_id, gid, x, y, 1180, 136, opacity="0.32")
                        count += 1
                    y += step_y
            elif layer_index in {3, 4, 5}:
                lanes = 2 if layer_index == 3 else 3
                for lane in range(lanes):
                    y = top + 520 + lane * max(520, min(1800, band_h / max(1, lanes)))
                    for col in range(-1, 12):
                        x = CROP_X + col * 985 + lane * 230
                        width = 1030 if layer_index != 5 else 996
                        height = 120 if layer_index == 3 else 112
                        alpha = "0.50" if layer_index == 3 else ("0.62" if layer_index == 4 else "0.74")
                        next_object_id = add_object(group, next_object_id, gid, x, y, width, height, opacity=alpha)
                        count += 1
            elif layer_index == 6:
                y = top + 950
                while y < bottom:
                    for col in range(0, 8):
                        if (col + biome_i + int(y // 1000)) % 3 == 0:
                            continue
                        x = CROP_X + 240 + col * 1420 + ((biome_i * 93 + col * 211) % 380)
                        next_object_id = add_object(group, next_object_id, gid, x, y, 720, 86, opacity="0.48")
                        count += 1
                    y += 1850
            elif layer_index == 7:
                y = top + 310
                while y < min(bottom, top + 3600):
                    for col in range(-1, 12):
                        x = CROP_X + col * 1010
                        next_object_id = add_object(group, next_object_id, gid, x, y, 1004, 116, opacity="0.58")
                        count += 1
                    y += 760
            elif layer_index == 8:
                for y in (top + 720, bottom - 360):
                    if top < y < bottom:
                        for col in range(-1, 12):
                            x = CROP_X + col * 1008
                            next_object_id = add_object(group, next_object_id, gid, x, y, 1002, 142, opacity="0.42")
                            count += 1
            elif layer_index == 9:
                for y in (top + 96, bottom - 96):
                    if top < y < bottom:
                        for col in range(-1, 12):
                            x = CROP_X + col * 996
                            next_object_id = add_object(group, next_object_id, gid, x, y, 996, 99, opacity="0.62")
                            count += 1
            elif layer_index == 10:
                y = top + 1200
                while y < bottom:
                    for col in range(0, 6):
                        x = CROP_X + 680 + col * 1800 + ((biome_i + col) % 2) * 410
                        next_object_id = add_object(group, next_object_id, gid, x, y, 996, 107, opacity="0.24")
                        count += 1
                    y += 4200

        object_counts[layer_name] = count
        new_groups.append(group)

    props_group = create_group("gpt-v9-11-clean-near-props", "0.95", next_layer_id)
    next_layer_id += 1
    prop_count = 0
    for biome_i, (_biome_name, _offset, top, bottom) in enumerate(BIOMES):
        y_values = [top + 720, top + 1850, bottom - 540]
        for lane, y in enumerate(y_values):
            if not (top < y < bottom):
                continue
            for col in range(0, 9):
                if (col + lane + biome_i) % 2 == 0:
                    continue
                prop_index = (col * 3 + lane * 5 + biome_i) % 16
                variant = (col + lane + biome_i) % 10
                gid = prop_gid(biome_i, prop_index, variant=variant, use_10x=True)
                w = 230 + ((col + biome_i) % 4) * 20
                h = 220 + ((lane + prop_index) % 4) * 18
                x = CROP_X + 320 + col * 1220 + ((biome_i * 171 + lane * 83) % 240)
                next_object_id = add_object(props_group, next_object_id, gid, round(x), round(y), w, h, opacity="0.88")
                prop_count += 1
    object_counts[props_group.attrib["name"]] = prop_count
    new_groups.append(props_group)

    insert_at = 0
    children = list(root)
    for idx, child in enumerate(children):
        if child.tag == "layer":
            insert_at = idx
            break
    for offset, group in enumerate(new_groups):
        root.insert(insert_at + offset, group)

    root.attrib["nextlayerid"] = str(next_layer_id)
    root.attrib["nextobjectid"] = str(next_object_id)

    ET.indent(root, space=" ")
    tree.write(V9_TMX, encoding="UTF-8", xml_declaration=True)

    report = {
        "source": str(SOURCE_TMX),
        "v9": str(V9_TMX),
        "crop": {"x": 40, "y": 40, "width": 120, "height": 2000},
        "hiddenOldBackgroundGroups": hidden_old,
        "newGroups": object_counts,
        "totalNewObjects": sum(object_counts.values()),
        "biomes": [{"name": name, "topPx": top, "bottomPx": bottom} for name, _offset, top, bottom in BIOMES],
        "notes": [
            "Old object background stack is hidden, not deleted.",
            "New GPT v9 groups use current pallet-v9 strip and 10x prop tilesets.",
            "Objects are placed near native scale with overlapping bands to reduce visible box seams.",
        ],
    }
    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(f"Wrote {V9_TMX}")
    print(f"Wrote report {REPORT}")
    print(f"Hidden old background groups: {len(hidden_old)}")
    print(f"New objects: {sum(object_counts.values())}")


if __name__ == "__main__":
    main()
