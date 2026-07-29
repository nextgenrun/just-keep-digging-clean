from __future__ import annotations

from pathlib import Path
import hashlib
import json
import math
import shutil
import subprocess

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "ai-tools" / "2026-07-28-demon-mist-three-layer-background-mockup-v2.png"
STEM = "2026-07-28-demon-mist-baked-motion-variant-v3"
FAR_PLATE = ROOT / "ai-tools" / f"{STEM}-far-plate.png"
MID_PLATE = ROOT / "ai-tools" / f"{STEM}-mist-demon-plate.png"
FORE_PLATE = ROOT / "ai-tools" / f"{STEM}-foreground-trees-plate.png"
POSTER = ROOT / "ai-tools" / f"{STEM}-poster.png"
OUTPUT = ROOT / "ai-tools" / f"{STEM}.mp4"
MANIFEST = ROOT / "ai-tools" / f"{STEM}-manifest.json"

FRAME_RATE = 60
DURATION_SECONDS = 8
FRAME_COUNT = FRAME_RATE * DURATION_SECONDS
FAR_ZOOM = 1.006
MID_ZOOM = 1.008
FAR_XY = (0.35, 0.25)
MID_XY = (2.4, 0.9)
MID_ZOOM_AMPLITUDE = 0.0015
FORE_XY = (0.45, 0.25)
FORE_SHEAR = 0.00115


def scaled(points: list[tuple[float, float]], size: tuple[int, int]):
    return [(int(x * size[0]), int(y * size[1])) for x, y in points]


def load_source() -> Image.Image:
    if not SOURCE.is_file():
        raise RuntimeError(f"Missing approved source: {SOURCE}")
    with Image.open(SOURCE) as opened:
        source = opened.convert("RGB")
    width = source.width - source.width % 2
    height = source.height - source.height % 2
    return source.crop((0, 0, width, height))


def make_mid_mask(size: tuple[int, int]) -> Image.Image:
    width, height = size
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.polygon(
        scaled(
            [(0, .38), (.18, .34), (.36, .43), (.52, .37), (.72, .34),
             (1, .39), (1, .78), (.66, .74), (.37, .80), (0, .75)],
            size,
        ),
        fill=224,
    )
    draw.ellipse(
        (
            int(width * 0.37),
            int(height * 0.10),
            int(width * 0.64),
            int(height * 0.53),
        ),
        fill=240,
    )
    mask = mask.filter(ImageFilter.GaussianBlur(34))
    return ImageChops.subtract(mask, make_protected_mask(size, blur=12))


def make_foreground_mask(source: Image.Image) -> Image.Image:
    width, height = source.size
    darkness = ImageOps.grayscale(source).point(
        lambda value: max(0, min(255, round((106 - value) * 5.2)))
    )
    darkness = darkness.filter(ImageFilter.MaxFilter(9))
    darkness = darkness.filter(ImageFilter.GaussianBlur(1.7))
    spatial = Image.new("L", source.size, 0)
    draw = ImageDraw.Draw(spatial)
    draw.polygon(
        scaled([(0, .30), (.18, .26), (.31, .55), (.35, 1), (0, 1)], source.size),
        fill=255,
    )
    draw.polygon(
        scaled([(.50, .31), (.76, .20), (.87, 1), (.47, 1)], source.size),
        fill=255,
    )
    draw.polygon(
        scaled([(.78, .32), (1, .27), (1, 1), (.73, 1)], source.size),
        fill=255,
    )
    spatial = spatial.filter(ImageFilter.GaussianBlur(8))
    return ImageChops.subtract(
        ImageChops.multiply(darkness, spatial),
        make_protected_mask(source.size, blur=8),
    )


def make_protected_mask(
    size: tuple[int, int],
    blur: float = 7,
) -> Image.Image:
    width, height = size
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle(
        (
            int(width * 0.24),
            int(height * 0.41),
            int(width * 0.51),
            int(height * 0.91),
        ),
        radius=42,
        fill=255,
    )
    return mask.filter(ImageFilter.GaussianBlur(blur))


def save_plates(
    source: Image.Image,
    mid_mask: Image.Image,
    fore_mask: Image.Image,
) -> None:
    source.save(FAR_PLATE, optimize=True)
    for path, alpha in ((MID_PLATE, mid_mask), (FORE_PLATE, fore_mask)):
        plate = source.convert("RGBA")
        plate.putalpha(alpha)
        plate.save(path, optimize=True)


def transform_plate(
    source: Image.Image,
    x_offset: float,
    y_offset: float,
    zoom: float,
    shear: float = 0.0,
) -> Image.Image:
    width, height = source.size
    inverse_zoom = 1 / zoom
    base_x = (width - width * inverse_zoom) * 0.5
    base_y = (height - height * inverse_zoom) * 0.5
    return source.transform(
        source.size,
        Image.Transform.AFFINE,
        (
            inverse_zoom,
            shear,
            base_x + x_offset - shear * height,
            0,
            inverse_zoom,
            base_y + y_offset,
        ),
        resample=Image.Resampling.BICUBIC,
    )


