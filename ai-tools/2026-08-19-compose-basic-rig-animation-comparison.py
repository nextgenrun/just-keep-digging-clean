import json
import os
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def arguments():
    return sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else sys.argv[1:]


def config_argument():
    for argument in arguments():
        if argument.startswith("--config="):
            return argument.split("=", 1)[1]
    raise RuntimeError("Missing required --config argument")


def absolute(path_value):
    return Path(path_value if os.path.isabs(path_value) else Path.cwd() / path_value).resolve()


def centered_text(draw, bounds, value, font, fill):
    left, top, right, bottom = bounds
    text_box = draw.textbbox((0, 0), value, font=font)
    width = text_box[2] - text_box[0]
    height = text_box[3] - text_box[1]
    draw.text(
        (left + (right - left - width) / 2, top + (bottom - top - height) / 2 - text_box[1]),
        value,
        font=font,
        fill=fill,
    )


def frame_paths(root, family, side):
    paths = sorted((root / family / side).glob("frame-*.png"))
    if not paths:
        raise RuntimeError(f"No {side} frames found for {family}")
    return paths


def compose_frame(config, family, current_path, candidate_path):
    render = config["render"]
    preview = config["preview"]
    width = render["singleWidthPx"] * 2
    header = preview["headerHeightPx"]
    footer = preview["footerHeightPx"]
    height = header + render["heightPx"] + footer
    canvas = Image.new("RGBA", (width, height), tuple(preview["backgroundColor"]))
    current = Image.open(current_path).convert("RGBA")
    candidate = Image.open(candidate_path).convert("RGBA")
    expected = (render["singleWidthPx"], render["heightPx"])
    if current.size != expected or candidate.size != expected:
        raise RuntimeError(f"Unexpected frame dimensions for {family}: {current.size} / {candidate.size}")
    canvas.alpha_composite(current, (0, header))
    canvas.alpha_composite(candidate, (render["singleWidthPx"], header))
    draw = ImageDraw.Draw(canvas)
    title_font = ImageFont.truetype(str(absolute(preview["fontPath"])), preview["titleFontSizePx"])
    label_font = ImageFont.truetype(str(absolute(preview["fontPath"])), preview["labelFontSizePx"])
    half = render["singleWidthPx"]
    centered_text(draw, (0, 0, half, header), preview["sourceTitle"], title_font, tuple(preview["sourceColor"]))
    centered_text(draw, (half, 0, width, header), preview["candidateTitle"], title_font, tuple(preview["candidateColor"]))
    divider_half = preview["dividerWidthPx"] / 2
    draw.rectangle(
        (half - divider_half, 0, half + divider_half, height),
        fill=tuple(preview["textColor"]),
    )
    centered_text(
        draw,
        (0, header + render["heightPx"], width, height),
        preview["familyLabels"][family],
        label_font,
        tuple(preview["textColor"]),
    )
    return canvas.convert("P", palette=Image.Palette.ADAPTIVE)


def save_gif(path, frames, durations):
    path.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        path,
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        disposal=2,
        optimize=False,
    )


def main():
    with open(absolute(config_argument()), "r", encoding="utf-8") as handle:
        config = json.load(handle)
    root = absolute(config["outputRoot"])
    preview = config["preview"]
    combined_frames = []
    combined_durations = []
    summary = {}
    for family in config["families"]:
        current = frame_paths(root, family, "current")
        candidate = frame_paths(root, family, "candidate")
        if len(current) != len(candidate):
            raise RuntimeError(f"Frame count mismatch for {family}: {len(current)} / {len(candidate)}")
        frames = [
            compose_frame(config, family, current_path, candidate_path)
            for current_path, candidate_path in zip(current, candidate)
        ]
        durations = [preview["frameDurationMs"]] * len(frames)
        durations[-1] = preview["pauseDurationMs"]
        family_output = root / preview["outputPattern"].format(family=family)
        save_gif(family_output, frames, durations)
        combined_frames.extend(frame.copy() for frame in frames)
        combined_durations.extend(durations)
        summary[family] = {"frames": len(frames), "output": str(family_output)}
    combined_output = root / preview["combinedOutput"]
    save_gif(combined_output, combined_frames, combined_durations)
    summary["combined"] = {"frames": len(combined_frames), "output": str(combined_output)}
    report_path = root / "preview-report.json"
    report_path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(f"BASIC_RIG_ANIMATION_PREVIEW_OK frames={len(combined_frames)} output={combined_output}")


if __name__ == "__main__":
    main()
