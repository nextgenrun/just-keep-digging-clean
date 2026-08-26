"""Assemble three review-only vertical UNDERSTAR promotional videos."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

from understarShortRenderer import build_short, write_manifest


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_PLAN_PATH = ROOT / "steam-marketing/2026-08-26-elevenlabs-promo-shorts-v1/request-plan.json"


def extract_poster(ffmpeg: str, video: Path, poster: Path) -> None:
    completed = subprocess.run(
        [ffmpeg, "-y", "-ss", "1.5", "-i", str(video), "-frames:v", "1", str(poster)],
        capture_output=True,
        text=True,
        check=False,
    )
    if completed.returncode:
        raise RuntimeError("Failed to extract promo-short poster")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan", type=Path, default=DEFAULT_PLAN_PATH, help="Request plan inside this workspace")
    args = parser.parse_args()
    try:
        ffmpeg = os.environ.get("FFMPEG_EXE", "").strip()
        if not ffmpeg or not Path(ffmpeg).is_file():
            raise ValueError("FFMPEG_EXE must point to a valid executable")
        plan_path = args.plan if args.plan.is_absolute() else ROOT / args.plan
        plan_path = plan_path.resolve()
        plan_path.relative_to(ROOT.resolve())
        plan = json.loads(plan_path.read_text(encoding="utf-8"))
        if plan.get("schemaVersion") != 1:
            raise ValueError("Unsupported promo-short plan schema")
        package = (ROOT / plan["outputRoot"]).resolve()
        package.relative_to(ROOT.resolve())
        for folder in (package / "audio", package / "captions", package / "posters"):
            folder.mkdir(parents=True, exist_ok=True)
        logo = (ROOT / plan["logo"]).resolve()
        items: list[dict] = []
        with tempfile.TemporaryDirectory(prefix="understar-shorts-build-") as temporary:
            work = Path(temporary)
            for short in plan["shorts"]:
                for filename in short["audio"].values():
                    if not (package / "audio" / filename).exists():
                        raise ValueError(f"Missing generated audio: {filename}")
                print(f"Rendering {short['id']}...", flush=True)
                item = build_short(ffmpeg, ROOT, package, short, work, logo)
                video = ROOT / item["output"]
                poster = package / "posters" / f"{short['id']}-poster.png"
                extract_poster(ffmpeg, video, poster)
                item["poster"] = str(poster.relative_to(ROOT)).replace("\\", "/")
                items.append(item)
        write_manifest(package / plan.get("verificationFile", "media-verification.json"), items)
        print(f"Rendered {len(items)} UNDERSTAR promo shorts")
        return 0
    except (OSError, ValueError, RuntimeError, json.JSONDecodeError) as error:
        print(f"Short renderer error: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
