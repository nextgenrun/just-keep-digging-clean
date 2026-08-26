"""Gate and pack unified 1024 px Survival frames into runtime sheets."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / "values/survivalUnifiedAnimationRuntimeV1.json").read_text(encoding="utf-8"))
RUNTIME = ROOT / CONFIG["runtimeRoot"]
REVIEW = ROOT / CONFIG["reviewRoot"]
# Frame 232 turns almost edge-on and reads as a one-frame scale collapse.
# Hold the previous authored pose for that visual tick; contacts stay intact.
SIDEWAYS_FRAME_REPLACEMENTS = {232: 231}


def runtime_filename(sheet_key):
    return f"2026-08-25-{sheet_key}.webp"


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def metrics(image):
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    threshold = int(CONFIG["render"]["alphaThreshold"])
    mask = alpha.point(lambda value: 255 if value > threshold else 0)
    bounds = mask.getbbox()
    if bounds is None:
        raise RuntimeError("Blank rendered frame")
    red, green, blue, source_alpha = rgba.split()
    suspicious_green = sum(
        1 for r, g, b, a in zip(red.getdata(), green.getdata(), blue.getdata(), source_alpha.getdata())
        if a > threshold and g > 80 and g > r * 1.35 and g > b * 1.2
    )
    margin = min(bounds[0], bounds[1], image.width - bounds[2], image.height - bounds[3])
    return {
        "bounds": list(bounds),
        "baselinePx": bounds[3] - 1,
        "edgeMarginPx": margin,
        "suspiciousGreenPixels": suspicious_green,
    }


def pack_sheet(sheet_key, spec):
    count = int(spec["frames"])
    source_root = ROOT / CONFIG["renderRoot"] / sheet_key
    paths = [source_root / f"frame-{index:04d}.png" for index in range(count)]
    missing = [str(path) for path in paths if not path.is_file()]
    if missing:
        raise FileNotFoundError(f"{sheet_key}: missing {len(missing)} frames; first={missing[:3]}")
    source_size = int(CONFIG["render"]["sourceSizePx"])
    packed_size = int(spec.get("packedSizePx", CONFIG["render"]["packedSizePx"]))
    columns = min(int(spec.get("columns", CONFIG["render"]["columns"])), count)
    rows = math.ceil(count / columns)
    sheet = Image.new("RGBA", (columns * packed_size, rows * packed_size), (0, 0, 0, 0))
    raw_metrics = []
    preview = []
    for index, path in enumerate(paths):
        with Image.open(path) as source:
            if source.size != (source_size, source_size):
                raise RuntimeError(f"{path}: expected {source_size}px, got {source.size}")
            try:
                raw_metrics.append(metrics(source))
            except RuntimeError as error:
                raise RuntimeError(f"{sheet_key} frame {index}: {error}") from error
            frame = source.convert("RGBA").resize((packed_size, packed_size), Image.Resampling.LANCZOS)
        sheet.alpha_composite(frame, ((index % columns) * packed_size, (index // columns) * packed_size))
        if index in {0, count // 4, count // 2, (count * 3) // 4, count - 1}:
            preview.append((index, frame))
    minimum_margin = min(item["edgeMarginPx"] for item in raw_metrics)
    minimum_margin_frames = [
        index for index, item in enumerate(raw_metrics)
        if item["edgeMarginPx"] == minimum_margin
    ]
    maximum_green = max(item["suspiciousGreenPixels"] for item in raw_metrics)
    if minimum_margin < int(CONFIG["gates"]["minimumRawEdgeMarginPx"]):
        raise RuntimeError(
            f"{sheet_key}: clipped raw alpha, minimum margin {minimum_margin}px "
            f"at frames {minimum_margin_frames[:12]}"
        )
    if maximum_green > int(CONFIG["gates"]["maximumSuspiciousGreenPixelsPerFrame"]):
        raise RuntimeError(f"{sheet_key}: suspicious green pixels {maximum_green}")
    output = RUNTIME / runtime_filename(sheet_key)
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, format="WEBP", lossless=True, method=6)
    build_contact_sheet(sheet_key, preview, packed_size)
    baselines = [item["baselinePx"] for item in raw_metrics]
    return {
        "file": output.name,
        "frames": count,
        "frameSizePx": packed_size,
        "columns": columns,
        "rows": rows,
        "sourceRenderSizePx": source_size,
        "downsamplePasses": 1,
        "minimumRawEdgeMarginPx": minimum_margin,
        "baselineRangePx": max(baselines) - min(baselines),
        "maximumSuspiciousGreenPixels": maximum_green,
        "sha256": sha256(output),
    }


def font(size):
    path = Path("C:/Windows/Fonts/segoeuib.ttf")
    return ImageFont.truetype(str(path), size) if path.is_file() else ImageFont.load_default()


def build_contact_sheet(sheet_key, samples, frame_size):
    REVIEW.mkdir(parents=True, exist_ok=True)
    cell = 192
    canvas = Image.new("RGB", (cell * len(samples), cell + 40), (7, 14, 18))
    draw = ImageDraw.Draw(canvas)
    draw.text((10, 8), sheet_key, font=font(16), fill=(235, 241, 247))
    for column, (index, frame) in enumerate(samples):
        tile = Image.new("RGB", (frame_size, frame_size), (7, 14, 18))
        tile.paste(frame, (0, 0), frame)
        tile = tile.resize((cell, cell), Image.Resampling.LANCZOS)
        canvas.paste(tile, (column * cell, 40))
        draw.text((column * cell + 6, 46), str(index), font=font(14), fill=(244, 189, 105))
    canvas.save(REVIEW / f"{sheet_key}-contact-sheet.png", optimize=True)


MOVING_META = {
    "cross": ("cross", "hands", "mixamo-cross-punch"),
    "jab": ("jab", "hands", "mixamo-jab-punch"),
    "roundhouse": ("roundhouse", "feet", "mixamo-mma-roundhouse-kick"),
    "jabElbow": ("jab-elbow", "hands", "mixamo-jab-to-elbow-combo"),
    "lowKick": ("low-kick", "feet", "mixamo-mma-low-kick"),
    "highKick": ("high-kick", "feet", "mixamo-mma-high-kick"),
    "spinningBackKick": ("spinning-back-kick", "feet", "mixamo-mma-spinning-back-kick"),
    "elbowUppercut": ("elbow-uppercut", "hands", "mixamo-elbow-uppercut-combo"),
    "singleElbow": ("single-elbow", "hands", "mixamo-male-elbow-punch"),
    "hook": ("hook", "hands", "mixamo-hook-punch"),
}


def build_moving_module(sheet_manifest):
    moving = CONFIG["moving"]
    action_specs = CONFIG["movingActions"]
    phase_stride = sum(int(spec["movingFrames"]) for spec in action_specs.values())
    action_offsets = {}
    cursor = 0
    for action_id, spec in action_specs.items():
        action_offsets[action_id] = cursor
        cursor += int(spec["movingFrames"])
    aliases = []
    by_base = {}
    default_by_base = {}
    for action_id, spec in action_specs.items():
        slug, marker, source_action = MOVING_META[action_id]
        base_key = f"survival-mixamo-v3-complex-dig-{slug}-anim"
        by_base[base_key] = {}
        for phase_index, phase in enumerate(moving["phaseVariants"]):
            count = int(spec["movingFrames"])
            start = phase_index * phase_stride + action_offsets[action_id]
            frames = [
                SIDEWAYS_FRAME_REPLACEMENTS.get(frame, frame)
                for frame in range(start, start + count)
            ]
            run_frames = [
                (int(phase["runStartFrame"]) + index) % int(moving["runFrames"])
                for index in range(count)
            ]
            contacts = []
            for source_index in spec["contactIndices"]:
                sequence_index = round(source_index * (count - 1) / max(1, int(spec["sourceFrames"]) - 1))
                contacts.append({"textureFrame": start + sequence_index, "sequenceIndex": sequence_index})
            primary = contacts[-1]
            animation_key = (
                f"survival-ual-player-v1-moving-complex-dig-{action_id}-{phase['id']}-anim"
            )
            alias = {
                "clipId": action_id,
                "baseAnimationKey": base_key,
                "phaseVariantId": phase["id"],
                "animationKey": animation_key,
                "frames": frames,
                "runFrames": run_frames,
                "runStartFrame": int(phase["runStartFrame"]),
                "resumeJogFrame": (int(phase["runStartFrame"]) + count) % int(moving["runFrames"]),
                "contact": {
                    "textureFrame": primary["textureFrame"],
                    "sequenceIndex": primary["sequenceIndex"],
                    "contacts": contacts,
                    "sourceAction": f"moving-3d:{source_action}",
                    "markerGroup": marker,
                    "visualAlignmentEnabled": False,
                },
                "dualContact": len(contacts) > 1,
            }
            aliases.append(alias)
            by_base[base_key][phase["id"]] = {
                "animationKey": animation_key,
                "resumeJogFrame": alias["resumeJogFrame"],
            }
            if phase.get("base") and base_key not in default_by_base:
                default_by_base[base_key] = animation_key
    payload = {
        "version": CONFIG["version"],
        "enabledByDefault": True,
        "basePath": CONFIG["runtimeRoot"],
        "sheet": {
            "key": "survival-ual-player-v1-moving-complex-dig-sheet",
            "fileName": sheet_manifest["file"],
            "frameCount": sheet_manifest["frames"],
            "frames": list(range(sheet_manifest["frames"])),
        },
        "displaySizePx": int(CONFIG["render"]["displaySizePx"]),
        "origin": {"x": CONFIG["render"]["groundedOrigin"][0], "y": CONFIG["render"]["groundedOrigin"][1]},
        "visualFrameReplacements": SIDEWAYS_FRAME_REPLACEMENTS,
        "phaseVariants": aliases,
        "aliases": aliases,
        "defaultAnimationKeyByBaseAnimation": default_by_base,
        "variantByBaseAnimationAndPhaseVariantId": by_base,
    }
    module = (
        "// Generated by 2026-08-25-pack-survival-unified-animation-runtime-v1.py.\n"
        "const deepFreeze = (value) => {\n"
        "  if (!value || typeof value !== \"object\" || Object.isFrozen(value)) return value;\n"
        "  Object.values(value).forEach(deepFreeze);\n"
        "  return Object.freeze(value);\n"
        "};\n\n"
        "export const MOVING_COMPLEX_DIG_ANIMATION_UNIFIED_V1 = deepFreeze("
        + json.dumps(payload, indent=2)
        + ");\n"
    )
    output = ROOT / "values/movingComplexDigAnimationUnifiedV1.generated.js"
    output.write_text(module, encoding="utf-8")
    return {"file": str(output.relative_to(ROOT)).replace("\\", "/"), "aliases": len(aliases)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sheet", choices=CONFIG["sheets"].keys())
    parser.add_argument("--resume", action="store_true")
    args = parser.parse_args()
    selected = {args.sheet: CONFIG["sheets"][args.sheet]} if args.sheet else CONFIG["sheets"]
    manifest_path = RUNTIME / "2026-08-25-survival-unified-animation-runtime-v1-manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.is_file() else {
        "version": CONFIG["version"],
        "runtimeWired": False,
        "sourceRenderSizePx": CONFIG["render"]["sourceSizePx"],
        "qualityAuthority": "one Survival V4 mesh, rig, material, light, camera and anchor contract",
        "sheets": {},
    }
    RUNTIME.mkdir(parents=True, exist_ok=True)
    for sheet_key, spec in selected.items():
        existing = manifest["sheets"].get(sheet_key)
        existing_output = RUNTIME / runtime_filename(sheet_key)
        if args.resume and existing and existing_output.is_file():
            print(f"SURVIVAL_UNIFIED_PACK_SKIP sheet={sheet_key}")
            continue
        manifest["sheets"][sheet_key] = pack_sheet(sheet_key, spec)
        manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    moving_key = "survival-ual-player-v1-moving-complex-dig-sheet"
    if moving_key in manifest["sheets"]:
        manifest["movingModule"] = build_moving_module(manifest["sheets"][moving_key])
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"SURVIVAL_UNIFIED_PACK_OK sheets={len(selected)} manifest={manifest_path}")


if __name__ == "__main__":
    main()