def render_frame(
    source: Image.Image,
    mid_mask: Image.Image,
    fore_mask: Image.Image,
    lock_mask: Image.Image,
    frame_index: int,
) -> Image.Image:
    theta = math.tau * frame_index / FRAME_COUNT
    far = transform_plate(
        source,
        FAR_XY[0] * math.sin(theta),
        FAR_XY[1] * math.cos(theta),
        FAR_ZOOM,
    )
    breathing_zoom = MID_ZOOM + MID_ZOOM_AMPLITUDE * (
        0.5 + 0.5 * math.sin(theta - math.pi / 2)
    )
    mid = transform_plate(
        source,
        MID_XY[0] * math.sin(theta + 0.32),
        MID_XY[1] * math.sin(theta * 2 - 0.20),
        breathing_zoom,
    )
    foreground = transform_plate(
        source,
        FORE_XY[0] * math.sin(theta + math.pi),
        FORE_XY[1] * math.sin(theta * 2 + 0.65),
        FAR_ZOOM,
        FORE_SHEAR * math.sin(theta - 0.45),
    )
    frame = Image.composite(mid, far, mid_mask)
    frame = Image.composite(foreground, frame, fore_mask)
    return Image.composite(source, frame, lock_mask)


def encode_video(
    ffmpeg: str,
    source: Image.Image,
    mid_mask: Image.Image,
    fore_mask: Image.Image,
    lock_mask: Image.Image,
) -> None:
    width, height = source.size
    command = [
        ffmpeg, "-y", "-hide_banner", "-loglevel", "error",
        "-f", "rawvideo", "-pixel_format", "rgb24",
        "-video_size", f"{width}x{height}", "-framerate", str(FRAME_RATE),
        "-i", "-", "-an", "-c:v", "libx264", "-preset", "medium",
        "-crf", "12", "-g", str(FRAME_COUNT), "-keyint_min", str(FRAME_COUNT),
        "-sc_threshold", "0", "-force_key_frames", f"0,{(FRAME_COUNT - 1) / FRAME_RATE:.6f}",
        "-pix_fmt", "yuv420p", "-profile:v", "high",
        "-movflags", "+faststart", str(OUTPUT),
    ]
    process = subprocess.Popen(command, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    if process.stdin is None or process.stderr is None:
        raise RuntimeError("Unable to open FFmpeg frame pipe")
    try:
        for frame_index in range(FRAME_COUNT):
            motion_index = 0 if frame_index == FRAME_COUNT - 1 else frame_index
            frame = render_frame(
                source, mid_mask, fore_mask, lock_mask, motion_index
            )
            if frame_index == 0:
                frame.save(POSTER, optimize=True)
            process.stdin.write(frame.tobytes())
    finally:
        process.stdin.close()
    error = process.stderr.read().decode("utf-8", errors="replace")
    if process.wait():
        raise RuntimeError(f"FFmpeg failed:\n{error}")


def inspect_video(ffprobe: str, size: tuple[int, int]) -> dict[str, object]:
    command = [
        ffprobe, "-v", "error",
        "-show_entries", "stream=codec_name,width,height,pix_fmt,r_frame_rate,nb_frames",
        "-show_entries", "format=duration,size", "-of", "json", str(OUTPUT),
    ]
    completed = subprocess.run(command, capture_output=True, text=True, check=False)
    if completed.returncode:
        raise RuntimeError(completed.stderr)
    payload = json.loads(completed.stdout)
    stream = payload["streams"][0]
    media = payload["format"]
    expected = {"codec_name": "h264", "width": size[0], "height": size[1],
                "pix_fmt": "yuv420p", "r_frame_rate": f"{FRAME_RATE}/1",
                "nb_frames": str(FRAME_COUNT)}
    for key, value in expected.items():
        if stream.get(key) != value:
            raise RuntimeError(f"Unexpected {key}: {stream.get(key)}")
    if abs(float(media["duration"]) - DURATION_SECONDS) > 0.02:
        raise RuntimeError(f"Unexpected duration: {media['duration']}")
    return {"codec": stream["codec_name"], "width": stream["width"],
            "height": stream["height"], "pixelFormat": stream["pix_fmt"],
            "frameRate": stream["r_frame_rate"], "frames": int(stream["nb_frames"]),
            "durationSeconds": float(media["duration"]), "bytes": int(media["size"])}


def main() -> None:
    ffmpeg = shutil.which("ffmpeg")
    ffprobe = shutil.which("ffprobe")
    if not ffmpeg or not ffprobe:
        raise RuntimeError("FFmpeg and FFprobe must be on PATH")
    source = load_source()
    mid_mask = make_mid_mask(source.size)
    fore_mask = make_foreground_mask(source)
    lock_mask = make_protected_mask(source.size)
    save_plates(source, mid_mask, fore_mask)
    encode_video(ffmpeg, source, mid_mask, fore_mask, lock_mask)
    media = inspect_video(ffprobe, source.size)
    record = {
        "version": STEM.removeprefix("2026-07-28-"),
        "reviewOnly": True,
        "productionChanged": False,
        "runtimeWired": False,
        "source": SOURCE.relative_to(ROOT).as_posix(),
        "motionSource": "three-baked-plates-with-subpixel-affine-transforms",
        "individualObjectAnimation": False,
        "opticalFlow": False,
        "deformation": False,
        "plates": [path.relative_to(ROOT).as_posix()
                   for path in (FAR_PLATE, MID_PLATE, FORE_PLATE)],
        "motion": {
            "farXYAmplitudePx": FAR_XY,
            "midXYAmplitudePx": MID_XY,
            "midZoomAmplitude": MID_ZOOM_AMPLITUDE,
            "foregroundXYAmplitudePx": FORE_XY,
            "foregroundBottomAnchoredShear": FORE_SHEAR,
        },
        "output": OUTPUT.relative_to(ROOT).as_posix(),
        "poster": POSTER.relative_to(ROOT).as_posix(),
        "sha256": hashlib.sha256(OUTPUT.read_bytes()).hexdigest(),
        **media,
    }
    MANIFEST.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
    print(
        f"Built review-only baked variant: {OUTPUT.name} "
        f"({media['bytes'] / 1024 / 1024:.2f} MiB)"
    )


if __name__ == "__main__":
    main()
