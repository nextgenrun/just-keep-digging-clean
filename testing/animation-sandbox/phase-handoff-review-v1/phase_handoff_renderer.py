"""Render split-screen phase-handoff review frames and GIFs."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont

from phase_handoff_geometry import marker_distance, planted_foot, project_marker


def load_font(path: str, size: int) -> ImageFont.ImageFont:
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def render_pair(
    config: dict[str, Any],
    manifest: dict[str, Any],
    scenario: dict[str, Any],
    current: list[dict[str, Any]],
    proposed: list[dict[str, Any]],
    index: int,
) -> Image.Image:
    build, palette, labels = config["build"], config["palette"], config["labels"]
    canvas = Image.new(
        "RGBA",
        (build["canvasWidth"], build["panelHeight"] * 2),
        palette["background"],
    )
    draw = ImageDraw.Draw(canvas)
    normal = load_font(build["fontFile"], 15)
    small = load_font(build["fontFile"], 12)
    bold = load_font(build["fontBoldFile"], 17)
    rows = (
        (current[index], current[index - 1] if index else None, labels["current"]),
        (proposed[index], proposed[index - 1] if index else None, labels["proposed"]),
    )
    for row, (record, prior, heading) in enumerate(rows):
        top = row * build["panelHeight"]
        ground_y = top + build["panelHeight"] - build["groundInsetPx"]
        draw.rectangle(
            (0, top, build["canvasWidth"], top + build["panelHeight"]),
            fill=palette["panel"],
        )
        grid_step = build["tileSizePx"] * build["reviewScale"]
        for x in range(0, build["canvasWidth"] + grid_step, grid_step):
            draw.line((x, top, x, ground_y), fill=palette["grid"], width=1)
        draw.line(
            (0, ground_y, build["canvasWidth"], ground_y),
            fill=palette["ground"],
            width=2,
        )
        if scenario["targetTile"]:
            tile_size = build["tileSizePx"] * build["reviewScale"]
            tile_box = (
                build["tileFaceX"],
                ground_y - tile_size,
                build["tileFaceX"] + tile_size,
                ground_y,
            )
            draw.rectangle(
                tile_box,
                fill=palette["impact"] if record["contact"] else palette["tile"],
            )
            draw.rectangle(tile_box, outline=palette["tileEdge"], width=2)
        collider_w = build["playerBodyWidthPx"] * build["reviewScale"]
        collider_h = build["playerBodyHeightPx"] * build["reviewScale"]
        collider = (
            build["actorRootX"] - collider_w / 2,
            ground_y - collider_h,
            build["actorRootX"] + collider_w / 2,
            ground_y,
        )
        draw.rectangle(collider, outline=palette["collider"], width=2)
        display = round(build["displaySizePx"] * build["reviewScale"])
        sprite = record["frame"].resize((display, display), Image.Resampling.LANCZOS)
        if record["flipX"]:
            sprite = sprite.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        sprite_x = round(build["actorRootX"] - display * build["visualOriginX"])
        sprite_y = round(ground_y - display * build["visualOriginY"])
        canvas.alpha_composite(sprite, (sprite_x, sprite_y))
        foot = planted_foot(manifest, record["runPhase"], record["flipX"])
        foot_stage = project_marker(config, foot, ground_y)
        marker_color = palette["green"] if row else palette["red"]
        draw.ellipse(
            (foot_stage[0] - 4, foot_stage[1] - 4, foot_stage[0] + 4, foot_stage[1] + 4),
            fill=marker_color,
        )
        if prior and record["event"]:
            prior_foot = planted_foot(manifest, prior["runPhase"], prior["flipX"])
            prior_stage = project_marker(config, prior_foot, ground_y)
            draw.line((*prior_stage, *foot_stage), fill=marker_color, width=3)
            live_delta = (
                marker_distance(prior_foot, foot)
                * build["displaySizePx"]
                / build["frameWidth"]
            )
            draw.text(
                (615, top + 52),
                f"PLANTED FOOT DELTA  {live_delta:.1f} live px",
                font=bold,
                fill=marker_color,
            )
        draw.text((18, top + 14), heading, font=bold, fill=palette["text"])
        draw.text((18, top + 40), labels["zeroDelay"], font=small, fill=palette["cyan"])
        draw.text(
            (615, top + 17),
            f"{record['label']}   •   JOG PHASE {record['runPhase']:02d}",
            font=normal,
            fill=palette["amber"],
        )
        if record["event"]:
            draw.text((615, top + 78), record["event"], font=bold, fill=palette["text"])
        if record["contact"]:
            draw.text(
                (615, top + 78),
                "CONTACT • SAME FRAME",
                font=bold,
                fill=palette["impact"],
            )
    draw.line(
        (0, build["panelHeight"], build["canvasWidth"], build["panelHeight"]),
        fill=palette["cyan"],
        width=2,
    )
    draw.text(
        (720, build["panelHeight"] - 22),
        labels["reviewOnly"],
        font=small,
        fill=palette["muted"],
    )
    return canvas


def save_gif(frames: list[Image.Image], path: Path, duration: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        path,
        save_all=True,
        append_images=frames[1:],
        duration=duration,
        loop=0,
        disposal=2,
        optimize=False,
    )
