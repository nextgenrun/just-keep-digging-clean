"""Build the complete library-backed Phaser tile-destruction runtime pack."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
LIBRARY = ROOT / "visual-approval-previews/2026-07-29-high-impact-review-library-v2"
LIBRARY_MANIFEST = LIBRARY / "manifest.json"
PACKAGE = ROOT / "sprites/fx/tile-destruction-fx-v3"
CORE_ATLAS = PACKAGE / "tile-break-core-v3.png"
SHARD_ATLAS = PACKAGE / "tile-break-shards-v3.png"
PROVENANCE = PACKAGE / "provenance.json"
REVIEW = ROOT / "visual-approval-previews/tile-destruction-fx-v3"
REVIEW_SHEET = REVIEW / "01-library-sequences-native-94px.png"

SOURCE_CELL = (320, 256)
CORE_CELL = (256, 208)
SHARD_CELL = 80
SHARDS_PER_FAMILY = 5
ALPHA_THRESHOLD = 16
TILE_SIZE = 94

# Four runtime phases: contact, fracture, detached pieces, settling dust.
# Every ID below is zero-warning. Unsafe phases use safe donors instead.
FAMILIES = (
    ("dirt", ("a0252-dry-topsoil-cycle-f02", "a0253-dry-topsoil-cycle-f03", "a0254-dry-topsoil-cycle-f04", "a0255-dry-topsoil-cycle-f05"), False),
    ("damp", ("a0257-damp-loam-cycle-f02", "a0258-damp-loam-cycle-f03", "a0259-damp-loam-cycle-f04", "a0260-damp-loam-cycle-f05"), False),
    ("hard", ("a0302-gold-break-cycle-f02", "a0303-gold-break-cycle-f03", "a0304-gold-break-cycle-f04", "a0305-gold-break-cycle-f05"), True),
    ("copper", ("a0277-copper-break-cycle-f02", "a0303-gold-break-cycle-f03", "a0279-copper-break-cycle-f04", "a0280-copper-break-cycle-f05"), True),
    ("bronze", ("a0282-bronze-break-cycle-f02", "a0303-gold-break-cycle-f03", "a0284-bronze-break-cycle-f04", "a0285-bronze-break-cycle-f05"), True),
    ("iron", ("a0287-iron-break-cycle-f02", "a0303-gold-break-cycle-f03", "a0289-iron-break-cycle-f04", "a0290-iron-break-cycle-f05"), True),
    ("steel", ("a0302-gold-break-cycle-f02", "a0293-steel-break-cycle-f03", "a0294-steel-break-cycle-f04", "a0295-steel-break-cycle-f05"), True),
    ("silver", ("a0302-gold-break-cycle-f02", "a0303-gold-break-cycle-f03", "a0299-silver-break-cycle-f04", "a0300-silver-break-cycle-f05"), True),
    ("gold", ("a0302-gold-break-cycle-f02", "a0303-gold-break-cycle-f03", "a0304-gold-break-cycle-f04", "a0305-gold-break-cycle-f05"), False),
    ("lava", ("a0257-damp-loam-cycle-f02", "a0258-damp-loam-cycle-f03", "a0309-lava-soil-break-cycle-f04", "a0310-lava-soil-break-cycle-f05"), False),
    ("obsidian", ("a0302-gold-break-cycle-f02", "a0303-gold-break-cycle-f03", "a0314-obsidian-shatter-cycle-f04", "a0315-obsidian-shatter-cycle-f05"), True),
    ("ember", ("a0322-magma-crystal-break-cycle-f02", "a0318-ember-ore-break-cycle-f03", "a0319-ember-ore-break-cycle-f04", "a0320-ember-ore-break-cycle-f05"), False),
    ("magma", ("a0322-magma-crystal-break-cycle-f02", "a0323-magma-crystal-break-cycle-f03", "a0324-magma-crystal-break-cycle-f04", "a0325-magma-crystal-break-cycle-f05"), False),
    ("crystal", ("a0322-magma-crystal-break-cycle-f02", "a0323-magma-crystal-break-cycle-f03", "a0324-magma-crystal-break-cycle-f04", "a0325-magma-crystal-break-cycle-f05"), True),
    ("geode", ("a0337-geode-heavy-fracture-cycle-f02", "a0338-geode-heavy-fracture-cycle-f03", "a0339-geode-heavy-fracture-cycle-f04", "a0340-geode-heavy-fracture-cycle-f05"), False),
    ("relic", ("a0342-relic-cache-break-effect-cycle-f02", "a0338-geode-heavy-fracture-cycle-f03", "a0344-relic-cache-break-effect-cycle-f04", "a0345-relic-cache-break-effect-cycle-f05"), False),
    ("special", ("a0347-special-block-activation-effect-cycle-f02", "a0323-magma-crystal-break-cycle-f03", "a0349-special-block-activation-effect-cycle-f04", "a0350-special-block-activation-effect-cycle-f05"), False),
)

REVIEW_ROWS = (
    ("DIRT", "dirt", "sprites/backgrounds/world-visual-v2/materials/town-dark-earth-v1.png", 0xFFFFFF),
    ("STONE", "hard", "sprites/backgrounds/world-scenic-facade-v1/level1-shallow-blue-seamless.webp", 0xC7CDD1),
    ("COPPER", "copper", "sprites/backgrounds/world-scenic-facade-v1/level1-silver-core-seamless.webp", 0xD99A6A),
    ("OBSIDIAN", "obsidian", "sprites/backgrounds/world-scenic-facade-v1/level2-future-blackglass-seamless.webp", 0x777487),
    ("MAGMA", "magma", "sprites/backgrounds/world-scenic-facade-v1/level2-current-magma-seamless.webp", 0xFFFFFF),
    ("GEODE", "geode", "sprites/backgrounds/world-scenic-facade-v1/level1-amber-crystal-seamless.webp", 0xFFFFFF),
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    path = Path("C:/Windows/Fonts") / ("segoeuib.ttf" if bold else "segoeui.ttf")
    return ImageFont.truetype(str(path), size) if path.is_file() else ImageFont.load_default()


def neutralize(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    gray = ImageOps.autocontrast(ImageOps.grayscale(image.convert("RGB")), cutoff=0.6)
    gray = ImageEnhance.Brightness(ImageEnhance.Contrast(gray).enhance(1.08)).enhance(1.12)
    rgb = Image.merge("RGB", (gray, gray, gray)).filter(
        ImageFilter.UnsharpMask(radius=0.65, percent=75, threshold=2)
    )
    result = rgb.convert("RGBA")
    result.putalpha(alpha)
    return result


def tint(image: Image.Image, color: int) -> Image.Image:
    red, green, blue, alpha = image.convert("RGBA").split()
    factors = ((color >> 16) & 255, (color >> 8) & 255, color & 255)
    channels = [
        channel.point(lambda value, factor=factor: value * factor // 255)
        for channel, factor in zip((red, green, blue), factors)
    ]
    return Image.merge("RGBA", (*channels, alpha))


def load_and_audit() -> tuple[dict[str, dict], dict[str, Image.Image]]:
    manifest = json.loads(LIBRARY_MANIFEST.read_text(encoding="utf-8"))
    wanted = {asset_id for _, ids, _ in FAMILIES for asset_id in ids}
    records = {record["id"]: record for record in manifest["sources"] if record["id"] in wanted}
    if set(records) != wanted:
        raise AssertionError(f"Missing selected library IDs: {sorted(wanted - set(records))}")
    images = {}
    for asset_id in sorted(wanted):
        record = records[asset_id]
        warnings = list(record.get("masterSpaceQa", {}).get("warnings", []))
        warnings += list(record.get("qa", {}).get("warnings", []))
        if record.get("approvalStatus") != "pending" or warnings:
            raise AssertionError(f"Unsafe source {asset_id}: {record.get('approvalStatus')} {warnings}")
        path = LIBRARY / record["path"]
        if sha256(path) != record["sha256"]:
            raise AssertionError(f"Hash drift for {asset_id}")
        image = Image.open(path).convert("RGBA")
        if image.size != SOURCE_CELL:
            raise AssertionError(f"Unexpected frame size for {asset_id}: {image.size}")
        images[asset_id] = image
    return records, images


def runtime_frame(image: Image.Image, make_neutral: bool) -> Image.Image:
    frame = neutralize(image) if make_neutral else image.copy()
    return ImageOps.contain(frame, CORE_CELL, method=Image.Resampling.LANCZOS)


def components(image: Image.Image) -> list[dict]:
    alpha = image.getchannel("A")
    width, height = image.size
    pixels = alpha.load()
    seen = bytearray(width * height)
    found = []
    for y0 in range(height):
        for x0 in range(width):
            index = y0 * width + x0
            if seen[index] or pixels[x0, y0] <= ALPHA_THRESHOLD:
                continue
            seen[index] = 1
            stack, points, opacity = [(x0, y0)], [], 0
            while stack:
                x, y = stack.pop()
                points.append((x, y))
                opacity += pixels[x, y]
                for ny in range(max(0, y - 1), min(height, y + 2)):
                    for nx in range(max(0, x - 1), min(width, x + 2)):
                        neighbor = ny * width + nx
                        if not seen[neighbor] and pixels[nx, ny] > ALPHA_THRESHOLD:
                            seen[neighbor] = 1
                            stack.append((nx, ny))
            xs, ys = [point[0] for point in points], [point[1] for point in points]
            bounds = (min(xs), min(ys), max(xs) + 1, max(ys) + 1)
            if len(points) >= 10 and bounds[2] - bounds[0] >= 2 and bounds[3] - bounds[1] >= 2:
                found.append({"points": points, "bounds": bounds, "area": len(points), "opacity": opacity})
    found.sort(key=lambda item: (item["opacity"], item["area"]), reverse=True)
    return found[:SHARDS_PER_FAMILY]


def component_cell(image: Image.Image, component: dict) -> Image.Image:
    left, top, right, bottom = component["bounds"]
    piece = Image.new("RGBA", (right - left, bottom - top), (0, 0, 0, 0))
    source, target = image.load(), piece.load()
    for x, y in component["points"]:
        target[x - left, y - top] = source[x, y]
    piece.thumbnail((62, 62), Image.Resampling.LANCZOS)
    cell = Image.new("RGBA", (SHARD_CELL, SHARD_CELL), (0, 0, 0, 0))
    cell.alpha_composite(piece, ((SHARD_CELL - piece.width) // 2, (SHARD_CELL - piece.height) // 2))
    return cell


def build_atlases(images: dict[str, Image.Image]) -> tuple[dict, dict]:
    core = Image.new("RGBA", (CORE_CELL[0] * 4, CORE_CELL[1] * len(FAMILIES)), (0, 0, 0, 0))
    shards = Image.new("RGBA", (SHARD_CELL * SHARDS_PER_FAMILY, SHARD_CELL * len(FAMILIES)), (0, 0, 0, 0))
    core_frames, shard_frames = {}, {}
    for row, (family, asset_ids, make_neutral) in enumerate(FAMILIES):
        frames = [runtime_frame(images[asset_id], make_neutral) for asset_id in asset_ids]
        core_frames[family] = []
        for column, frame in enumerate(frames):
            core.alpha_composite(frame, (column * CORE_CELL[0], row * CORE_CELL[1]))
            core_frames[family].append(f"{family}-p{column + 1:02d}")
        selected = components(images[asset_ids[2]])
        if len(selected) < SHARDS_PER_FAMILY:
            raise AssertionError(f"Only {len(selected)} components found for {family}")
        transformed = neutralize(images[asset_ids[2]]) if make_neutral else images[asset_ids[2]]
        shard_frames[family] = []
        for column, component in enumerate(selected):
            shards.alpha_composite(component_cell(transformed, component), (column * SHARD_CELL, row * SHARD_CELL))
            shard_frames[family].append({
                "name": f"{family}-s{column + 1:02d}",
                "sourceBounds": list(component["bounds"]),
                "sourceArea": component["area"],
            })
    PACKAGE.mkdir(parents=True, exist_ok=True)
    core.save(CORE_ATLAS, "PNG", optimize=True)
    shards.save(SHARD_ATLAS, "PNG", optimize=True)
    return core_frames, shard_frames


def material_panel(path: Path) -> Image.Image:
    sample = ImageOps.fit(Image.open(path).convert("RGB"), (TILE_SIZE, TILE_SIZE), method=Image.Resampling.LANCZOS)
    panel = Image.new("RGBA", (TILE_SIZE * 3, TILE_SIZE * 2), (0, 0, 0, 255))
    for y in range(2):
        for x in range(3):
            panel.paste(sample, (x * TILE_SIZE, y * TILE_SIZE))
    draw = ImageDraw.Draw(panel, "RGBA")
    for x in range(4):
        draw.line((x * TILE_SIZE, 0, x * TILE_SIZE, panel.height), fill=(255, 255, 255, 34))
    for y in range(3):
        draw.line((0, y * TILE_SIZE, panel.width, y * TILE_SIZE), fill=(255, 255, 255, 34))
    return panel


def place_core(panel: Image.Image, atlas: Image.Image, row: int, phase: int, color: int) -> None:
    left, top = phase * CORE_CELL[0], row * CORE_CELL[1]
    cell = atlas.crop((left, top, left + CORE_CELL[0], top + CORE_CELL[1]))
    cell = tint(cell, color).resize((round(TILE_SIZE * 1.08), round(TILE_SIZE * 0.88)), Image.Resampling.LANCZOS)
    panel.alpha_composite(cell, ((panel.width - cell.width) // 2, (panel.height - cell.height) // 2))


def build_review() -> None:
    core, shards = Image.open(CORE_ATLAS).convert("RGBA"), Image.open(SHARD_ATLAS).convert("RGBA")
    label_width, gutter, header = 150, 16, 76
    panel_size = (TILE_SIZE * 3, TILE_SIZE * 2)
    width = label_width + 4 * panel_size[0] + 5 * gutter
    height = header + len(REVIEW_ROWS) * (panel_size[1] + gutter)
    canvas = Image.new("RGB", (width, height), "#080b10")
    draw = ImageDraw.Draw(canvas)
    draw.text((18, 12), "LIBRARY BREAK FX - EXACT 94 PX WORLD SCALE", fill="#f0dfbd", font=font(26, True))
    for column, label in enumerate(("CONTACT", "FRACTURE", "PLAYER-FACING DEPTH", "SETTLE")):
        draw.text((label_width + gutter + column * (panel_size[0] + gutter), 49), label, fill="#a9d6ef", font=font(13, True))
    family_rows = {family: index for index, (family, _, _) in enumerate(FAMILIES)}
    for index, (label, family, background, color) in enumerate(REVIEW_ROWS):
        y, row = header + index * (panel_size[1] + gutter), family_rows[family]
        draw.text((16, y + 78), label, fill="#d9e2ee", font=font(14, True))
        for column, phase in enumerate((0, 1, 2, 3)):
            panel = material_panel(ROOT / background)
            place_core(panel, core, row, phase, color)
            if column == 2:
                for shard_index, (dx, dy, size) in enumerate(((-48, -23, 17), (-29, 26, 22), (-4, -34, 15), (22, 14, 19), (43, -7, 14))):
                    left, top = shard_index * SHARD_CELL, row * SHARD_CELL
                    cell = shards.crop((left, top, left + SHARD_CELL, top + SHARD_CELL))
                    cell = tint(cell, color).resize((size, size), Image.Resampling.LANCZOS)
                    panel.alpha_composite(cell, (panel.width // 2 + dx - size // 2, panel.height // 2 + dy - size // 2))
            x = label_width + gutter + column * (panel_size[0] + gutter)
            canvas.paste(panel.convert("RGB"), (x, y))
    REVIEW.mkdir(parents=True, exist_ok=True)
    canvas.save(REVIEW_SHEET, "PNG", optimize=True)


def write_provenance(records: dict[str, dict], core_frames: dict, shard_frames: dict) -> None:
    selected = sorted({asset_id for _, ids, _ in FAMILIES for asset_id in ids})
    payload = {
        "schemaVersion": 3,
        "date": "2026-08-02",
        "purpose": "complete material-mapped, front-facing tile destruction with perspective shards",
        "promotionAuthority": "User explicitly requested full runtime use of the existing image library.",
        "sourceLibrary": relative(LIBRARY),
        "selectionRule": "zero-warning source frames only; unsafe phases use pinned zero-warning donors",
        "damageStateAssetsChanged": False,
        "selectedSources": [{"id": asset_id, "path": records[asset_id]["path"], "sha256": records[asset_id]["sha256"]} for asset_id in selected],
        "families": [{"name": name, "sourceIds": list(ids), "neutralTintDerivative": neutral} for name, ids, neutral in FAMILIES],
        "runtime": {
            "core": {"path": relative(CORE_ATLAS), "size": list(Image.open(CORE_ATLAS).size), "sha256": sha256(CORE_ATLAS), "frames": core_frames},
            "shards": {"path": relative(SHARD_ATLAS), "size": list(Image.open(SHARD_ATLAS).size), "sha256": sha256(SHARD_ATLAS), "frames": shard_frames},
        },
        "review": {"path": relative(REVIEW_SHEET), "sha256": sha256(REVIEW_SHEET)},
    }
    PROVENANCE.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    records, images = load_and_audit()
    core_frames, shard_frames = build_atlases(images)
    build_review()
    write_provenance(records, core_frames, shard_frames)
    for path in (CORE_ATLAS, SHARD_ATLAS, REVIEW_SHEET, PROVENANCE):
        print(f"Built {relative(path)}")


if __name__ == "__main__":
    main()
