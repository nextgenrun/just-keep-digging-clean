"""Build review-only polished merchant idle animation masters and inline previews."""

from __future__ import annotations

import json
import math
import shutil
import subprocess
import sys
from pathlib import Path

import cv2
import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "visual-approval-previews" / "npc-idle-polish-v1"
TMP = OUT / "_frames"
FPS = 30
FRAME_COUNT = 120
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
SUPPLIED = {
    "money-monster": Path(r"C:\Users\Mila\Downloads\money_monster_idle_alpha(1).webm"),
    "bobo-merchant": Path(r"C:\Users\Mila\Downloads\dog_adventurer_idle_alpha.webm"),
}
GENERATED = {
    "player-upgrades": {"motion": (3.8, 2.2, 0.006), "pulse": "purple", "event": 0.67},
    "gear-merchant": {"motion": (2.7, 1.4, 0.004), "pulse": "lamp", "event": 0.58},
    "gem-power-merchant": {"motion": (2.1, 1.0, 0.003), "pulse": "purple", "event": 0.48},
}
SINGLES = ROOT / "sprites" / "npc" / "npc-v5-generated" / "singles" / "merchant-idle"


def run(args: list[str]) -> None:
    subprocess.run(args, check=True)


def extract_rgba(slug: str, source: Path) -> list[np.ndarray]:
    folder = TMP / f"{slug}-source"
    folder.mkdir(parents=True, exist_ok=True)
    run([FFMPEG, "-hide_banner", "-loglevel", "error", "-c:v", "libvpx-vp9",
         "-i", str(source), "-vsync", "0", "-y", str(folder / "%03d.png")])
    return [np.array(Image.open(path).convert("RGBA")) for path in sorted(folder.glob("*.png"))]


def alpha_bbox(frame: np.ndarray) -> tuple[int, int, int, int]:
    ys, xs = np.where(frame[:, :, 3] > 12)
    return (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)


def translate(frame: np.ndarray, dx: int, dy: int) -> np.ndarray:
    return cv2.warpAffine(frame, np.float32([[1, 0, dx], [0, 1, dy]]),
                          (frame.shape[1], frame.shape[0]), flags=cv2.INTER_LANCZOS4,
                          borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))


def frame_distance(a: np.ndarray, b: np.ndarray) -> float:
    aa = cv2.resize(a, (128, 128), interpolation=cv2.INTER_AREA).astype(np.float32)
    bb = cv2.resize(b, (128, 128), interpolation=cv2.INTER_AREA).astype(np.float32)
    return float(np.mean(np.abs(aa - bb)))


