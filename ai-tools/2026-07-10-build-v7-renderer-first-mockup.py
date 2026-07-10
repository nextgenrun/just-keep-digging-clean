from __future__ import annotations

import base64
import copy
import hashlib
import json
import math
import random
import struct
import subprocess
import tempfile
import zlib
from pathlib import Path
from xml.etree import ElementTree as ET

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE_TMX = ROOT / "exports/dig-game-world-edit-v-7-30-06-2026-;layered.tmx"
OUT = ROOT / "exports/visual-gap-analysis/v7-renderer-first-mockup"
PLAYER_SOURCE = ROOT / "sprites/character/character-v8/runtime/idle-cleaned-frames/frame-000.png"
RASTERIZER = Path(r"C:\Program Files\Tiled\tmxrasterizer.exe")

TILE = 94
VIEW_W, VIEW_H = 1920, 1080
CAMERA_X, CAMERA_Y = 6005, 38164
CROP_TILE_X, CROP_TILE_Y = 63, 406
CROP_TILES_W, CROP_TILES_H = 22, 12
CROP_PIXEL_X = CAMERA_X - CROP_TILE_X * TILE
PLAYER_WORLD = (6533, 38916)
PLAYER_SCREEN = (PLAYER_WORLD[0] - CAMERA_X, PLAYER_WORLD[1] - CAMERA_Y)
FORBIDDEN_SOURCE_TOKENS = ("pallet-v10", "v10_08", "v14", "living-drill", "robot-runtime")
FLIP_MASK = 0x1FFFFFFF


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def decode_layer(layer: ET.Element, width: int, height: int) -> list[int]:
    data = layer.find("data")
    if data is None or data.get("encoding") != "base64" or data.get("compression") != "zlib":
        raise ValueError(f"Unsupported layer encoding: {layer.get('name')}")
    raw = zlib.decompress(base64.b64decode(data.text or ""))
    values = list(struct.unpack(f"<{width * height}I", raw))
    return values


def encode_layer(layer: ET.Element, values: list[int]) -> None:
    packed = struct.pack(f"<{len(values)}I", *values)
    encoded = base64.b64encode(zlib.compress(packed, 9)).decode("ascii")
    layer.find("data").text = "\n" + "\n".join(
        encoded[index:index + 76] for index in range(0, len(encoded), 76)
    ) + "\n"


def object_bounds(obj: ET.Element) -> tuple[float, float, float, float]:
    x = float(obj.get("x", "0"))
    y = float(obj.get("y", "0"))
    width = float(obj.get("width", "0"))
    height = float(obj.get("height", "0"))
    if obj.get("gid"):
        return x, y - height, x + width, y
    return x, y, x + width, y + height


def intersects(bounds: tuple[float, float, float, float], clip: tuple[float, float, float, float]) -> bool:
    left, top, right, bottom = bounds
    clip_left, clip_top, clip_right, clip_bottom = clip
    return right > clip_left and left < clip_right and bottom > clip_top and top < clip_bottom


