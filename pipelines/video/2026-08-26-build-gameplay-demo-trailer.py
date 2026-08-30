#!/usr/bin/env python3
"""Build the review-only gameplay trailer and one vertical Short."""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
PACKAGE = ROOT / "steam-marketing/2026-08-26-gameplay-demo-trailer-v1"
CAPTURES = ROOT / "systems/screenrecord"
WIDE = CAPTURES / "screenrecord-20260820-015748-656106-screenrecord-broad-2026-08-19T22-57-48-181Z.webm"
VERTICAL_LONG = CAPTURES / "screenrecord-20260803-195757-048080-screenrecord-short-2026-08-03T16-57-56-273Z.webm"
VERTICAL_ALT = CAPTURES / "screenrecord-20260803-195514-401018-screenrecord-short-2026-08-03T16-55-13-688Z.webm"
KEY_ART = PACKAGE / "openrouter-gameplay-keyart-landscape-v2.png"
LOGO = ROOT / "steam-marketing/2026-08-16-static-upload-pack-v1/source-runtime-logo-transparent.png"
FONT_DIR = ROOT / "assets/fonts/barlow-semi-condensed"
MUSIC = ROOT / "sound/playlists/tor-music-boss-breakthrough-final-opening-heroic-impact-i04-b03-c01-v01.mp3"
DIG = ROOT / "sound/soundEffects/approved-sfx-findings-v1/rare-discovery-tight-reward.ogg"
CHIME = ROOT / "sound/soundEffects/approved-sfx-findings-v1/rare-discovery-clean-reward.ogg"
VOICE_SOURCE = ROOT / "steam-marketing/2026-08-26-cinematic-video-pack-v1/audio"
TRAILER_VOICE = PACKAGE / "narration-trailer-frederick-v2.mp3"
SHORT_VOICE = PACKAGE / "narration-short-depth-frederick-v2.mp3"
TRAILER = PACKAGE / "understar-gameplay-demo-trailer-v1.mp4"
SHORT = PACKAGE / "understar-gameplay-short-01-v1.mp4"


def executable(name: str) -> str:
    configured = os.environ.get("FFMPEG_EXE")
    if configured:
        path = Path(configured)
        return str(path.with_name("ffprobe.exe")) if name == "ffprobe" else str(path)
    found = shutil.which(name)
    if not found:
        raise RuntimeError(f"Set FFMPEG_EXE or install {name}.")
    return found


FFMPEG = executable("ffmpeg")
FFPROBE = executable("ffprobe")


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def run(args: list[str]) -> None:
    print("Running:", Path(args[0]).name, " ".join(args[1:5]), "...")
    subprocess.run(args, cwd=ROOT, check=True)


def stamp(seconds: float, comma: bool = True) -> str:
    milliseconds = round(seconds * 1000)
    hours, milliseconds = divmod(milliseconds, 3_600_000)
    minutes, milliseconds = divmod(milliseconds, 60_000)
    secs, milliseconds = divmod(milliseconds, 1000)
    separator = "," if comma else "."
    return f"{hours:02d}:{minutes:02d}:{secs:02d}{separator}{milliseconds:03d}"


def ass_stamp(seconds: float) -> str:
    centiseconds = round(seconds * 100)
    hours, centiseconds = divmod(centiseconds, 360_000)
    minutes, centiseconds = divmod(centiseconds, 6_000)
    secs, centiseconds = divmod(centiseconds, 100)
    return f"{hours}:{minutes:02d}:{secs:02d}.{centiseconds:02d}"


