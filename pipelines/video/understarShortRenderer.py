"""Render one captioned vertical UNDERSTAR promotional short."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFont, ImageOps


WIDTH = 1080
HEIGHT = 1920
FPS = 24


def run(command: list[str], cwd: Path | None = None) -> None:
    completed = subprocess.run(
        command,
        cwd=str(cwd) if cwd else None,
        capture_output=True,
        text=True,
        check=False,
    )
    if completed.returncode:
        tail = "\n".join(completed.stderr.splitlines()[-18:])
        raise RuntimeError(f"FFmpeg failed ({completed.returncode}):\n{tail}")


def crop_image(source: Path, destination: Path, focus: list[float]) -> None:
    with Image.open(source) as image:
        image = image.convert("RGB")
        fitted = ImageOps.fit(
            image,
            (WIDTH, HEIGHT),
            method=Image.Resampling.LANCZOS,
            centering=(float(focus[0]), float(focus[1])),
        )
        fitted.save(destination, quality=95)


def make_cta(source: Path, logo_path: Path, destination: Path, focus: list[float]) -> None:
    crop_image(source, destination, focus)
    with Image.open(destination).convert("RGB") as background:
        background = ImageEnhance.Contrast(background).enhance(1.08)
        overlay = Image.new("RGBA", background.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        for y in range(HEIGHT):
            alpha = int(80 + (y / HEIGHT) * 120)
            draw.line((0, y, WIDTH, y), fill=(4, 8, 16, min(alpha, 205)))
        composed = Image.alpha_composite(background.convert("RGBA"), overlay)
        with Image.open(logo_path).convert("RGBA") as logo:
            max_width = 820
            scale = min(1.0, max_width / logo.width)
            logo = logo.resize(
                (int(logo.width * scale), int(logo.height * scale)),
                Image.Resampling.LANCZOS,
            )
            x = (WIDTH - logo.width) // 2
            y = 670 - logo.height // 2
            composed.alpha_composite(logo, (x, y))
        font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 56)
        small = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 31)
        draw = ImageDraw.Draw(composed)
        text = "WISHLIST ON STEAM"
        box = draw.textbbox((0, 0), text, font=font)
        draw.text(((WIDTH - (box[2] - box[0])) / 2, 1050), text, font=font, fill="#f6d47a")
        sub = "DIG · DISCOVER · DESCEND"
        box = draw.textbbox((0, 0), sub, font=small)
        draw.text(((WIDTH - (box[2] - box[0])) / 2, 1140), sub, font=small, fill="#d9e8f5")
        composed.convert("RGB").save(destination, quality=96)


def render_segment(ffmpeg: str, root: Path, segment: dict, target: Path, work: Path, logo: Path) -> None:
    source = (root / segment["source"]).resolve()
    duration = float(segment["durationSeconds"])
    focus = segment.get("focus", [0.5, 0.5])
    if segment["type"] == "video":
        crop = (
            f"scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=increase,"
            f"crop={WIDTH}:{HEIGHT}:(iw-ow)*{focus[0]}:(ih-oh)*{focus[1]},"
            f"fps={FPS},format=yuv420p"
        )
        run([
            ffmpeg, "-y", "-i", str(source), "-t", str(duration), "-an",
            "-vf", crop, "-c:v", "libx264", "-preset", "medium", "-crf", "18",
            "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(target),
        ])
        return
    still = work / f"{target.stem}.png"
    if segment["type"] == "cta":
        make_cta(source, logo, still, focus)
    else:
        crop_image(source, still, focus)
    zoom = (
        "zoompan=z='min(zoom+0.00055,1.06)':"
        "x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
        f"d=1:s={WIDTH}x{HEIGHT}:fps={FPS},format=yuv420p"
    )
    run([
        ffmpeg, "-y", "-loop", "1", "-framerate", str(FPS), "-i", str(still),
        "-t", str(duration), "-an", "-vf", zoom,
        "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(target),
    ])


def ass_time(seconds: float) -> str:
    centiseconds = round(seconds * 100)
    hours, remainder = divmod(centiseconds, 360000)
    minutes, remainder = divmod(remainder, 6000)
    whole_seconds, fraction = divmod(remainder, 100)
    return f"{hours}:{minutes:02d}:{whole_seconds:02d}.{fraction:02d}"


def write_captions(path: Path, captions: list[dict]) -> None:
    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {WIDTH}
PlayResY: {HEIGHT}
WrapStyle: 2

[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: Hook,Arial,86,&H00F7FAFF,&H000000FF,&H00100B05,&H70000000,-1,0,0,0,100,100,1,0,1,6,2,8,70,70,220,1
Style: Caption,Arial,66,&H00FFFFFF,&H000000FF,&H00100804,&H78000000,-1,0,0,0,100,100,0,0,1,5,2,2,74,74,235,1
Style: CTA,Arial,76,&H007AD4F6,&H000000FF,&H00100804,&H70000000,-1,0,0,0,100,100,1,0,1,6,2,2,64,64,230,1

[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
"""
    lines = []
    for cue in captions:
        text = cue["text"].replace("\n", r"\N").replace(",", r"\,")
        lines.append(
            f"Dialogue: 0,{ass_time(cue['start'])},{ass_time(cue['end'])},"
            f"{cue['style']},,0,0,0,,{text}"
        )
    path.write_text(header + "\n".join(lines) + "\n", encoding="utf-8-sig")


