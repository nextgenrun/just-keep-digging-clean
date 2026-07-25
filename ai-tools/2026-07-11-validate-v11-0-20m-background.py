from __future__ import annotations

import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path, PurePosixPath

from PIL import Image, UnidentifiedImageError


ROOT = Path(__file__).resolve().parents[1]
TMX = ROOT / "exports" / "dig-game-world-edit-v-11-08-07-2026-;1-img-test.tmx"
BACKUP = ROOT / "exports" / "dig-game-world-edit-v-11-08-07-2026-;1-img-test-before-0-20m-v3.tmx"

OLD_GROUP = "V11_LEVEL1_COMPOSITION_MASTER"
NEW_GROUP = "V11_SCALE_CORRECT_SKY_GROUND_0_20M_V3"
TILESET_SOURCE = "../sprites/backgrounds/world-v11-scale-correct-0-20m-v3/v11-scale-correct-0-20m-v3.tsx"
FIRST_GID = 50000
EXPECTED_OBJECTS = 90
TILE_PX = 94.0
MAX_Y_TILE = 114.41176470588235
PIXEL_CUTOFF = 10754.705882
MAX_CHUNK_PX = 3008.0
TOLERANCE = 0.001
GID_MASK = 0x1FFFFFFF


class Report:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []
        self.checks = 0

    def check(self, condition: bool, message: str) -> None:
        self.checks += 1
        if not condition:
            self.errors.append(message)

    def warn(self, message: str) -> None:
        self.warnings.append(message)


def expected_names() -> set[str]:
    names = {f"sky-r{row:02d}-c{column:02d}" for row in range(1, 4) for column in range(1, 12)}
    names |= {f"level1-ground-{index:02d}" for index in range(1, 11)}
    names |= {f"level2-ground-{index:02d}" for index in range(1, 16)}
    names |= {f"town-ground-{index:02d}" for index in range(1, 6)}
    names |= {f"level1-depth-{index:02d}" for index in range(1, 11)}
    names |= {f"level2-depth-{index:02d}" for index in range(1, 16)}
    names |= {"level1-exit-01", "level2-cavity-01"}
    return names


def parse_xml(path: Path, report: Report, label: str) -> ET.Element | None:
    if not path.is_file():
        report.errors.append(f"{label} does not exist: {path}")
        return None
    try:
        root = ET.parse(path).getroot()
    except ET.ParseError as error:
        report.errors.append(f"{label} is not valid XML: {error}")
        return None
    report.check(root.tag == "map" if path.suffix.lower() == ".tmx" else root.tag == "tileset", f"Unexpected {label} root tag: {root.tag}")
    return root


def normalized_text(value: str | None) -> str:
    return re.sub(r"\s+", " ", value.strip()) if value and value.strip() else ""


def semantic_element(element: ET.Element) -> tuple:
    return (
        element.tag,
        tuple(sorted(element.attrib.items())),
        normalized_text(element.text),
        tuple(semantic_element(child) for child in element),
    )


def normalize_payload(value: str | None, encoding: str) -> tuple[str, ...] | str:
    text = value or ""
    if encoding == "csv":
        return tuple(part.strip() for part in text.split(",") if part.strip())
    if encoding == "base64":
        return "".join(text.split())
    return normalized_text(text)


def data_signature(data: ET.Element | None) -> tuple:
    if data is None:
        return ("missing",)
    attributes = tuple(sorted(data.attrib.items()))
    encoding = data.get("encoding", "")
    chunks = data.findall("chunk")
    if chunks:
        body = tuple((tuple(sorted(chunk.attrib.items())), normalize_payload(chunk.text, encoding)) for chunk in chunks)
    elif list(data):
        body = tuple((child.tag, tuple(sorted(child.attrib.items())), normalized_text(child.text)) for child in data)
    else:
        body = normalize_payload(data.text, encoding)
    return attributes, body


def tile_layer_signatures(root: ET.Element) -> list[tuple]:
    signatures: list[tuple] = []
    for layer in root.iter("layer"):
        signatures.append((tuple(sorted(layer.attrib.items())), data_signature(layer.find("data"))))
    return signatures


def named_groups(root: ET.Element, name: str) -> list[ET.Element]:
    return [group for group in root.iter("objectgroup") if group.get("name") == name]


