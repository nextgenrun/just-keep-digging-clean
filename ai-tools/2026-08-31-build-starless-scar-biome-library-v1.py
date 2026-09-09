"""Package twenty authored Starless Scar biome kits for demand streaming."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "sprites" / "environment" / "starless-scar-biomes-v1"
SOURCE_ROOT = ASSET_ROOT / "source"
RUNTIME_ROOT = ASSET_ROOT / "runtime"
SPEC_PATH = ASSET_ROOT / "source-spec-v1.json"
PROMPT_PATH = ASSET_ROOT / "imagegen-prompts-v1.md"
MANIFEST_PATH = ASSET_ROOT / "manifest-v1.json"
CONTACT_PATH = ASSET_ROOT / "starless-scar-biome-library-contact-v1.jpg"
SOURCE_SIZE = (1254, 1254)
GROUND_SIZE = (512, 512)
DECAL_SIZE = (512, 512)
PROP_FRAME_SIZE = (256, 256)
QUADRANT = 627


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def exact_prompt(entry: dict[str, object]) -> str:
    props = ", ".join(str(value) for value in entry["props"])
    return "\n".join((
        "Use case: stylized-concept",
        "Asset type: production game-environment sprite kit for one Starless "
        "Scar darkness biome palette",
        f"Primary request: create the {entry['promptName']} Star-corruption kit "
        f"for UNDERSTAR's {entry['biomeLabel']} underground biome: "
        f"{entry['materialRequest']}.",
        "Composition/framing: one perfectly square sprite-kit canvas in an exact "
        "clean 2 by 2 layout with equal quadrants and generous transparent gutters. "
        "TOP LEFT: fully opaque square seamless orthographic top-down walkable ground "
        "with broad low-frequency footing plates. TOP RIGHT: isolated compact dead-Star "
        "center crater/ring decal. BOTTOM LEFT: isolated horizontal spreading-frontier "
        "strip, left/right tileable, material below and transparency above. BOTTOM "
        f"RIGHT: four separate small overlay prop clusters with generous spacing: {props}.",
        "Style/medium: polished realistic dark-fantasy 2D game environment sprites, "
        "exact orthographic/top-down ground language, highly authored material detail, "
        "game-ready.",
        "Lighting/mood: subdued overhead ambient light, readable shallow relief, dead "
        "and exhausted rather than bright or magical.",
        f"Color palette: {entry['colors']}.",
        "Transparency: true transparent canvas outside each isolated role; top-left "
        "ground swatch alone is opaque full coverage.",
        "Constraints: no text, labels, letters, grid lines, UI, player, active Star, "
        "resource ore icons, perspective floor, side-view cliff, giant crystals, deep "
        "holes, watermark. Keep every role wholly inside its quadrant with no overlap "
        "across gutters.",
    ))


def write_prompts(entries: list[dict[str, object]]) -> None:
    lines = [
        "# Starless Scar biome kit ImageGen prompts V1", "",
        "Generation mode: built-in ImageGen, one independent call per palette.", "",
    ]
    for entry in entries:
        lines.extend((f"## {entry['id']}", "", "```text", exact_prompt(entry),
                      "```", ""))
    PROMPT_PATH.write_text("\n".join(lines), encoding="utf-8")


def extract_light_checker_alpha(image: Image.Image) -> Image.Image:
    rgb = np.asarray(image.convert("RGB"), dtype=np.uint8)
    minimum = rgb.min(axis=2)
    maximum = rgb.max(axis=2)
    chroma = maximum - minimum
    # The two legacy RGB boards contain a baked checker throughout the open
    # spaces inside their spiky silhouettes. Treat every near-white checker
    # cell as matte, not only the cells connected to the canvas border.
    background = (minimum >= 214) & (chroma <= 24)
    fringe = (minimum >= 174) & (chroma <= 34)
    for _ in range(4):
        neighbors = np.zeros_like(background)
        neighbors[1:] |= background[:-1]
        neighbors[:-1] |= background[1:]
        neighbors[:, 1:] |= background[:, :-1]
        neighbors[:, :-1] |= background[:, 1:]
        background |= fringe & neighbors
    alpha = np.where(background, 0, 255).astype(np.uint8)
    # Keep this key hard at source resolution. The later premultiplied resize
    # supplies antialiasing from foreground colors without reviving the matte.
    alpha_image = Image.fromarray(alpha, "L")
    opacity = np.asarray(alpha_image, dtype=np.float32) / 255.0
    matte = np.median(rgb[background], axis=0).astype(np.float32)
    corrected = (
        rgb.astype(np.float32) - (1 - opacity[..., None]) * matte[None, None, :]
    ) / np.maximum(opacity[..., None], 0.035)
    corrected = np.clip(corrected, 0, 255).astype(np.uint8)
    corrected[opacity <= 0] = 0
    return Image.fromarray(np.dstack((corrected, np.asarray(alpha_image))), "RGBA")


def source_rgba(path: Path) -> tuple[Image.Image, str]:
    opened = Image.open(path)
    if opened.size != SOURCE_SIZE:
        raise RuntimeError(f"{path.name}: expected {SOURCE_SIZE}, got {opened.size}")
    rgba = opened.convert("RGBA")
    extrema = rgba.getchannel("A").getextrema()
    if extrema[0] < 255:
        return rgba, "native-rgba"
    return extract_light_checker_alpha(opened), "global-light-checker-cleanup"


def seamless_ground(source: Image.Image) -> Image.Image:
    # ImageGen can leave a narrow matte just inside a board edge. The 28 px
    # authored gutter removes that packaging residue before the toroidal blend.
    ground = source.crop((28, 28, QUADRANT - 28, QUADRANT - 28)).convert("RGB")
    ground = ground.resize(GROUND_SIZE, Image.Resampling.LANCZOS)
    pixels = np.asarray(ground, dtype=np.float32).copy()
    feather = 56
    for index in range(feather):
        ratio = index / max(1, feather - 1)
        ratio = ratio * ratio * (3 - 2 * ratio)
        average = (pixels[:, index] + pixels[:, -1 - index]) * 0.5
        pixels[:, index] = average * (1 - ratio) + pixels[:, index] * ratio
        pixels[:, -1 - index] = average * (1 - ratio) + pixels[:, -1 - index] * ratio
    for index in range(feather):
        ratio = index / max(1, feather - 1)
        ratio = ratio * ratio * (3 - 2 * ratio)
        average = (pixels[index] + pixels[-1 - index]) * 0.5
        pixels[index] = average * (1 - ratio) + pixels[index] * ratio
        pixels[-1 - index] = average * (1 - ratio) + pixels[-1 - index] * ratio
    return Image.fromarray(np.clip(pixels, 0, 255).astype(np.uint8), "RGB")


def resize_rgba_premultiplied(image: Image.Image,
                              size: tuple[int, int]) -> Image.Image:
    """Resize a cutout without pulling its transparent matte into the fringe."""
    rgba = np.asarray(image.convert("RGBA"), dtype=np.float32)
    alpha = rgba[:, :, 3:4] / 255.0
    premultiplied = np.clip(rgba[:, :, :3] * alpha, 0, 255).astype(np.uint8)
    resized_rgb = np.asarray(
        Image.fromarray(premultiplied, "RGB").resize(size, Image.Resampling.LANCZOS),
        dtype=np.float32,
    )
    resized_alpha = np.asarray(
        Image.fromarray(rgba[:, :, 3].astype(np.uint8), "L").resize(
            size, Image.Resampling.LANCZOS
        ),
        dtype=np.uint8,
    )
    opacity = resized_alpha.astype(np.float32) / 255.0
    straight_rgb = resized_rgb / np.maximum(opacity[:, :, None], 1 / 255)
    straight_rgb[resized_alpha == 0] = 0
    return Image.fromarray(
        np.dstack((np.clip(straight_rgb, 0, 255).astype(np.uint8), resized_alpha)),
        "RGBA",
    )


def normalized_decal(source: Image.Image, size: tuple[int, int], padding: int) -> Image.Image:
    alpha = source.getchannel("A").point(lambda value: 0 if value < 7 else value)
    bounds = alpha.getbbox()
    if not bounds:
        raise RuntimeError("Empty authored decal frame")
    isolated = source.crop(bounds)
    maximum = (size[0] - padding * 2, size[1] - padding * 2)
    scale = min(maximum[0] / isolated.width, maximum[1] / isolated.height)
    isolated = resize_rgba_premultiplied(
        isolated,
        (max(1, round(isolated.width * scale)),
         max(1, round(isolated.height * scale))),
    )
    frame = Image.new("RGBA", size, (0, 0, 0, 0))
    frame.alpha_composite(isolated, ((size[0] - isolated.width) // 2,
                                     (size[1] - isolated.height) // 2))
    return frame


def role_quadrants(source: Image.Image) -> tuple[Image.Image, Image.Image, Image.Image]:
    center = normalized_decal(source.crop((QUADRANT, 0, SOURCE_SIZE[0], QUADRANT)),
                              DECAL_SIZE, 14)
    # Trim the authored board gutter before resizing so RGB checker sources do
    # not carry a one-pixel matte seam into every repeated territory edge.
    frontier = source.crop((28, QUADRANT + 8, QUADRANT - 28, SOURCE_SIZE[1] - 36))
    frontier = resize_rgba_premultiplied(frontier, DECAL_SIZE)
    props_source = source.crop((QUADRANT, QUADRANT, SOURCE_SIZE[0], SOURCE_SIZE[1]))
    atlas = Image.new("RGBA", (PROP_FRAME_SIZE[0] * 2, PROP_FRAME_SIZE[1] * 2),
                      (0, 0, 0, 0))
    for index in range(4):
        column, row = index % 2, index // 2
        left = round(column * props_source.width / 2)
        top = round(row * props_source.height / 2)
        right = round((column + 1) * props_source.width / 2)
        bottom = round((row + 1) * props_source.height / 2)
        prop = normalized_decal(props_source.crop((left, top, right, bottom)),
                                PROP_FRAME_SIZE, 12)
        atlas.alpha_composite(prop, (column * PROP_FRAME_SIZE[0],
                                     row * PROP_FRAME_SIZE[1]))
    return center, frontier, atlas


def save_webp(image: Image.Image, path: Path) -> None:
    image.save(path, "WEBP", quality=92, method=4, exact=True)


def alpha_coverage(image: Image.Image) -> float:
    alpha = np.asarray(image.convert("RGBA").getchannel("A"), dtype=np.uint8)
    return round(float(np.count_nonzero(alpha >= 8) / alpha.size), 6)


def build_entry(entry: dict[str, object]) -> dict[str, object]:
    palette_id = str(entry["id"])
    source_path = SOURCE_ROOT / f"{palette_id}-source-v1.png"
    if not source_path.is_file():
        raise RuntimeError(f"Missing ImageGen source: {source_path}")
    source, alpha_mode = source_rgba(source_path)
    ground = seamless_ground(source)
    center, frontier, props = role_quadrants(source)
    outputs = {
        "ground": (ground, RUNTIME_ROOT / f"{palette_id}-ground-v1.webp"),
        "center": (center, RUNTIME_ROOT / f"{palette_id}-center-v1.webp"),
        "frontier": (frontier, RUNTIME_ROOT / f"{palette_id}-frontier-v1.webp"),
        "props": (props, RUNTIME_ROOT / f"{palette_id}-props-v1.webp"),
    }
    for image, path in outputs.values():
        save_webp(image, path)
    return {
        "id": palette_id,
        "parentRegionId": entry["parentRegionId"],
        "source": source_path.relative_to(ROOT).as_posix(),
        "sourceSha256": sha256(source_path),
        "alphaMode": alpha_mode,
        "assets": {
            role: {
                "path": path.relative_to(ROOT).as_posix(),
                "sha256": sha256(path),
                "bytes": path.stat().st_size,
                "size": list(image.size),
                "alphaCoverage": alpha_coverage(image),
            } for role, (image, path) in outputs.items()
        },
    }


def contact_sheet(entries: list[dict[str, object]]) -> None:
    cell = (300, 250)
    sheet = Image.new("RGB", (cell[0] * 5, cell[1] * 4), (13, 15, 20))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for index, entry in enumerate(entries):
        palette_id = str(entry["id"])
        ground = Image.open(RUNTIME_ROOT / f"{palette_id}-ground-v1.webp").convert("RGBA")
        center = Image.open(RUNTIME_ROOT / f"{palette_id}-center-v1.webp").convert("RGBA")
        frontier = Image.open(RUNTIME_ROOT / f"{palette_id}-frontier-v1.webp").convert("RGBA")
        props = Image.open(RUNTIME_ROOT / f"{palette_id}-props-v1.webp").convert("RGBA")
        card = ground.resize((280, 210), Image.Resampling.LANCZOS)
        card.alpha_composite(frontier.resize(card.size, Image.Resampling.LANCZOS))
        focus = center.resize((132, 132), Image.Resampling.LANCZOS)
        card.alpha_composite(focus, (74, 34))
        prop = props.crop((0, 0, 256, 256)).resize((76, 76), Image.Resampling.LANCZOS)
        card.alpha_composite(prop, (192, 124))
        left = (index % 5) * cell[0] + 10
        top = (index // 5) * cell[1] + 10
        sheet.paste(card.convert("RGB"), (left, top))
        draw.text((left + 2, top + 218), palette_id, fill=(238, 240, 245), font=font)
    sheet.save(CONTACT_PATH, "JPEG", quality=92, optimize=True)


def main() -> None:
    spec = json.loads(SPEC_PATH.read_text(encoding="utf-8"))
    entries = spec["palettes"]
    if len(entries) != 20 or len({entry["id"] for entry in entries}) != 20:
        raise RuntimeError("Starless Scar V1 requires exactly twenty unique palettes")
    SOURCE_ROOT.mkdir(parents=True, exist_ok=True)
    RUNTIME_ROOT.mkdir(parents=True, exist_ok=True)
    write_prompts(entries)
    built = [build_entry(entry) for entry in entries]
    contact_sheet(entries)
    manifest = {
        "version": 1,
        "date": "2026-08-31",
        "generationMode": spec["generationMode"],
        "counts": {"palettes": 20, "runtimeAssets": 80, "overlayPropFrames": 80},
        "promptManifest": PROMPT_PATH.relative_to(ROOT).as_posix(),
        "contactSheet": CONTACT_PATH.relative_to(ROOT).as_posix(),
        "runtimeContract": "visual only; demand streamed; solid-cell masked",
        "entries": built,
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest["counts"], indent=2))
    print(CONTACT_PATH.relative_to(ROOT).as_posix())


if __name__ == "__main__":
    main()
