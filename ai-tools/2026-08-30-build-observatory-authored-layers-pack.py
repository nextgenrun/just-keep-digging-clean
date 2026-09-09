"""Build the review-only Observatory V3 pack from independently authored sources."""

from __future__ import annotations

import hashlib
import json
from collections import deque
from pathlib import Path
from runpy import run_path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
REVIEW = ROOT / "testing/animation-sandbox/2026-08-30-observatory-authored-layers-v3"
SOURCE = REVIEW / "pack/source"
PACK = REVIEW / "pack"
REFERENCE = ROOT / "sprites/backgrounds/world-visual-v2/far/sky-cohesion-v1/2026-07-28-sky-13-level2-lower-iron-forge-haze-v1.webp"
TOWN_VIDEO = ROOT / "sprites/backgrounds/start-zone-scenic-v1/living-background-v1/surface-town-air-v1.mp4"
REFERENCE_SHA = "a1d6bf7b7f945bf1baf4f9c846c9ba7d9c44231d5804fcaa945c581e5c45e029"
TOWN_SHA = "1650f7a88e2445ef9ab1be954680e4a8d5ffb51b2ccd8e7def5bec19726132d6"
SIZE = (1672, 941)
CHROMA_MATTE_FLOOR = 0.05
MODULE_GRIDS = {"upper": (6, 2), "horizon": (10, 2), "lower": (7, 2), "near": (7, 2)}
ATLAS_TOOLS = run_path(str(Path(__file__).with_name("2026_08_30_observatory_module_atlas.py")))
BUILD_CLOUD_ATLAS = ATLAS_TOOLS["build_cloud_atlas"]
BUILD_BOX_ATLAS = ATLAS_TOOLS["build_box_atlas"]
BUILD_INTERIOR_LIFE = run_path(str(Path(__file__).with_name("2026_08_30_observatory_interior_life_atlas.py")))["build_interior_life_atlas"]

SOURCES = {
    "sky": "sky-base-source-v3.png",
    "upper": "upper-cloud-crown-chroma-source-v3.png",
    "horizon": "horizon-wisps-chroma-source-v3.png",
    "lower": "lower-cloud-sea-source-v3.png",
    "near": "near-fog-chroma-source-v3.png",
    "architecture": "architecture-unlit-chroma-source-v3.png",
    "architectureLit": "architecture-lit-chroma-source-v3.png",
}

OUTPUTS = {
    "sky": "sky-base-v3.png",
    "stars": "sky-stars-v4.png",
    "upper": "upper-cloud-crown-v3.png",
    "horizon": "horizon-wisps-v3.png",
    "lower": "lower-cloud-sea-v3.png",
    "near": "near-fog-v3.png",
    "architecture": "architecture-unlit-v3.png",
    "emissive": "architecture-emissive-ids-v4.png",
    "lightIds": "architecture-light-ids-v3.png",
    "layerReview": "layer-review-v3.png",
    "composite": "static-composite-v3.png",
    "comparison": "reference-vs-authored-v3.png",
}

GRADES = {
    "sky": (0.82, 0.60, (0.78, 0.88, 1.00)),
    "upper": (0.48, 0.52, (0.70, 0.83, 1.00)),
    "horizon": (0.42, 0.46, (0.72, 0.84, 1.00)),
    "lower": (0.46, 0.50, (0.70, 0.82, 1.00)),
    "near": (0.34, 0.48, (0.68, 0.80, 1.00)),
    "architecture": (0.66, 0.52, (0.72, 0.84, 1.00)),
}

def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def open_rgba(path: Path) -> Image.Image:
    image = Image.open(path).convert("RGBA")
    if image.size != SIZE:
        raise ValueError(f"{path.name}: expected {SIZE}, got {image.size}")
    return image


