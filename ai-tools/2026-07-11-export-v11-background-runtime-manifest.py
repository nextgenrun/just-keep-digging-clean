"""Export the saved v11 TMX background image objects as runtime-only data."""
from __future__ import annotations
import argparse, hashlib, json, re, sys
import xml.etree.ElementTree as ET
from decimal import Decimal
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
SOURCE_TMX = ROOT / "exports" / "dig-game-world-edit-v-11-08-07-2026-;1-img-test-saved-before-runtime-wire.tmx"
OUTPUT_JS = ROOT / "values" / "v11BackgroundRuntimeManifest.js"
TILE_SIZE, X_OFFSET_TILES, Y_OFFSET_TILES = 94, -40, -40
GROUP_NAMES = ("V11_LEVEL1_COMPOSITION_MASTER", "V11_SCALE_CORRECT_SKY_GROUND_0_20M_V3")
REQUIRED_GROUPS = {"V11_SCALE_CORRECT_SKY_GROUND_0_20M_V3"}
GROUP_BASE_DEPTH = {"V11_LEVEL1_COMPOSITION_MASTER": -7, "V11_SCALE_CORRECT_SKY_GROUND_0_20M_V3": -6}
GID_MASK = 0x0FFFFFFF
def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()
def browser_path(path: Path) -> str:
    resolved = path.resolve()
    try:
        relative = resolved.relative_to(ROOT)
    except ValueError as exc:
        raise ValueError(f"Asset escapes workspace: {resolved}") from exc
    result = relative.as_posix()
    if "\\" in result or result.startswith("../"):
        raise ValueError(f"Invalid browser path: {result}")
    return result
def decimal_attr(element: ET.Element, name: str, default: str = "0") -> Decimal:
    return Decimal(element.get(name, default))
def js_number(value: Decimal) -> int | float:
    return int(value) if value == value.to_integral_value() else float(value)
def typed_property(prop: ET.Element):
    raw = prop.get("value", prop.text or "")
    value_type = prop.get("type", "string")
    if value_type == "bool":
        return raw.lower() == "true"
    if value_type == "int":
        return int(raw)
    if value_type == "float":
        return float(raw)
    return raw
def properties(element: ET.Element) -> dict:
    container = element.find("properties")
    if container is None:
        return {}
    return {prop.get("name", ""): typed_property(prop) for prop in container.findall("property")}
def bool_attr(element: ET.Element, name: str, default: bool = True) -> bool:
    raw = element.get(name)
    return default if raw is None else raw not in {"0", "false"}
def slug(value: str) -> str:
    cleaned = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return cleaned[:64] or "image"
class TilesetResolver:
    def __init__(self, map_root: ET.Element, tmx_path: Path):
        self.tmx_path = tmx_path
        self.refs = []
        self.cache = {}
        for node in map_root.findall("tileset"):
            self.refs.append({"firstGid": int(node.get("firstgid", "0")), "source": node.get("source", ""), "node": node})
        self.refs.sort(key=lambda item: item["firstGid"])
    def resolve(self, encoded_gid: int) -> dict:
        base_gid = encoded_gid & GID_MASK
        candidates = [ref for ref in self.refs if ref["firstGid"] <= base_gid]
        if not candidates:
            raise ValueError(f"No tileset owns GID {base_gid}")
        ref = candidates[-1]
        tileset = self._load(ref)
        local_id = base_gid - ref["firstGid"]
        image = tileset["images"].get(local_id)
        if image is None:
            raise ValueError(f"Tileset {tileset['name']} has no image tile {local_id}")
        return {
            "encodedGid": encoded_gid,
            "baseGid": base_gid,
            "firstGid": ref["firstGid"],
            "localTileId": local_id,
            "tilesetName": tileset["name"],
            "tilesetPath": tileset["path"],
            "flipHorizontal": bool(encoded_gid & 0x80000000),
            "flipVertical": bool(encoded_gid & 0x40000000),
            "flipDiagonal": bool(encoded_gid & 0x20000000),
            **image,
        }
    def _load(self, ref: dict) -> dict:
        first_gid = ref["firstGid"]
        if first_gid in self.cache:
            return self.cache[first_gid]
        source = ref["source"]
        if source:
            source_path = (self.tmx_path.parent / source).resolve()
            if not source_path.is_file():
                raise FileNotFoundError(f"Missing external tileset: {source_path}")
            root = ET.parse(source_path).getroot()
            base_dir = source_path.parent
            tileset_path = browser_path(source_path)
        else:
            root = ref["node"]
            base_dir = self.tmx_path.parent
            tileset_path = browser_path(self.tmx_path)
        images = {}
        for tile in root.findall("tile"):
            image = tile.find("image")
            if image is None:
                continue
            image_path = (base_dir / image.get("source", "")).resolve()
            if not image_path.is_file():
                raise FileNotFoundError(f"Missing background image: {image_path}")
            images[int(tile.get("id", "0"))] = {
                "path": browser_path(image_path),
                "sourceWidthPx": int(image.get("width", "0")),
                "sourceHeightPx": int(image.get("height", "0")),
            }
        result = {"name": root.get("name", ""), "path": tileset_path, "images": images}
        self.cache[first_gid] = result
        return result