def write_subtitles(stem: str, width: int, height: int, captions: list[tuple], overlays: list[tuple]) -> Path:
    captions = sorted(captions, key=lambda item: item[0])
    srt = PACKAGE / f"{stem}.srt"
    vtt = PACKAGE / f"{stem}.vtt"
    ass = PACKAGE / f"{stem}.ass"
    srt.write_text("\n\n".join(
        f"{index}\n{stamp(start)} --> {stamp(end)}\n{text}"
        for index, (start, end, text, _style) in enumerate(captions, 1)
    ) + "\n", encoding="utf-8")
    vtt.write_text("WEBVTT\n\n" + "\n\n".join(
        f"{stamp(start, False)} --> {stamp(end, False)}\n{text}"
        for start, end, text, _style in captions
    ) + "\n", encoding="utf-8")

    portrait = height > width
    caption_size = 68 if portrait else 52
    cue_size = 54 if portrait else 42
    margin_v = 280 if portrait else 86
    cue_margin = 410 if portrait else 154
    feature_size = 68 if portrait else 58
    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {width}
PlayResY: {height}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Barlow Semi Condensed,{caption_size},&H00FFFFFF,&H00FFFFFF,&H00000000,&HA0000000,-1,0,0,0,100,100,0,0,3,12,0,2,140,140,{margin_v},1
Style: Cue,Barlow Semi Condensed,{cue_size},&H00E8E8E8,&H00E8E8E8,&H00000000,&H98000000,0,-1,0,0,100,100,0,0,3,10,0,2,160,160,{cue_margin},1
Style: Eyebrow,Barlow Semi Condensed,{38 if portrait else 30},&H00D8FCFF,&H00D8FCFF,&H90000000,&H00000000,-1,0,0,0,100,100,3,0,1,3,0,8,100,100,{92 if portrait else 54},1
Style: Feature,Barlow Semi Condensed,{feature_size},&H00FFFFFF,&H00FFFFFF,&H00000000,&H70000000,-1,0,0,0,100,100,1,0,3,14,0,8,110,110,{210 if portrait else 88},1
Style: CTA,Barlow Semi Condensed,{74 if portrait else 54},&H00FFFFFF,&H00FFFFFF,&H00000000,&HA0000000,-1,0,0,0,100,100,2,0,3,14,0,2,100,100,{330 if portrait else 120},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    dialogue = []
    for start, end, text, style in captions + overlays:
        escaped = text.replace("\n", r"\N")
        dialogue.append(f"Dialogue: 0,{ass_stamp(start)},{ass_stamp(end)},{style},,0,0,0,,{escaped}")
    ass.write_text(header + "\n".join(dialogue) + "\n", encoding="utf-8")
    return ass


def subtitle_files() -> tuple[Path, Path]:
    trailer_captions = [
        (0.55, 2.13, "Every descent is a decision.", "Caption"),
        (2.61, 4.24, "Every return makes you stronger.", "Caption"),
        (4.80, 5.64, "Master Flight.", "Caption"),
        (5.99, 7.06, "Find the Titans.", "Caption"),
        (7.44, 8.49, "Wake the Understar.", "Caption"),
        (8.88, 10.77, "Wishlist Understar on Steam.", "Caption"),
        (11.80, 13.05, "[Mining impact]", "Cue"),
        (21.15, 22.55, "[Star chime]", "Cue"),
        (27.15, 29.55, "[Music resolves]", "Cue"),
    ]
    trailer_overlays = [
        (0.25, 2.45, "CAPTURED GAMEPLAY", "Eyebrow"),
        (11.20, 14.65, "MINE  •  MASTER FLIGHT  •  FIND STARS", "Feature"),
        (15.15, 17.20, "REAL PORTRAIT CAPTURES", "Eyebrow"),
        (17.15, 20.80, "ANCHORED STARS\nLIVING INTERNAL ANIMATION", "Feature"),
        (22.30, 26.30, "DIG. RETURN. GROW STRONGER.", "Feature"),
        (27.05, 29.90, "GAMEPLAY-DERIVED KEY ART", "Eyebrow"),
        (27.15, 29.90, "WISHLIST ON STEAM", "CTA"),
    ]
    short_captions = [
        (0.35, 1.54, "How deep would you go?", "Caption"),
        (2.11, 2.39, "Dig.", "Caption"),
        (2.90, 3.50, "Return.", "Caption"),
        (3.55, 4.20, "[Mining impact]", "Cue"),
        (4.00, 4.80, "Grow stronger.", "Caption"),
        (5.38, 6.70, "The Understar is waiting.", "Caption"),
        (7.20, 8.58, "Wishlist now on Steam.", "Caption"),
        (9.00, 10.35, "[Star chime]", "Cue"),
        (12.65, 14.75, "[Music resolves]", "Cue"),
    ]
    short_overlays = [
        (0.20, 1.55, "REAL GAMEPLAY", "Eyebrow"),
        (9.05, 11.20, "ANCHORED STARS\nPURE INTERNAL ANIMATION", "Feature"),
        (11.60, 14.90, "WISHLIST NOW ON STEAM", "CTA"),
    ]
    return (
        write_subtitles("understar-gameplay-demo-trailer-v1", 1920, 1080, trailer_captions, trailer_overlays),
        write_subtitles("understar-gameplay-short-01-v1", 1080, 1920, short_captions, short_overlays),
    )


