"""Build deterministic animated and phase-board proof for the walk handoff."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads(
    (ROOT / "values/survivalUnifiedAnimationRuntimeV1.json").read_text(
        encoding="utf-8"
    )
)
RUNTIME = ROOT / CONFIG["runtimeRoot"]
HANDOFF_KEY = "survival-mixamo-v2-walk-handoff-sheet"
HANDOFF = CONFIG["sheets"][HANDOFF_KEY]
OUTPUT_GIF = ROOT / "testing/2026-08-30-mixamo-walk-handoff-proof.gif"
OUTPUT_BOARD = ROOT / "testing/2026-08-30-mixamo-walk-stop-phase-board.png"
OUTPUT_START_BOARD = ROOT / "testing/2026-08-30-mixamo-walk-start-board.png"


def font(size):
    path = Path("C:/Windows/Fonts/segoeuib.ttf")
    return ImageFont.truetype(str(path), size) if path.is_file() else ImageFont.load_default()


def load_frames(path, count, frame_size):
    with Image.open(path) as source:
        sheet = source.convert("RGBA")
    return [
        sheet.crop((
            index % 16 * frame_size,
            index // 16 * frame_size,
            (index % 16 + 1) * frame_size,
            (index // 16 + 1) * frame_size,
        ))
        for index in range(count)
    ]


def checker(size):
    canvas = Image.new("RGBA", size, (7, 15, 26, 255))
    draw = ImageDraw.Draw(canvas)
    step = 16
    for y in range(42, size[1], step):
        for x in range(32, size[0] - 32, step):
            shade = (13, 27, 42, 255) if (x // step + y // step) % 2 else (10, 22, 36, 255)
            draw.rectangle((x, y, x + step - 1, y + step - 1), fill=shade)
    return canvas


def proof_frame(frame, label, facing_left=False):
    canvas = checker((320, 320))
    draw = ImageDraw.Draw(canvas)
    draw.text((32, 14), label, font=font(13), fill=(104, 212, 255, 255))
    sprite = frame.transpose(Image.Transpose.FLIP_LEFT_RIGHT) if facing_left else frame
    sprite = sprite.resize((256, 256), Image.Resampling.LANCZOS)
    canvas.alpha_composite(sprite, (32, 42))
    draw.rectangle((32, 42, 287, 297), outline=(78, 199, 241, 255), width=3)
    return canvas.convert("P", palette=Image.Palette.ADAPTIVE)


def build_gif(idle, walk, handoff):
    phase = 6
    stop_start = len(HANDOFF["start"]["walkFrames"])
    stop_count = len(HANDOFF["stop"]["idleBlendWeights"])
    stop_index = HANDOFF["stop"]["phases"].index(phase)
    stop_frames = handoff[
        stop_start + stop_index * stop_count:
        stop_start + (stop_index + 1) * stop_count
    ]
    output = []
    for facing_left in (False, True):
        side = "left" if facing_left else "right"
        output.extend(proof_frame(idle[0], f"{side}: idle", facing_left) for _ in range(6))
        output.extend(
            proof_frame(frame, f"{side}: Blender start", facing_left)
            for frame in handoff[:stop_start]
        )
        output.extend(
            proof_frame(walk[index], f"{side}: Standard Walk", facing_left)
            for index in [*range(7, 24), *range(0, 6)]
        )
        output.extend(
            proof_frame(frame, f"{side}: phase-06 stop", facing_left)
            for frame in stop_frames
        )
        output.extend(proof_frame(idle[0], f"{side}: idle", facing_left) for _ in range(8))
    output[0].save(
        OUTPUT_GIF,
        save_all=True,
        append_images=output[1:],
        duration=42,
        loop=0,
        disposal=2,
        optimize=False,
    )


def build_phase_board(idle, walk, handoff):
    phases = [0, 6, 12, 18]
    cell = 150
    header = 34
    canvas = Image.new("RGB", (cell * 7, header + cell * len(phases)), (7, 15, 26))
    draw = ImageDraw.Draw(canvas)
    labels = ["walk", "stop 0", "stop 1", "stop 2", "stop 3", "stop 4", "idle"]
    for column, label in enumerate(labels):
        draw.text((column * cell + 8, 8), label, font=font(13), fill=(104, 212, 255))
    stop_start = len(HANDOFF["start"]["walkFrames"])
    stop_count = len(HANDOFF["stop"]["idleBlendWeights"])
    for row, phase in enumerate(phases):
        variant = HANDOFF["stop"]["phases"].index(phase)
        first = stop_start + variant * stop_count
        row_frames = [walk[phase], *handoff[first:first + stop_count], idle[0]]
        for column, frame in enumerate(row_frames):
            tile = Image.new("RGBA", (cell, cell), (7, 15, 26, 255))
            tile.alpha_composite(frame.resize((cell, cell), Image.Resampling.LANCZOS))
            canvas.paste(tile.convert("RGB"), (column * cell, header + row * cell))
        draw.text((8, header + row * cell + 8), f"phase {phase:02d}", font=font(12), fill=(244, 189, 105))
    canvas.save(OUTPUT_BOARD, optimize=True)


def build_start_board(idle, walk, handoff):
    frames = [idle[0], *handoff[:len(HANDOFF["start"]["walkFrames"])], walk[7]]
    labels = ["idle", *[f"start {index}" for index in range(7)], "walk 7"]
    cell = 132
    canvas = Image.new("RGB", (cell * len(frames), cell + 32), (7, 15, 26))
    draw = ImageDraw.Draw(canvas)
    for column, (frame, label) in enumerate(zip(frames, labels)):
        tile = Image.new("RGBA", (cell, cell), (7, 15, 26, 255))
        tile.alpha_composite(frame.resize((cell, cell), Image.Resampling.LANCZOS))
        canvas.paste(tile.convert("RGB"), (column * cell, 32))
        draw.text((column * cell + 7, 7), label, font=font(12), fill=(104, 212, 255))
    canvas.save(OUTPUT_START_BOARD, optimize=True)


def main():
    idle = load_frames(
        RUNTIME / "2026-08-25-survival-blender-v2-idle-sheet.webp",
        48,
        256,
    )
    walk = load_frames(
        RUNTIME / "2026-08-25-survival-mixamo-v1-walk-loop-sheet.webp",
        24,
        256,
    )
    handoff = load_frames(
        RUNTIME / "2026-08-25-survival-mixamo-v2-walk-handoff-sheet.webp",
        int(HANDOFF["frames"]),
        int(HANDOFF["packedSizePx"]),
    )
    build_gif(idle, walk, handoff)
    build_phase_board(idle, walk, handoff)
    build_start_board(idle, walk, handoff)
    print(
        "MIXAMO_WALK_HANDOFF_PROOF_OK "
        f"gif={OUTPUT_GIF} stopBoard={OUTPUT_BOARD} startBoard={OUTPUT_START_BOARD}"
    )


if __name__ == "__main__":
    main()