def export_object(
    obj: ET.Element,
    group_name: str,
    group_opacity: Decimal,
    group_visible: bool,
    draw_order: int,
    resolver: TilesetResolver,
) -> dict:
    encoded_gid = int(obj.get("gid", "0"))
    if encoded_gid == 0:
        raise ValueError(f"Background object {obj.get('id')} has no image GID")
    image = resolver.resolve(encoded_gid)
    x = decimal_attr(obj, "x")
    bottom_y = decimal_attr(obj, "y")
    width = decimal_attr(obj, "width", str(image["sourceWidthPx"]))
    height = decimal_attr(obj, "height", str(image["sourceHeightPx"]))
    top_y = bottom_y - height
    object_opacity = decimal_attr(obj, "opacity", "1")
    visible = group_visible and bool_attr(obj, "visible")
    object_id = int(obj.get("id", "0"))
    name = obj.get("name", "")
    base_depth = Decimal(str(GROUP_BASE_DEPTH[group_name]))
    depth = base_depth + Decimal(draw_order) / Decimal("1000000")
    return {
        "id": f"{group_name}:{object_id}",
        "tmxObjectId": object_id,
        "groupName": group_name,
        "name": name,
        "type": obj.get("type", obj.get("class", "")),
        "textureKey": f"v11-bg-{object_id}-{slug(name or Path(image['path']).stem)}",
        "path": image["path"],
        "xTile": js_number(x / TILE_SIZE),
        "yTile": js_number(top_y / TILE_SIZE),
        "widthTiles": js_number(width / TILE_SIZE),
        "heightTiles": js_number(height / TILE_SIZE),
        "xPx": js_number(x),
        "yPx": js_number(top_y),
        "widthPx": js_number(width),
        "heightPx": js_number(height),
        "tiledBottomYPx": js_number(bottom_y),
        "anchor": "bottom-left",
        "opacity": float(group_opacity * object_opacity),
        "visible": visible,
        "rotation": float(decimal_attr(obj, "rotation")),
        "depth": float(depth),
        "drawOrder": draw_order,
        "savedGeometry": {
            "x": obj.get("x"),
            "y": obj.get("y"),
            "width": obj.get("width"),
            "height": obj.get("height"),
        },
        "properties": properties(obj),
        **image,
    }
def build_manifest(source_bytes: bytes) -> dict:
    map_root = ET.fromstring(source_bytes)
    if int(map_root.get("tilewidth", "0")) != TILE_SIZE or int(map_root.get("tileheight", "0")) != TILE_SIZE:
        raise ValueError("The saved v11 TMX is no longer a 94px tile map")
    resolver = TilesetResolver(map_root, SOURCE_TMX)
    children = list(map_root)
    found = {}
    for map_index, child in enumerate(children):
        if child.tag == "objectgroup" and child.get("name") in GROUP_NAMES:
            found[child.get("name")] = (map_index, child)
    missing = [name for name in GROUP_NAMES if name not in found]
    required_missing = REQUIRED_GROUPS.intersection(missing)
    if required_missing:
        raise ValueError(f"Required TMX group missing: {sorted(required_missing)}")
    groups = []
    flat_objects = []
    for name, (map_index, group) in sorted(found.items(), key=lambda item: item[1][0]):
        group_opacity = decimal_attr(group, "opacity", "1")
        group_visible = bool_attr(group, "visible")
        group_objects = []
        for obj in group.findall("object"):
            exported = export_object(
                obj, name, group_opacity, group_visible, len(flat_objects), resolver
            )
            flat_objects.append(exported)
            group_objects.append(exported["id"])
        groups.append({
            "name": name,
            "mapChildIndex": map_index,
            "drawOrder": group.get("draworder", "topdown"),
            "opacity": float(group_opacity),
            "visible": group_visible,
            "locked": bool_attr(group, "locked", False),
            "properties": properties(group),
            "objectIds": group_objects,
        })
    manifest = {
        "version": 1,
        "generatedBy": "ai-tools/2026-07-11-export-v11-background-runtime-manifest.py",
        "sourceMap": browser_path(SOURCE_TMX),
        "sourceTmxSha256": sha256_bytes(source_bytes),
        "tileSize": TILE_SIZE,
        "xOffsetTiles": X_OFFSET_TILES,
        "xOffsetPx": X_OFFSET_TILES * TILE_SIZE,
        "yOffsetTiles": Y_OFFSET_TILES,
        "yOffsetPx": Y_OFFSET_TILES * TILE_SIZE,
        "runtimeCrop": {"sourceLeftTile": 40, "sourceTopTile": 40, "sourceRightTileExclusive": 320, "sourceBottomTileExclusive": 2040, "widthTiles": 280, "heightTiles": 2000},
        "mapWidthTiles": int(map_root.get("width", "0")),
        "mapHeightTiles": int(map_root.get("height", "0")),
        "requestedGroups": list(GROUP_NAMES),
        "missingGroups": missing,
        "groupCount": len(groups),
        "objectCount": len(flat_objects),
        "groups": groups,
        "objects": flat_objects,
    }
    validate(manifest)
    return manifest
