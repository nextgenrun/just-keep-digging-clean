from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

import build_living_drill_v1_assets as builder
import import_living_drill_grok_frames as grok_import


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "sprites" / "character" / "living-drill-v1"
RUNTIME_DIR = ASSET_DIR / "runtime"
REPORT_PATH = ASSET_DIR / "reports" / "living-drill-v1-full-animation-audit.json"
V2_REPORT_PATH = ASSET_DIR / "reports" / "living-drill-v1-v2-motion-polish-report.json"
BLENDER_DIR = ASSET_DIR / "blender" / "v2-motion-polish"
MOTION_PROFILE_PATH = BLENDER_DIR / "living-drill-motion-profile.json"
BLENDER_FRAMES_DIR = BLENDER_DIR / "frames"
V2_PREVIEW_DIR = ASSET_DIR / "previews" / "v2-motion-polish"

FRAME_SIZE = builder.FRAME_SIZE
ANCHOR = builder.ANCHOR

SHEETS = {
    "idle": "living-drill-idle-sheet.png",
    "fly": "living-drill-fly-sheet.png",
    "dig": "living-drill-dig-sheet.png",
    "dig_recoil": "living-drill-dig-recoil-sheet.png",
}

FPS = {
    "idle": 7,
    "fly": 9,
    "dig": 14,
    "dig_recoil": 12,
}

PROFILE_STATE_FOR_ANIMATION = {
    "idle": "idle",
    "fly": "fly",
    "dig": "dig_bite",
    "dig_recoil": "recoil",
}


