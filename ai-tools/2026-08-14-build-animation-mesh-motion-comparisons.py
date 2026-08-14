"""Build review-only MP4 comparisons from exact Survival runtime sheets."""

from __future__ import annotations

import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
UAL_RUNTIME = ROOT / "sprites/character/survival-ual-player-v1/runtime"
BLENDER_RUNTIME = ROOT / "sprites/character/survival-character-blender-v2/runtime"
OUTPUT = ROOT / "visual-approval-previews/2026-08-14-animation-mesh-polish-v2-motion"

WIDTH = 1440
HEIGHT = 900
FPS = 30
DURATION_SECONDS = 8
FRAMES = FPS * DURATION_SECONDS
CELL = 256

BG = (7, 18, 27)
PANEL = (12, 31, 43)
EDGE = (42, 94, 116)
GOLD = (255, 209, 102)
TEXT = (225, 238, 245)
MUTED = (151, 178, 190)
CURRENT = (239, 117, 89)
REFERENCE = (91, 201, 147)


@dataclass(frozen=True)
class Clip:
    label: str
    detail: str
    path: Path
    frame_count: int
    columns: int
    authored_fps: int
    loop: bool
    color: tuple[int, int, int]


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(Path("C:/Windows/Fonts") / name), size)


def extract_frames(clip: Clip) -> list[Image.Image]:
    sheet = Image.open(clip.path).convert("RGBA")
    frames = []
    for index in range(clip.frame_count):
        left = (index % clip.columns) * CELL
        top = (index // clip.columns) * CELL
        frames.append(sheet.crop((left, top, left + CELL, top + CELL)))
    return frames


def alpha_union(frames: list[Image.Image]) -> tuple[int, int, int, int]:
    bounds = [frame.getchannel("A").getbbox() for frame in frames]
    valid = [bound for bound in bounds if bound]
    return (
        min(bound[0] for bound in valid),
        min(bound[1] for bound in valid),
        max(bound[2] for bound in valid),
        max(bound[3] for bound in valid),
    )


def selected_frame(frames: list[Image.Image], clip: Clip, time_seconds: float) -> Image.Image:
    authored_index = int(time_seconds * clip.authored_fps)
    if clip.loop:
        index = authored_index % len(frames)
    else:
        hold_frames = round(0.55 * clip.authored_fps)
        cycle = len(frames) + hold_frames
        phase = authored_index % cycle
        index = min(phase, len(frames) - 1)
    return frames[index]


def paste_inspection(
    board: Image.Image,
    frame: Image.Image,
    union: tuple[int, int, int, int],
    panel_x: int,
) -> None:
    crop = frame.crop(union)
    target_height = 420
    scale = target_height / crop.height
    resized = crop.resize((round(crop.width * scale), target_height), Image.Resampling.LANCZOS)
    x = panel_x + (440 - resized.width) // 2
    y = 178 + (450 - resized.height) // 2
    board.paste(resized, (x, y), resized)


def paste_game_scale(board: Image.Image, frame: Image.Image, panel_x: int) -> None:
    resized = frame.resize((123, 123), Image.Resampling.LANCZOS)
    x = panel_x + (440 - 123) // 2
    board.paste(resized, (x, 664), resized)


def centered(draw: ImageDraw.ImageDraw, text: str, x: int, y: int, width: int, face, fill) -> None:
    box = draw.textbbox((0, 0), text, font=face)
    draw.text((x + (width - (box[2] - box[0])) // 2, y), text, font=face, fill=fill)


def encode_comparison(title: str, footer: str, clips: tuple[Clip, Clip, Clip], output_name: str) -> None:
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("ffmpeg is required")
    decoded = [extract_frames(clip) for clip in clips]
    unions = [alpha_union(frames) for frames in decoded]
    output_path = OUTPUT / output_name
    output_path.parent.mkdir(parents=True, exist_ok=True)
    command = [
        ffmpeg, "-y", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "rgb24",
        "-s", f"{WIDTH}x{HEIGHT}", "-r", str(FPS), "-i", "-",
        "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "17",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(output_path),
    ]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    title_font = font("segoeuib.ttf", 32)
    label_font = font("segoeuib.ttf", 22)
    detail_font = font("segoeui.ttf", 17)
    small_font = font("segoeui.ttf", 16)
    panel_xs = (30, 500, 970)

    assert process.stdin is not None
    try:
        for output_index in range(FRAMES):
            time_seconds = output_index / FPS
            board = Image.new("RGB", (WIDTH, HEIGHT), BG)
            draw = ImageDraw.Draw(board)
            draw.text((36, 28), title, font=title_font, fill=GOLD)
            draw.text((38, 76), "Same Survival character mesh · authored timing retained · review only", font=detail_font, fill=MUTED)
            for index, (clip, frames, union, panel_x) in enumerate(zip(clips, decoded, unions, panel_xs)):
                draw.rounded_rectangle((panel_x, 120, panel_x + 440, 812), radius=18, fill=PANEL, outline=EDGE, width=2)
                centered(draw, clip.label, panel_x, 138, 440, label_font, clip.color)
                centered(draw, clip.detail, panel_x, 168, 440, detail_font, MUTED)
                frame = selected_frame(frames, clip, time_seconds)
                paste_inspection(board, frame, union, panel_x)
                centered(draw, "INSPECTION SCALE", panel_x, 620, 440, small_font, MUTED)
                paste_game_scale(board, frame, panel_x)
                centered(draw, "123 PX CELL CHECK", panel_x, 792, 440, small_font, MUTED)
            centered(draw, footer, 30, 850, WIDTH - 60, small_font, GOLD)
            process.stdin.write(board.tobytes())
    finally:
        process.stdin.close()
    if process.wait() != 0:
        raise RuntimeError(f"ffmpeg failed for {output_path}")
    print(output_path)


def encode_blender_ab() -> None:
    current_dir = OUTPUT / "blender-ab/current"
    target_dir = OUTPUT / "blender-ab/target"
    current = sorted(current_dir.glob("frame-*.png"))
    target = sorted(target_dir.glob("frame-*.png"))
    if not current or len(current) != len(target):
        print("BLENDER_AB_SKIPPED: render frame pairs first")
        return
    ffmpeg = shutil.which("ffmpeg")
    output_path = OUTPUT / "03-blender-lighting-material-motion-ab.mp4"
    command = [
        ffmpeg, "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
        "-s", f"{WIDTH}x{HEIGHT}", "-r", "24", "-i", "-", "-an", "-c:v", "libx264",
        "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(output_path),
    ]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    assert process.stdin is not None
    title_font = font("segoeuib.ttf", 32)
    label_font = font("segoeuib.ttf", 23)
    small_font = font("segoeui.ttf", 17)
    for cycle in range(3):
        for before_path, after_path in zip(current, target):
            board = Image.new("RGB", (WIDTH, HEIGHT), BG)
            draw = ImageDraw.Draw(board)
            draw.text((36, 28), "REAL BLENDER A/B · MATERIAL + LIGHTING + SKINNING", font=title_font, fill=GOLD)
            draw.text((38, 76), "Exact production master · temporary render settings · master file not saved", font=small_font, fill=MUTED)
            for x, path, label, color in (
                (40, before_path, "CURRENT · 7 LIGHTS", CURRENT),
                (740, after_path, "TARGET · 4 LIGHTS + CORRECT NORMALS", REFERENCE),
            ):
                draw.rounded_rectangle((x, 120, x + 660, 820), radius=18, fill=PANEL, outline=EDGE, width=2)
                centered(draw, label, x, 144, 660, label_font, color)
                image = Image.open(path).convert("RGBA").resize((600, 600), Image.Resampling.LANCZOS)
                board.paste(image, (x + 30, 190), image)
            centered(draw, "Target also enables preserve-volume skinning and AgX color management", 40, 852, 1360, small_font, GOLD)
            process.stdin.write(board.tobytes())
    process.stdin.close()
    if process.wait() != 0:
        raise RuntimeError(f"ffmpeg failed for {output_path}")
    print(output_path)


def main() -> None:
    encode_comparison(
        "LOCOMOTION QUALITY · CURRENT VS BLENDER VS UNREAL GASP",
        "GASP motion is a reference, not approved runtime content",
        (
            Clip("CURRENT RUNTIME", "UAL Jog + Piskel anchors", UAL_RUNTIME / "survival-ual-player-v1-animation-polish-run-sheet.webp", 28, 16, 30, True, CURRENT),
            Clip("BLENDER ROLLBACK", "MINER_run · 16 fps", BLENDER_RUNTIME / "survival-character-blender-v2-run-sheet.png", 28, 16, 16, True, TEXT),
            Clip("UNREAL GASP", "MF_Unarmed_Jog_Fwd · 30 fps", UAL_RUNTIME / "survival-ual-player-v1-gasp-run-sheet.webp", 55, 16, 30, True, REFERENCE),
        ),
        "01-locomotion-current-vs-blender-vs-gasp.mp4",
    )
    encode_comparison(
        "ACTION DEFORMATION · HANDS, HIPS, RECOVERY",
        "Compare joint behavior and recovery arcs; action intent differs by source",
        (
            Clip("CURRENT COMPOSITE", "Jog lower + Jab upper", UAL_RUNTIME / "survival-ual-player-v1-moving-side-dig-jab-sheet.webp", 22, 16, 30, False, CURRENT),
            Clip("BLENDER UP STRIKE", "MINER_dig_up + Piskel anchor", BLENDER_RUNTIME / "survival-character-blender-v2-dig-up-piskel-polished-sheet.png", 24, 16, 27, False, TEXT),
            Clip("UNREAL GASP", "MM_ChargedAttack · 30 fps", UAL_RUNTIME / "survival-ual-player-v1-gasp-mining-strike-sheet.webp", 57, 16, 30, False, REFERENCE),
        ),
        "02-action-deformation-current-vs-blender-vs-gasp.mp4",
    )
    encode_blender_ab()


if __name__ == "__main__":
    main()
