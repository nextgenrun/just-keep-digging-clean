"""Convert Unreal walk renders into the Legacy Miner 341px/51-frame 2D contract."""

from __future__ import annotations

import json
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter


PROJECT_DIR = Path(__file__).resolve().parents[1]
SOURCE_DIR = PROJECT_DIR / "Renders" / "walk-frames"
FRAME_DIR = PROJECT_DIR / "Renders" / "walk-2d-frames"
SHEET_PATH = PROJECT_DIR / "Renders" / "legacy-miner-unreal-walk-sheet.webp"
PREVIEW_PATH = PROJECT_DIR / "Renders" / "legacy-miner-unreal-walk-preview.webp"
CONTACT_PATH = PROJECT_DIR / "Renders" / "legacy-miner-unreal-walk-contact-sheet.png"
REPORT_PATH = PROJECT_DIR / "SourceAssets" / "walk-2d-port-report.json"

FRAME_COUNT = 51
FRAME_SIZE = 341
SHEET_COLUMNS = 16
SHEET_ROWS = 4
PLAYBACK_FPS = 14
TARGET_CHARACTER_HEIGHT = 315
TARGET_BOTTOM = 337
BACKGROUND_THRESHOLD = 12


def exterior_background_mask(image: Image.Image) -> Image.Image:
    """Flood only near-black pixels connected to the canvas edge."""
    rgb = image.convert("RGB")
    width, height = rgb.size
    pixels = rgb.load()
    exterior = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def enqueue(x: int, y: int) -> None:
        index = y * width + x
        if exterior[index]:
            return
        r, g, b = pixels[x, y]
        if max(r, g, b) > BACKGROUND_THRESHOLD:
            return
        exterior[index] = 1
        queue.append((x, y))

    for x in range(width):
        enqueue(x, 0)
        enqueue(x, height - 1)
    for y in range(height):
        enqueue(0, y)
        enqueue(width - 1, y)

    while queue:
        x, y = queue.popleft()
        if x > 0:
            enqueue(x - 1, y)
        if x + 1 < width:
            enqueue(x + 1, y)
        if y > 0:
            enqueue(x, y - 1)
        if y + 1 < height:
            enqueue(x, y + 1)

    alpha = Image.new("L", (width, height), 255)
    alpha_pixels = alpha.load()
    for index, is_exterior in enumerate(exterior):
        if is_exterior:
            alpha_pixels[index % width, index // width] = 0
    return alpha.filter(ImageFilter.GaussianBlur(0.55))


def main() -> None:
    source_paths = [SOURCE_DIR / f"frame-{index:03d}.png" for index in range(FRAME_COUNT)]
    missing = [str(path) for path in source_paths if not path.exists()]
    if missing:
        raise RuntimeError(f"Missing {len(missing)} Unreal walk frames; first missing: {missing[0]}")

    FRAME_DIR.mkdir(parents=True, exist_ok=True)
    for old_frame in FRAME_DIR.glob("frame-*.png"):
        old_frame.unlink()

    keyed_frames: list[Image.Image] = []
    union_box: tuple[int, int, int, int] | None = None
    for frame_index, source_path in enumerate(source_paths):
        frame = Image.open(source_path).convert("RGBA")
        if frame.getchannel("A").getextrema() == (255, 255):
            frame.putalpha(exterior_background_mask(frame))
        box = frame.getchannel("A").getbbox()
        if box is None:
            raise RuntimeError(f"No character pixels found in frame {frame_index:03d}")
        if union_box is None:
            union_box = box
        else:
            union_box = (
                min(union_box[0], box[0]),
                min(union_box[1], box[1]),
                max(union_box[2], box[2]),
                max(union_box[3], box[3]),
            )
        keyed_frames.append(frame)

    assert union_box is not None
    union_width = union_box[2] - union_box[0]
    union_height = union_box[3] - union_box[1]
    scale = min(TARGET_CHARACTER_HEIGHT / union_height, (FRAME_SIZE - 12) / union_width)
    scaled_width = max(1, round(union_width * scale))
    scaled_height = max(1, round(union_height * scale))
    paste_x = round((FRAME_SIZE - scaled_width) / 2)
    paste_y = TARGET_BOTTOM - scaled_height

    output_frames: list[Image.Image] = []
    for frame_index, frame in enumerate(keyed_frames):
        cropped = frame.crop(union_box)
        resized = cropped.resize((scaled_width, scaled_height), Image.Resampling.LANCZOS)
        cell = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
        cell.alpha_composite(resized, (paste_x, paste_y))
        output_path = FRAME_DIR / f"frame-{frame_index:03d}.png"
        cell.save(output_path, optimize=True)
        output_frames.append(cell)

    sheet = Image.new(
        "RGBA",
        (SHEET_COLUMNS * FRAME_SIZE, SHEET_ROWS * FRAME_SIZE),
        (0, 0, 0, 0),
    )
    for frame_index, frame in enumerate(output_frames):
        x = (frame_index % SHEET_COLUMNS) * FRAME_SIZE
        y = (frame_index // SHEET_COLUMNS) * FRAME_SIZE
        sheet.alpha_composite(frame, (x, y))
    sheet.save(SHEET_PATH, "WEBP", lossless=True, method=6)

    frame_duration_ms = round(1000 / PLAYBACK_FPS)
    output_frames[0].save(
        PREVIEW_PATH,
        "WEBP",
        save_all=True,
        append_images=output_frames[1:],
        duration=frame_duration_ms,
        loop=0,
        quality=90,
        method=6,
    )

    contact_indices = [0, 8, 16, 24, 32, 40, 50]
    contact = Image.new("RGBA", (FRAME_SIZE * len(contact_indices), FRAME_SIZE), (25, 23, 20, 255))
    for column, frame_index in enumerate(contact_indices):
        contact.alpha_composite(output_frames[frame_index], (column * FRAME_SIZE, 0))
    contact.save(CONTACT_PATH, optimize=True)

    report = {
        "scope": "walk-only",
        "frame_count": FRAME_COUNT,
        "frame_size": [FRAME_SIZE, FRAME_SIZE],
        "playback_fps": PLAYBACK_FPS,
        "sheet_layout": [SHEET_COLUMNS, SHEET_ROWS],
        "sheet_size": list(sheet.size),
        "source_union_box": list(union_box),
        "scale": scale,
        "anchor": {"center_x": FRAME_SIZE // 2, "bottom_y": TARGET_BOTTOM},
        "background": "transparent; exterior black removed by edge-connected flood fill",
        "capture_presentation": "textured Blender render of the Unreal-exported retargeted animation",
        "sheet": str(SHEET_PATH),
        "animated_preview": str(PREVIEW_PATH),
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"WALK_2D_PORT_OK frames={FRAME_COUNT} sheet={SHEET_PATH}")


if __name__ == "__main__":
    main()
