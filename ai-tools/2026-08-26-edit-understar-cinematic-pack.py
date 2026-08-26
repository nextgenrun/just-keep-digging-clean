"""Edit UNDERSTAR source clips into runtime, trailer, and captioned social exports."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "steam-marketing/2026-08-26-cinematic-video-pack-v1"
CLIPS = PACK / "source-clips"
AUDIO = PACK / "audio"
CAPTIONS = PACK / "captions"
FRAMES = PACK / "reference-frames"
RUNTIME = ROOT / "sprites/cinematics/understar-cinematics-v1"
FONT_DIR = ROOT / "assets/fonts/barlow-semi-condensed"
FONT_BOLD = FONT_DIR / "BarlowSemiCondensed-Bold.ttf"
LOGO = ROOT / "sprites/branding/understar-logo-v1/understar-rift-monolith-runtime.png"
KEY_ART = ROOT / "steam-marketing/2026-08-16-static-upload-pack-v1/source-textless-wide-imagegen-v1.png"
BIOMES = ROOT / "sprites/backgrounds/world-visual-v2/depth/biome-motion-v3"
MUSIC = ROOT / "sound/playlists"


EDITS = {
    "opening": {
        "size": (1920, 1080), "duration": 25.0, "voiceDelay": 0.55,
        "music": "tor-music-title-active-run-base-i00-b02-c01-v01.mp3", "musicVolume": 0.20,
        "segments": [("clip", "roots-descent.mp4", 5.5), ("clip", "rift-flight.mp4", 5.5),
                     ("biome", "blue-caverns-resonant-crystal-rain-loop-v3.mp4", 4.0),
                     ("clip", "understar-awakening.mp4", 7.0), ("card", "opening", 3.0)],
        "events": [(0.7, 4.1, "Caption", "Below the last light,\\Nthe mine remembers every path."),
                   (4.6, 7.8, "Caption", "Dig. Return. Grow stronger."),
                   (9.0, 15.3, "Caption", "Then descend where earth, sky,\\Nand starlight meet."),
                   (16.0, 20.7, "Caption", "The Understar is waiting.")],
    },
    "mossback": {
        "size": (1920, 1080), "duration": 15.0, "voiceDelay": 4.4,
        "music": "tor-music-discovery-enemy-knowledge-truth-revealed-wonder-i02-b03-c01-v01.mp3", "musicVolume": 0.18,
        "segments": [("biome", "weathered-roots-root-tide-lantern-hollow-loop-v3.mp4", 3.0),
                     ("clip", "mossback-stirs.mp4", 7.0), ("clip", "mossback-close.mp4", 5.0)],
        "events": [(4.7, 8.8, "Caption", "That is not a statue.\\NIt is breathing."),
                   (10.3, 15.0, "Title", "MOSSBACK WANDERER"),
                   (11.2, 15.0, "Kicker", "THE ROOT-BEARER"),
                   (12.2, 15.0, "Lore", "Where it passes, forgotten forests remember rain.")],
    },
    "trailer": {
        "size": (1920, 1080), "duration": 30.0, "voiceDelay": 0.45,
        "music": "tor-music-boss-breakthrough-final-opening-heroic-impact-i04-b03-c01-v01.mp3", "musicVolume": 0.24,
        "segments": [("clip", "roots-descent.mp4", 3.5), ("clip", "rift-flight.mp4", 4.5),
                     ("clip", "star-core-release.mp4", 4.0),
                     ("biome", "starfire-rift-celestial-current-loop-v3.mp4", 3.5),
                     ("clip", "mossback-stirs.mp4", 5.0), ("clip", "understar-awakening.mp4", 5.5),
                     ("card", "trailer", 4.0)],
        "events": [(0.2, 3.4, "Title", "THE MINE REMEMBERS."), (3.6, 7.8, "Title", "MASTER FLIGHT."),
                   (8.1, 11.8, "Title", "BREAK RARE STARS."), (12.1, 15.3, "Title", "DESCEND THROUGH LIVING BIOMES."),
                   (15.7, 20.3, "Title", "FIND 25 TITANS."), (20.7, 25.8, "Title", "WAKE THE UNDERSTAR.")],
    },
    "short-mossback": {
        "size": (1080, 1920), "duration": 15.0, "voiceDelay": 0.30,
        "music": "tor-music-discovery-enemy-knowledge-truth-revealed-wonder-i02-b03-c01-v01.mp3", "musicVolume": 0.20,
        "segments": [("clip", "mossback-vertical.mp4", 6.0), ("clip", "mossback-close.mp4", 5.0), ("card", "short", 4.0)],
        "events": [(0.2, 2.9, "Hook", "YOU THOUGHT IT WAS A STATUE."),
                   (3.0, 6.1, "Hook", "THEN THE ROOTS STARTED BREATHING."),
                   (6.2, 10.8, "Hook", "FIND ALL 25 TITANS."), (11.0, 15.0, "Hook", "WISHLIST UNDERSTAR ON STEAM")],
    },
    "short-depth": {
        "size": (1080, 1920), "duration": 15.0, "voiceDelay": 0.25,
        "music": "tor-music-boss-breakthrough-final-opening-heroic-impact-i04-b03-c01-v01.mp3", "musicVolume": 0.22,
        "segments": [("clip", "rift-flight-vertical.mp4", 6.0), ("clip", "star-core-release.mp4", 3.0),
                     ("clip", "understar-awakening.mp4", 3.0), ("card", "short", 3.0)],
        "events": [(0.2, 3.0, "Hook", "HOW DEEP WOULD YOU GO?"), (3.1, 6.0, "Hook", "DIG. RETURN. GROW STRONGER."),
                   (6.1, 9.0, "Hook", "BREAK RARE STARS."), (9.1, 12.0, "Hook", "THE UNDERSTAR IS WAITING."),
                   (12.1, 15.0, "Hook", "WISHLIST NOW ON STEAM")],
    },
}

DEFAULT_OUTPUTS = {
    "opening": RUNTIME / "understar-opening-v1.mp4",
    "mossback": RUNTIME / "mossback-discovery-v1.mp4",
    "trailer": PACK / "understar-cinematic-trailer-v1.mp4",
    "short-mossback": PACK / "understar-short-01-mossback-v1.mp4",
    "short-depth": PACK / "understar-short-02-depth-v1.mp4",
}


def ffmpeg() -> str:
    if os.environ.get("FFMPEG_EXE"):
        return os.environ["FFMPEG_EXE"]
    if shutil.which("ffmpeg"):
        return shutil.which("ffmpeg") or "ffmpeg"
    import imageio_ffmpeg  # type: ignore
    return imageio_ffmpeg.get_ffmpeg_exe()


def workspace_path(path: Path | str) -> Path:
    candidate = Path(path)
    resolved = (candidate if candidate.is_absolute() else ROOT / candidate).resolve()
    try:
        resolved.relative_to(ROOT.resolve())
    except ValueError:
        raise ValueError(f"Configured path escapes workspace: {path}") from None
    return resolved


def resolve_build_plan(plan_path: Path | None) -> tuple[dict[str, dict], Path, bool]:
    if plan_path is None:
        targets = {
            edit_id: {
                "narration": AUDIO / f"narration-{edit_id}.mp3",
                "output": output,
            }
            for edit_id, output in DEFAULT_OUTPUTS.items()
        }
        return targets, PACK / "media-verification.json", True
    plan = json.loads(workspace_path(plan_path).read_text(encoding="utf-8"))
    package = workspace_path(plan["outputRoot"])
    audio_dir = (package / plan.get("audioDir", "audio")).resolve()
    audio_dir.relative_to(package.resolve())
    targets = {
        item["editId"]: {
            "narration": (audio_dir / item["narrationFile"]).resolve(),
            "output": workspace_path(item["candidateOutput"]),
        }
        for item in plan["renderTargets"]
    }
    if set(targets) != set(EDITS):
        raise ValueError("Render plan must map all five cinematic edit ids exactly once")
    verification = (package / plan.get(
        "mediaVerificationFile",
        "media-verification-frederick-v2.json",
    )).resolve()
    for target in targets.values():
        target["narration"].relative_to(audio_dir)
    verification.relative_to(package.resolve())
    return targets, verification, False


def run(args: list[str], cwd: Path | None = None, capture: bool = False) -> subprocess.CompletedProcess[str]:
    return subprocess.run([ffmpeg(), "-hide_banner", "-loglevel", "error", "-y", *args], cwd=cwd or ROOT,
                          text=True, capture_output=capture, check=True)


def probe(path: Path) -> dict:
    result = subprocess.run([ffmpeg(), "-hide_banner", "-i", str(path)], text=True, capture_output=True)
    text = result.stderr
    duration = re.search(r"Duration: (\d+):(\d+):([\d.]+)", text)
    size = re.search(r"Video: .*?, (\d{2,5})x(\d{2,5})", text)
    seconds = int(duration.group(1)) * 3600 + int(duration.group(2)) * 60 + float(duration.group(3)) if duration else 0
    return {"durationSeconds": seconds, "width": int(size.group(1)) if size else 0,
            "height": int(size.group(2)) if size else 0, "hasAudio": "Audio:" in text}


def fit_filter(width: int, height: int) -> str:
    return f"scale={width}:{height}:force_original_aspect_ratio=increase,crop={width}:{height},fps=30,format=yuv420p"


def normalize(source: Path, output: Path, seconds: float, size: tuple[int, int]) -> None:
    info = probe(source)
    fade_out = max(0.0, seconds - 0.12)
    video = f"{fit_filter(*size)},fade=t=in:st=0:d=0.10,fade=t=out:st={fade_out}:d=0.12,setpts=PTS-STARTPTS[v]"
    if info["hasAudio"]:
        filters = f"[0:v]{video};[0:a]aresample=48000,volume=0.55,atrim=0:{seconds},apad=pad_dur={seconds},asetpts=PTS-STARTPTS[a]"
        inputs, audio_map = ["-i", str(source)], "[a]"
    else:
        filters = f"[0:v]{video};[1:a]atrim=0:{seconds},asetpts=PTS-STARTPTS[a]"
        inputs, audio_map = ["-i", str(source), "-f", "lavfi", "-t", str(seconds), "-i", "anullsrc=r=48000:cl=stereo"], "[a]"
    run([*inputs, "-t", str(seconds), "-filter_complex", filters, "-map", "[v]", "-map", audio_map,
         "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", str(output)])


def font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_BOLD), size)


def render_card(kind: str, size: tuple[int, int]) -> Path:
    output = FRAMES / f"{kind}-{size[0]}x{size[1]}-card.png"
    with Image.open(KEY_ART) as source:
        image = ImageOps.fit(source.convert("RGB"), size, Image.Resampling.LANCZOS, centering=(0.57, 0.50))
    image = ImageEnhance.Brightness(image.filter(ImageFilter.GaussianBlur(4))).enhance(0.26).convert("RGBA")
    with Image.open(LOGO) as logo_source:
        logo = logo_source.convert("RGBA")
    max_width = int(size[0] * (0.70 if size[0] > size[1] else 0.82))
    logo.thumbnail((max_width, int(size[1] * 0.47)), Image.Resampling.LANCZOS)
    image.alpha_composite(logo, ((size[0] - logo.width) // 2, int(size[1] * (0.17 if size[0] > size[1] else 0.25))))
    draw = ImageDraw.Draw(image)
    label = "DIG DEEP.  GROW STRONGER.  KEEP GOING." if kind == "opening" else "WISHLIST UNDERSTAR ON STEAM"
    text_font = font(max(36, int(size[0] * (0.031 if size[0] > size[1] else 0.052))))
    box = draw.textbbox((0, 0), label, font=text_font, stroke_width=2)
    x, y = (size[0] - (box[2] - box[0])) // 2, int(size[1] * (0.76 if size[0] > size[1] else 0.70))
    draw.text((x, y), label, font=text_font, fill="#fff0bd", stroke_width=4, stroke_fill="#050812")
    image.convert("RGB").save(output, quality=95)
    return output


def normalize_card(kind: str, output: Path, seconds: float, size: tuple[int, int]) -> None:
    source = render_card(kind, size)
    run(["-loop", "1", "-i", str(source), "-f", "lavfi", "-t", str(seconds), "-i", "anullsrc=r=48000:cl=stereo",
         "-t", str(seconds), "-vf", f"fps=30,format=yuv420p,fade=t=in:st=0:d=0.12,fade=t=out:st={max(0, seconds-0.15)}:d=0.15",
         "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "medium", "-crf", "17",
         "-c:a", "aac", "-b:a", "192k", "-ar", "48000", str(output)])


def timestamp(seconds: float, srt: bool = False) -> str:
    total_ms = round(seconds * 1000)
    hours, remainder = divmod(total_ms, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    whole_seconds, milliseconds = divmod(remainder, 1000)
    if srt:
        return f"{hours:02d}:{minutes:02d}:{whole_seconds:02d},{milliseconds:03d}"
    return f"{hours}:{minutes:02d}:{whole_seconds:02d}.{milliseconds // 10:02d}"


def write_captions(edit_id: str, edit: dict) -> tuple[Path, Path]:
    srt = CAPTIONS / f"{edit_id}.srt"; ass = CAPTIONS / f"{edit_id}.ass"
    srt.write_text("\n\n".join(f"{index}\n{timestamp(start, True)} --> {timestamp(end, True)}\n{text.replace('\\N', '\n')}"
                                    for index, (start, end, _style, text) in enumerate(edit["events"], 1)) + "\n", encoding="utf-8")
    width, height = edit["size"]
    styles = (
        f"Style: Caption,Barlow Semi Condensed,{60 if width > height else 58},&H00FFFFFF,&H000000FF,&H00100805,&H90000000,-1,0,0,0,100,100,0,0,1,4,1,2,90,90,{180 if width > height else 220},1\n"
        f"Style: Title,Barlow Semi Condensed,{82 if width > height else 74},&H00B8E8FF,&H000000FF,&H00100805,&H70000000,-1,0,0,0,100,100,2,0,1,5,1,8,70,70,{95 if width > height else 180},1\n"
        f"Style: Kicker,Barlow Semi Condensed,42,&H00FFEA9D,&H000000FF,&H00100805,&H70000000,-1,0,0,0,100,100,2,0,1,4,1,8,70,70,190,1\n"
        f"Style: Lore,Barlow Semi Condensed,34,&H00FFFFFF,&H000000FF,&H00100805,&H70000000,0,0,0,0,100,100,0,0,1,3,1,2,110,110,120,1\n"
        f"Style: Hook,Barlow Semi Condensed,68,&H00FFFFFF,&H000000FF,&H00100805,&H80000000,-1,0,0,0,100,100,1,0,1,6,1,8,70,70,210,1\n"
    )
    events = "\n".join(f"Dialogue: 0,{timestamp(start)},{timestamp(end)},{style},,0,0,0,,{text}" for start, end, style, text in edit["events"])
    ass.write_text(f"[Script Info]\nScriptType: v4.00+\nPlayResX: {width}\nPlayResY: {height}\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding\n{styles}\n[Events]\nFormat: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text\n{events}\n", encoding="utf-8")
    return srt, ass


def build(edit_id: str, edit: dict, temp: Path, narration: Path, output: Path) -> Path:
    segments = []
    for index, (kind, name, seconds) in enumerate(edit["segments"]):
        output = temp / f"{edit_id}-{index:02d}.mp4"
        if kind == "card": normalize_card(name, output, seconds, edit["size"])
        else: normalize((CLIPS if kind == "clip" else BIOMES) / name, output, seconds, edit["size"])
        segments.append(output)
    concat = temp / f"{edit_id}-concat.txt"
    concat.write_text("\n".join(f"file '{path.as_posix()}'" for path in segments), encoding="utf-8")
    joined = temp / f"{edit_id}-joined.mp4"
    run(["-f", "concat", "-safe", "0", "-i", str(concat), "-c", "copy", str(joined)])
    _srt, ass = write_captions(edit_id, edit)
    output.parent.mkdir(parents=True, exist_ok=True)
    subtitle_filter = f"subtitles='{ass.relative_to(PACK).as_posix()}':fontsdir='../../assets/fonts/barlow-semi-condensed'"
    mix = (f"[0:a]volume=0.42[a0];[1:a]atrim=0:{edit['duration']},asetpts=PTS-STARTPTS,volume={edit['musicVolume']},afade=t=in:st=0:d=0.6,afade=t=out:st={edit['duration']-1}:d=1,apad[a1];"
           f"[2:a]adelay={int(edit['voiceDelay']*1000)}:all=1,volume=1.12,apad,atrim=0:{edit['duration']}[a2];[a0][a1][a2]amix=inputs=3:duration=first:normalize=0,loudnorm=I=-16:LRA=10:TP=-1.5[a]")
    run(["-i", str(joined), "-i", str(MUSIC / edit["music"]), "-i", str(narration),
         "-t", str(edit["duration"]), "-filter_complex", mix, "-vf", subtitle_filter, "-map", "0:v", "-map", "[a]",
         "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", "-r", "30",
         "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", str(output)], cwd=PACK)
    return output


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan", type=Path, help="Optional narration replacement plan inside the workspace")
    parser.add_argument("--dry-run", action="store_true", help="Validate and print inputs without rendering")
    args = parser.parse_args()
    targets, verification_path, build_posters = resolve_build_plan(args.plan)
    missing = [target["narration"] for target in targets.values() if not target["narration"].is_file()]
    for edit_id, target in targets.items():
        state = "ready" if target["narration"].is_file() else "missing"
        print(f"{edit_id}: {state} {target['narration'].name} -> {target['output'].name}")
    if args.dry_run:
        return 1 if missing else 0
    if missing:
        raise FileNotFoundError(f"Missing {len(missing)} narration files; run the audio plan first")
    for directory in (CAPTIONS, FRAMES, RUNTIME): directory.mkdir(parents=True, exist_ok=True)
    outputs = []
    with tempfile.TemporaryDirectory(prefix="understar-cinematic-edit-") as name:
        temp = Path(name)
        for edit_id, edit in EDITS.items():
            print(f"Editing {edit_id}", flush=True)
            target = targets[edit_id]
            outputs.append(build(edit_id, edit, temp, target["narration"], target["output"]))
    if build_posters:
        posters = [(RUNTIME / "understar-opening-v1.mp4", RUNTIME / "understar-opening-v1-poster.png", 1.0),
                   (RUNTIME / "mossback-discovery-v1.mp4", RUNTIME / "mossback-discovery-v1-poster.png", 7.0)]
        for source, output, at in posters:
            run(["-ss", str(at), "-i", str(source), "-frames:v", "1", str(output)])
    verification = []
    for output in outputs:
        info = probe(output)
        verification.append({"path": output.relative_to(ROOT).as_posix(), **info, "bytes": output.stat().st_size,
                             "sha256": hashlib.sha256(output.read_bytes()).hexdigest()})
    verification_path.write_text(json.dumps({"schemaVersion": 1, "outputs": verification}, indent=2), encoding="utf-8")
    print(json.dumps(verification, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
