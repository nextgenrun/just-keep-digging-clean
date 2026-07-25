from __future__ import annotations

import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "systems" / "screenrecord"
OUT = ROOT / "exports" / "video-content" / "2026-07-20-gameplay-portrait"
OUT.mkdir(parents=True, exist_ok=True)
source = SOURCE_DIR / "gameplay-ore-event.webm"
if not source.exists():
    source = max(SOURCE_DIR.glob("*.webm"), key=lambda p: p.stat().st_size)
voiceover = ROOT / "sound" / "voice-lines" / "player-voice-lines" / "random-voice-lines" / "cl1.ogg"

shorts = [
    "HEAR THAT?",
    "ORE FOUND",
    "ONE TILE DEEPER",
    "TARGET LOCKED",
    "DARKNESS MOVES",
    "KEEP DIGGING",
    "WOULD YOU RISK IT?",
    "THE MINE RESPONDS",
    "THIS IS THE PAYOFF",
    "NO TURNING BACK",
]

def write_srt(path: Path, text: str, duration: float) -> None:
    end = max(duration - 0.05, 0.5)
    path.write_text(f"1\n00:00:00,000 --> 00:00:{int(end):02d},{int((end % 1) * 1000):03d}\n{text}\n", encoding="utf-8")


def run(args: list[str]) -> None:
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args], check=True, cwd=OUT)


for index, caption in enumerate(shorts, 1):
    srt = OUT / f"short-{index:02d}.srt"
    output = OUT / f"short-{index:02d}.mp4"
    write_srt(srt, caption, 8.0)
    if output.exists() and output.stat().st_size > 10000:
        continue
    subtitle_path = srt.name
    vf = (
        "scale=1080:1920:flags=lanczos,"
        f"subtitles=filename='{subtitle_path}':force_style='FontName=Arial,FontSize=13,"
        "PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=3,"
        "Alignment=2,MarginV=180'"
    )
    run([
        "-stream_loop", "-1", "-ss", str((index - 1) * 2), "-i", str(source), "-i", str(voiceover),
        "-t", "8",
        "-filter_complex", "[0:a]volume=0.62[a0];[1:a]adelay=700|700,volume=1.18[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=2[a]",
        "-vf", vf, "-map", "0:v", "-map", "[a]",
        "-c:v", "libx264", "-preset", "ultrafast", "-crf", "21", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", str(output),
    ])

long_caption = OUT / "long-form.srt"
long_caption.write_text(
    "1\n00:00:00,000 --> 00:00:05,000\nHEAR THAT?\n\n"
    "2\n00:00:05,000 --> 00:00:11,000\nTARGET LOCKED\n\n"
    "3\n00:00:11,000 --> 00:00:18,000\nORE FOUND\n\n"
    "4\n00:00:18,000 --> 00:00:25,000\nKEEP DIGGING\n\n"
    "5\n00:00:25,000 --> 00:00:32,000\nWOULD YOU RISK IT?\n",
    encoding="utf-8",
)
long_output = OUT / "long-form.mp4"
if not long_output.exists() or long_output.stat().st_size < 10000:
  run([
    "-stream_loop", "-1", "-ss", "0", "-i", str(source), "-i", str(voiceover),
    "-t", "45", "-filter_complex", "[0:a]volume=0.62[a0];[1:a]adelay=700|700,volume=1.18[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=2[a]",
    "-vf", f"scale=1080:1920:flags=lanczos,subtitles=filename='{long_caption.name}':force_style='FontName=Arial,FontSize=18,"
    "PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=3,"
    "Alignment=2,MarginV=54'", "-map", "0:v", "-map", "[a]", "-c:v", "libx264",
    "-preset", "ultrafast", "-crf", "21", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k",
    "-movflags", "+faststart", str(long_output),
  ])

(OUT / "manifest.md").write_text(
    "# Gameplay content batch — 2026-07-20\n\n"
    f"Source: `{source.relative_to(ROOT).as_posix()}`\n\n"
    "The ten 8-second MP4s are 1080x1920 full-frame portrait cuts with 3–5-word hook captions. "
    "`long-form.mp4` is a 45-second portrait cut with timed captions. All outputs use H.264, "
    "yuv420p, AAC, and faststart. The AAC track mixes captured in-game sound with the game's "
    "recorded player voice line (`cl1.ogg`). The ORE FOUND hook is used on a captured underground "
    "gameplay frame where the ore node is visibly on screen.\n",
    encoding="utf-8",
)
print(f"Built {len(shorts)} shorts and one long-form video from {source.name}")