def input_clip(args: list[str], start: float, duration: float, source: Path) -> None:
    args.extend(["-ss", str(start), "-t", str(duration), "-i", rel(source)])


def build_trailer(ass: Path) -> None:
    args = [FFMPEG, "-y", "-hide_banner"]
    input_clip(args, 0, 15, WIDE)
    for start, source in [(17, VERTICAL_LONG), (20, VERTICAL_ALT), (44, VERTICAL_LONG),
                          (52, VERTICAL_LONG), (33, VERTICAL_ALT), (68, VERTICAL_LONG)]:
        input_clip(args, start, 6, source)
    args += ["-loop", "1", "-framerate", "30", "-i", rel(KEY_ART),
             "-loop", "1", "-framerate", "30", "-i", rel(LOGO),
             "-i", rel(TRAILER_VOICE), "-stream_loop", "-1", "-i", rel(MUSIC),
             "-i", rel(DIG), "-i", rel(CHIME)]
    filters = [
        "[0:v]fps=30,scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1,trim=duration=15,setpts=PTS-STARTPTS[v0]",
    ]
    for index in range(1, 7):
        filters.append(f"[{index}:v]fps=30,scale=640:1138,crop=640:1080:0:29,setsar=1,trim=duration=6,setpts=PTS-STARTPTS[p{index}]")
    filters += [
        "[p1][p2][p3]hstack=inputs=3,drawbox=x=638:y=0:w=4:h=ih:color=black@0.7:t=fill,drawbox=x=1278:y=0:w=4:h=ih:color=black@0.7:t=fill[m1]",
        "[p4][p5][p6]hstack=inputs=3,drawbox=x=638:y=0:w=4:h=ih:color=black@0.7:t=fill,drawbox=x=1278:y=0:w=4:h=ih:color=black@0.7:t=fill[m2]",
        "[7:v]fps=30,scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,eq=brightness=-0.10:saturation=0.86,trim=duration=3,setpts=PTS-STARTPTS[card]",
        "[v0][m1][m2][card]concat=n=4:v=1:a=0,format=yuv420p,fade=t=in:st=0:d=0.35,fade=t=out:st=29.55:d=0.45[base]",
        "[8:v]scale=900:-1[logo]",
        "[base]drawbox=x=0:y=0:w=iw:h=ih:color=black@0.24:t=fill:enable='between(t,27,30)'[dark]",
        "[dark][logo]overlay=x=(W-w)/2:y=350:enable='between(t,27,30)':eof_action=pass[brand]",
        f"[brand]ass=filename={rel(ass)}:fontsdir={rel(FONT_DIR)}[vout]",
        "[9:a]aresample=48000,volume=1.24,adelay=550:all=1,apad=pad_dur=30,atrim=duration=30[voice]",
        "[10:a]aresample=48000,atrim=duration=30,volume=0.18,afade=t=in:st=0:d=0.7,afade=t=out:st=28.4:d=1.6[music]",
        "[11:a]aresample=48000,atrim=duration=1.2,volume=0.52,adelay=11800:all=1[dig]",
        "[12:a]aresample=48000,atrim=duration=1.4,volume=0.48,adelay=21150:all=1[chime]",
        "[voice][music][dig][chime]amix=inputs=4:duration=longest:dropout_transition=1:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=8,atrim=duration=30[aout]",
    ]
    args += ["-filter_complex", ";".join(filters), "-map", "[vout]", "-map", "[aout]",
             "-t", "30", "-r", "30", "-c:v", "libx264", "-preset", "slow", "-crf", "18",
             "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
             "-movflags", "+faststart", rel(TRAILER)]
    run(args)