def green_key(path: Path) -> Image.Image:
    rgb = np.asarray(Image.open(path).convert("RGB"), dtype=np.float32) / 255.0
    red, green, blue = (rgb[:, :, index] for index in range(3))
    dominance = green - np.maximum(red, blue)
    key = np.clip((dominance - 0.035) / 0.70, 0.0, 1.0)
    key *= np.clip((green - 0.42) / 0.58, 0.0, 1.0)
    alpha = 1.0 - key
    safe = np.maximum(alpha, 0.035)
    clean = np.empty_like(rgb)
    clean[:, :, 0] = red / safe
    clean[:, :, 1] = (green - (1.0 - alpha)) / safe
    clean[:, :, 2] = blue / safe
    clean = np.clip(clean, 0.0, 1.0)
    clean[:, :, 1] = np.minimum(clean[:, :, 1], clean[:, :, 2] * 0.86 + clean[:, :, 0] * 0.14 + 0.01)
    alpha_image = Image.fromarray(np.uint8(np.clip(alpha * 255.0, 0, 255)), "L").filter(ImageFilter.GaussianBlur(0.65))
    clean_alpha = np.asarray(alpha_image, dtype=np.float32) / 255.0
    clean_alpha = np.clip((clean_alpha - CHROMA_MATTE_FLOOR) / (1.0 - CHROMA_MATTE_FLOOR), 0.0, 1.0)
    rgba = np.dstack((np.uint8(clean * 255.0), np.uint8(clean_alpha * 255.0)))
    rgba[rgba[:, :, 3] < 3] = 0
    return Image.fromarray(rgba, "RGBA")


def grade(image: Image.Image, profile: tuple[float, float, tuple[float, float, float]]) -> Image.Image:
    brightness, saturation, tint = profile
    rgba = np.asarray(image.convert("RGBA"), dtype=np.float32) / 255.0
    rgb = rgba[:, :, :3]
    luma = rgb[:, :, 0:1] * 0.2126 + rgb[:, :, 1:2] * 0.7152 + rgb[:, :, 2:3] * 0.0722
    rgb = (luma + (rgb - luma) * saturation) * brightness
    rgb *= np.asarray(tint, dtype=np.float32)
    rgba[:, :, :3] = np.clip(rgb, 0.0, 1.0)
    return Image.fromarray(np.uint8(rgba * 255.0), "RGBA")


def connected_components(mask: np.ndarray, minimum_pixels: int = 10) -> list[list[tuple[int, int]]]:
    height, width = mask.shape
    visited = np.zeros_like(mask, dtype=np.bool_)
    components: list[list[tuple[int, int]]] = []
    for y, x in zip(*np.nonzero(mask)):
        if visited[y, x]:
            continue
        queue = deque([(int(y), int(x))])
        visited[y, x] = True
        component: list[tuple[int, int]] = []
        while queue:
            current_y, current_x = queue.popleft()
            component.append((current_y, current_x))
            for next_y in range(max(0, current_y - 1), min(height, current_y + 2)):
                for next_x in range(max(0, current_x - 1), min(width, current_x + 2)):
                    if mask[next_y, next_x] and not visited[next_y, next_x]:
                        visited[next_y, next_x] = True
                        queue.append((next_y, next_x))
        if len(component) >= minimum_pixels:
            components.append(component)
    return components