def properties(element: ET.Element) -> dict[str, str]:
    parent = element.find("properties")
    if parent is None:
        return {}
    return {item.get("name", ""): item.get("value", item.text or "") for item in parent.findall("property")}


def xml_reference(base: Path, reference: str) -> Path:
    normalized = reference.replace("\\", "/")
    return (base / Path(*PurePosixPath(normalized).parts)).resolve()


def number(element: ET.Element, attribute: str, report: Report) -> float | None:
    try:
        return float(element.get(attribute, ""))
    except ValueError:
        report.errors.append(f"Object {element.get('name', element.get('id', '?'))} has invalid {attribute}")
        return None


def validate_backup(target: ET.Element, backup: ET.Element, report: Report) -> None:
    report.check(tile_layer_signatures(target) == tile_layer_signatures(backup), "Tile-layer attributes or encoded tile data changed from the backup")
    target_old = named_groups(target, OLD_GROUP)
    backup_old = named_groups(backup, OLD_GROUP)
    report.check(len(target_old) == 1, f"Target must contain exactly one unchanged {OLD_GROUP} group")
    report.check(len(backup_old) == 1, f"Backup must contain exactly one {OLD_GROUP} group")
    if len(target_old) == 1 and len(backup_old) == 1:
        report.check(semantic_element(target_old[0]) == semantic_element(backup_old[0]), f"{OLD_GROUP} differs from the backup")


def validate_tileset(target: ET.Element, objects: list[ET.Element], report: Report) -> None:
    links = [item for item in target.findall("tileset") if item.get("source") == TILESET_SOURCE]
    report.check(len(links) == 1, "Target must reference the v3 external tileset exactly once")
    if len(links) != 1:
        return
    link = links[0]
    report.check(link.get("firstgid") == str(FIRST_GID), f"v3 tileset firstgid must be {FIRST_GID}")
    tsx_path = xml_reference(TMX.parent, link.get("source", ""))
    tileset = parse_xml(tsx_path, report, "v3 TSX")
    if tileset is None:
        return

    tiles = {int(tile.get("id", "-1")): tile for tile in tileset.findall("tile")}
    report.check(tileset.get("tilecount") == str(EXPECTED_OBJECTS), f"TSX tilecount must be {EXPECTED_OBJECTS}")
    report.check(set(tiles) == set(range(EXPECTED_OBJECTS)), f"TSX tile IDs must be the complete 0..{EXPECTED_OBJECTS - 1} range")
    gids = [(int(obj.get("gid", "0")) & GID_MASK) for obj in objects if obj.get("gid")]
    report.check(set(gids) == set(range(FIRST_GID, FIRST_GID + EXPECTED_OBJECTS)), "New image objects must use each v3 tileset gid exactly once")
    report.check(len(gids) == len(set(gids)), "New image-object gids must be unique")

    image_names: set[str] = set()
    for tile_id, tile in sorted(tiles.items()):
        image = tile.find("image")
        if image is None:
            report.errors.append(f"TSX tile {tile_id} has no image reference")
            continue
        reference = image.get("source", "")
        image_path = xml_reference(tsx_path.parent, reference)
        image_names.add(Path(reference).stem)
        report.check(image_path.is_file(), f"Missing TSX image: {image_path}")
        try:
            native_width = int(image.get("width", "0"))
            native_height = int(image.get("height", "0"))
        except ValueError:
            report.errors.append(f"TSX tile {tile_id} has non-integer native dimensions")
            continue
        report.check(0 < native_width <= MAX_CHUNK_PX and 0 < native_height <= MAX_CHUNK_PX, f"TSX tile {tile_id} native size exceeds {MAX_CHUNK_PX:g}px: {native_width}x{native_height}")
        if image_path.is_file():
            try:
                with Image.open(image_path) as source:
                    report.check(source.size == (native_width, native_height), f"TSX dimensions disagree with {image_path.name}: metadata {native_width}x{native_height}, file {source.width}x{source.height}")
            except (OSError, UnidentifiedImageError) as error:
                report.errors.append(f"Cannot read {image_path}: {error}")
    report.check(image_names == expected_names(), f"TSX image names do not match the expected {EXPECTED_OBJECTS}-chunk v3 manifest")