def build_short(ass: Path) -> None:
    args = [FFMPEG, "-y", "-hide_banner"]
    for start, duration, source in [(16.5, 3.5, VERTICAL_LONG), (20, 4, VERTICAL_ALT),
                                    (44, 4, VERTICAL_LONG), (68, 3.5, VERTICAL_LONG)]:
        input_clip(args, start, duration, source)
    args += ["-loop", "1", "-framerate", "30", "-i", rel(LOGO),
             "-i", rel(SHORT_VOICE), "-stream_loop", "-1", "-i", rel(MUSIC),
             "-i", rel(DIG), "-i", rel(CHIME)]
    filters = []
    for index, duration in enumerate((3.5, 4, 4, 3.5)):
        filters.append(f"[{index}:v]fps=30,scale=1080:1920,setsar=1,trim=duration={duration},setpts=PTS-STARTPTS[s{index}]")
    filters += [
        "[s0][s1][s2][s3]concat=n=4:v=1:a=0,format=yuv420p,fade=t=in:st=0:d=0.25,fade=t=out:st=14.6:d=0.4[base]",
        "[4:v]scale=820:-1[logo]",
        "[base]drawbox=x=0:y=0:w=iw:h=ih:color=black@0.48:t=fill:enable='between(t,11.5,15)'[dark]",
        "[dark][logo]overlay=x=(W-w)/2:y=430:enable='between(t,11.5,15)':eof_action=pass[brand]",
        f"[brand]ass=filename={rel(ass)}:fontsdir={rel(FONT_DIR)}[vout]",
        "[5:a]aresample=48000,volume=1.24,adelay=350:all=1,apad=pad_dur=15,atrim=duration=15[voice]",
        "[6:a]aresample=48000,atrim=duration=15,volume=0.17,afade=t=in:st=0:d=0.5,afade=t=out:st=13.7:d=1.3[music]",
        "[7:a]aresample=48000,atrim=duration=0.9,volume=0.50,adelay=3550:all=1[dig]",
        "[8:a]aresample=48000,atrim=duration=1.35,volume=0.46,adelay=9000:all=1[chime]",
        "[voice][music][dig][chime]amix=inputs=4:duration=longest:dropout_transition=1:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=8,atrim=duration=15[aout]",
    ]
    args += ["-filter_complex", ";".join(filters), "-map", "[vout]", "-map", "[aout]",
             "-t", "15", "-r", "30", "-c:v", "libx264", "-preset", "slow", "-crf", "18",
             "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
             "-movflags", "+faststart", rel(SHORT)]
    run(args)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def verify(path: Path, duration: float) -> dict:
    probe = subprocess.run(
        [FFPROBE, "-v", "error", "-show_streams", "-show_format", "-of", "json", rel(path)],
        cwd=ROOT, check=True, capture_output=True, text=True,
    )
    metadata = json.loads(probe.stdout)
    run([FFMPEG, "-v", "error", "-i", rel(path), "-f", "null", os.devnull])
    actual = float(metadata["format"]["duration"])
    if abs(actual - duration) > 0.08:
        raise RuntimeError(f"Unexpected duration for {path.name}: {actual}")
    return {"file": rel(path), "bytes": path.stat().st_size, "sha256": sha256(path),
            "durationSeconds": actual, "streams": metadata["streams"], "fullDecodePassed": True}


