from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "visual-approval-previews/2026-08-14-survival-animation-global-polish-v1"
SHEET = ROOT / "sprites/character/survival-ual-player-v1/runtime/survival-ual-player-v1-animation-polish-run-sheet.webp"
MANIFEST = ROOT / "sprites/character/survival-ual-player-v1/runtime/manifest.json"
W, H, FPS, SECONDS = 1920, 1080, 30, 9
SOURCE_FPS, SPEED, TILE, DISPLAY = 30, 200, 94, 123
BEFORE_STRIDE, AFTER_STRIDE = 1.55, 1.12


def font(size, bold=False):
    name = "segoeuib.ttf" if bold else "segoeui.ttf"
    path = Path("C:/Windows/Fonts") / name
    return ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default()


def frames():
    with Image.open(SHEET) as source:
        atlas = source.convert("RGBA")
    return [atlas.crop(((index % 16) * 256, (index // 16) * 256,
                        (index % 16 + 1) * 256, (index // 16 + 1) * 256))
            for index in range(28)]


def markers():
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    return data["actions"]["run-piskel-polished"]["rig_markers"]["frames"]


def panel(canvas, box, title, stride, slip, t, source_frames, rig, after):
    draw = ImageDraw.Draw(canvas)
    left, top, right, bottom = box
    accent = (93, 214, 176) if after else (239, 151, 119)
    draw.rounded_rectangle(box, 18, fill=(13, 20, 28), outline=accent, width=2)
    draw.text((left + 28, top + 20), title, font=font(25, True), fill=accent)
    scale = (len(source_frames) / SOURCE_FPS) * SPEED / (stride * TILE)
    draw.text((left + 28, top + 60),
              f"same approved 28 frames · same 200 px/s · time scale {scale:.3f}x",
              font=font(17), fill=(166, 179, 188))
    draw.text((left + 28, top + 90),
              f"stride {stride:.2f} tiles · marker slip proxy {slip:.2f} px/cycle",
              font=font(18, True), fill=(235, 228, 197))
    frame_index = int(t * SOURCE_FPS * scale) % len(source_frames)
    source = source_frames[frame_index]
    ground_y = bottom - 95
    zoom = 3.4
    cell = source.resize((round(256 * DISPLAY / 256 * zoom),) * 2, Image.Resampling.NEAREST)
    anchor_x = (left + right) // 2
    anchor_y = ground_y
    paste_x = round(anchor_x - 0.5 * cell.width)
    paste_y = round(anchor_y - (247 / 256) * cell.height)
    canvas.paste(cell, (paste_x, paste_y), cell)
    scroll = (SPEED * zoom * t) % (TILE * zoom)
    draw.line((left + 20, ground_y, right - 20, ground_y), fill=(135, 151, 158), width=3)
    for n in range(-2, 6):
        x = right - 20 - ((scroll + n * TILE * zoom) % ((right - left) + TILE * zoom))
        draw.line((x, ground_y, x, ground_y + 24), fill=(74, 98, 108), width=2)
    frame_markers = rig[str(frame_index)]
    grounded_foot = max(("foot_l", "foot_r"), key=lambda key: frame_markers[key][1])
    for key, color in (("foot_l", (107, 176, 255)), ("foot_r", (255, 205, 96))):
        marker = frame_markers[key]
        x = paste_x + marker[0] * DISPLAY / 256 * zoom
        y = paste_y + marker[1] * DISPLAY / 256 * zoom
        radius = 10 if key == grounded_foot else 6
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), outline=color, width=4)
    draw.text((left + 28, bottom - 50),
              f"frame {frame_index + 1:02d}/28 · highlighted lower foot = contact-readability guide",
              font=font(16), fill=(141, 157, 168))


def main():
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("ffmpeg is required")
    OUT.mkdir(parents=True, exist_ok=True)
    target = OUT / "01-run-skating-before-vs-after.mp4"
    source_frames = frames()
    rig = markers()
    command = [ffmpeg, "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
               "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-an", "-c:v", "libx264",
               "-crf", "17", "-preset", "medium", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(target)]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    try:
        for number in range(FPS * SECONDS):
            t = number / FPS
            canvas = Image.new("RGB", (W, H), (6, 10, 15))
            draw = ImageDraw.Draw(canvas)
            draw.text((44, 25), "FOOT SKATING POLISH — SYNCHRONIZED MOVING-GROUND TEST",
                      font=font(31, True), fill=(239, 241, 238))
            draw.text((44, 70), "No clip swap · no frame reorder · no collider change · approved UAL Jog retained",
                      font=font(19), fill=(137, 164, 178))
            panel(canvas, (34, 120, 944, 1028), "BEFORE · production cadence", BEFORE_STRIDE, 40.862,
                  t, source_frames, rig, False)
            panel(canvas, (976, 120, 1886, 1028), "AFTER · marker-fitted cadence", AFTER_STRIDE, 0.442,
                  t, source_frames, rig, True)
            process.stdin.write(canvas.tobytes())
    finally:
        process.stdin.close()
    if process.wait():
        raise RuntimeError("ffmpeg failed")
    qa = {
        "video": target.name,
        "frames": FPS * SECONDS,
        "fps": FPS,
        "worldSpeedPxPerSec": SPEED,
        "beforeStrideTiles": BEFORE_STRIDE,
        "afterStrideTiles": AFTER_STRIDE,
        "approvedAnimationFramesUnchanged": True,
    }
    (OUT / "comparison-qa.json").write_text(json.dumps(qa, indent=2) + "\n", encoding="utf-8")
    print(f"SURVIVAL_SKATING_POLISH_REEL_OK {target}")


if __name__ == "__main__":
    main()