def crop_tmx(destination: Path) -> dict:
    tree = ET.parse(SOURCE_TMX)
    root = tree.getroot()
    source_width, source_height = int(root.get("width")), int(root.get("height"))
    map_x, map_y = CROP_TILE_X * TILE, CROP_TILE_Y * TILE
    visible_clip = (CAMERA_X, CAMERA_Y, CAMERA_X + VIEW_W, CAMERA_Y + VIEW_H)
    used_gids: set[int] = set()
    objects: list[dict] = []

    for layer in root.findall("layer"):
        source = decode_layer(layer, source_width, source_height)
        cropped: list[int] = []
        for row in range(CROP_TILE_Y, CROP_TILE_Y + CROP_TILES_H):
            start = row * source_width + CROP_TILE_X
            cropped.extend(source[start:start + CROP_TILES_W])
        used_gids.update(value & FLIP_MASK for value in cropped if value & FLIP_MASK)
        encode_layer(layer, cropped)
        layer.set("width", str(CROP_TILES_W))
        layer.set("height", str(CROP_TILES_H))

    for group in root.findall("objectgroup"):
        for obj in list(group.findall("object")):
            if not intersects(object_bounds(obj), visible_clip):
                group.remove(obj)
                continue
            obj.set("x", str(float(obj.get("x", "0")) - map_x))
            obj.set("y", str(float(obj.get("y", "0")) - map_y))
            gid = int(obj.get("gid", "0")) & FLIP_MASK
            if gid:
                used_gids.add(gid)
            objects.append({
                "layer": group.get("name", ""),
                "id": int(obj.get("id", "0")),
                "name": obj.get("name", ""),
                "gid": gid,
                "worldX": float(obj.get("x", "0")) + map_x,
                "worldY": float(obj.get("y", "0")) + map_y,
                "displayWidth": float(obj.get("width", "0")),
                "displayHeight": float(obj.get("height", "0")),
            })

    root.set("width", str(CROP_TILES_W))
    root.set("height", str(CROP_TILES_H))
    root.set("infinite", "0")

    tilesets = sorted(
        [(int(node.get("firstgid")), node.get("source", "")) for node in root.findall("tileset")],
        key=lambda item: item[0],
    )
    used_sources: set[str] = set()
    for gid in sorted(used_gids):
        candidates = [entry for entry in tilesets if entry[0] <= gid]
        if candidates:
            used_sources.add(candidates[-1][1])
    forbidden = sorted(
        source for source in used_sources
        if any(token in source.lower() for token in FORBIDDEN_SOURCE_TOKENS)
    )
    if forbidden:
        raise RuntimeError(f"Forbidden v10/v14/discontinued source intersects the camera: {forbidden}")

    tree.write(destination, encoding="utf-8", xml_declaration=True)
    return {
        "usedGids": sorted(used_gids),
        "usedTilesetSources": sorted(used_sources),
        "forbiddenSources": forbidden,
        "visibleObjects": objects,
    }