def stills() -> None:
    run([FFMPEG, "-y", "-hide_banner", "-loglevel", "error", "-ss", "7.5", "-i", rel(TRAILER),
         "-frames:v", "1", rel(PACKAGE / "understar-gameplay-demo-trailer-v1-poster.png")])
    run([FFMPEG, "-y", "-hide_banner", "-loglevel", "error", "-ss", "6", "-i", rel(SHORT),
         "-frames:v", "1", rel(PACKAGE / "understar-gameplay-short-01-v1-poster.png")])
    run([FFMPEG, "-y", "-hide_banner", "-loglevel", "error", "-i", rel(TRAILER), "-vf",
         "fps=1/5,scale=600:-1,tile=3x2:padding=8:margin=8", "-frames:v", "1",
         rel(PACKAGE / "analysis-final-trailer-contact.png")])
    run([FFMPEG, "-y", "-hide_banner", "-loglevel", "error", "-i", rel(SHORT), "-vf",
         "fps=1/2.5,scale=300:-1,tile=3x2:padding=8:margin=8", "-frames:v", "1",
         rel(PACKAGE / "analysis-final-short-contact.png")])


def main() -> None:
    PACKAGE.mkdir(parents=True, exist_ok=True)
    required = [WIDE, VERTICAL_LONG, VERTICAL_ALT, KEY_ART, LOGO, MUSIC, DIG, CHIME,
                VOICE_SOURCE / TRAILER_VOICE.name, VOICE_SOURCE / SHORT_VOICE.name]
    missing = [str(path) for path in required if not path.is_file()]
    if missing:
        raise FileNotFoundError("Missing inputs:\n" + "\n".join(missing))
    shutil.copy2(VOICE_SOURCE / TRAILER_VOICE.name, TRAILER_VOICE)
    shutil.copy2(VOICE_SOURCE / SHORT_VOICE.name, SHORT_VOICE)
    trailer_ass, short_ass = subtitle_files()
    build_trailer(trailer_ass)
    build_short(short_ass)
    stills()
    report = {
        "schemaVersion": 1,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "reviewOnly": True,
        "published": False,
        "starMotionContract": "tile anchored; content-only frame animation; no float, bob, transform, or whole-object pulse",
        "voice": {"provider": "ElevenLabs", "voice": "Frederick Surrey - Smooth and Velvety",
                  "modelSettings": {"stability": 0.7, "similarityBoost": 0.86, "style": 0, "speed": 0.9}},
        "generatedVisualUse": {"file": rel(KEY_ART), "use": "static final trailer key-art card only",
                               "disclosureBurnedIn": "GAMEPLAY-DERIVED KEY ART", "shortUsesGeneratedVisuals": False},
        "sources": [
            {"file": rel(WIDE), "selected": [[0, 15]]},
            {"file": rel(VERTICAL_LONG), "selected": [[16.5, 20], [17, 23], [44, 50], [52, 58], [68, 74]]},
            {"file": rel(VERTICAL_ALT), "selected": [[20, 24], [20, 26], [33, 39]]},
        ],
        "excluded": {"reason": "black frames", "recordingPrefix": "screenrecord-20260731"},
        "outputs": [verify(TRAILER, 30), verify(SHORT, 15)],
        "subtitleSidecars": [rel(PACKAGE / name) for name in (
            "understar-gameplay-demo-trailer-v1.srt", "understar-gameplay-demo-trailer-v1.vtt",
            "understar-gameplay-demo-trailer-v1.ass", "understar-gameplay-short-01-v1.srt",
            "understar-gameplay-short-01-v1.vtt", "understar-gameplay-short-01-v1.ass")],
    }
    (PACKAGE / "media-verification.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"outputs": [rel(TRAILER), rel(SHORT)]}, indent=2))


if __name__ == "__main__":
    main()
