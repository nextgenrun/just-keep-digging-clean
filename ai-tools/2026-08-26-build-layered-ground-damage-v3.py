"""Build the authored structural + material-response ground-damage V3 atlases."""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SEMANTIC_ROOT = ROOT / "sprites/backgrounds/world-visual-v2/semantic-decals-v1"
PACKAGE_ROOT = SEMANTIC_ROOT / "ground-damage-layered-v3"
SOURCE_ROOT = PACKAGE_ROOT / "sources"
SOURCE = SOURCE_ROOT / "2026-08-26-ground-damage-fracture-library-chroma-v3.png"
ALPHA_SHEET = PACKAGE_ROOT / "fracture-library-alpha-v3.png"
FRACTURE_ATLAS = SEMANTIC_ROOT / "ground-damage-fracture-v3.png"
RESPONSE_ATLAS = SEMANTIC_ROOT / "ground-damage-response-v3.png"
SHARD_ATLAS = ROOT / "sprites/fx/tile-destruction-fx-v3/tile-break-shards-v3.png"
MANIFEST = PACKAGE_ROOT / "manifest.json"
PREVIEW_ROOT = ROOT / "visual-approval-previews/ground-damage-layered-v3"
LIBRARY_PREVIEW = PREVIEW_ROOT / "01-fracture-library-native-94px.png"
RESPONSE_PREVIEW = PREVIEW_ROOT / "02-material-response-library-native-94px.png"
CHROMA_HELPER = (
    Path.home() / ".codex/skills/.system/imagegen/scripts/remove_chroma_key.py"
)

FRAME_PX = 188
NATIVE_PX = 94
FRACTURE_COLUMNS = 4
FRACTURE_ROWS = 4
FRACTURE_VARIANTS = 16
STATES = 12
RESPONSE_TIERS = 4
RESPONSE_FAMILIES = (
    "dirt", "damp", "hard", "copper", "bronze", "iron", "steel",
    "silver", "gold", "lava", "obsidian", "ember", "magma", "crystal",
    "geode", "relic", "special",
)
STAGE_FRACTIONS = (0.07, 0.12, 0.18, 0.25, 0.33, 0.42, 0.52, 0.63, 0.74, 0.84, 0.93, 1.0)
STAGE_OPACITY = (0.66, 0.72, 0.78, 0.83, 0.87, 0.90, 0.93, 0.95, 0.97, 0.985, 0.995, 1.0)
RESPONSE_COUNTS = (1, 2, 3, 5)
RESPONSE_ORDER = (4, 3, 2, 1, 0)
RESPONSE_PLACEMENTS = (
    (5, 3, 14, -8), (-15, 8, 19, 17), (18, 10, 22, -19),
    (-28, -5, 25, 31), (29, -9, 29, -28),
)

FRACTURE_PROMPT = (
    "Create an isolated grid of distinct full-severity orthographic ground-fracture "
    "decals: material-neutral charcoal fissures, pale exposed rims, flakes and dust; "
    "readable at 94 px; no terrain square, hole, text, border, tool, or character."
)
CHROMA_EDIT_PROMPT = (
    "Replace only the checkerboard with flat #00FF00; preserve all sixteen fracture "
    "motifs, their grid positions, scale, fine branches, debris, dust and highlights."
)


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def pixel_sha256(image: Image.Image) -> str:
    return hashlib.sha256(image.convert("RGBA").tobytes()).hexdigest()


def load_font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    name = "segoeuib.ttf" if bold else "segoeui.ttf"
    path = Path("C:/Windows/Fonts") / name
    return ImageFont.truetype(str(path), size) if path.is_file() else ImageFont.load_default()


def remove_chroma() -> None:
    if not SOURCE.is_file() or not CHROMA_HELPER.is_file():
        raise FileNotFoundError("Missing ImageGen source or bundled chroma helper")
    subprocess.run(
        (
            sys.executable, str(CHROMA_HELPER), "--input", str(SOURCE),
            "--out", str(ALPHA_SHEET), "--auto-key", "border", "--soft-matte",
            "--transparent-threshold", "16", "--opaque-threshold", "168",
            "--despill", "--force",
        ),
        check=True,
    )