def polish_supplied(frames: list[np.ndarray]) -> tuple[list[np.ndarray], dict]:
    frames = frames[:FRAME_COUNT]
    boxes = [alpha_bbox(frame) for frame in frames]
    ground = int(np.median([box[3] for box in boxes]))
    centers = []
    for frame, box in zip(frames, boxes):
        y0 = max(box[1], box[3] - max(24, (box[3] - box[1]) // 8))
        ys, xs = np.where(frame[y0:box[3], :, 3] > 96)
        centers.append(float(np.median(xs)) if len(xs) else (box[0] + box[2]) / 2)
    center = float(np.median(centers))
    stabilized = []
    shifts = []
    for frame, box, foot_x in zip(frames, boxes, centers):
        dx = int(np.clip(round(center - foot_x), -5, 5))
        dy = int(np.clip(ground - box[3], -5, 5))
        clean = frame.copy()
        clean[clean[:, :, 3] <= 2] = 0
        stabilized.append(translate(clean, dx, dy))
        shifts.append((dx, dy))
    seam_before = frame_distance(stabilized[-1], stabilized[0])
    polished = [frame.copy() for frame in stabilized]
    if seam_before > 1.0:
        blend = 10
        for i in range(blend):
            idx = len(polished) - blend + i
            mix = (i + 1) / (blend + 1)
            polished[idx] = cv2.addWeighted(stabilized[idx], 1.0 - mix, stabilized[i], mix, 0)
    for frame in polished:
        frame[frame[:, :, 3] <= 2] = 0
    return polished, {
        "sourceFrames": len(frames), "groundMedian": ground,
        "maxCorrection": max(max(abs(x), abs(y)) for x, y in shifts),
        "seamDistanceBefore": round(seam_before, 4),
        "seamDistanceAfter": round(frame_distance(polished[-1], polished[0]), 4),
    }


def color_mask(rgb: np.ndarray, mode: str) -> np.ndarray:
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    if mode == "purple":
        mask = cv2.inRange(hsv, (120, 65, 105), (175, 255, 255))
    else:
        yy, xx = np.mgrid[:rgb.shape[0], :rgb.shape[1]]
        mask = cv2.inRange(hsv, (15, 0, 185), (45, 150, 255))
        mask[((xx - 500) ** 2 + (yy - 105) ** 2) > 125 ** 2] = 0
    return cv2.GaussianBlur(mask, (0, 0), 2.0).astype(np.float32) / 255.0


def procedural_frames(source: Path, profile: dict) -> list[np.ndarray]:
    base = np.array(Image.open(source).convert("RGBA"))
    bbox = alpha_bbox(base)
    h, w = base.shape[:2]
    yy, xx = np.mgrid[:h, :w].astype(np.float32)
    top, bottom, center = bbox[1], bbox[3], (bbox[0] + bbox[2]) / 2
    weight = np.clip((bottom - yy) / max(bottom - top, 1), 0, 1) ** 1.65
    pulse_mask = color_mask(base[:, :, :3], profile["pulse"]) * (base[:, :, 3] / 255.0)
    vertical, sway, expand = profile["motion"]
    frames = []
    for index in range(FRAME_COUNT):
        t = index / FRAME_COUNT
        phase = math.tau * t
        breath = math.sin(phase - math.pi / 2)
        secondary = math.sin(phase * 2 + 0.7)
        dx = weight * (sway * math.sin(phase + 0.45) + 0.35 * secondary)
        dy = weight * (-vertical * breath)
        scale = 1.0 + expand * breath * weight
        map_x = center + (xx - center) / scale - dx
        map_y = yy - dy
        frame = cv2.remap(base, map_x.astype(np.float32), map_y.astype(np.float32),
                          cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_CONSTANT,
                          borderValue=(0, 0, 0, 0))
        pulse = 0.055 + 0.08 * (0.5 + 0.5 * math.sin(phase * 1.5 + profile["event"] * math.tau))
        rgb = frame[:, :, :3].astype(np.float32)
        highlight = pulse_mask[:, :, None] * pulse
        rgb = rgb + (255.0 - rgb) * highlight
        frame[:, :, :3] = np.clip(rgb, 0, 255).astype(np.uint8)
        frame[frame[:, :, 3] <= 2] = 0
        frames.append(frame)
    return frames


def write_frames(slug: str, frames: list[np.ndarray]) -> Path:
    folder = TMP / f"{slug}-final"
    folder.mkdir(parents=True, exist_ok=True)
    for index, frame in enumerate(frames):
        Image.fromarray(frame, "RGBA").save(folder / f"{index:03d}.png", compress_level=2)
    return folder


def encode_alpha(slug: str, folder: Path) -> Path:
    target = OUT / f"{slug}-idle-alpha.webm"
    run([FFMPEG, "-hide_banner", "-loglevel", "error", "-framerate", str(FPS),
         "-i", str(folder / "%03d.png"), "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p",
         "-auto-alt-ref", "0", "-crf", "24", "-b:v", "0", "-metadata:s:v:0", "alpha_mode=1",
         "-an", "-y", str(target)])
    return target


def checker(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size), (25, 22, 31, 255))
    draw = ImageDraw.Draw(image)
    step = 24
    for y in range(0, size, step):
        for x in range(0, size, step):
            if (x // step + y // step) % 2 == 0:
                draw.rectangle((x, y, x + step - 1, y + step - 1), fill=(38, 34, 46, 255))
    return image


def composite_preview(frame: np.ndarray, size: int = 448) -> Image.Image:
    subject = Image.fromarray(frame, "RGBA")
    subject.thumbnail((size - 20, size - 20), Image.Resampling.LANCZOS)
    bg = checker(size)
    bg.alpha_composite(subject, ((size - subject.width) // 2, (size - subject.height) // 2))
    return bg.convert("RGB")


def save_preview(slug: str, frames: list[np.ndarray]) -> Path:
    sampled = [composite_preview(frames[i]) for i in range(0, FRAME_COUNT, 2)]
    target = OUT / f"{slug}-idle-preview.webp"
    sampled[0].save(target, save_all=True, append_images=sampled[1:], duration=67,
                    loop=0, format="WEBP", quality=82, method=6)
    return target


def save_contact_sheet(all_frames: dict[str, list[np.ndarray]]) -> Path:
    slugs = list(all_frames)
    cell, label_h, cols = 220, 32, 6
    sheet = Image.new("RGB", (cols * cell, len(slugs) * (cell + label_h)), (17, 15, 22))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 18)
    for row, slug in enumerate(slugs):
        y = row * (cell + label_h)
        draw.text((10, y + 5), slug.replace("-", " ").title(), font=font, fill=(245, 213, 136))
        for col, idx in enumerate((0, 20, 40, 60, 80, 100)):
            shot = composite_preview(all_frames[slug][idx], cell)
            sheet.paste(shot, (col * cell, y + label_h))
    target = OUT / "npc-idle-polish-v1-contact-sheet.png"
    sheet.save(target, optimize=True)
    return target


def main() -> None:
    supplied_only = "--supplied-only" in sys.argv
    OUT.mkdir(parents=True, exist_ok=True)
    if TMP.exists():
        shutil.rmtree(TMP)
    TMP.mkdir(parents=True)
    manifest_path = OUT / "manifest.json"
    if supplied_only and manifest_path.exists():
        report = json.loads(manifest_path.read_text(encoding="utf-8"))
    else:
        report = {"previewOnly": True, "runtimeWired": False, "animations": {}}
    all_frames = {}
    for slug, source in SUPPLIED.items():
        frames, metrics = polish_supplied(extract_rgba(slug, source))
        all_frames[slug] = frames
        report["animations"][slug] = {"kind": "supplied-polish", "source": str(source), **metrics}
    if not supplied_only:
        for slug, profile in GENERATED.items():
            source = SINGLES / f"{slug}.png"
            all_frames[slug] = procedural_frames(source, profile)
            report["animations"][slug] = {"kind": "identity-locked-local-motion", "source": str(source.relative_to(ROOT)), "profile": profile}
    for slug, frames in all_frames.items():
        folder = write_frames(slug, frames)
        report["animations"][slug]["alphaWebm"] = str(encode_alpha(slug, folder).relative_to(ROOT))
        report["animations"][slug]["inlinePreview"] = str(save_preview(slug, frames).relative_to(ROOT))
    if not supplied_only:
        report["contactSheet"] = str(save_contact_sheet(all_frames).relative_to(ROOT))
    manifest_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    if TMP.exists():
        shutil.rmtree(TMP)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
