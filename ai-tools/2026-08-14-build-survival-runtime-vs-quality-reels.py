"""Build synchronized current-runtime vs 1024 px quality-candidate MP4 reels."""

from __future__ import annotations

import json
import math
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "visual-approval-previews/2026-08-14-survival-current-runtime-vs-full-improvements-v1"
CANDIDATE = OUT / "candidate-1024"
UAL = ROOT / "sprites/character/survival-ual-player-v1/runtime"
BLENDER = ROOT / "sprites/character/survival-character-blender-v2/runtime"
W, H, FPS, SECONDS = 1920, 1080, 24, 7


def font(size, bold=False):
    path = Path(f"C:/Windows/Fonts/{'segoeuib' if bold else 'segoeui'}.ttf")
    return ImageFont.truetype(str(path), size) if path.is_file() else ImageFont.load_default()


def runtime_frames(path, indices):
    with Image.open(path) as source:
        sheet = source.convert("RGBA")
    columns = sheet.width // 256
    frames = []
    for index in indices:
        x, y = (index % columns) * 256, (index // columns) * 256
        frames.append(sheet.crop((x, y, x + 256, y + 256)))
    return frames


def candidate_frames(name):
    frames = []
    for path in sorted((CANDIDATE / name).glob("frame-*.png")):
        with Image.open(path) as source:
            frames.append(source.convert("RGBA"))
    if not frames:
        raise RuntimeError(f"No candidate frames for {name}")
    return frames


def fit_subject(image, box_width, box_height):
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        raise RuntimeError("Empty subject frame")
    subject = image.crop(bbox)
    scale = min(box_width / subject.width, box_height / subject.height)
    subject = subject.resize(
        (max(1, round(subject.width * scale)), max(1, round(subject.height * scale))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (box_width, box_height), (0, 0, 0, 0))
    canvas.alpha_composite(subject, ((box_width - subject.width) // 2, box_height - subject.height))
    return canvas


def exact_size(image, size):
    bbox = image.getchannel("A").getbbox()
    subject = image.crop(bbox)
    subject.thumbnail((size, size), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(subject, ((size - subject.width) // 2, size - subject.height))
    return canvas


def background(title):
    canvas = Image.new("RGB", (W, H), (7, 11, 16))
    draw = ImageDraw.Draw(canvas)
    for y in range(H):
        value = int(8 + 14 * y / H)
        draw.line((0, y, W, y), fill=(value // 2, value, value + 6))
    draw.text((48, 26), "CURRENT RUNTIME vs MOTION-LOCKED QUALITY CANDIDATE", font=font(31, True), fill=(239, 239, 234))
    draw.text((48, 70), title, font=font(23, True), fill=(105, 188, 229))
    draw.text((1260, 34), "REVIEW ONLY  |  PRODUCTION UNCHANGED", font=font(18, True), fill=(232, 151, 119))
    draw.rounded_rectangle((34, 120, 944, 1016), 20, fill=(12, 19, 26), outline=(49, 71, 85), width=2)
    draw.rounded_rectangle((976, 120, 1886, 1016), 20, fill=(12, 19, 26), outline=(67, 104, 121), width=2)
    draw.text((70, 142), "CURRENT RUNTIME — EXACT ACTIVE SHEETS", font=font(23, True), fill=(230, 233, 234))
    draw.text((1012, 142), "QUALITY CANDIDATE — SAME SOURCE MOTION", font=font(23, True), fill=(126, 207, 235))
    draw.text((70, 180), "No animation replacement · current timing/pose order", font=font(16), fill=(147, 162, 171))
    draw.text((1012, 180), "1024 px render · single downsample · not wired", font=font(16), fill=(147, 174, 184))
    draw.line((65, 765, 913, 765), fill=(45, 61, 72), width=1)
    draw.line((1007, 765, 1855, 765), fill=(45, 67, 78), width=1)
    draw.text((70, 784), "TRUE SCALE CHECK", font=font(16, True), fill=(112, 188, 224))
    draw.text((1012, 784), "TRUE SCALE + LARGER TEST", font=font(16, True), fill=(112, 203, 230))
    draw.text((240, 934), "CURRENT 123 px", font=font(15), fill=(154, 166, 173))
    draw.text((1185, 934), "CANDIDATE 123 px", font=font(15), fill=(154, 174, 181))
    draw.text((1570, 934), "SCALE TEST 145 px", font=font(15), fill=(196, 185, 129))
    return canvas


def select_frame(frames, progress):
    return frames[min(len(frames) - 1, int(progress * len(frames)))]


def encode(name, title, segments):
    target = OUT / f"{name}.mp4"
    command = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-an", "-c:v", "libx264", "-crf", "17", "-preset", "medium", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(target)]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    base = background(title)
    total_weight = sum(segment[3] for segment in segments)
    try:
        for number in range(FPS * SECONDS):
            cycle = (number / (FPS * SECONDS)) * total_weight
            cursor = 0.0
            chosen = segments[-1]
            local = 0.0
            for segment in segments:
                if cycle < cursor + segment[3]:
                    chosen = segment
                    local = (cycle - cursor) / segment[3]
                    break
                cursor += segment[3]
            label, current, candidate, _ = chosen
            current_frame = select_frame(current, local)
            candidate_frame = select_frame(candidate, local)
            canvas = base.copy()
            draw = ImageDraw.Draw(canvas)
            draw.text((70, 218), label, font=font(20, True), fill=(235, 205, 127))
            draw.text((1012, 218), label, font=font(20, True), fill=(235, 205, 127))
            left_large = fit_subject(current_frame, 760, 500)
            right_large = fit_subject(candidate_frame, 760, 500)
            canvas.paste(left_large, (105, 246), left_large)
            canvas.paste(right_large, (1047, 246), right_large)
            current_small = exact_size(current_frame, 123)
            candidate_small = exact_size(candidate_frame, 123)
            candidate_large = exact_size(candidate_frame, 145)
            canvas.paste(current_small, (90, 828), current_small)
            canvas.paste(candidate_small, (1035, 828), candidate_small)
            canvas.paste(candidate_large, (1420, 817), candidate_large)
            process.stdin.write(canvas.tobytes())
    finally:
        process.stdin.close()
    if process.wait():
        raise RuntimeError(f"ffmpeg failed for {target}")
    with Image.open(OUT / f"{name}-poster.png") if (OUT / f"{name}-poster.png").is_file() else Image.new("RGB", (1, 1)):
        pass
    print(f"QUALITY_AB_REEL_OK {target}")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    transition = UAL / "survival-ual-player-v1-animation-polish-transitions-sheet.webp"
    walk_current = runtime_frames(BLENDER / "survival-character-blender-v2-walk-sheet.png", range(24))
    walk_candidate = candidate_frames("walk")
    run_current = runtime_frames(UAL / "survival-ual-player-v1-animation-polish-run-sheet.webp", range(28))
    run_candidate = candidate_frames("run")
    start_current = runtime_frames(transition, [0, 1])
    stop_current = runtime_frames(transition, [2, 3])
    encode("01-walk-transitions-current-vs-quality", "WALK START → WALK → RUN → STOP (review slow-motion)", (
        ("EXACT 2-FRAME START BRIDGE", start_current, walk_candidate[:2], 0.7),
        ("CURRENT WALK SOURCE", walk_current, walk_candidate, 2.1),
        ("CURRENT UAL JOG/RUN SOURCE", run_current, run_candidate, 2.5),
        ("EXACT 2-FRAME STOP BRIDGE", stop_current, walk_candidate[-2:], 0.7),
    ))
    side_current = runtime_frames(UAL / "survival-ual-player-v1-punch-jab-sheet.webp", range(3, 18))
    up_current = runtime_frames(BLENDER / "survival-character-blender-v2-dig-up-piskel-polished-sheet.png", range(24))
    down_current = runtime_frames(UAL / "survival-ual-player-v1-ground-strike-sheet.webp", range(4, 41))
    encode("02-mining-current-vs-quality", "MINING — SIDE JAB → UP STRIKE → DOWN GROUND STRIKE", (
        ("SIDE MINING · PUNCH_JAB", side_current, candidate_frames("mining-side"), 1.8),
        ("UP MINING · MINER_DIG_UP", up_current, candidate_frames("mining-up"), 2.1),
        ("DOWN MINING · OVERHAND THROW", down_current, candidate_frames("mining-down"), 2.6),
    ))
    flight_current = runtime_frames(BLENDER / "survival-character-blender-v2-superman-flight-prone-v3-sheet.png", range(36))
    encode("03-flight-current-vs-quality", "FLIGHT — EXACT DG_SUPERMAN_FLIGHT_IDLE_PRONE_V3", (
        ("PRONE-V3 FLIGHT LOOP · 16 FPS", flight_current, candidate_frames("flight"), 1.0),
    ))
    qa = {"version": 1, "reviewOnly": True, "productionChanged": False, "currentProfile": "survival-blender-v2-promoted-animation-polish-v4-20260803", "renderSize": 1024, "downsamplePasses": 1, "videos": ["01-walk-transitions-current-vs-quality.mp4", "02-mining-current-vs-quality.mp4", "03-flight-current-vs-quality.mp4"]}
    for action in ("walk", "run", "mining-side", "mining-up", "mining-down", "flight"):
        bounds = []
        for path in sorted((CANDIDATE / action).glob("frame-*.png")):
            with Image.open(path) as image:
                bbox = image.getchannel("A").getbbox()
                if not bbox:
                    raise RuntimeError(f"Empty frame {path}")
                if bbox[0] <= 1 or bbox[1] <= 1 or bbox[2] >= image.width - 1 or bbox[3] >= image.height - 1:
                    raise RuntimeError(f"Candidate clipping {path}: {bbox}")
                bounds.append(list(bbox))
        qa[action] = {"frames": len(bounds), "alphaBounds": bounds}
    (OUT / "comparison-qa.json").write_text(json.dumps(qa, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
