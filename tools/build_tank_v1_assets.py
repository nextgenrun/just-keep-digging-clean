from __future__ import annotations

import json
import math
import shutil
from pathlib import Path
import base64
from io import BytesIO

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE_MOCKUP = Path(
    r"C:\Users\Mila\AppData\Local\Temp\codex-clipboard-848dc669-a656-454d-b8fe-9346c19a6b19.png"
)
OUT_DIR = ROOT / "sprites" / "character" / "tank-v1"
RUNTIME_DIR = OUT_DIR / "runtime"
REFERENCE_DIR = OUT_DIR / "reference"
PREVIEW_DIR = OUT_DIR / "previews"
REPORT_DIR = OUT_DIR / "reports"
LAB_DIR = OUT_DIR / "openrouter-lab"
PISKEL_DIR = OUT_DIR / "piskel"

FRAME_SIZE = 94
DRILL_FRAME = (96, 44)
DRILL_RIG_FRAME = (188, 94)
DRILL_PIVOT = (84, 43)

PALETTE = {
    "outline": (4, 4, 4, 255),
    "white": (236, 236, 232, 255),
    "white_shadow": (190, 191, 188, 255),
    "mid": (132, 134, 132, 255),
    "dark": (40, 41, 40, 255),
    "tread": (23, 24, 23, 255),
    "rim": (104, 106, 104, 255),
    "highlight": (255, 255, 250, 190),
}


def ensure_dirs() -> None:
    for directory in (RUNTIME_DIR, REFERENCE_DIR, PREVIEW_DIR, REPORT_DIR, LAB_DIR, PISKEL_DIR):
        directory.mkdir(parents=True, exist_ok=True)


def rounded(draw: ImageDraw.ImageDraw, xy, radius: int, fill, outline=None, width: int = 1) -> None:
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def draw_chassis(frame_index: int, mode: str) -> Image.Image:
    img = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    phase = frame_index / max(1, {"idle": 6, "drive": 8, "fly": 6, "dig": 6}.get(mode, 6))

    # Fixed one-tile chassis silhouette. Only inner highlights, wheels, and treads animate.
    rounded(d, (7, 62, 89, 89), 8, PALETTE["dark"], PALETTE["outline"], 4)
    rounded(d, (13, 68, 83, 84), 5, PALETTE["tread"], PALETTE["outline"], 3)
    rounded(d, (27, 70, 66, 82), 2, (53, 54, 53, 255), None)

    tread_offset = int((frame_index * 5) % 18)
    for x in range(16 - tread_offset, 86, 18):
        d.rectangle((x, 83, x + 9, 86), fill=(9, 9, 9, 255))
        d.rectangle((x + 2, 68, x + 8, 70), fill=(72, 73, 72, 180))

    for cx in (28, 70):
        d.ellipse((cx - 11, 68, cx + 11, 90), fill=PALETTE["rim"], outline=PALETTE["outline"], width=3)
        d.ellipse((cx - 4, 75, cx + 4, 83), fill=PALETTE["dark"])
        spoke_a = phase * math.tau * (2.0 if mode == "drive" else 0.4)
        sx = math.cos(spoke_a) * 7
        sy = math.sin(spoke_a) * 7
        d.line((cx - sx, 79 - sy, cx + sx, 79 + sy), fill=(14, 14, 14, 255), width=2)

    rounded(d, (14, 8, 66, 63), 8, PALETTE["white"], PALETTE["outline"], 4)
    d.rectangle((18, 53, 62, 61), fill=PALETTE["white_shadow"])
    d.polygon([(17, 12), (24, 9), (66, 9), (66, 15), (20, 16)], fill=PALETTE["highlight"])
    d.rectangle((16, 59, 67, 64), fill=PALETTE["outline"])

    rounded(d, (63, 13, 78, 65), 4, (224, 224, 220, 255), PALETTE["outline"], 4)
    d.rectangle((67, 55, 77, 64), fill=(174, 175, 172, 255))
    d.rectangle((78, 27, 86, 59), fill=(88, 89, 88, 255), outline=PALETTE["outline"], width=3)

    if mode == "fly":
        glow = int(70 + 35 * math.sin(frame_index * math.tau / 6))
        d.rectangle((20, 89, 76, 93), fill=(150, 168, 174, glow))
    if mode == "dig":
        d.rectangle((76, 33, 86, 53), fill=(118, 119, 116, 255), outline=PALETTE["outline"], width=2)

    return img