def validate_objects(group: ET.Element, report: Report) -> list[ET.Element]:
    objects = group.findall("object")
    report.check(len(objects) == EXPECTED_OBJECTS, f"{NEW_GROUP} must contain exactly {EXPECTED_OBJECTS} objects, found {len(objects)}")
    report.check(all(obj.get("gid") for obj in objects), "Every object in the new group must be an image/tile object with a gid")
    report.check({obj.get("name", "") for obj in objects} == expected_names(), f"New group object names do not match the expected {EXPECTED_OBJECTS}-chunk manifest")
    violations: list[str] = []
    max_bottom = float("-inf")
    for obj in objects:
        x = number(obj, "x", report)
        bottom = number(obj, "y", report)
        width = number(obj, "width", report)
        height = number(obj, "height", report)
        if None in (x, bottom, width, height):
            continue
        assert x is not None and bottom is not None and width is not None and height is not None
        max_bottom = max(max_bottom, bottom)
        if bottom > PIXEL_CUTOFF + TOLERANCE:
            violations.append(f"{obj.get('name')} bottom={bottom:.6f}")
        report.check(0 < width <= MAX_CHUNK_PX + TOLERANCE and 0 < height <= MAX_CHUNK_PX + TOLERANCE, f"Object {obj.get('name')} display size exceeds {MAX_CHUNK_PX:g}px: {width:g}x{height:g}")
        item_properties = properties(obj)
        try:
            top_tile = float(item_properties["topTileY"])
            width_tiles = float(item_properties["widthTiles"])
            height_tiles = float(item_properties["heightTiles"])
        except (KeyError, ValueError):
            report.errors.append(f"Object {obj.get('name')} is missing valid tile-coordinate properties")
            continue
        top = bottom - height
        report.check(abs(top - top_tile * TILE_PX) <= TOLERANCE, f"Object {obj.get('name')} top pixel/tile coordinates disagree")
        report.check(abs(width - width_tiles * TILE_PX) <= TOLERANCE, f"Object {obj.get('name')} width pixel/tile coordinates disagree")
        report.check(abs(height - height_tiles * TILE_PX) <= TOLERANCE, f"Object {obj.get('name')} height pixel/tile coordinates disagree")
        report.check(top_tile + height_tiles <= MAX_Y_TILE + TOLERANCE / TILE_PX, f"Object {obj.get('name')} extends below the exact 20m tile cutoff")
    report.check(not violations, "New objects below the exact 20m pixel cutoff: " + ", ".join(violations[:6]))
    report.check(abs(max_bottom - PIXEL_CUTOFF) <= TOLERANCE, f"Deepest new object must end exactly at {PIXEL_CUTOFF:.6f}px, found {max_bottom:.6f}px")
    return objects


def main() -> int:
    report = Report()
    target = parse_xml(TMX, report, "target TMX")
    if target is None:
        return finish(report)

    old_groups = named_groups(target, OLD_GROUP)
    report.check(len(old_groups) == 1, f"Target must retain exactly one {OLD_GROUP} group")
    new_groups = named_groups(target, NEW_GROUP)
    report.check(len(new_groups) == 1, f"Target must contain exactly one {NEW_GROUP} group")
    if len(new_groups) == 1:
        group = new_groups[0]
        group_properties = properties(group)
        report.check(group_properties.get("maxYTile") == "114.41176470588235", "New group maxYTile property is not exact")
        report.check(group_properties.get("runtimeWired") == "false", "New group must remain Tiled-only (runtimeWired=false)")
        objects = validate_objects(group, report)
        validate_tileset(target, objects, report)

    if BACKUP.is_file():
        backup = parse_xml(BACKUP, report, "pre-v3 backup TMX")
        if backup is not None:
            validate_backup(target, backup, report)
    else:
        report.warn(f"Backup comparison skipped because this file is absent: {BACKUP}")
    return finish(report)


def finish(report: Report) -> int:
    print("V11 sky/ground/0-20m background validation")
    for warning in report.warnings:
        print(f"WARNING: {warning}")
    if report.errors:
        print(f"FAIL: {len(report.errors)} error(s), {report.checks} checks")
        for error in report.errors:
            print(f" - {error}")
        return 1
    print(f"PASS: {report.checks} checks; TMX, backup invariants, {EXPECTED_OBJECTS} chunks, and exact 20m cutoff are valid")
    return 0


if __name__ == "__main__":
    sys.exit(main())