def validate(manifest: dict) -> None:
    if not manifest["objects"]:
        raise ValueError("No v11 runtime background objects were exported")
    ids = [obj["id"] for obj in manifest["objects"]]; keys = [obj["textureKey"] for obj in manifest["objects"]]
    if len(ids) != len(set(ids)) or len(keys) != len(set(keys)):
        raise ValueError("Manifest object IDs or texture keys are not unique")
    for index, obj in enumerate(manifest["objects"]):
        if obj["drawOrder"] != index:
            raise ValueError("Manifest draw order is not contiguous")
        if not obj["path"] or "\\" in obj["path"] or obj["path"].startswith("../"):
            raise ValueError(f"Invalid runtime image path: {obj['path']}")
        if obj["widthPx"] <= 0 or obj["heightPx"] <= 0:
            raise ValueError(f"Invalid display size for {obj['id']}")
        expected_top = Decimal(obj["savedGeometry"]["y"]) - Decimal(obj["savedGeometry"]["height"])
        if Decimal(str(obj["yPx"])) != expected_top:
            raise ValueError(f"Tiled bottom anchoring changed for {obj['id']}")
    expected_crop = {"sourceLeftTile": 40, "sourceTopTile": 40, "sourceRightTileExclusive": 320, "sourceBottomTileExclusive": 2040, "widthTiles": 280, "heightTiles": 2000}
    if manifest["runtimeCrop"] != expected_crop or manifest["xOffsetTiles"] != -expected_crop["sourceLeftTile"] or manifest["yOffsetTiles"] != -expected_crop["sourceTopTile"]: raise ValueError("Runtime crop offsets no longer map TMX x40..319/y40..2039 to the 280x2000 runtime world")
def render_js(manifest: dict) -> str:
    groups = manifest["groups"]; objects = manifest["objects"]
    metadata = {key: value for key, value in manifest.items() if key not in {"groups", "objects"}}
    lines = [
        "// Generated file. Re-run the dated exporter; do not edit by hand.",
        "const deepFreeze = value => {",
        "  if (!value || typeof value !== \"object\" || Object.isFrozen(value)) return value;",
        "  Object.values(value).forEach(deepFreeze);",
        "  return Object.freeze(value);",
        "};",
        "",
        "const DATA = {",
    ]
    for key, value in metadata.items():
        lines.append(f"  {json.dumps(key)}: {json.dumps(value, ensure_ascii=False)},")
    lines.append('  "groups": [')
    for group in groups:
        lines.append(f"    {json.dumps(group, ensure_ascii=False, separators=(',', ':'))},")
    lines.append("  ],")
    lines.append('  "objects": [')
    for obj in objects:
        lines.append(f"    {json.dumps(obj, ensure_ascii=False, separators=(',', ':'))},")
    lines.extend([
        "  ],",
        "};",
        "",
        "export const V11_BACKGROUND_RUNTIME_MANIFEST = deepFreeze(DATA);",
        "",
    ])
    return "\n".join(lines)
def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Fail if the generated module is stale"); args = parser.parse_args()
    source_bytes = SOURCE_TMX.read_bytes(); source_hash = sha256_bytes(source_bytes)
    output = render_js(build_manifest(source_bytes))
    if sha256_bytes(SOURCE_TMX.read_bytes()) != source_hash:
        raise RuntimeError("Source TMX changed during export")
    if args.check:
        if not OUTPUT_JS.is_file() or OUTPUT_JS.read_text(encoding="utf-8") != output:
            print(f"STALE: {OUTPUT_JS.relative_to(ROOT).as_posix()}", file=sys.stderr)
            return 1
    else:
        OUTPUT_JS.write_text(output, encoding="utf-8", newline="\n")
    manifest = build_manifest(source_bytes)
    print(json.dumps({
        "sourceTmxSha256": manifest["sourceTmxSha256"],
        "groups": {group["name"]: len(group["objectIds"]) for group in manifest["groups"]},
        "missingGroups": manifest["missingGroups"],
        "objectCount": manifest["objectCount"],
        "output": OUTPUT_JS.relative_to(ROOT).as_posix(),
        "mode": "check" if args.check else "write",
    }, indent=2))
    return 0
if __name__ == "__main__":
    raise SystemExit(main())