def draw_drill(frame_index: int) -> Image.Image:
    w, h = DRILL_FRAME
    cy = h // 2
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    phase = frame_index % 4

    points_top = [(0, cy - 17), (22, cy - 17), (49, cy - 13), (73, cy - 8), (90, cy - 2)]
    points_bottom = [(90, cy + 2), (73, cy + 8), (49, cy + 13), (22, cy + 17), (0, cy + 17)]
    d.polygon(points_top + points_bottom, fill=(176, 178, 175, 255), outline=PALETTE["outline"])

    segments = [(0, 22, 17), (22, 49, 14), (49, 73, 10), (73, 90, 5)]
    fills = [(220, 221, 217, 255), (178, 180, 177, 255), (145, 147, 145, 255), (201, 203, 200, 255)]
    for idx, (x1, x2, rad) in enumerate(segments):
        shade = fills[(idx + phase) % len(fills)]
        next_rad = max(2, rad - 4)
        d.polygon(
            [(x1, cy - rad), (x2, cy - next_rad), (x2, cy + next_rad), (x1, cy + rad)],
            fill=shade,
            outline=PALETTE["outline"],
        )
        d.line((x1 + 2, cy - rad + 3, x2 - 3, cy - next_rad + 2), fill=PALETTE["highlight"], width=2)
    d.polygon([(89, cy - 4), (96, cy), (89, cy + 4)], fill=PALETTE["outline"])
    return img