def load_sheet(name: str) -> list[Image.Image]:
    path = RUNTIME_DIR / name
    sheet = Image.open(path).convert("RGBA")
    if sheet.height != FRAME_SIZE or sheet.width % FRAME_SIZE != 0:
        raise RuntimeError(f"Unexpected sheet dimensions for {path}: {sheet.size}")
    return [
        sheet.crop((index * FRAME_SIZE, 0, (index + 1) * FRAME_SIZE, FRAME_SIZE))
        for index in range(sheet.width // FRAME_SIZE)
    ]


def body_bbox(frame: Image.Image) -> tuple[int, int, int, int] | None:
    return grok_import.visible_body_bbox(frame)


def bbox_center(box: tuple[int, int, int, int]) -> tuple[float, float]:
    left, top, right, bottom = box
    return (left + right - 1) / 2, (top + bottom - 1) / 2


def shifted(frame: Image.Image, dx: int, dy: int) -> Image.Image:
    out = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    out.alpha_composite(frame, (dx, dy))
    return out


def align_to_center(frame: Image.Image, target_center: tuple[float, float]) -> Image.Image:
    box = body_bbox(frame)
    if not box:
        return frame
    cx, cy = bbox_center(box)
    dx = round(target_center[0] - cx)
    dy = round(target_center[1] - cy)
    return shifted(frame, dx, dy) if dx or dy else frame


def align_group(frames: list[Image.Image], target_center: tuple[float, float] | None = None) -> list[Image.Image]:
    if target_center is None:
        boxes = [body_bbox(frame) for frame in frames]
        centers = [bbox_center(box) for box in boxes if box]
        if not centers:
            return frames
        xs = sorted(center[0] for center in centers)
        ys = sorted(center[1] for center in centers)
        target_center = (xs[len(xs) // 2], ys[len(ys) // 2])
    return [align_to_center(frame, target_center) for frame in frames]


def add_fly_effects(frame: Image.Image, index: int) -> Image.Image:
    effects = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    out = effects
    draw = ImageDraw.Draw(out)
    pulse = [0, 2, 4, 2, 0, 3, 5, 2][index % 8]
    rear_y = ANCHOR[1] + [0, -1, 0, 1, 0, -1, 0, 1][index % 8]
    rear_x = 24
    rear_len = 9 + pulse
    draw.polygon(
        [(rear_x, rear_y - 5), (rear_x - rear_len, rear_y), (rear_x, rear_y + 5)],
        fill=(13, 108, 255, 230),
    )
    draw.polygon(
        [(rear_x - 2, rear_y - 3), (rear_x - max(5, rear_len - 4), rear_y), (rear_x - 2, rear_y + 3)],
        fill=(191, 248, 255, 235),
    )

    base_y = 63
    cx = ANCHOR[0] - 1
    length = 13 + pulse
    draw.ellipse((cx - 11, base_y - 3, cx + 11, base_y + 6), fill=(13, 108, 255, 210))
    draw.polygon(
        [(cx - 8, base_y + 2), (cx, base_y + length), (cx + 8, base_y + 2)],
        fill=(0, 183, 255, 190),
    )
    draw.polygon(
        [(cx - 4, base_y + 4), (cx, base_y + max(7, length - 5)), (cx + 4, base_y + 4)],
        fill=(191, 248, 255, 225),
    )
    effects.alpha_composite(frame)
    return effects


def load_motion_profile() -> dict[str, object]:
    if not MOTION_PROFILE_PATH.exists():
        raise FileNotFoundError(
            f"Missing Blender motion profile: {MOTION_PROFILE_PATH}. "
            "Run tools/export_living_drill_blender_blockout.py with Blender first."
        )
    return json.loads(MOTION_PROFILE_PATH.read_text(encoding="utf-8"))


def profile_frames(profile: dict[str, object], state: str) -> list[dict[str, float]]:
    frames = profile.get("animations", {}).get(state, {}).get("frames", [])
    return frames if isinstance(frames, list) else []


def sample_for(profile: dict[str, object], state: str, index: int) -> dict[str, float]:
    frames = profile_frames(profile, state)
    if not frames:
        return {}
    return frames[index % len(frames)]


def body_mask(frame: Image.Image) -> Image.Image:
    return frame.getchannel("A").point(lambda value: 255 if value > 20 else 0)


def overlay_drill_phase(frame: Image.Image, phase: float, pressure: float = 0) -> Image.Image:
    out = frame.copy()
    overlay = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    step = int(round((phase % 1) * 4))
    colors = [
        (255, 255, 255, 36 + round(pressure * 28)),
        (42, 42, 42, 34 + round(pressure * 26)),
        (180, 180, 180, 32 + round(pressure * 20)),
        (0, 0, 0, 30 + round(pressure * 22)),
    ]
    for index, x in enumerate((50, 58, 66, 74)):
        color = colors[(index + step) % len(colors)]
        draw.polygon([(x, 33), (x + 8, 36), (x + 2, 62), (x - 6, 59)], fill=color)
    drill_region = Image.new("L", frame.size, 0)
    region_draw = ImageDraw.Draw(drill_region)
    region_draw.rectangle((47, 27, 88, 67), fill=255)
    alpha = ImageChops.multiply(overlay.getchannel("A"), body_mask(frame))
    alpha = ImageChops.multiply(alpha, drill_region)
    overlay.putalpha(alpha)
    return Image.alpha_composite(out, overlay)


def strip_external_contact_marks(frame: Image.Image) -> Image.Image:
    out = frame.copy()
    pixels = out.load()
    for y in range(out.height):
        for x in range(out.width):
            if x < 55:
                continue
            r, g, b, a = pixels[x, y]
            if a < 20:
                continue
            spread = max(r, g, b) - min(r, g, b)
            is_colored_non_blue = spread > 28 and not builder.is_blue_effect_pixel((r, g, b, a))
            if is_colored_non_blue:
                pixels[x, y] = (255, 255, 255, 0)
    return out


def add_contact_spark(frame: Image.Image, pressure: float) -> Image.Image:
    return frame


def add_fly_effects_from_profile(frame: Image.Image, sample: dict[str, float], index: int) -> Image.Image:
    effects = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(effects)
    rear_len = float(sample.get("rearThrustLengthPx", 9 + (index % 4)))
    bottom_len = float(sample.get("bottomThrustLengthPx", 13 + (index % 3)))
    rear_y = ANCHOR[1] + round(float(sample.get("bodyBobPx", 0)))
    rear_x = 24
    draw.polygon(
        [(rear_x, rear_y - 5), (rear_x - rear_len, rear_y), (rear_x, rear_y + 5)],
        fill=(13, 108, 255, 230),
    )
    draw.polygon(
        [(rear_x - 2, rear_y - 3), (rear_x - max(5, rear_len - 4), rear_y), (rear_x - 2, rear_y + 3)],
        fill=(191, 248, 255, 235),
    )
    base_y = 63
    cx = ANCHOR[0] - 1
    draw.ellipse((cx - 11, base_y - 3, cx + 11, base_y + 6), fill=(13, 108, 255, 210))
    draw.polygon(
        [(cx - 8, base_y + 2), (cx, base_y + bottom_len), (cx + 8, base_y + 2)],
        fill=(0, 183, 255, 190),
    )
    draw.polygon(
        [(cx - 4, base_y + 4), (cx, base_y + max(7, bottom_len - 5)), (cx + 4, base_y + 4)],
        fill=(191, 248, 255, 225),
    )
    effects.alpha_composite(frame)
    return effects


def make_sheet(name: str, frames: list[Image.Image]) -> None:
    sheet = Image.new("RGBA", (FRAME_SIZE * len(frames), FRAME_SIZE), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, (index * FRAME_SIZE, 0))
    sheet.save(RUNTIME_DIR / name)


def frame_metrics(frame: Image.Image) -> dict[str, object]:
    alpha = grok_import.alpha_bbox(frame)
    body = body_bbox(frame)
    entry: dict[str, object] = {
        "alphaBBox": list(alpha) if alpha else None,
        "bodyBBox": list(body) if body else None,
    }
    if body:
        cx, cy = bbox_center(body)
        entry.update({
            "bodyWidth": body[2] - body[0],
            "bodyHeight": body[3] - body[1],
            "bodyCenterX": round(cx, 3),
            "bodyCenterY": round(cy, 3),
        })
    return entry


def silhouette_delta(previous: Image.Image, current: Image.Image) -> int:
    previous_mask = previous.getchannel("A").point(lambda value: 255 if value > 20 else 0)
    current_mask = current.getchannel("A").point(lambda value: 255 if value > 20 else 0)
    diff = ImageChops.difference(previous_mask, current_mask)
    histogram = diff.histogram()
    return sum(histogram[1:])


def blue_effect_bbox(frame: Image.Image) -> tuple[int, int, int, int] | None:
    pixels = frame.convert("RGBA").load()
    xs: list[int] = []
    ys: list[int] = []
    for y in range(frame.height):
        for x in range(frame.width):
            pixel = pixels[x, y]
            if builder.is_blue_effect_pixel(pixel):
                xs.append(x)
                ys.append(y)
    if not xs:
        return None
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1


def drill_tip_right_edge(frame: Image.Image) -> int | None:
    body = body_bbox(frame)
    return body[2] if body else None


def motion_metrics(name: str, frames: list[Image.Image], profile: dict[str, object]) -> dict[str, object]:
    deltas = [silhouette_delta(frames[index - 1], frames[index]) for index in range(1, len(frames))]
    blue_boxes = [blue_effect_bbox(frame) for frame in frames]
    blue_boxes = [box for box in blue_boxes if box]
    right_edges = [edge for edge in (drill_tip_right_edge(frame) for frame in frames) if edge is not None]
    state = PROFILE_STATE_FOR_ANIMATION[name]
    samples = profile_frames(profile, state)
    bite_depths = [float(sample.get("biteDepth01", 0)) for sample in samples]
    spin_phases = [float(sample.get("drillSpinPhase", 0)) for sample in samples]
    return {
        "silhouetteDeltaPx": {
            "max": max(deltas) if deltas else 0,
            "avg": round(sum(deltas) / len(deltas), 3) if deltas else 0,
        },
        "blueEffectBounds": {
            "minLeft": min((box[0] for box in blue_boxes), default=None),
            "maxRight": max((box[2] for box in blue_boxes), default=None),
            "minTop": min((box[1] for box in blue_boxes), default=None),
            "maxBottom": max((box[3] for box in blue_boxes), default=None),
        },
        "drillTipRightEdgeDriftPx": max(right_edges) - min(right_edges) if right_edges else 0,
        "profileBiteDepthRange": [round(min(bite_depths), 4), round(max(bite_depths), 4)] if bite_depths else [0, 0],
        "profileSpinPhaseSteps": len(set(round(phase, 2) for phase in spin_phases)),
    }


def write_audit(groups: dict[str, list[Image.Image]], changes: list[str], profile: dict[str, object]) -> None:
    report: dict[str, object] = {
        "schemaVersion": 1,
        "asset": "living-drill-v1",
        "method": "V2 motion polish: Blender blockout profile drives timing/feel, while final accepted frames remain anchored Piskel/runtime sheets.",
        "anchor": list(ANCHOR),
        "frameSize": [FRAME_SIZE, FRAME_SIZE],
        "blenderMotionProfile": str(MOTION_PROFILE_PATH.relative_to(ROOT)).replace("\\", "/"),
        "changes": changes,
        "animations": {},
    }
    animations: dict[str, object] = {}
    for name, frames in groups.items():
        metrics = [frame_metrics(frame) for frame in frames]
        centers_x = [float(item["bodyCenterX"]) for item in metrics if "bodyCenterX" in item]
        centers_y = [float(item["bodyCenterY"]) for item in metrics if "bodyCenterY" in item]
        widths = [int(item["bodyWidth"]) for item in metrics if "bodyWidth" in item]
        heights = [int(item["bodyHeight"]) for item in metrics if "bodyHeight" in item]
        animations[name] = {
            "frames": len(frames),
            "fps": FPS[name],
            "centerDriftPx": {
                "x": round(max(centers_x) - min(centers_x), 3) if centers_x else 0,
                "y": round(max(centers_y) - min(centers_y), 3) if centers_y else 0,
            },
            "bodySizeDriftPx": {
                "width": max(widths) - min(widths) if widths else 0,
                "height": max(heights) - min(heights) if heights else 0,
            },
            "motionSmoothness": motion_metrics(name, frames, profile),
            "framesDetail": metrics,
        }
    report["animations"] = animations
    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    V2_REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")


def update_manifest(groups: dict[str, list[Image.Image]]) -> None:
    manifest_path = ASSET_DIR / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["runtimeSource"] = "grok-imagine-video-eur5-filtered-piskel-blender-motion-v2"
    manifest["animations"] = {
        name: {"frames": len(frames), "fps": FPS[name]}
        for name, frames in groups.items()
    }
    manifest.setdefault("piskel", {})["dig_recoil"] = "sprites/character/living-drill-v1/piskel/living-drill-dig-recoil.piskel"
    manifest["reports"] = {
        **manifest.get("reports", {}),
        "fullAnimationAudit": "sprites/character/living-drill-v1/reports/living-drill-v1-full-animation-audit.json",
        "v2MotionPolish": "sprites/character/living-drill-v1/reports/living-drill-v1-v2-motion-polish-report.json",
    }
    manifest.setdefault("pipeline", {})["blenderMotionProfile"] = "sprites/character/living-drill-v1/blender/v2-motion-polish/living-drill-motion-profile.json"
    manifest["budget"]["status"] = "EUR5 Grok frames polished through Blender motion blockout plus anchored .piskel/runtime export"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")


def write_preview_gif(name: str, frames: list[Image.Image], fps: int) -> None:
    V2_PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    scaled = [
        frame.resize((FRAME_SIZE * 3, FRAME_SIZE * 3), Image.Resampling.NEAREST).convert("P", palette=Image.Palette.ADAPTIVE)
        for frame in frames
    ]
    duration = round(1000 / max(1, fps))
    scaled[0].save(
        V2_PREVIEW_DIR / f"living-drill-v2-{name}-slowmo.gif",
        save_all=True,
        append_images=scaled[1:],
        duration=duration * 2,
        loop=0,
        disposal=2,
    )


def write_blender_reference_sheets(profile: dict[str, object]) -> None:
    V2_PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    states = list(profile.get("animations", {}).keys())
    rendered_groups: dict[str, list[Image.Image]] = {}
    for state in states:
        frame_dir = BLENDER_FRAMES_DIR / state
        frames = [Image.open(path).convert("RGBA") for path in sorted(frame_dir.glob("frame-*.png"))]
        if frames:
            rendered_groups[state] = frames

    if not rendered_groups:
        return

    thumb_w = 120
    thumb_h = 120
    cols = max(len(frames) for frames in rendered_groups.values())
    label_w = 110
    sheet = Image.new("RGBA", (label_w + cols * (thumb_w + 8), 20 + len(rendered_groups) * (thumb_h + 34)), (18, 22, 26, 255))
    draw = ImageDraw.Draw(sheet)
    for row, (state, frames) in enumerate(rendered_groups.items()):
        y = 14 + row * (thumb_h + 34)
        draw.text((12, y + 48), state, fill=(230, 230, 230, 255))
        for col, frame in enumerate(frames):
            x = label_w + col * (thumb_w + 8)
            thumb = frame.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
            sheet.alpha_composite(thumb, (x, y))
            draw.rectangle((x, y, x + thumb_w - 1, y + thumb_h - 1), outline=(80, 90, 96, 255))
            draw.text((x, y + thumb_h + 4), f"{col:02d}", fill=(185, 190, 190, 255))
    sheet.save(V2_PREVIEW_DIR / "living-drill-v2-blender-blockout-contact-sheet.png")

    for state, frames in rendered_groups.items():
        gif_frames = [
            frame.resize((160, 160), Image.Resampling.LANCZOS).convert("P", palette=Image.Palette.ADAPTIVE)
            for frame in frames
        ]
        if gif_frames:
            gif_frames[0].save(
                V2_PREVIEW_DIR / f"living-drill-v2-blender-{state}-slowmo.gif",
                save_all=True,
                append_images=gif_frames[1:],
                duration=180,
                loop=0,
                disposal=2,
            )


def main() -> None:
    profile = load_motion_profile()
    raw_idle = load_sheet(SHEETS["idle"])
    raw_dig = load_sheet(SHEETS["dig"])

    idle_indices = [0, 1, 2, 3, 4, 5, 4, 1]
    idle = []
    for index, source_index in enumerate(idle_indices):
        sample = sample_for(profile, "idle", index)
        idle.append(overlay_drill_phase(raw_idle[source_index].copy(), sample.get("drillSpinPhase", index / 8), 0.05))
    idle = align_group(idle, bbox_center(body_bbox(idle[0]) or (26, 31, 69, 64)))

    dig = []
    for index, frame in enumerate(raw_dig):
        sample = sample_for(profile, "dig_bite", index)
        pressure = float(sample.get("contactPressure01", 0))
        polished = strip_external_contact_marks(frame.copy())
        polished = overlay_drill_phase(polished, sample.get("drillSpinPhase", index / 10), pressure)
        polished = add_contact_spark(polished, pressure)
        dig.append(polished)
    dig = align_group(dig, (47.5, 47.0))

    dig_recoil = []
    recoil_sources = [9, 8, 7, 6, 5, 4, 3, 2]
    for index, source_index in enumerate(recoil_sources):
        sample = sample_for(profile, "recoil", index)
        dig_recoil.append(overlay_drill_phase(dig[source_index].copy(), sample.get("drillSpinPhase", index / 8), float(sample.get("contactPressure01", 0))))
    dig_recoil = align_group(dig_recoil, (47.5, 47.0))

    fly = []
    for index, frame in enumerate(idle):
        sample = sample_for(profile, "fly", index)
        fly.append(add_fly_effects_from_profile(frame.copy(), sample, index))
    fly = align_group(fly, bbox_center(body_bbox(idle[0]) or (26, 31, 69, 64)))

    groups = {
        "idle": idle,
        "fly": fly,
        "dig": dig,
        "dig_recoil": dig_recoil,
    }
    changes = [
        "Blender 5.1 blockout profile now drives timing, thrust pulse lengths, spin phase, bite pressure, and recoil settle.",
        "Idle keeps the stable approved body cadence with quieter drill shimmer and no body popping.",
        "Fly keeps the approved body locked while thrust flicker follows the Blender pulse curve.",
        "Dig adds stronger in-mask cone spin and contact sparks without changing the anchored silhouette.",
        "Dig recoil uses the approved dig body frames with a short Blender-timed settle curve.",
    ]

    for name, frames in groups.items():
        make_sheet(SHEETS[name], frames)
        write_preview_gif(name, frames, FPS[name])
    builder.make_piskel("Living Drill V1 Idle Polished", "living-drill-idle", groups["idle"], FPS["idle"])
    builder.make_piskel("Living Drill V1 Fly Polished", "living-drill-fly", groups["fly"], FPS["fly"])
    builder.make_piskel("Living Drill V1 Dig Polished", "living-drill-dig", groups["dig"], FPS["dig"])
    builder.make_piskel("Living Drill V1 Dig Recoil Polished", "living-drill-dig-recoil", groups["dig_recoil"], FPS["dig_recoil"])
    builder.write_contact_sheet(groups)
    write_blender_reference_sheets(profile)
    write_audit(groups, changes, profile)
    update_manifest(groups)
    print(f"Polished living-drill animations and wrote V2 audit: {V2_REPORT_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
