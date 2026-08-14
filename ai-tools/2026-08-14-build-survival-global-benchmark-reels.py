"""Build four animated approval reels from the global Survival benchmark renders."""

from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
REVIEW_ROOT = ROOT / "visual-approval-previews" / "2026-08-14-survival-global-benchmark-v1"
RENDER_ROOT = REVIEW_ROOT / "renders"
WIDTH, HEIGHT = 1920, 900
FPS, DURATION = 24, 6
CARD_WIDTH = WIDTH // 5
REELS = (
    ("01-locomotion", ("idle", "idle-talk", "walk", "run", "crouch")),
    ("02-traversal", ("airborne", "falling", "fly", "climb", "landing")),
    ("03-combat-mining", ("punch-jab", "punch-cross", "punch-uppercut", "pickaxe-mining", "ground-strike")),
    ("04-states-recovery", ("wall-push", "teleport", "thunder-charge", "hit-react", "death")),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", default=str(RENDER_ROOT))
    parser.add_argument("--output", default=str(REVIEW_ROOT))
    return parser.parse_args()


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = (
        Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf"),
    )
    for path in candidates:
        if path.is_file():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def fit_rgba(source: Image.Image, box: int) -> Image.Image:
    copy = source.copy()
    copy.thumbnail((box, box), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (box, box), (0, 0, 0, 0))
    canvas.alpha_composite(copy, ((box - copy.width) // 2, (box - copy.height) // 2))
    return canvas


def frame_index(frame_number: int, frame_count: int, loop: bool) -> int:
    if loop:
        return int(frame_number * frame_count / FPS) % frame_count
    cycle_frames = int(FPS * 2.5)
    local = frame_number % cycle_frames
    active = int(FPS * 2.0)
    progress = min(local, active - 1) / max(1, active - 1)
    return min(frame_count - 1, round(progress * (frame_count - 1)))


def build_background(title: str) -> Image.Image:
    canvas = Image.new("RGB", (WIDTH, HEIGHT), (7, 11, 16))
    draw = ImageDraw.Draw(canvas)
    for y in range(HEIGHT):
        value = int(8 + 12 * y / HEIGHT)
        draw.line((0, y, WIDTH, y), fill=(value // 2, value, value + 5))
    draw.text((48, 24), "APPROVED GLOBAL CHARACTER BENCHMARK", font=font(32, True), fill=(238, 238, 232))
    draw.text((48, 66), title.replace("-", " ").upper(), font=font(22, True), fill=(103, 184, 229))
    draw.text((WIDTH - 590, 35), "4 LIGHTS  |  NON-COLOR NORMALS  |  AgX  |  PRESERVE VOLUME", font=font(17), fill=(165, 178, 188))
    return canvas


def encode_reel(name: str, actions: tuple[str, ...], manifest: dict, render_root: Path, output: Path) -> None:
    loaded: dict[str, dict[str, list[Image.Image]]] = {}
    for action in actions:
        action_manifest = manifest["actions"][action]
        originals = []
        for frame_name in action_manifest["frames"]:
            with Image.open(render_root / action / frame_name) as source:
                originals.append(source.convert("RGBA"))
        loaded[action] = {
            "large": [fit_rgba(frame, 340) for frame in originals],
            "small": [fit_rgba(frame, 123) for frame in originals],
        }
        for frame in originals:
            frame.close()

    target = output / f"{name}-approved-benchmark.mp4"
    command = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{WIDTH}x{HEIGHT}",
        "-r", str(FPS), "-i", "-", "-an", "-c:v", "libx264",
        "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p",
        "-movflags", "+faststart", str(target),
    ]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    assert process.stdin is not None
    background = build_background(name)
    try:
        for number in range(FPS * DURATION):
            canvas = background.copy()
            draw = ImageDraw.Draw(canvas)
            for column, action in enumerate(actions):
                left = column * CARD_WIDTH
                right = left + CARD_WIDTH
                draw.rounded_rectangle((left + 14, 112, right - 14, 872), 18, fill=(14, 21, 28), outline=(47, 66, 79), width=2)
                is_run = action == "run"
                draw.text((left + 28, 132), action.upper(), font=font(24, True), fill=(246, 205, 121) if is_run else (229, 234, 236))
                authority = manifest["actions"][action]["motion_authority"]
                draw.text((left + 28, 169), authority.replace("-", " "), font=font(15), fill=(246, 205, 121) if is_run else (134, 155, 168))
                index = frame_index(number, len(loaded[action]["large"]), bool(manifest["actions"][action]["loop"]))
                large = loaded[action]["large"][index]
                canvas.paste(large, (left + 22, 210), large)
                draw.line((left + 28, 573, right - 28, 573), fill=(43, 59, 69), width=1)
                draw.text((left + 28, 592), "TRUE 123 PX CHECK", font=font(15, True), fill=(115, 190, 226))
                true_size = loaded[action]["small"][index]
                canvas.paste(true_size, (left + 28, 632), true_size)
                render_size = manifest["benchmark"]["render_size"]
                draw.text((left + 170, 640), f"Inspection render: {render_size} px", font=font(14), fill=(155, 165, 171))
                draw.text((left + 170, 670), "Runtime mock scale: 123 px", font=font(14), fill=(155, 165, 171))
                draw.text((left + 170, 710), "REVIEW ONLY", font=font(14, True), fill=(205, 132, 111))
                draw.text((left + 170, 738), "NOT WIRED", font=font(14, True), fill=(205, 132, 111))
            process.stdin.write(canvas.tobytes())
    finally:
        process.stdin.close()
    code = process.wait()
    if code:
        raise RuntimeError(f"ffmpeg failed for {name}: {code}")
    for sizes in loaded.values():
        for frames in sizes.values():
            for frame in frames:
                frame.close()
    print(f"GLOBAL_BENCHMARK_REEL_OK {target}")


def main() -> None:
    args = parse_args()
    render_root = Path(args.input).resolve()
    output = Path(args.output).resolve()
    output.mkdir(parents=True, exist_ok=True)
    manifest = json.loads((render_root / "review-render-manifest.json").read_text(encoding="utf-8"))
    expected_actions = {action for _, actions in REELS for action in actions}
    actual_actions = set(manifest.get("actions", {}))
    if actual_actions != expected_actions:
        raise RuntimeError(
            f"Review inventory mismatch: missing={sorted(expected_actions - actual_actions)} "
            f"extra={sorted(actual_actions - expected_actions)}"
        )
    qa_actions = {}
    for action in sorted(expected_actions):
        bounds = []
        for frame_name in manifest["actions"][action]["frames"]:
            path = render_root / action / frame_name
            with Image.open(path) as source:
                rgba = source.convert("RGBA")
                bbox = rgba.getchannel("A").getbbox()
                if bbox is None:
                    raise RuntimeError(f"Empty render: {path}")
                if bbox[0] <= 1 or bbox[1] <= 1 or bbox[2] >= rgba.width - 1 or bbox[3] >= rgba.height - 1:
                    raise RuntimeError(f"Frame-edge clipping detected: {path} bbox={bbox}")
                bounds.append(list(bbox))
        qa_actions[action] = {"frame_count": len(bounds), "alpha_bounds": bounds}
    (output / "visual-qa-report.json").write_text(
        json.dumps({
            "version": 1,
            "reviewOnly": True,
            "productionChanged": False,
            "actions": qa_actions,
        }, indent=2) + "\n",
        encoding="utf-8",
    )
    for name, actions in REELS:
        encode_reel(name, actions, manifest, render_root, output)


if __name__ == "__main__":
    main()
