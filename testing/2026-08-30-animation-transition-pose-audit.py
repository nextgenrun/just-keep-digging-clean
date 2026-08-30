"""Measure and render the player poses used at locomotion and ledge handoffs."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "sprites/character/survival-character-unified-v1/runtime"
OUTPUT = ROOT / "testing/2026-08-30-animation-transition-pose-audit.png"
WALK_GIF = ROOT / "testing/2026-08-30-walk-handoff-polish.gif"
LEDGE_GIF = ROOT / "testing/2026-08-30-ledge-catch-polish.gif"
FRAME_SIZE = 256
SHEET_COLUMNS = 16
ALPHA_THRESHOLD = 12
PREVIEW_SIZE = 112

SHEETS = {
    "idle": ("2026-08-25-survival-blender-v2-idle-sheet.webp", 48),
    "start": ("2026-08-25-survival-mixamo-v1-walk-start-sheet.webp", 16),
    "walk": ("2026-08-25-survival-mixamo-v1-walk-loop-sheet.webp", 24),
    "stop": ("2026-08-25-survival-mixamo-v1-walk-stop-sheet.webp", 16),
    "ledge": ("2026-08-25-survival-mixamo-v4-ledge-climb-sheet.webp", 35),
}


def load_frames(file_name: str, count: int) -> list[Image.Image]:
    with Image.open(RUNTIME / file_name) as source:
        sheet = source.convert("RGBA")
    return [
        sheet.crop((
            index % SHEET_COLUMNS * FRAME_SIZE,
            index // SHEET_COLUMNS * FRAME_SIZE,
            index % SHEET_COLUMNS * FRAME_SIZE + FRAME_SIZE,
            index // SHEET_COLUMNS * FRAME_SIZE + FRAME_SIZE,
        ))
        for index in range(count)
    ]


def alpha_mask(frame: Image.Image) -> Image.Image:
    return frame.getchannel("A").point(
        lambda value: 255 if value > ALPHA_THRESHOLD else 0,
    )


def pose_distance(left: Image.Image, right: Image.Image) -> float:
    """Return silhouette disagreement in the shared, already anchored canvas."""
    left_pixels = alpha_mask(left).load()
    right_pixels = alpha_mask(right).load()
    disagreement = 0
    union = 0
    for y in range(FRAME_SIZE):
        for x in range(FRAME_SIZE):
            left_on = left_pixels[x, y] > 0
            right_on = right_pixels[x, y] > 0
            union += left_on or right_on
            disagreement += left_on != right_on
    return disagreement / max(1, union)


def closest(source: Image.Image, candidates: list[Image.Image], indices=None):
    candidate_indices = list(indices if indices is not None else range(len(candidates)))
    scored = [(pose_distance(source, candidates[index]), index) for index in candidate_indices]
    return min(scored)


def checker(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size), "#152031")
    draw = ImageDraw.Draw(image)
    block = 8
    for y in range(0, size, block):
        for x in range(0, size, block):
            if (x // block + y // block) % 2 == 0:
                draw.rectangle((x, y, x + block - 1, y + block - 1), fill="#1d2a3e")
    return image


def preview(frame: Image.Image) -> Image.Image:
    scaled = frame.resize((PREVIEW_SIZE, PREVIEW_SIZE), Image.Resampling.LANCZOS)
    background = checker(PREVIEW_SIZE)
    background.alpha_composite(scaled)
    return background.convert("RGB")


def paste_cell(canvas, draw, frame, label, column, row, accent="#d9e6ff"):
    x = 18 + column * (PREVIEW_SIZE + 12)
    y = 48 + row * (PREVIEW_SIZE + 34)
    canvas.paste(preview(frame), (x, y))
    draw.rectangle((x, y, x + PREVIEW_SIZE - 1, y + PREVIEW_SIZE - 1), outline=accent, width=2)
    draw.text((x, y + PREVIEW_SIZE + 5), label, fill=accent, font=ImageFont.load_default())


def playback_frame(frame: Image.Image, label: str, accent: str) -> Image.Image:
    canvas = Image.new("RGB", (320, 320), "#0b1220")
    stage = checker(FRAME_SIZE)
    stage.alpha_composite(frame)
    canvas.paste(stage.convert("RGB"), (32, 40))
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((32, 40, 287, 295), outline=accent, width=3)
    draw.text((32, 16), label, fill=accent, font=ImageFont.load_default())
    return canvas


def save_playback(path: Path, sequence, durations):
    rendered = [playback_frame(frame, label, accent) for frame, label, accent in sequence]
    rendered[0].save(
        path,
        save_all=True,
        append_images=rendered[1:],
        duration=durations,
        loop=0,
        disposal=2,
    )


frames = {name: load_frames(*spec) for name, spec in SHEETS.items()}
start_to_walk = closest(frames["start"][-1], frames["walk"])
walk_to_stop_zero = closest(frames["stop"][0], frames["walk"])
stop_start_by_walk = [
    closest(walk_frame, frames["stop"], range(8))[1]
    for walk_frame in frames["walk"]
]

report = {
    "resumeWalkFrameAfterStart": start_to_walk[1],
    "startToWalkSilhouetteDistance": round(start_to_walk[0], 4),
    "walkFrameClosestToStopZero": walk_to_stop_zero[1],
    "walkToStopZeroSilhouetteDistance": round(walk_to_stop_zero[0], 4),
    "stopStartFrameByOutgoingWalkFrame": stop_start_by_walk,
    "legacyAverageStopEntryDistance": round(
        sum(pose_distance(frame, frames["stop"][0]) for frame in frames["walk"])
        / len(frames["walk"]),
        4,
    ),
    "phaseMatchedAverageStopEntryDistance": round(
        sum(
            pose_distance(frame, frames["stop"][stop_start_by_walk[index]])
            for index, frame in enumerate(frames["walk"])
        ) / len(frames["walk"]),
        4,
    ),
}
assert report["resumeWalkFrameAfterStart"] == 11, report
assert (
    report["phaseMatchedAverageStopEntryDistance"]
    <= report["legacyAverageStopEntryDistance"] * 0.85
), report

columns = 6
rows = 11
canvas = Image.new(
    "RGB",
    (36 + columns * (PREVIEW_SIZE + 12), 62 + rows * (PREVIEW_SIZE + 34)),
    "#0b1220",
)
draw = ImageDraw.Draw(canvas)
draw.text((18, 16), "2026-08-30 player animation handoff pose audit", fill="#ffffff")

paste_cell(canvas, draw, frames["start"][-1], "start 15", 0, 0, "#80dfff")
paste_cell(canvas, draw, frames["walk"][start_to_walk[1]], f"walk {start_to_walk[1]}", 1, 0, "#80dfff")
paste_cell(canvas, draw, frames["walk"][walk_to_stop_zero[1]], f"walk {walk_to_stop_zero[1]}", 3, 0, "#ffcb74")
paste_cell(canvas, draw, frames["stop"][0], "stop 0", 4, 0, "#ffcb74")

for pair_index, walk_index in enumerate(range(0, 24, 3)):
    row = 1 + pair_index // 3
    column = (pair_index % 3) * 2
    stop_index = stop_start_by_walk[walk_index]
    paste_cell(canvas, draw, frames["walk"][walk_index], f"walk {walk_index}", column, row)
    paste_cell(canvas, draw, frames["stop"][stop_index], f"stop {stop_index}", column + 1, row)

ledge_row = 4
for column, ledge_index in enumerate((5, 4, 3, 2, 1, 0)):
    paste_cell(canvas, draw, frames["ledge"][ledge_index], f"catch {ledge_index}", column, ledge_row, "#b8ff9c")

for pair_index, walk_index in enumerate(range(1, 24, 3)):
    row = 5 + pair_index // 3
    column = (pair_index % 3) * 2
    stop_index = stop_start_by_walk[walk_index]
    paste_cell(canvas, draw, frames["walk"][walk_index], f"walk {walk_index}", column, row)
    paste_cell(canvas, draw, frames["stop"][stop_index], f"stop {stop_index}", column + 1, row)

print("ANIMATION_TRANSITION_POSE_AUDIT", json.dumps(report))
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
canvas.save(OUTPUT)
walk_sequence = [
    (frame, f"walk start {index}", "#80dfff")
    for index, frame in enumerate(frames["start"])
]
walk_indices = list(range(start_to_walk[1], 24)) + list(range(4))
walk_sequence.extend(
    (frames["walk"][index], f"walk loop {index}", "#d9e6ff")
    for index in walk_indices
)
representative_stop_start = stop_start_by_walk[walk_indices[-1]]
walk_sequence.extend(
    (frames["stop"][index], f"walk stop {index}", "#ffcb74")
    for index in range(representative_stop_start, 16)
)
walk_sequence.extend((frames["idle"][0], "idle", "#b8ff9c") for _ in range(5))
save_playback(
    WALK_GIF,
    walk_sequence,
    [33] * 16
    + [42] * len(walk_indices)
    + [33] * (16 - representative_stop_start)
    + [60] * 5,
)

ledge_sequence = [
    (frames["ledge"][index], f"ledge catch {index}", "#b8ff9c")
    for index in (5, 4, 3, 2, 1, 0)
]
ledge_sequence.extend((frames["ledge"][0], "ledge hold", "#80dfff") for _ in range(4))
ledge_sequence.extend(
    (frame, f"ledge climb {index}", "#ffcb74")
    for index, frame in enumerate(frames["ledge"])
)
save_playback(LEDGE_GIF, ledge_sequence, [33] * 6 + [50] * 4 + [33] * 35)
print(OUTPUT)
print(WALK_GIF)
print(LEDGE_GIF)