def normalize_decal(cell: Image.Image) -> Image.Image:
    rgba = cell.convert("RGBA")
    box = rgba.getchannel("A").point(lambda value: 255 if value > 7 else 0).getbbox()
    if not box:
        raise ValueError("Fracture source cell became empty after chroma removal")
    crop = rgba.crop(box)
    scale = min(172 / crop.width, 172 / crop.height)
    crop = crop.resize(
        (max(1, round(crop.width * scale)), max(1, round(crop.height * scale))),
        Image.Resampling.LANCZOS,
    )
    frame = Image.new("RGBA", (FRAME_PX, FRAME_PX), (0, 0, 0, 0))
    frame.alpha_composite(crop, ((FRAME_PX - crop.width) // 2, (FRAME_PX - crop.height) // 2))
    return frame


def split_fracture_finals() -> list[Image.Image]:
    sheet = Image.open(ALPHA_SHEET).convert("RGBA")
    finals = []
    for row in range(FRACTURE_ROWS):
        top = round(row * sheet.height / FRACTURE_ROWS)
        bottom = round((row + 1) * sheet.height / FRACTURE_ROWS)
        for column in range(FRACTURE_COLUMNS):
            left = round(column * sheet.width / FRACTURE_COLUMNS)
            right = round((column + 1) * sheet.width / FRACTURE_COLUMNS)
            finals.append(normalize_decal(sheet.crop((left, top, right, bottom))))
    if len(finals) != FRACTURE_VARIANTS:
        raise AssertionError("Unexpected fracture source inventory")
    return finals


def progressive_frames(final: Image.Image) -> list[Image.Image]:
    rgba = np.asarray(final.convert("RGBA"), dtype=np.uint8)
    alpha = rgba[:, :, 3].astype(np.float32)
    ys, xs = np.nonzero(alpha > 7)
    if len(xs) < 64:
        raise ValueError("Fracture final has insufficient visible structure")
    core = alpha > 36
    core_y, core_x = np.nonzero(core)
    center_x = (FRAME_PX - 1) / 2
    center_y = (FRAME_PX - 1) / 2
    seed_index = np.argmin((core_x - center_x) ** 2 + (core_y - center_y) ** 2)
    seed_x = float(core_x[seed_index])
    seed_y = float(core_y[seed_index])
    grid_y, grid_x = np.mgrid[:FRAME_PX, :FRAME_PX]
    distance = np.hypot(grid_x - seed_x, grid_y - seed_y)
    visible_distances = distance[alpha > 7]
    previous = np.zeros_like(alpha)
    frames = []
    for fraction, opacity in zip(STAGE_FRACTIONS, STAGE_OPACITY):
        threshold = float(np.quantile(visible_distances, fraction))
        reveal = np.clip((threshold + 2.5 - distance) / 2.5, 0.0, 1.0)
        state_alpha = np.rint(alpha * reveal * opacity)
        state_alpha = np.maximum(previous, state_alpha).astype(np.uint8)
        previous = state_alpha.astype(np.float32)
        state = rgba.copy()
        state[:, :, 3] = state_alpha
        frames.append(Image.fromarray(state, "RGBA"))
    frames[-1] = final
    return frames


def build_fracture_atlas() -> tuple[list[list[Image.Image]], dict[str, list[float]]]:
    by_variant = [progressive_frames(final) for final in split_fracture_finals()]
    atlas = Image.new(
        "RGBA", (FRACTURE_VARIANTS * FRAME_PX, STATES * FRAME_PX), (0, 0, 0, 0)
    )
    coverage: dict[str, list[float]] = {}
    fingerprints: set[str] = set()
    for variant, frames in enumerate(by_variant):
        values = []
        for state, frame in enumerate(frames):
            atlas.alpha_composite(frame, (variant * FRAME_PX, state * FRAME_PX))
            alpha = np.asarray(frame.getchannel("A"))
            values.append(round(float((alpha > 7).mean()), 6))
            fingerprints.add(pixel_sha256(frame))
        if any(after < before for before, after in zip(values, values[1:])):
            raise AssertionError(f"Variant {variant + 1} coverage is not cumulative")
        coverage[f"variant-{variant + 1:02d}"] = values
    if len(fingerprints) != FRACTURE_VARIANTS * STATES:
        raise AssertionError("Fracture atlas contains duplicate frames")
    atlas.save(FRACTURE_ATLAS, "PNG", optimize=True)
    return by_variant, coverage


def shard_frame(sheet: Image.Image, family: int, index: int) -> Image.Image:
    frame = sheet.crop((index * 80, family * 80, (index + 1) * 80, (family + 1) * 80))
    box = frame.getchannel("A").point(lambda value: 255 if value > 5 else 0).getbbox()
    return frame.crop(box) if box else Image.new("RGBA", (1, 1), (0, 0, 0, 0))


def response_family_frames(sheet: Image.Image, family: int) -> list[Image.Image]:
    shards = [shard_frame(sheet, family, index) for index in range(5)]
    frames = []
    for count in RESPONSE_COUNTS:
        frame = Image.new("RGBA", (FRAME_PX, FRAME_PX), (0, 0, 0, 0))
        for placement_index in range(count):
            source = shards[RESPONSE_ORDER[placement_index]]
            dx, dy, target, angle = RESPONSE_PLACEMENTS[placement_index]
            target += (family % 3) - 1
            scale = target / max(source.size)
            resized = source.resize(
                (max(1, round(source.width * scale)), max(1, round(source.height * scale))),
                Image.Resampling.LANCZOS,
            ).rotate(angle + (family % 4 - 1.5) * 3, resample=Image.Resampling.BICUBIC, expand=True)
            frame.alpha_composite(
                resized,
                (round(FRAME_PX / 2 + dx - resized.width / 2),
                 round(FRAME_PX / 2 + dy - resized.height / 2)),
            )
        frames.append(frame)
    return frames


def build_response_atlas() -> list[list[Image.Image]]:
    sheet = Image.open(SHARD_ATLAS).convert("RGBA")
    expected = (5 * 80, len(RESPONSE_FAMILIES) * 80)
    if sheet.size != expected:
        raise ValueError(f"Expected shard atlas {expected}, got {sheet.size}")
    families = [response_family_frames(sheet, index) for index in range(len(RESPONSE_FAMILIES))]
    atlas = Image.new(
        "RGBA", (len(RESPONSE_FAMILIES) * FRAME_PX, RESPONSE_TIERS * FRAME_PX),
        (0, 0, 0, 0),
    )
    for tier in range(RESPONSE_TIERS):
        for family, frames in enumerate(families):
            atlas.alpha_composite(frames[tier], (family * FRAME_PX, tier * FRAME_PX))
    atlas.save(RESPONSE_ATLAS, "PNG", optimize=True)
    return families


def checker(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size), (18, 22, 29, 255))
    draw = ImageDraw.Draw(image)
    step = 12
    for y in range(0, size, step):
        for x in range(0, size, step):
            if (x // step + y // step) % 2:
                draw.rectangle((x, y, x + step - 1, y + step - 1), fill=(28, 34, 43, 255))
    return image


def build_previews(
    fractures: list[list[Image.Image]], responses: list[list[Image.Image]]
) -> None:
    PREVIEW_ROOT.mkdir(parents=True, exist_ok=True)
    selected_states = (0, 3, 6, 9, 11)
    width = 200 + len(selected_states) * NATIVE_PX
    canvas = Image.new("RGB", (width, 56 + FRACTURE_VARIANTS * NATIVE_PX), "#080b10")
    draw = ImageDraw.Draw(canvas)
    draw.text((16, 14), "LAYERED DAMAGE V3 - STRUCTURAL FAMILIES AT 94 PX", fill="#f4dfbc", font=load_font(18, True))
    for variant, frames in enumerate(fractures):
        y = 56 + variant * NATIVE_PX
        draw.text((14, y + 37), f"F{variant + 1:02d}", fill="#cbd5e1", font=load_font(14, True))
        for column, state in enumerate(selected_states):
            cell = checker(NATIVE_PX)
            cell.alpha_composite(frames[state].resize((NATIVE_PX, NATIVE_PX), Image.Resampling.LANCZOS))
            canvas.paste(cell.convert("RGB"), (200 + column * NATIVE_PX, y))
    canvas.save(LIBRARY_PREVIEW, "PNG", optimize=True)

    panel_width = 220 + RESPONSE_TIERS * NATIVE_PX
    panel_height = 56 + 9 * NATIVE_PX
    response_canvas = Image.new("RGB", (panel_width * 2, panel_height), "#080b10")
    response_draw = ImageDraw.Draw(response_canvas)
    response_draw.text((16, 14), "V3 MATERIAL RESPONSE - 17 AUTHORED FAMILIES", fill="#f4dfbc", font=load_font(18, True))
    for family, frames in enumerate(responses):
        panel = family // 9
        row = family % 9
        x0 = panel * panel_width
        y = 56 + row * NATIVE_PX
        response_draw.text((x0 + 14, y + 37), RESPONSE_FAMILIES[family], fill="#cbd5e1", font=load_font(13, True))
        for tier, frame in enumerate(frames):
            cell = checker(NATIVE_PX)
            cell.alpha_composite(frame.resize((NATIVE_PX, NATIVE_PX), Image.Resampling.LANCZOS))
            response_canvas.paste(cell.convert("RGB"), (x0 + 220 + tier * NATIVE_PX, y))
    response_canvas.save(RESPONSE_PREVIEW, "PNG", optimize=True)


def image_record(path: Path) -> dict[str, object]:
    image = Image.open(path)
    return {
        "path": relative(path), "sha256": sha256(path), "width": image.width,
        "height": image.height, "mode": image.mode,
    }


def write_manifest(coverage: dict[str, list[float]]) -> None:
    data = {
        "version": 3,
        "date": "2026-08-26",
        "production": True,
        "generator": relative(Path(__file__)),
        "imageGeneration": {
            "mode": "OpenAI built-in image generation",
            "sourcePromptSummary": FRACTURE_PROMPT,
            "chromaEditPromptSummary": CHROMA_EDIT_PROMPT,
        },
        "sources": {
            "fractureChroma": image_record(SOURCE),
            "fractureAlpha": image_record(ALPHA_SHEET),
            "materialResponses": image_record(SHARD_ATLAS),
        },
        "atlases": {
            "fracture": {**image_record(FRACTURE_ATLAS), "frameSizePx": FRAME_PX,
                         "columns": FRACTURE_VARIANTS, "states": STATES,
                         "frameCount": FRACTURE_VARIANTS * STATES},
            "response": {**image_record(RESPONSE_ATLAS), "frameSizePx": FRAME_PX,
                         "columns": len(RESPONSE_FAMILIES), "tiers": RESPONSE_TIERS,
                         "frameCount": len(RESPONSE_FAMILIES) * RESPONSE_TIERS},
        },
        "contracts": {
            "logicalTilePx": NATIVE_PX,
            "fractureFrameOrder": "state-major: stateIndex * 16 + variantIndex",
            "responseFrameOrder": "tier-major: tierIndex * 17 + familyIndex",
            "responseFamilies": list(RESPONSE_FAMILIES),
            "responseTierCounts": list(RESPONSE_COUNTS),
            "coverage": coverage,
        },
        "rollback": {
            "v2Query": "?groundDamageAtlas=v2",
            "v1Query": "?groundDamageAtlas=legacy",
            "rendererQuery": "?groundDamage=legacy",
        },
    }
    MANIFEST.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    PACKAGE_ROOT.mkdir(parents=True, exist_ok=True)
    remove_chroma()
    fractures, coverage = build_fracture_atlas()
    responses = build_response_atlas()
    build_previews(fractures, responses)
    write_manifest(coverage)
    print("LAYERED_GROUND_DAMAGE_V3_OK")
    print(f"fracture={relative(FRACTURE_ATLAS)} sha256={sha256(FRACTURE_ATLAS)}")
    print(f"response={relative(RESPONSE_ATLAS)} sha256={sha256(RESPONSE_ATLAS)}")


if __name__ == "__main__":
    main()
