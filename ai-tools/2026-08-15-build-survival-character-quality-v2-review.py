"""Build a review-only animated Character Quality V2 before/after reel."""

from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
CFG_PATH = ROOT / "values/survivalCharacterQualityV2Review.json"
OUT = ROOT / "visual-approval-previews/2026-08-15-survival-character-quality-v2-before-after"
SOURCE = ROOT / "visual-approval-previews/2026-08-14-survival-current-runtime-vs-full-improvements-v1"
UAL = ROOT / "sprites/character/survival-ual-player-v1/runtime"
BLENDER = ROOT / "sprites/character/survival-character-blender-v2/runtime"


def font(size: int, bold: bool = False):
    name = "segoeuib.ttf" if bold else "segoeui.ttf"
    path = Path("C:/Windows/Fonts") / name
    return ImageFont.truetype(str(path), size) if path.is_file() else ImageFont.load_default()


def sha256(path: Path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def runtime_frames(path: Path, indices):
    with Image.open(path) as source:
        sheet = source.convert("RGBA")
    columns = sheet.width // 256
    return [sheet.crop(((i % columns) * 256, (i // columns) * 256,
                        (i % columns + 1) * 256, (i // columns + 1) * 256)) for i in indices]


def source_frames(name: str):
    paths = sorted((SOURCE / "candidate-1024" / name).glob("frame-*.png"))
    if not paths:
        raise RuntimeError(f"No motion-locked source frames for {name}")
    return [Image.open(path).convert("RGBA") for path in paths], paths


def subject(image: Image.Image):
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        raise RuntimeError("Empty character frame")
    return image.crop(bbox), bbox


def quality_pass(image: Image.Image, cfg):
    alpha = image.getchannel("A")
    rgb = image.convert("RGB")
    rgb = ImageEnhance.Contrast(rgb).enhance(cfg["contrast"])
    rgb = ImageEnhance.Color(rgb).enhance(cfg["color"])
    rgb = ImageEnhance.Sharpness(rgb).enhance(cfg["sharpness"])
    rgb = rgb.filter(ImageFilter.UnsharpMask(
        radius=cfg["unsharpRadius"], percent=cfg["unsharpPercent"], threshold=cfg["unsharpThreshold"]
    ))
    lit = Image.merge("RGBA", (*rgb.split(), alpha))
    inner = ImageChops.subtract(alpha, alpha.filter(ImageFilter.MinFilter(cfg["rimRadius"])))
    directional = Image.new("L", (image.width, 1))
    directional.putdata([int(255 * (1.0 - x / max(1, image.width - 1))) for x in range(image.width)])
    directional = directional.resize(image.size)
    rim = ImageChops.multiply(inner, directional).point(lambda p: p * cfg["rimOpacity"] // 255)
    cool = Image.new("RGBA", image.size, (91, 178, 225, 0))
    cool.putalpha(rim)
    return Image.alpha_composite(lit, cool)


def resize_subject(image: Image.Image, height: int, box: tuple[int, int]):
    item, _ = subject(image)
    scale = min(height / item.height, (box[0] - 20) / item.width)
    item = item.resize((max(1, round(item.width * scale)), max(1, round(item.height * scale))), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", box, (0, 0, 0, 0))
    canvas.alpha_composite(item, ((box[0] - item.width) // 2, box[1] - item.height))
    return canvas


def crop_detail(image: Image.Image, focus: str, size=(290, 230)):
    item, _ = subject(image)
    regions = {
        "FACE / EYES": (0.39, 0.00, 0.78, 0.34),
        "HANDS / WRISTS": (0.38, 0.14, 1.00, 0.53),
        "PELVIS / HIPS": (0.25, 0.36, 0.78, 0.72),
    }
    x0, y0, x1, y1 = regions[focus]
    crop = item.crop((int(item.width*x0), int(item.height*y0), int(item.width*x1), int(item.height*y1)))
    crop.thumbnail(size, Image.Resampling.LANCZOS)
    out = Image.new("RGBA", size, (5, 9, 13, 255))
    out.alpha_composite(crop, ((size[0]-crop.width)//2, (size[1]-crop.height)//2))
    return out


def base_frame(title: str, label: str):
    canvas = Image.new("RGB", (W, H), (5, 9, 13))
    draw = ImageDraw.Draw(canvas)
    for y in range(H):
        c = int(8 + 16 * y / H)
        draw.line((0, y, W, y), fill=(c//2, c, c+7))
    draw.text((48, 28), title, font=font(32, True), fill=(240, 241, 238))
    draw.text((48, 76), label, font=font(21, True), fill=(105, 195, 229))
    draw.text((1370, 38), "REVIEW ONLY · NOT WIRED", font=font(19, True), fill=(238, 151, 118))
    for left, outline in ((35, (52, 69, 80)), (975, (71, 111, 130))):
        draw.rounded_rectangle((left, 126, left+910, 1018), 20, fill=(10, 16, 22), outline=outline, width=2)
    draw.text((68, 146), "BEFORE · CURRENT ACTIVE 256 PX", font=font(23, True), fill=(225, 229, 231))
    draw.text((1008, 146), "AFTER · QUALITY V2 DIRECTION", font=font(23, True), fill=(128, 209, 236))
    return canvas


def shadow(canvas, x: int, y: int, width: int):
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse((x-width//2, y-18, x+width//2, y+18), fill=(0, 0, 0, 115))
    layer = layer.filter(ImageFilter.GaussianBlur(12))
    canvas.paste(layer, (0, 0), layer)


def motion_frame(title, label, before, after, index, grounded, heights):
    canvas = base_frame(title, label)
    draw = ImageDraw.Draw(canvas)
    if grounded:
        shadow(canvas, 505, 735, 430)
        shadow(canvas, 1445, 735, 430)
    left = resize_subject(before, heights["inspection4x"], (760, 540))
    right = resize_subject(after, heights["inspection4x"], (760, 540))
    canvas.paste(left, (110, 205), left)
    canvas.paste(right, (1050, 205), right)
    draw.text((355, 700), f'4X INSPECTION · {heights["inspection4x"]} PX', font=font(14, True), fill=(151, 171, 181))
    draw.text((1295, 700), f'4X INSPECTION · {heights["inspection4x"]} PX', font=font(14, True), fill=(132, 194, 211))
    focuses = ("FACE / EYES", "HANDS / WRISTS", "PELVIS / HIPS")
    focus = focuses[(index // 18) % len(focuses)]
    for x, image in ((70, before), (1010, after)):
        detail = crop_detail(image, focus)
        canvas.paste(detail, (x, 766), detail)
        draw.rectangle((x, 766, x+290, 996), outline=(66, 96, 112), width=2)
        draw.text((x+12, 780), focus, font=font(15, True), fill=(232, 203, 126))
    for x, image, caption in ((380, before, "TRUE SIZE"), (1320, after, "TRUE SIZE")):
        small = resize_subject(image, heights["trueSize"], (145, 150))
        canvas.paste(small, (x, 822), small)
        draw.text((x+22, 974), f'{caption} {heights["trueSize"]} PX', font=font(13), fill=(160, 176, 185))
    for x, image in ((540, before), (1480, after)):
        double = resize_subject(image, heights["inspection2x"], (260, 220))
        canvas.paste(double, (x, 770), double)
        draw.text((x+45, 974), f'2X INSPECTION · {heights["inspection2x"]} PX', font=font(13), fill=(151, 183, 193))
    draw.text((1010, 735), "1024–2048 source target · single downsample · same motion/timing", font=font(14, True), fill=(115, 205, 231))
    return canvas


def hero_frame(before: Image.Image, target: Image.Image, progress: float):
    canvas = base_frame("CHARACTER QUALITY V2 · BEFORE / AFTER", "ILLUSTRATIVE HERO TARGET · MOTION FRAME REMAINS AUTHORITATIVE")
    draw = ImageDraw.Draw(canvas)
    zoom = 530 + round(50 * progress)
    left = resize_subject(before, zoom, (800, 620))
    right = resize_subject(target, zoom, (800, 620))
    canvas.paste(left, (90, 230), left)
    canvas.paste(right, (1030, 230), right)
    draw.text((72, 810), "Current: softer face/hands · flatter material response", font=font(18), fill=(174, 184, 190))
    draw.text((1012, 810), "Target: anatomy cleanup · eyes/cornea · material/normal separation", font=font(18), fill=(157, 210, 226))
    draw.text((72, 872), "Pose, identity, outfit and silhouette locked to current motion", font=font(18, True), fill=(234, 204, 126))
    draw.text((72, 922), "The target still is not a production animation export", font=font(17), fill=(236, 154, 121))
    return canvas


def black_to_alpha(image: Image.Image):
    rgb = image.convert("RGB")
    maximum = ImageChops.lighter(ImageChops.lighter(rgb.getchannel("R"), rgb.getchannel("G")), rgb.getchannel("B"))
    alpha = maximum.point(lambda p: 0 if p <= 3 else min(255, (p - 3) * 5))
    return Image.merge("RGBA", (*rgb.split(), alpha))


def main():
    global W, H, FPS
    cfg = json.loads(CFG_PATH.read_text(encoding="utf-8"))
    W, H, FPS = cfg["canvas"]["width"], cfg["canvas"]["height"], cfg["canvas"]["fps"]
    target_path = OUT / "quality-v2-imagegen-run-target.png"
    if not target_path.is_file():
        raise RuntimeError(f"Missing ImageGen target: {target_path}")
    with Image.open(target_path) as image:
        target = black_to_alpha(image.convert("RGBA"))
    families = [
        ("run", "RUN · APPROVED CURRENT MOTION", UAL / "survival-ual-player-v1-animation-polish-run-sheet.webp", range(28), True),
        ("mining-side", "MINING SIDE · PUNCH_JAB", UAL / "survival-ual-player-v1-punch-jab-sheet.webp", range(3, 18), True),
        ("mining-up", "MINING UP · MINER_DIG_UP", BLENDER / "survival-character-blender-v2-dig-up-piskel-polished-sheet.png", range(24), True),
        ("mining-down", "MINING DOWN · OVERHAND THROW", UAL / "survival-ual-player-v1-ground-strike-sheet.webp", range(4, 41), True),
        ("flight", "FLIGHT · APPROVED PRONE-V3", BLENDER / "survival-character-blender-v2-superman-flight-prone-v3-sheet.png", range(36), False),
    ]
    motion = {}
    source_paths = []
    for name, label, sheet, indices, grounded in families:
        before = runtime_frames(sheet, indices)
        after_source, paths = source_frames(name)
        if len(before) != len(after_source):
            raise RuntimeError(f"Frame mismatch for {name}: {len(before)} vs {len(after_source)}")
        after = [quality_pass(frame, cfg["qualityPass"]) for frame in after_source]
        motion[name] = (label, before, after, grounded, sheet, paths)
        source_paths.extend(paths)
    output = OUT / "01-character-quality-v2-before-after.mp4"
    try:
        import imageio_ffmpeg
        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        ffmpeg = shutil.which("ffmpeg")
    process = None
    webp_frames = []
    if ffmpeg:
        cmd = [ffmpeg, "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
               "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-an", "-c:v", "libx264",
               "-crf", "16", "-preset", "medium", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(output)]
        try:
            process = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        except PermissionError:
            process = None
    fallback = cfg["fallbackAnimatedWebp"]
    emitted = 0

    def emit(frame):
        nonlocal emitted
        if process:
            process.stdin.write(frame.tobytes())
        elif emitted % max(1, FPS // fallback["fps"]) == 0:
            webp_frames.append(frame.resize((fallback["width"], fallback["height"]), Image.Resampling.LANCZOS))
        emitted += 1
    poster = None
    try:
        hero_seconds = cfg["segmentSeconds"]["heroTarget"]
        hero_before = motion["run"][1][12]
        hero_total = round(hero_seconds * FPS)
        for i in range(hero_total):
            frame = hero_frame(hero_before, target, i / max(1, hero_total - 1))
            poster = poster or frame.copy()
            emit(frame)
        key_map = {"run": "run", "mining-side": "miningSide", "mining-up": "miningUp",
                   "mining-down": "miningDown", "flight": "flight"}
        for name, *_ in families:
            label, before, after, grounded, _, _ = motion[name]
            total = round(cfg["segmentSeconds"][key_map[name]] * FPS)
            for i in range(total):
                index = int((i / max(1, total)) * len(before)) % len(before)
                frame = motion_frame("CHARACTER QUALITY V2 · SYNCHRONIZED MOTION", label,
                                     before[index], after[index], i, grounded, cfg["presentationHeights"])
                emit(frame)
    finally:
        if process:
            process.stdin.close()
    if process and process.wait():
        raise RuntimeError("ffmpeg failed")
    if not process:
        output = OUT / "01-character-quality-v2-before-after.webp"
        webp_frames[0].save(output, save_all=True, append_images=webp_frames[1:],
                            duration=round(1000 / fallback["fps"]), loop=0,
                            quality=fallback["quality"], method=fallback["method"])
    poster.save(OUT / "01-character-quality-v2-before-after-poster.png")
    decoded_frames = None
    if output.suffix.lower() == ".webp":
        with Image.open(output) as animation:
            decoded_frames = animation.n_frames
            picks = [round(i * (decoded_frames - 1) / 5) for i in range(6)]
            sheet = Image.new("RGB", (960, 540), (5, 9, 13))
            for slot, pick in enumerate(picks):
                animation.seek(pick)
                sample = animation.convert("RGB").resize((320, 270), Image.Resampling.LANCZOS)
                sheet.paste(sample, ((slot % 3) * 320, (slot // 3) * 270))
            sheet.save(OUT / "02-motion-qa-samples.png")
    qa = {
        "version": 1, "reviewOnly": True, "productionChanged": False, "runtimeWiring": "none",
        "video": output.name, "decodedAnimationFrames": decoded_frames,
        "heroTarget": {"path": target_path.name, "sha256": sha256(target_path)},
        "families": {}, "notes": [
            "Before is exact active 256 px runtime imagery.",
            "After is a motion-locked 1024 px visual compositor direction, not production output.",
            "ImageGen hero target is illustrative and is not substituted into the animated sequence."
        ]
    }
    for name, data in motion.items():
        label, before, after, grounded, sheet, paths = data
        bounds = [list(frame.getchannel("A").getbbox()) for frame in after]
        if any(not b or b[0] <= 1 or b[1] <= 1 or b[2] >= 1023 or b[3] >= 1023 for b in bounds):
            raise RuntimeError(f"Alpha clipping detected in {name}")
        qa["families"][name] = {"label": label, "frames": len(before), "grounded": grounded,
                                      "runtimeSheet": str(sheet.relative_to(ROOT)).replace("\\", "/"),
                                      "runtimeSha256": sha256(sheet), "sourceFrameSha256": [sha256(p) for p in paths],
                                      "alphaBounds": bounds}
    (OUT / "comparison-qa.json").write_text(json.dumps(qa, indent=2) + "\n", encoding="utf-8")
    print(f"CHARACTER_QUALITY_V2_REVIEW_OK {output}")


if __name__ == "__main__":
    main()