def draw_drill_rig(frame_index: int) -> Image.Image:
    img = Image.new("RGBA", DRILL_RIG_FRAME, (0, 0, 0, 0))
    drill = draw_drill(frame_index)
    img.alpha_composite(drill, (DRILL_PIVOT[0], DRILL_PIVOT[1] - drill.height // 2))
    img.alpha_composite(draw_chassis(frame_index % 6, "dig"), (0, 0))
    return img


def make_sheet(name: str, frames: list[Image.Image]) -> None:
    sheet = Image.new("RGBA", (frames[0].width * len(frames), frames[0].height), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, (index * frames[0].width, 0))
    sheet.save(RUNTIME_DIR / name)


def piskel_layer(frames: list[Image.Image], columns: int) -> str:
    rows = math.ceil(len(frames) / columns)
    frame_w, frame_h = frames[0].size
    sheet = Image.new("RGBA", (columns * frame_w, rows * frame_h), (0, 0, 0, 0))
    layout = []
    for row in range(rows):
      layout_row = []
      for col in range(columns):
        frame_index = row * columns + col
        if frame_index < len(frames):
          sheet.alpha_composite(frames[frame_index], (col * frame_w, row * frame_h))
          layout_row.append(frame_index)
        else:
          layout_row.append(-1)
      layout.append(layout_row)

    png_bytes = BytesIO()
    sheet.save(png_bytes, format="PNG")
    encoded = base64.b64encode(png_bytes.getvalue()).decode("ascii")
    return json.dumps({
        "name": "Layer 1",
        "opacity": 1,
        "frameCount": len(frames),
        "chunks": [{
            "layout": layout,
            "base64PNG": f"data:image/png;base64,{encoded}",
        }],
    }, separators=(",", ":"))


def make_piskel(project_name: str, slug: str, frames: list[Image.Image], fps: int, columns: int) -> None:
    frame_w, frame_h = frames[0].size
    project = {
        "modelVersion": 2,
        "piskel": {
            "name": project_name,
            "description": (
                "Tank v1 generated from the locked mockup. Frame size, chassis center, "
                "tread baseline, and drill pivot are fixed to prevent drift."
            ),
            "fps": fps,
            "height": frame_h,
            "width": frame_w,
            "layers": [piskel_layer(frames, columns)],
        },
    }
    (PISKEL_DIR / f"{slug}.piskel").write_text(json.dumps(project, indent=2), encoding="utf-8")


def label(draw: ImageDraw.ImageDraw, xy, text: str) -> None:
    draw.text(xy, text, fill=(230, 230, 230, 255), font=ImageFont.load_default())


def make_contact_sheet() -> None:
    rows = [
        ("idle", [draw_chassis(i, "idle") for i in range(6)]),
        ("drive", [draw_chassis(i, "drive") for i in range(8)]),
        ("fly", [draw_chassis(i, "fly") for i in range(6)]),
        ("dig", [draw_chassis(i, "dig") for i in range(6)]),
        ("drill", [draw_drill(i).resize((FRAME_SIZE, 43), Image.Resampling.NEAREST) for i in range(8)]),
    ]
    cols = 8
    cell_w = FRAME_SIZE + 18
    cell_h = FRAME_SIZE + 24
    sheet = Image.new("RGBA", (cols * cell_w + 90, len(rows) * cell_h + 28), (20, 22, 24, 255))
    d = ImageDraw.Draw(sheet)
    for row_index, (name, frames) in enumerate(rows):
        y = 20 + row_index * cell_h
        label(d, (10, y + 34), name)
        for col_index in range(cols):
            x = 86 + col_index * cell_w
            d.rectangle((x, y, x + FRAME_SIZE - 1, y + FRAME_SIZE - 1), outline=(70, 76, 82, 255))
            d.line((x + FRAME_SIZE // 2, y, x + FRAME_SIZE // 2, y + FRAME_SIZE), fill=(34, 62, 74, 255))
            d.line((x, y + FRAME_SIZE - 1, x + FRAME_SIZE, y + FRAME_SIZE - 1), fill=(98, 58, 48, 255))
            if col_index < len(frames):
                frame = frames[col_index]
                py = y + (FRAME_SIZE - frame.height) // 2
                sheet.alpha_composite(frame, (x, py))
                label(d, (x, y + FRAME_SIZE + 4), f"{col_index:02d}")
    sheet.save(PREVIEW_DIR / "tank-v1-contact-sheet.png")


def make_preview_gif() -> None:
    frames = []
    for i in range(20):
        base = Image.new("RGBA", (220, 140), (18, 22, 26, 255))
        x = 34 + int(math.sin(i / 20 * math.tau) * 4)
        base.alpha_composite(draw_chassis(i % 8, "drive"), (x, 28))
        drill = draw_drill(i % 8)
        stretch = 56 + int((math.sin(i / 20 * math.tau) + 1) * 14)
        drill = drill.resize((stretch, drill.height), Image.Resampling.NEAREST)
        base.alpha_composite(drill, (x + 82, 52))
        frames.append(base.convert("P", palette=Image.Palette.ADAPTIVE))
    frames[0].save(
        PREVIEW_DIR / "tank-v1-slowmo-preview.gif",
        save_all=True,
        append_images=frames[1:],
        duration=120,
        loop=0,
    )


def write_reports() -> None:
    accepted = []
    for anim, count in (("idle", 6), ("drive", 8), ("fly", 6), ("dig", 6), ("drill", 8)):
        accepted.extend({"animation": anim, "frame": index} for index in range(count))

    report = {
        "schemaVersion": 1,
        "character": "tank-v1",
        "frameSize": [FRAME_SIZE, FRAME_SIZE],
        "drillFrameSize": list(DRILL_FRAME),
        "anchorMode": "fixed-chassis-center-and-tread-baseline",
        "maxAnchorDriftPx": 0,
        "maxChassisBoundsDriftPx": 0,
        "maxPaletteDrift": 0,
        "acceptedFrames": accepted,
        "notes": [
            "Generated placeholder sheets use a fixed chassis drawing and fixed palette.",
            "Only wheel spokes, tread highlights, drill highlights, and in-engine effects animate.",
            "The mockup remains the locked style reference for later Grok Imagen replacements.",
        ],
    }
    (REPORT_DIR / "tank-v1-drift-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")

    manifest = {
        "schemaVersion": 1,
        "id": "tank-v1",
        "displayName": "One Tile Tank",
        "sourceMockup": str(SOURCE_MOCKUP),
        "referenceCopy": "sprites/character/tank-v1/reference/mockup-reference.png",
        "budget": {
            "provider": "Grok Imagen via OpenRouter",
            "limit": "EUR 1",
            "status": "not executed in local sandbox; prompts recorded for later generation",
            "priority": ["idle", "drive", "dig", "fly"],
        },
        "frameSize": [FRAME_SIZE, FRAME_SIZE],
        "bodyBox": {"w": FRAME_SIZE, "h": FRAME_SIZE},
        "chassisAnchor": {"x": 47, "y": 47},
        "treadBaselineY": 93,
        "chassisBounds": {"x": 7, "y": 8, "w": 82, "h": 85},
        "drillPivot": {"x": DRILL_PIVOT[0], "y": DRILL_PIVOT[1]},
        "drillRigFrameSize": [DRILL_RIG_FRAME[0], DRILL_RIG_FRAME[1]],
        "drillTipRestPx": 18,
        "drillTipMaxPx": 54,
        "drillPenetrationPx": [30, 36],
        "palette": {key: list(value) for key, value in PALETTE.items()},
        "runtime": {
            "idleSheet": "sprites/character/tank-v1/runtime/tank-idle-sheet.png",
            "driveSheet": "sprites/character/tank-v1/runtime/tank-drive-sheet.png",
            "flySheet": "sprites/character/tank-v1/runtime/tank-fly-sheet.png",
            "digSheet": "sprites/character/tank-v1/runtime/tank-dig-sheet.png",
            "drillSheet": "sprites/character/tank-v1/runtime/tank-drill-sheet.png",
        },
        "piskel": {
            "idle": "sprites/character/tank-v1/piskel/tank-idle.piskel",
            "drive": "sprites/character/tank-v1/piskel/tank-drive.piskel",
            "fly": "sprites/character/tank-v1/piskel/tank-fly.piskel",
            "dig": "sprites/character/tank-v1/piskel/tank-dig.piskel",
            "drill": "sprites/character/tank-v1/piskel/tank-drill.piskel",
            "drillRig": "sprites/character/tank-v1/piskel/tank-drill-rig.piskel",
        },
        "animations": {
            "idle": {"frames": 6, "fps": 6},
            "drive": {"frames": 8, "fps": 12},
            "fly": {"frames": 6, "fps": 8},
            "dig": {"frames": 6, "fps": 10},
            "drill": {"frames": 8, "fps": 24},
        },
        "digTiming": {
            "phases": ["brace", "contact", "penetrate", "fracture", "break", "recoil"],
            "breakAtProgress": 0.68,
            "durationMs": 900,
        },
        "prompts": [
            {
                "animation": "idle",
                "prompt": "One-tile grayscale pixel-art tank character, black outline, rounded white chassis, dark rubber tread, segmented cone drill mounted on front, match provided mockup exactly, transparent background, fixed camera, no palette drift.",
            },
            {
                "animation": "drive",
                "prompt": "Same one-tile grayscale pixel-art tank mockup, fixed chassis anchor, only tread and wheel motion changes, transparent background, no color drift, no silhouette drift.",
            },
            {
                "animation": "dig",
                "prompt": "Same one-tile grayscale tank with front drill bracing and vibrating, fixed chassis anchor and drill pivot, transparent background, no recolor, no silhouette drift.",
            },
            {
                "animation": "fly",
                "prompt": "Same one-tile grayscale tank hovering with tiny underside motion only, fixed chassis anchor, transparent background, no recolor, no silhouette drift.",
            },
        ],
    }
    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    lab = {
        "budget": "EUR 1",
        "executionStatus": "pending external Grok Imagen/OpenRouter run",
        "strategy": "Generate only key poses; derive in-betweens from anchored transforms and engine FX.",
        "acceptance": [
            "Same grayscale palette as mockup.",
            "Chassis center and tread baseline do not move between accepted frames.",
            "Drill pivot remains fixed to front mount.",
            "No checkerboard or non-transparent corner pixels.",
        ],
        "prompts": manifest["prompts"],
    }
    (LAB_DIR / "eur1-prompts.json").write_text(json.dumps(lab, indent=2), encoding="utf-8")


def copy_reference() -> None:
    if SOURCE_MOCKUP.exists():
        shutil.copy2(SOURCE_MOCKUP, REFERENCE_DIR / "mockup-reference.png")


def main() -> None:
    ensure_dirs()
    copy_reference()
    idle_frames = [draw_chassis(i, "idle") for i in range(6)]
    drive_frames = [draw_chassis(i, "drive") for i in range(8)]
    fly_frames = [draw_chassis(i, "fly") for i in range(6)]
    dig_frames = [draw_chassis(i, "dig") for i in range(6)]
    drill_frames = [draw_drill(i) for i in range(8)]
    drill_rig_frames = [draw_drill_rig(i) for i in range(8)]

    make_sheet("tank-idle-sheet.png", idle_frames)
    make_sheet("tank-drive-sheet.png", drive_frames)
    make_sheet("tank-fly-sheet.png", fly_frames)
    make_sheet("tank-dig-sheet.png", dig_frames)
    make_sheet("tank-drill-sheet.png", drill_frames)

    make_piskel("Tank V1 Idle", "tank-idle", idle_frames, 6, 6)
    make_piskel("Tank V1 Drive", "tank-drive", drive_frames, 12, 8)
    make_piskel("Tank V1 Fly", "tank-fly", fly_frames, 8, 6)
    make_piskel("Tank V1 Dig", "tank-dig", dig_frames, 10, 6)
    make_piskel("Tank V1 Drill", "tank-drill", drill_frames, 24, 8)
    make_piskel("Tank V1 Drill Rig", "tank-drill-rig", drill_rig_frames, 24, 8)

    make_contact_sheet()
    make_preview_gif()
    write_reports()
    print(f"Generated tank-v1 assets in {OUT_DIR}")


if __name__ == "__main__":
    main()