def build_short(ffmpeg: str, root: Path, package: Path, short: dict, work: Path, logo: Path) -> dict:
    segments: list[Path] = []
    for index, segment in enumerate(short["segments"], start=1):
        target = work / f"{short['id']}-segment-{index:02d}.mp4"
        render_segment(ffmpeg, root, segment, target, work, logo)
        segments.append(target)
    concat_file = work / f"{short['id']}-concat.txt"
    concat_file.write_text(
        "".join(f"file '{path.as_posix()}'\n" for path in segments),
        encoding="utf-8",
    )
    base = work / f"{short['id']}-base.mp4"
    run([ffmpeg, "-y", "-f", "concat", "-safe", "0", "-i", str(concat_file), "-c", "copy", str(base)])
    caption_path = package / "captions" / short["captionFile"]
    write_captions(caption_path, short["captions"])
    narration = package / "audio" / short["audio"]["narrationFile"]
    sfx = package / "audio" / short["audio"]["sfxFile"]
    output = package / short["outputFile"]
    audio_filter = (
        "[1:a]aresample=48000,loudnorm=I=-16:TP=-1.5:LRA=7,adelay=450|450[voice];"
        f"[2:a]aresample=48000,loudnorm=I=-25:TP=-3:LRA=10,"
        f"afade=t=in:st=0:d=0.35,afade=t=out:st={short['durationSeconds'] - 1.5}:d=1.5[bed];"
        "[voice][bed]amix=inputs=2:duration=longest:weights='1 0.7':normalize=0,"
        "alimiter=limit=0.95[mix]"
    )
    run([
        ffmpeg, "-y", "-i", str(base), "-i", str(narration), "-i", str(sfx),
        "-filter_complex", audio_filter, "-vf", f"subtitles={caption_path.name}",
        "-map", "0:v:0", "-map", "[mix]", "-t", str(short["durationSeconds"]),
        "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart",
        str(output),
    ], cwd=caption_path.parent)
    return {
        "id": short["id"],
        "output": str(output.relative_to(root)).replace("\\", "/"),
        "bytes": output.stat().st_size,
        "sha256": hashlib.sha256(output.read_bytes()).hexdigest(),
        "durationSeconds": short["durationSeconds"],
        "width": WIDTH,
        "height": HEIGHT,
        "fps": FPS,
        "voice": short["narration"]["voiceName"],
        "sources": [segment["source"] for segment in short["segments"]],
    }


def write_manifest(path: Path, items: list[dict]) -> None:
    path.write_text(
        json.dumps({"schemaVersion": 1, "reviewOnly": True, "runtimeWired": False, "shorts": items}, indent=2),
        encoding="utf-8",
    )
