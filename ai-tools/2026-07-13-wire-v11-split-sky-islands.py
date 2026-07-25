"""Wire the approved split sky-island portal banks into the saved v11 TMX."""

from __future__ import annotations

import base64
import colorsys
import hashlib
import json
import re
import shutil
import struct
import textwrap
import zlib
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
TMX = ROOT / "exports/dig-game-world-edit-v-11-08-07-2026-;1-img-test-saved-before-runtime-wire.tmx"
BACKUP = ROOT / "exports/dig-game-world-edit-v-11-08-07-2026-;1-img-test-before-split-sky-island-wire-2026-07-13.tmx"
ASSET_DIR = ROOT / "sprites/backgrounds/world-v11-sky-islands-v1"
TSX = ASSET_DIR / "world-v11-sky-islands-v1.tsx"
LEVEL1_ALPHA = ASSET_DIR / "level1-platform-alpha.png"
LEVEL2_ALPHA = ASSET_DIR / "level2-platform-alpha.png"
GATE_SOURCE = ROOT / "exports/dig_game_runtime_bg_props_v1/sprites/background-props/generated-runtime-v1/prop_048_eclipse_gate.webp"
PREVIEW_BASE = ROOT / "visual-approval-previews/v11-neutral-skyline-exact-tmx-preview-2026-07-12.png"
PREVIEW = ROOT / "visual-approval-previews/v11-split-sky-islands-wired-2026-07-13.png"
REPORT = ROOT / "visual-approval-previews/v11-split-sky-islands-wired-2026-07-13.json"

TILE = 94
MAP_WIDTH = 800
MAP_HEIGHT = 2120
GROUND_ROW = 105
PLATFORM_TOP_ROW = 58
PLATFORM_WIDTH_TILES = 16
PLATFORM_HEIGHT_TILES = 6
PLATFORM_WIDTH_PX = PLATFORM_WIDTH_TILES * TILE
PLATFORM_HEIGHT_PX = PLATFORM_HEIGHT_TILES * TILE
PLATFORM_WALKWAY_OFFSET_PX = 70
LEVEL1_LEFT = 120
LEVEL2_LEFT = 182
DIVIDER_X = 159
SKY_BEDROCK_END_ROW = GROUND_ROW
BEDROCK_GID = 5
LEVEL1_FLOOR_GID = 15
LEVEL2_FLOOR_GID = 16
TILESET_FIRST_GID = 1249
TILESET_SOURCE = "../sprites/backgrounds/world-v11-sky-islands-v1/world-v11-sky-islands-v1.tsx"
GROUP_NAME = "V11_SPLIT_SKY_ISLAND_PORTALS_V1"
GROUP_ID = 26
FIRST_OBJECT_ID = 101
PORTAL_SLOTS_PER_LEVEL = 4
PREVIEW_VIEW_LEFT = 40
PREVIEW_VIEW_TOP = 40
PREVIEW_SCALE = 0.12


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    rgba = image.convert("RGBA")
    bbox = rgba.getchannel("A").getbbox()
    if bbox is None:
        raise RuntimeError(f"No opaque content in {image}")
    return bbox