def build_stars(sky: Image.Image) -> tuple[Image.Image, Image.Image, int]:
    rgb = np.asarray(sky.convert("RGB"), dtype=np.float32) / 255.0
    luma = rgb[:, :, 0] * 0.2126 + rgb[:, :, 1] * 0.7152 + rgb[:, :, 2] * 0.0722
    blurred = np.asarray(Image.fromarray(np.uint8(luma * 255.0), "L").filter(ImageFilter.GaussianBlur(2.4)), dtype=np.float32) / 255.0
    detail = np.maximum(luma - blurred, 0.0)
    candidates = (detail > 0.045) & (luma > 0.07)
    ranked = []
    for component in connected_components(candidates, minimum_pixels=1):
        ys, xs = zip(*component)
        width = max(xs) - min(xs) + 1
        height = max(ys) - min(ys) + 1
        if len(component) <= 48 and width <= 10 and height <= 10:
            score = float(detail[np.asarray(ys), np.asarray(xs)].sum())
            ranked.append((score, component))
    ranked.sort(key=lambda item: item[0], reverse=True)
    stars = np.zeros((*luma.shape, 4), dtype=np.float32)
    selected = ranked[:900]
    removal = np.zeros_like(luma, dtype=np.float32)
    for index, (_, component) in enumerate(selected, start=1):
        component_mask = np.zeros_like(luma, dtype=np.float32)
        ys, xs = zip(*component)
        component_mask[np.asarray(ys), np.asarray(xs)] = np.clip(detail[np.asarray(ys), np.asarray(xs)] * 5.0, 0.20, 1.0)
        halo = np.asarray(Image.fromarray(np.uint8(component_mask * 255.0), "L").filter(ImageFilter.GaussianBlur(1.15)), dtype=np.float32) / 255.0
        alpha = np.maximum(component_mask, halo * 0.72)
        candidate = alpha > stars[:, :, 3]
        stars[candidate, 0] = ((index * 67) % 251 + 1) / 255.0
        stars[candidate, 1:3] = 0.0
        stars[:, :, 3] = np.maximum(stars[:, :, 3], alpha)
        removal = np.maximum(removal, alpha)
    removal_image = Image.fromarray(np.uint8(removal * 255.0), "L").filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1.6))
    removal = np.asarray(removal_image, dtype=np.float32)[:, :, None] / 255.0
    soft_sky = np.asarray(sky.convert("RGB").filter(ImageFilter.GaussianBlur(4.2)), dtype=np.float32) / 255.0
    starless_rgb = rgb * (1.0 - removal) + soft_sky * removal
    starless = Image.fromarray(np.uint8(np.clip(starless_rgb, 0.0, 1.0) * 255.0), "RGB").convert("RGBA")
    return starless, Image.fromarray(np.uint8(np.clip(stars, 0.0, 1.0) * 255.0), "RGBA"), len(selected)


def build_emissive(lit: Image.Image) -> tuple[Image.Image, Image.Image, int]:
    rgba = np.asarray(lit, dtype=np.float32) / 255.0
    red, green, blue, source_alpha = (rgba[:, :, index] for index in range(4))
    warm = np.clip((red - blue - 0.045) / 0.34, 0.0, 1.0)
    warm *= np.clip((green - blue - 0.015) / 0.24, 0.0, 1.0)
    warm *= np.clip((red - 0.18) / 0.38, 0.0, 1.0) * source_alpha
    core = Image.fromarray(np.uint8(warm * 255.0), "L")
    joined = np.asarray(core.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))) > 20
    components = connected_components(joined, minimum_pixels=2)
    components = [component for component in components if len(component) <= 500 and max(x for y, x in component) - min(x for y, x in component) < 40 and max(y for y, x in component) - min(y for y, x in component) < 60]
    components.sort(key=lambda component: (min(y for y, x in component), min(x for y, x in component)))
    emission = np.zeros((*warm.shape, 4), dtype=np.float32)
    light_ids = np.zeros((*warm.shape, 4), dtype=np.uint8)
    for index, component in enumerate(components, start=1):
        component_mask = np.zeros_like(warm, dtype=np.uint8)
        ys, xs = zip(*component)
        component_mask[np.asarray(ys), np.asarray(xs)] = 255
        component_core = np.asarray(Image.fromarray(component_mask, "L")) > 0
        local_core = np.where(component_core, warm, 0.0)
        halo = np.asarray(Image.fromarray(np.uint8(local_core * 255.0), "L").filter(ImageFilter.GaussianBlur(4.2)), dtype=np.float32) / 255.0
        alpha = np.maximum(local_core, halo * 0.68)
        candidate = alpha > emission[:, :, 3]
        emission[candidate, 0] = ((index * 67) % 251 + 1) / 255.0
        emission[candidate, 1:3] = 0.0
        emission[:, :, 3] = np.maximum(emission[:, :, 3], alpha)
        id_colour = ((index * 67) % 251 + 1, (index * 113) % 251 + 1, (index * 173) % 251 + 1, 255)
        id_region = alpha > 0.015
        light_ids[id_region] = id_colour
    return Image.fromarray(np.uint8(np.clip(emission, 0, 1) * 255), "RGBA"), Image.fromarray(light_ids, "RGBA"), len(components)