def premultiplied_resize(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    source = np.asarray(image.convert("RGBA"), dtype=np.float32) / 255.0
    alpha = source[..., 3]
    premultiplied = source[..., :3] * alpha[..., None]
    channels = [
        np.asarray(Image.fromarray(channel, mode="F").resize(size, Image.Resampling.LANCZOS))
        for channel in [*np.moveaxis(premultiplied, 2, 0), alpha]
    ]
    out_alpha = np.clip(channels[3], 0.0, 1.0)
    out_rgb = np.stack(channels[:3], axis=2)
    out_rgb = np.divide(out_rgb, out_alpha[..., None], out=np.zeros_like(out_rgb), where=out_alpha[..., None] > 1e-6)
    out = np.dstack((np.clip(out_rgb, 0.0, 1.0), out_alpha))
    return Image.fromarray(np.uint8(np.round(out * 255.0)), "RGBA")


def add_legacy_player(scene: Image.Image) -> Image.Image:
    player = premultiplied_resize(Image.open(PLAYER_SOURCE), (89, 89))
    x = round(PLAYER_SCREEN[0] - 89 / 2)
    y = round(PLAYER_SCREEN[1] - 89)
    result = scene.copy()
    result.alpha_composite(player, (x, y))
    return result


def radial(width: int, height: int, cx: float, cy: float, sigma: float) -> np.ndarray:
    yy, xx = np.mgrid[0:height, 0:width]
    return np.exp(-((xx - cx) ** 2 + (yy - cy) ** 2) / (2.0 * sigma * sigma))


def build_target(baseline: Image.Image) -> Image.Image:
    detailed = baseline.convert("RGB").filter(ImageFilter.UnsharpMask(radius=1.15, percent=55, threshold=4))
    detailed = ImageEnhance.Contrast(detailed).enhance(1.08)
    detailed = ImageEnhance.Color(detailed).enhance(1.06)
    original = np.asarray(detailed, dtype=np.float32) / 255.0
    lamp = radial(VIEW_W, VIEW_H, PLAYER_SCREEN[0], PLAYER_SCREEN[1] - 38, 270.0)
    chamber = radial(VIEW_W, VIEW_H, 570.0, 535.0, 520.0)
    yy, xx = np.mgrid[0:VIEW_H, 0:VIEW_W]
    edge_distance = np.sqrt(((xx - VIEW_W / 2) / (VIEW_W / 2)) ** 2 + ((yy - VIEW_H / 2) / (VIEW_H / 2)) ** 2)
    vignette = 1.0 - 0.24 * np.clip((edge_distance - 0.43) / 0.77, 0.0, 1.0) ** 1.65
    light = np.clip(0.43 + 0.52 * lamp + 0.12 * chamber, 0.43, 1.0) * vignette
    rgb = original * light[..., None]

    luminance = rgb[..., 0] * 0.2126 + rgb[..., 1] * 0.7152 + rgb[..., 2] * 0.0722
    shadow = (1.0 - luminance) ** 2 * (1.0 - lamp) * 0.10
    rgb[..., 0] -= shadow * 0.025
    rgb[..., 1] += shadow * 0.045
    rgb[..., 2] += shadow * 0.075
    fog_alpha = (1.0 - lamp) * (0.035 + 0.055 * (1.0 - yy / VIEW_H))
    fog_color = np.array([0.025, 0.095, 0.125], dtype=np.float32)
    rgb = rgb * (1.0 - fog_alpha[..., None]) + fog_color * fog_alpha[..., None]
    warm = np.dstack((lamp * 0.15, lamp * 0.072, lamp * 0.018))
    rgb = 1.0 - (1.0 - np.clip(rgb, 0.0, 1.0)) * (1.0 - warm)

    maximum = original.max(axis=2)
    minimum = original.min(axis=2)
    emissive_mask = np.clip((maximum - minimum - 0.20) * 2.8, 0.0, 1.0) * np.clip((maximum - 0.28) * 1.8, 0.0, 1.0)
    emissive = np.uint8(np.clip(original * emissive_mask[..., None] * 255.0, 0.0, 255.0))
    bloom = Image.fromarray(emissive, "RGB").filter(ImageFilter.GaussianBlur(15.0))
    bloom_array = np.asarray(bloom, dtype=np.float32) / 255.0 * 0.72
    rgb = 1.0 - (1.0 - np.clip(rgb, 0.0, 1.0)) * (1.0 - bloom_array)
    target = Image.fromarray(np.uint8(np.clip(rgb, 0.0, 1.0) * 255.0), "RGB").convert("RGBA")

    atmosphere = Image.new("RGBA", (VIEW_W, VIEW_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(atmosphere)
    draw.ellipse((160, 210, 1110, 890), fill=(20, 145, 170, 20))
    draw.ellipse((PLAYER_SCREEN[0] - 300, PLAYER_SCREEN[1] - 270, PLAYER_SCREEN[0] + 300, PLAYER_SCREEN[1] + 110), fill=(255, 167, 72, 17))
    atmosphere = atmosphere.filter(ImageFilter.GaussianBlur(78))
    target = Image.alpha_composite(target, atmosphere)

    particles = Image.new("RGBA", (VIEW_W, VIEW_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(particles)
    rng = random.Random(5607)
    for _ in range(34):
        x = rng.randint(110, 1320)
        y = rng.randint(220, 870)
        radius = rng.choice((1, 1, 1, 2))
        color = rng.choice(((104, 221, 229, 48), (255, 194, 108, 42), (174, 131, 255, 38)))
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=color)
    for _ in range(18):
        x = int(rng.gauss(PLAYER_SCREEN[0], 54))
        y = int(rng.gauss(PLAYER_SCREEN[1] - 3, 8))
        radius = rng.choice((1, 2, 3))
        draw.ellipse((x - radius * 2, y - radius, x + radius * 2, y + radius), fill=(211, 171, 118, 48))
    particles = particles.filter(ImageFilter.GaussianBlur(0.55))
    return Image.alpha_composite(target, particles)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    path = Path(r"C:\Windows\Fonts\seguisb.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf")
    return ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default()


def add_target_tag(image: Image.Image) -> Image.Image:
    tagged = image.copy()
    draw = ImageDraw.Draw(tagged, "RGBA")
    label = "VISUAL TARGET MOCKUP — NOT RUNTIME PROOF"
    label_font = font(22, True)
    box = draw.textbbox((0, 0), label, font=label_font)
    width = box[2] - box[0]
    x, y = VIEW_W - width - 44, VIEW_H - 54
    draw.rounded_rectangle((x - 15, y - 7, VIEW_W - 20, VIEW_H - 18), radius=8, fill=(5, 9, 13, 210), outline=(73, 218, 219, 155), width=1)
    draw.text((x, y), label, font=label_font, fill=(229, 242, 242, 255))
    return tagged


def build_comparison(current: Image.Image, target: Image.Image) -> Image.Image:
    header = 96
    canvas = Image.new("RGB", (VIEW_W * 2, VIEW_H + header), (8, 12, 17))
    canvas.paste(current.convert("RGB"), (0, header))
    canvas.paste(target.convert("RGB"), (VIEW_W, header))
    draw = ImageDraw.Draw(canvas)
    draw.text((34, 22), "CURRENT V7 — EXACT TMX CAMERA", font=font(34, True), fill=(225, 231, 234))
    draw.text((VIEW_W + 34, 22), "OPTIMIZED RENDERER TARGET", font=font(34, True), fill=(123, 239, 230))
    footer = "VISUAL TARGET MOCKUP — NOT RUNTIME PROOF • IDENTICAL GEOMETRY / CAMERA / LEGACY POSE"
    footer_font = font(18, True)
    footer_box = draw.textbbox((0, 0), footer, font=footer_font)
    draw.text(((VIEW_W * 2 - (footer_box[2] - footer_box[0])) / 2, 69), footer, font=footer_font, fill=(154, 166, 173))
    draw.line((VIEW_W, header, VIEW_W, VIEW_H + header), fill=(105, 235, 225), width=2)
    return canvas


def build_geometry_wipe(current: Image.Image, target: Image.Image) -> Image.Image:
    wipe = current.copy()
    band = 160
    for x in range(0, VIEW_W, band * 2):
        wipe.paste(target.crop((x, 0, min(x + band, VIEW_W), VIEW_H)), (x, 0))
    draw = ImageDraw.Draw(wipe, "RGBA")
    draw.rounded_rectangle((25, 22, 770, 75), radius=8, fill=(5, 9, 13, 220), outline=(102, 231, 222, 150), width=1)
    draw.text((43, 34), "ALTERNATING TARGET / CURRENT — SAME PIXEL COORDINATES", font=font(22, True), fill=(232, 241, 242, 255))
    return wipe


def main() -> None:
    if not RASTERIZER.is_file():
        raise FileNotFoundError(f"Missing Tiled rasterizer: {RASTERIZER}")
    OUT.mkdir(parents=True, exist_ok=True)
    temp_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(prefix="v7-mockup-crop-", suffix=".tmx", dir=SOURCE_TMX.parent, delete=False) as handle:
            temp_path = Path(handle.name)
        source_audit = crop_tmx(temp_path)
        raw_path = OUT / "_tiled-camera-raw.png"
        subprocess.run([str(RASTERIZER), str(temp_path), str(raw_path)], check=True)
        raw = Image.open(raw_path).convert("RGBA")
        if raw.width < CROP_PIXEL_X + VIEW_W or raw.height < VIEW_H:
            raise RuntimeError(f"Unexpected Tiled render size: {raw.size}")
        camera = raw.crop((CROP_PIXEL_X, 0, CROP_PIXEL_X + VIEW_W, VIEW_H))
        base = Image.new("RGBA", (VIEW_W, VIEW_H), (5, 8, 12, 255))
        base.alpha_composite(camera)
        current = add_legacy_player(base)
        target = build_target(current)

        current_path = OUT / "current-v7-actual-scale.png"
        target_path = OUT / "optimized-target.png"
        comparison_path = OUT / "ab-comparison.png"
        wipe_path = OUT / "geometry-wipe.png"
        current.save(current_path, optimize=True)
        add_target_tag(target).save(target_path, optimize=True)
        build_comparison(current, target).save(comparison_path, optimize=True)
        build_geometry_wipe(current, target).save(wipe_path, optimize=True)
        raw_path.unlink(missing_ok=True)

        outputs = [current_path, target_path, comparison_path, wipe_path]
        final_alpha = np.asarray(target.getchannel("A"))
        qa = {
            "pass": bool(final_alpha.min() == 255 and not source_audit["forbiddenSources"]),
            "viewport": [VIEW_W, VIEW_H],
            "geometry": {
                "cameraDisplacementPx": 0,
                "worldOrActorSpatialTransformsInTarget": 0,
                "targetDerivedFromExactBaselinePixels": True,
                "intentionalNewBuffer": "procedural atmosphere and particles only",
            },
            "alpha": {"targetMin": int(final_alpha.min()), "targetMax": int(final_alpha.max()), "fullyOpaqueDelivery": True},
            "scale": {
                "tmxRasterScale": 1.0,
                "targetResize": False,
                "legacyResize": "341x341 -> 89x89 premultiplied-alpha downscale",
                "additionalAssetUpscaling": False,
                "authoredV7RoundingTolerance": "bg_040 visible edge is 1.007x width; no target-side enlargement",
            },
            "contamination": {
                "chromaKeyUsed": False,
                "greenScreenSourceUsed": False,
                "forbiddenV10V14Sources": source_audit["forbiddenSources"],
            },
            "outputSha256": {path.name: sha256(path) for path in outputs},
        }
        (OUT / "qa-report.json").write_text(json.dumps(qa, indent=2) + "\n", encoding="utf-8")

        manifest = {
            "schemaVersion": 1,
            "status": "visual target mockup - not runtime proof",
            "source": {"tmx": SOURCE_TMX.relative_to(ROOT).as_posix(), "sha256": sha256(SOURCE_TMX)},
            "selection": "Endcore flank: native-safe 100% gameplay crop without the low-resolution vine arch",
            "camera": {"worldTopLeft": [CAMERA_X, CAMERA_Y], "viewport": [VIEW_W, VIEW_H], "scale": 1.0},
            "legacyMiner": {
                "source": PLAYER_SOURCE.relative_to(ROOT).as_posix(),
                "frame": 0,
                "sourceCanvas": [341, 341],
                "displayCanvas": [89, 89],
                "origin": [0.5, 1.0],
                "worldAnchor": list(PLAYER_WORLD),
                "screenAnchor": list(PLAYER_SCREEN),
                "flipX": False,
            },
            "effects": [
                "premultiplied-alpha legacy downsampling",
                "cool darkness hierarchy with local miner light",
                "color-selected emissive bloom from existing pixels",
                "background depth fog and restrained vignette",
                "material-local contrast",
                "deterministic atmospheric motes and contact dust",
            ],
            "imageGeneration": {
                "used": False,
                "reason": "Optional generation was deliberately skipped because deterministic code-native masks preserve TMX geometry and avoid chroma leakage.",
            },
            "sourceAudit": source_audit,
            "runtimeFilesModified": False,
            "outputs": [path.relative_to(ROOT).as_posix() for path in outputs],
        }
        (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({"ok": qa["pass"], "output": str(OUT), "camera": [CAMERA_X, CAMERA_Y]}, indent=2))
    finally:
        if temp_path is not None:
            temp_path.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