def build_platform(source: Path, destination: Path) -> None:
    with Image.open(source) as opened:
        subject = opened.convert("RGBA").crop(alpha_bbox(opened))
    scale = min(PLATFORM_WIDTH_PX / subject.width, PLATFORM_HEIGHT_PX / subject.height)
    size = (round(subject.width * scale), round(subject.height * scale))
    subject = subject.resize(size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (PLATFORM_WIDTH_PX, PLATFORM_HEIGHT_PX))
    canvas.alpha_composite(subject, ((PLATFORM_WIDTH_PX - subject.width) // 2, 0))
    canvas.save(destination, "WEBP", lossless=True, method=6)


def cyan_grade(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            red, green, blue, alpha = pixels[x, y]
            if alpha == 0:
                continue
            hue, saturation, value = colorsys.rgb_to_hsv(red / 255, green / 255, blue / 255)
            if saturation > 0.32 and (hue < 0.16 or hue > 0.95) and red > blue * 1.15:
                nr, ng, nb = colorsys.hsv_to_rgb(0.53, min(1, saturation * 1.05), value)
                pixels[x, y] = round(nr * 255), round(ng * 255), round(nb * 255), alpha
    return rgba


def build_gate_assets() -> None:
    with Image.open(GATE_SOURCE) as opened:
        subject = opened.convert("RGBA").crop(alpha_bbox(opened))
    target = (2 * TILE, 2 * TILE)
    scale = min(target[0] / subject.width, target[1] / subject.height)
    subject = subject.resize((round(subject.width * scale), round(subject.height * scale)), Image.Resampling.LANCZOS)
    level2 = Image.new("RGBA", target)
    level2.alpha_composite(subject, ((target[0] - subject.width) // 2, target[1] - subject.height))
    level2.save(ASSET_DIR / "level2-eclipse-gate.webp", "WEBP", lossless=True, method=6)
    cyan_grade(level2).save(ASSET_DIR / "level1-eclipse-gate.webp", "WEBP", lossless=True, method=6)


def write_tileset() -> None:
    TSX.write_text(
        """<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<tileset version=\"1.10\" tiledversion=\"1.11.2\" name=\"world-v11-sky-islands-v1\" tilewidth=\"1504\" tileheight=\"564\" tilecount=\"4\" columns=\"0\">
 <properties>
  <property name=\"approvedMockup\" value=\"exec-55873027-3883-4e21-8f8d-59d6f3b8b66d.png\"/>
  <property name=\"portalRetentionPolicy\" value=\"deepest-four-per-level\"/>
  <property name=\"runtimeWired\" type=\"bool\" value=\"false\"/>
 </properties>
 <grid orientation=\"orthogonal\" width=\"1\" height=\"1\"/>
 <tile id=\"0\" type=\"v11_level1_sky_island_platform\"><image width=\"1504\" height=\"564\" source=\"level1-platform.webp\"/></tile>
 <tile id=\"1\" type=\"v11_level2_sky_island_platform\"><image width=\"1504\" height=\"564\" source=\"level2-platform.webp\"/></tile>
 <tile id=\"2\" type=\"v11_level1_sky_portal\"><image width=\"188\" height=\"188\" source=\"level1-eclipse-gate.webp\"/></tile>
 <tile id=\"3\" type=\"v11_level2_sky_portal\"><image width=\"188\" height=\"188\" source=\"level2-eclipse-gate.webp\"/></tile>
</tileset>
""",
        encoding="utf-8",
    )


def decode_primary_layer(text: str) -> tuple[list[int], re.Match[str]]:
    pattern = re.compile(
        r'(<layer id="1" name="00_PAINT_HERE_tile_types"[^>]*>\s*<data encoding="base64" compression="zlib">)(.*?)(</data>)',
        re.DOTALL,
    )
    match = pattern.search(text)
    if match is None:
        raise RuntimeError("Primary authored tile layer not found")
    packed = zlib.decompress(base64.b64decode("".join(match.group(2).split())))
    gids = list(struct.unpack(f"<{len(packed) // 4}I", packed))
    if len(gids) != MAP_WIDTH * MAP_HEIGHT:
        raise RuntimeError(f"Unexpected tile count: {len(gids)}")
    return gids, match


def encode_primary_layer(gids: list[int]) -> str:
    packed = struct.pack(f"<{len(gids)}I", *gids)
    encoded = base64.b64encode(zlib.compress(packed, level=9)).decode("ascii")
    return "\n   " + "\n   ".join(textwrap.wrap(encoded, 160)) + "\n  "


def map_properties() -> str:
    return """  <property name=\"v11SkyIslandSplitV1\" type=\"bool\" value=\"true\"/>
  <property name=\"v11SkyIslandPlatformTopRow\" type=\"int\" value=\"58\"/>
  <property name=\"v11SkyPortalSlotsPerLevel\" type=\"int\" value=\"4\"/>
  <property name=\"v11SkyPortalRetentionPolicy\" value=\"deepest-four-per-level\"/>
  <property name=\"v11SkyPortalRuntimeWired\" type=\"bool\" value=\"false\"/>
  <property name=\"v11SkyBedrockPolicy\" value=\"vertical-divider-only\"/>
"""


def object_properties(level_id: int, kind: str, slot_index: int | None = None) -> str:
    slot = "" if slot_index is None else f'   <property name="slotIndex" type="int" value="{slot_index}"/>\n'
    return (
        "  <properties>\n"
        f'   <property name="levelId" type="int" value="{level_id}"/>\n'
        f'   <property name="visualKind" value="{kind}"/>\n'
        f'{slot}'
        f'   <property name="portalSlotsPerLevel" type="int" value="4"/>\n'
        f'   <property name="retentionPolicy" value="deepest-four"/>\n'
        f'   <property name="runtimeWired" type="bool" value="false"/>\n'
        "  </properties>\n"
    )


def object_group() -> str:
    objects: list[str] = []
    next_id = FIRST_OBJECT_ID
    platform_top_px = PLATFORM_TOP_ROW * TILE
    platform_object_top = platform_top_px - PLATFORM_WALKWAY_OFFSET_PX
    platform_object_bottom = platform_object_top + PLATFORM_HEIGHT_PX
    for level_id, left, gid in ((1, LEVEL1_LEFT, TILESET_FIRST_GID), (2, LEVEL2_LEFT, TILESET_FIRST_GID + 1)):
        objects.append(
            f' <object id="{next_id}" name="level{level_id}-sky-island-platform" type="v11_sky_island_platform" gid="{gid}" '
            f'x="{left * TILE}" y="{platform_object_bottom}" width="{PLATFORM_WIDTH_PX}" height="{PLATFORM_HEIGHT_PX}">\n'
            + object_properties(level_id, "sky-island-platform")
            + " </object>\n"
        )
        next_id += 1
        for slot_index, offset in enumerate((1, 5, 9, 13)):
            gate_gid = TILESET_FIRST_GID + (2 if level_id == 1 else 3)
            objects.append(
                f' <object id="{next_id}" name="level{level_id}-portal-slot-{slot_index + 1}" type="v11_sky_portal_slot" '
                f'gid="{gate_gid}" x="{(left + offset) * TILE}" y="{platform_top_px}" width="{2 * TILE}" height="{2 * TILE}">\n'
                + object_properties(level_id, "eclipse-gate", slot_index)
                + " </object>\n"
            )
            next_id += 1
    return (
        f'<objectgroup id="{GROUP_ID}" name="{GROUP_NAME}" draworder="index">\n'
        " <properties>\n"
        '  <property name="approved" type="bool" value="true"/>\n'
        '  <property name="platformTopRow" type="int" value="58"/>\n'
        '  <property name="portalSlotsPerLevel" type="int" value="4"/>\n'
        '  <property name="retentionPolicy" value="deepest-four-per-level"/>\n'
        '  <property name="runtimeWired" type="bool" value="false"/>\n'
        " </properties>\n"
        + "".join(objects)
        + "</objectgroup>\n "
    )


def update_tmx() -> dict[str, int]:
    if not BACKUP.exists():
        shutil.copy2(TMX, BACKUP)
    text = TMX.read_text(encoding="utf-8")
    text = re.sub(rf'\s*<tileset firstgid="\d+" source="{re.escape(TILESET_SOURCE)}"/>', "", text)
    text = re.sub(rf'\s*<objectgroup id="\d+" name="{GROUP_NAME}".*?</objectgroup>', "", text, flags=re.DOTALL)
    for name in (
        "v11SkyIslandSplitV1",
        "v11SkyIslandPlatformTopRow",
        "v11SkyPortalSlotsPerLevel",
        "v11SkyPortalRetentionPolicy",
        "v11SkyPortalRuntimeWired",
        "v11SkyBedrockPolicy",
    ):
        text = re.sub(rf'\s*<property name="{name}"[^>]*/>', "", text)

    gids, layer_match = decode_primary_layer(text)
    removed = 0
    for ty in range(SKY_BEDROCK_END_ROW):
        for tx in range(MAP_WIDTH):
            index = ty * MAP_WIDTH + tx
            if (gids[index] & 0x1FFFFFFF) == BEDROCK_GID:
                gids[index] = 1
                removed += 1
    for ty in range(40, SKY_BEDROCK_END_ROW):
        gids[ty * MAP_WIDTH + DIVIDER_X] = BEDROCK_GID
    for tx in range(LEVEL1_LEFT, LEVEL1_LEFT + PLATFORM_WIDTH_TILES):
        gids[PLATFORM_TOP_ROW * MAP_WIDTH + tx] = LEVEL1_FLOOR_GID
    for tx in range(LEVEL2_LEFT, LEVEL2_LEFT + PLATFORM_WIDTH_TILES):
        gids[PLATFORM_TOP_ROW * MAP_WIDTH + tx] = LEVEL2_FLOOR_GID

    replacement = layer_match.group(1) + encode_primary_layer(gids) + layer_match.group(3)
    text = text[: layer_match.start()] + replacement + text[layer_match.end() :]
    text = text.replace('nextlayerid="26"', 'nextlayerid="27"').replace('nextobjectid="101"', 'nextobjectid="111"')
    text = text.replace(" </properties>", map_properties() + " </properties>", 1)
    last_tileset = list(re.finditer(r'<tileset firstgid="\d+" source="[^"]+"/>', text))[-1]
    insertion = f'\n <tileset firstgid="{TILESET_FIRST_GID}" source="{TILESET_SOURCE}"/>'
    text = text[: last_tileset.end()] + insertion + text[last_tileset.end() :]
    tile_layer_at = text.index('<layer id="1" name="00_PAINT_HERE_tile_types"')
    text = text[:tile_layer_at] + object_group() + text[tile_layer_at:]
    TMX.write_text(text, encoding="utf-8", newline="\n")
    return {"removedSkyBedrockTiles": removed, "dividerBedrockTiles": SKY_BEDROCK_END_ROW - 40, "platformFloorTiles": 32}


def alpha_composite_scaled(canvas: Image.Image, source_path: Path, x: float, y: float, width: float, height: float) -> None:
    with Image.open(source_path) as opened:
        source = opened.convert("RGBA").resize((max(1, round(width)), max(1, round(height))), Image.Resampling.LANCZOS)
    canvas.alpha_composite(source, (round(x), round(y)))


def render_preview() -> None:
    with Image.open(PREVIEW_BASE) as opened:
        canvas = opened.convert("RGBA")
    tile_px = TILE * PREVIEW_SCALE
    draw = ImageDraw.Draw(canvas, "RGBA")
    divider_x = (DIVIDER_X - PREVIEW_VIEW_LEFT) * tile_px
    divider_y = 0
    divider_bottom = (GROUND_ROW - PREVIEW_VIEW_TOP) * tile_px
    draw.rectangle((divider_x, divider_y, divider_x + tile_px, divider_bottom), fill=(35, 36, 41, 245), outline=(13, 14, 18, 255), width=2)

    platform_top_world = PLATFORM_TOP_ROW * TILE - PLATFORM_WALKWAY_OFFSET_PX
    platform_top_preview = (platform_top_world - PREVIEW_VIEW_TOP * TILE) * PREVIEW_SCALE
    for level_id, left, platform, gate in (
        (1, LEVEL1_LEFT, ASSET_DIR / "level1-platform.webp", ASSET_DIR / "level1-eclipse-gate.webp"),
        (2, LEVEL2_LEFT, ASSET_DIR / "level2-platform.webp", ASSET_DIR / "level2-eclipse-gate.webp"),
    ):
        x = (left - PREVIEW_VIEW_LEFT) * tile_px
        alpha_composite_scaled(canvas, platform, x, platform_top_preview, PLATFORM_WIDTH_PX * PREVIEW_SCALE, PLATFORM_HEIGHT_PX * PREVIEW_SCALE)
        for offset in (1, 5, 9, 13):
            gate_x = (left + offset - PREVIEW_VIEW_LEFT) * tile_px
            gate_y = (PLATFORM_TOP_ROW - 2 - PREVIEW_VIEW_TOP) * tile_px
            alpha_composite_scaled(canvas, gate, gate_x, gate_y, 2 * tile_px, 2 * tile_px)
    canvas.convert("RGB").save(PREVIEW, optimize=True)


def validate() -> dict[str, object]:
    text = TMX.read_text(encoding="utf-8")
    gids, _ = decode_primary_layer(text)
    sky_bedrock = [
        (index % MAP_WIDTH, index // MAP_WIDTH)
        for index, gid in enumerate(gids[: MAP_WIDTH * GROUND_ROW])
        if (gid & 0x1FFFFFFF) == BEDROCK_GID
    ]
    expected_divider = {(DIVIDER_X, ty) for ty in range(40, GROUND_ROW)}
    if set(sky_bedrock) != expected_divider:
        raise RuntimeError(f"Unexpected sky bedrock after wiring: {len(sky_bedrock)} tiles")
    if text.count('type="v11_sky_portal_slot"') != 8:
        raise RuntimeError("Expected exactly eight portal slot objects")
    if text.count('type="v11_sky_island_platform"') != 2:
        raise RuntimeError("Expected exactly two sky-island platform objects")
    return {
        "tmx": str(TMX.relative_to(ROOT)),
        "backup": str(BACKUP.relative_to(ROOT)),
        "tmxSha256": sha256(TMX),
        "backupSha256": sha256(BACKUP),
        "group": GROUP_NAME,
        "platforms": 2,
        "portalSlots": 8,
        "portalSlotsPerLevel": PORTAL_SLOTS_PER_LEVEL,
        "retentionPolicy": "deepest-four-per-level",
        "platformTopRow": PLATFORM_TOP_ROW,
        "dividerX": DIVIDER_X,
        "skyBedrockTiles": len(sky_bedrock),
        "runtimeWired": False,
        "preview": str(PREVIEW.relative_to(ROOT)),
    }


def main() -> None:
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    PREVIEW.parent.mkdir(parents=True, exist_ok=True)
    build_platform(LEVEL1_ALPHA, ASSET_DIR / "level1-platform.webp")
    build_platform(LEVEL2_ALPHA, ASSET_DIR / "level2-platform.webp")
    build_gate_assets()
    write_tileset()
    changes = update_tmx()
    render_preview()
    report = {**validate(), **changes}
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