def colourize(encoded: Image.Image, colour: tuple[int, int, int]) -> Image.Image:
    alpha = np.asarray(encoded.convert("RGBA"))[:, :, 3]
    rgba = np.zeros((*alpha.shape, 4), dtype=np.uint8)
    rgba[:, :, :3] = np.array(colour, dtype=np.uint8)
    rgba[:, :, 3] = alpha
    return Image.fromarray(rgba, "RGBA")


def checkerboard() -> Image.Image:
    tile = 24
    yy, xx = np.indices((SIZE[1], SIZE[0]))
    field = ((xx // tile + yy // tile) % 2)[:, :, None]
    low = np.array([11, 17, 26], dtype=np.uint8)
    high = np.array([18, 27, 39], dtype=np.uint8)
    return Image.fromarray(np.where(field == 0, low, high).astype(np.uint8), "RGB").convert("RGBA")


def make_layer_review(layers: dict[str, Image.Image]) -> Image.Image:
    canvas = Image.new("RGB", SIZE, "#050912")
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 24)
    cell_width, cell_height = SIZE[0] // 3, SIZE[1] // 2
    for index, (label, image) in enumerate(layers.items()):
        cell = checkerboard()
        cell.alpha_composite(image)
        cell.thumbnail((cell_width - 20, cell_height - 52), Image.Resampling.LANCZOS)
        x = (index % 3) * cell_width + (cell_width - cell.width) // 2
        y = (index // 3) * cell_height + 42
        canvas.paste(cell.convert("RGB"), (x, y))
        draw.text(((index % 3) * cell_width + 14, (index // 3) * cell_height + 10), label, fill="#bfe6ff", font=font)
    return canvas


def main() -> None:
    PACK.mkdir(parents=True, exist_ok=True)
    if sha256(REFERENCE) != REFERENCE_SHA or sha256(TOWN_VIDEO) != TOWN_SHA:
        raise RuntimeError("Reference or protected Town Square source hash changed.")
    layers = {
        "sky": grade(open_rgba(SOURCE / SOURCES["sky"]), GRADES["sky"]),
        "upper": grade(green_key(SOURCE / SOURCES["upper"]), GRADES["upper"]),
        "horizon": grade(green_key(SOURCE / SOURCES["horizon"]), GRADES["horizon"]),
        "lower": grade(open_rgba(SOURCE / SOURCES["lower"]), GRADES["lower"]),
        "near": grade(green_key(SOURCE / SOURCES["near"]), GRADES["near"]),
        "architecture": grade(green_key(SOURCE / SOURCES["architecture"]), GRADES["architecture"]),
    }
    lit = green_key(SOURCE / SOURCES["architectureLit"])
    layers["sky"], stars, star_count = build_stars(layers["sky"])
    emissive, light_ids, light_count = build_emissive(lit)
    cloud_modules = {
        key: BUILD_CLOUD_ATLAS(layers[key], key, *MODULE_GRIDS[key], PACK)
        for key in ("upper", "horizon", "lower", "near")
    }
    for module_pack in cloud_modules.values():
        module_pack["textureSha256"] = sha256(PACK / module_pack["texturePath"])
        module_pack["atlasSha256"] = sha256(PACK / module_pack["atlasPath"])
    architecture_alpha = np.asarray(layers["architecture"])[:, :, 3]
    architecture_components = [component for component in connected_components(architecture_alpha > 6, minimum_pixels=1) if len(component) > 80]
    architecture_components.sort(key=lambda component: min(x for y, x in component))
    boxes = []
    for component in architecture_components:
        ys, xs = zip(*component)
        boxes.append((max(0, min(xs) - 14), max(0, min(ys) - 14), min(SIZE[0], max(xs) + 15), min(SIZE[1], max(ys) + 15)))
    architecture_modules = BUILD_BOX_ATLAS(layers["architecture"], "architecture", "architecture-unlit", boxes, PACK)
    emissive_modules = BUILD_BOX_ATLAS(emissive, "architecture", "architecture-emissive", boxes, PACK)
    architecture_modules.update({
        "emissiveTexturePath": emissive_modules["texturePath"],
        "emissiveAtlasPath": emissive_modules["atlasPath"],
        "textureSha256": sha256(PACK / architecture_modules["texturePath"]),
        "atlasSha256": sha256(PACK / architecture_modules["atlasPath"]),
        "emissiveTextureSha256": sha256(PACK / emissive_modules["texturePath"]),
        "emissiveAtlasSha256": sha256(PACK / emissive_modules["atlasPath"]),
    })
    interior_life = BUILD_INTERIOR_LIFE(ROOT, PACK)
    runtime = {**layers, "stars": stars, "emissive": emissive, "lightIds": light_ids}
    for key, image in runtime.items():
        image.save(PACK / OUTPUTS[key], optimize=True)
    composite = Image.new("RGBA", SIZE)
    for key in ("sky", "stars", "upper", "horizon", "lower", "architecture", "emissive", "near"):
        layer = colourize(runtime[key], (255, 128, 26)) if key == "emissive" else colourize(runtime[key], (180, 215, 255)) if key == "stars" else runtime[key]
        composite.alpha_composite(layer)
    composite.convert("RGB").save(PACK / OUTPUTS["composite"], optimize=True)
    make_layer_review({key: layers[key] for key in ("sky", "upper", "horizon", "lower", "architecture", "near")}).save(PACK / OUTPUTS["layerReview"], optimize=True)
    comparison = Image.new("RGB", (SIZE[0] * 2, SIZE[1]), "black")
    comparison.paste(Image.open(REFERENCE).convert("RGB"), (0, 0))
    comparison.paste(composite.convert("RGB"), (SIZE[0], 0))
    comparison.save(PACK / OUTPUTS["comparison"], optimize=True)
    manifest = {
        "version": "observatory-authored-layers-v3",
        "reviewOnly": True,
        "runtimePixelReuseFromReference": False,
        "reference": {"path": str(REFERENCE.relative_to(ROOT)).replace("\\", "/"), "sha256": REFERENCE_SHA, "referenceOnly": True, "runtimePixelDonor": False},
        "sourceAuthority": "seven independently authored built-in ImageGen sources plus existing canonical character animation donors",
        "sources": {key: {"path": f"source/{name}", "sha256": sha256(SOURCE / name)} for key, name in SOURCES.items()},
        "outputs": {key: {"path": name, "sha256": sha256(PACK / name)} for key, name in OUTPUTS.items()},
        "cloudModules": cloud_modules,
        "architectureModules": architecture_modules,
        "interiorLife": interior_life,
        "decomposition": {"cloudLayerCount": 4, "cloudModuleCount": sum(len(pack["modules"]) for pack in cloud_modules.values()), "architectureModuleCount": len(architecture_modules["modules"]), "architectureUnlit": True, "architectureStatic": False, "lightsSeparated": True, "lightClusterCount": light_count, "starCount": star_count, "interiorAnimationCount": len(interior_life["animations"])},
        "townSquareGuard": {"path": str(TOWN_VIDEO.relative_to(ROOT)).replace("\\", "/"), "sha256": TOWN_SHA, "modified": False},
    }
    (PACK / "manifest-v3.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"cloudModules": sum(len(pack["modules"]) for pack in cloud_modules.values()), "architectureModules": len(architecture_modules["modules"]), "stars": star_count, "individualLights": light_count, "runtimePixelReuse": False, "townVideoModified": False}, indent=2))


if __name__ == "__main__":
    main()
