"""Render synchronized vertical-dig Before/After review frames."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageDraw, ImageFont


def _font(path: str, size: int) -> ImageFont.ImageFont:
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def _visible_bounds(frame: Image.Image, threshold: int) -> tuple[int, int, int, int]:
    alpha = np.asarray(frame.getchannel("A"))
    ys, xs = np.where(alpha >= threshold)
    if len(xs) == 0:
        return 0, 0, 0, 0
    return int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())


def _target_box(
    family: str,
    moving: bool,
    root_x: float,
    ground_y: float,
    tile_size: float,
) -> tuple[float, float, float, float]:
    left = root_x + tile_size / 2 if moving else root_x - tile_size / 2
    if family == "up":
        return left, ground_y - tile_size * 2, left + tile_size, ground_y - tile_size
    return left, ground_y, left + tile_size, ground_y + tile_size


def _impact_point(
    family: str,
    moving: bool,
    tile_box: tuple[float, float, float, float],
) -> tuple[float, float]:
    left, top, right, bottom = tile_box
    if moving:
        return left, bottom if family == "up" else top
    return (left + right) / 2, bottom if family == "up" else top


def _draw_impact(
    draw: ImageDraw.ImageDraw,
    point: tuple[float, float],
    family: str,
    moving: bool,
    palette: dict[str, str],
) -> None:
    x, y = point
    direction_x = 1 if moving else 0
    direction_y = -1 if family == "up" else 1
    draw.ellipse((x - 8, y - 8, x + 8, y + 8), outline=palette["impact"], width=3)
    for length in (13, 21, 29):
        end_x = x - direction_x * length
        end_y = y - direction_y * length
        draw.line((x, y, end_x, end_y), fill=palette["impact"], width=2)


def _render_lane(
    canvas: Image.Image,
    config: dict[str, Any],
    scenario: dict[str, Any],
    record: dict[str, Any],
    lane_index: int,
) -> None:
    render = config["render"]
    geometry = config["geometry"]
    palette = config["palette"]
    lane_width = int(render["canvasWidth"]) // 2
    lane_left = lane_index * lane_width
    lane_height = int(render["laneHeight"])
    ground_y = lane_height - int(render["groundInsetPx"])
    root_x = lane_left + int(render["actorRootX"])
    panel_color = palette["panelAfter"] if lane_index else palette["panel"]
    draw = ImageDraw.Draw(canvas)
    draw.rectangle(
        (lane_left, 0, lane_left + lane_width, lane_height),
        fill=panel_color,
    )
    tile_size = int(geometry["tileSizePx"])
    for x in range(lane_left, lane_left + lane_width + tile_size, tile_size):
        draw.line((x, 58, x, ground_y + tile_size), fill=palette["grid"], width=1)
    for y in range(ground_y - tile_size * 2, ground_y + tile_size * 2, tile_size):
        draw.line((lane_left, y, lane_left + lane_width, y), fill=palette["grid"], width=1)
    draw.line(
        (lane_left, ground_y, lane_left + lane_width, ground_y),
        fill=palette["ground"],
        width=2,
    )
    tile_box = _target_box(
        scenario["family"],
        scenario["movement"],
        root_x,
        ground_y,
        tile_size,
    )
    draw.rectangle(
        tile_box,
        fill=palette["impact"] if record["contact"] else palette["tile"],
        outline=palette["tileEdge"],
        width=2,
    )
    body_width = float(geometry["playerBodyWidthPx"])
    body_height = float(geometry["playerBodyHeightPx"])
    body_box = (
        root_x - body_width / 2,
        ground_y - body_height,
        root_x + body_width / 2,
        ground_y,
    )
    draw.rectangle(body_box, outline=palette["collider"], width=2)
    display_size = int(record["displaySizePx"])
    sprite = record["frame"].resize(
        (display_size, display_size),
        Image.Resampling.LANCZOS,
    )
    sprite_anchor_x = root_x + float(record["offsetX"])
    sprite_anchor_y = ground_y + float(record["offsetY"])
    sprite_x = round(
        sprite_anchor_x - display_size * float(geometry["visualOriginX"]),
    )
    sprite_y = round(
        sprite_anchor_y - display_size * float(record["originY"]),
    )
    canvas.alpha_composite(sprite, (sprite_x, sprite_y))
    source_bounds = _visible_bounds(record["frame"], int(geometry["alphaThreshold"]))
    scale = display_size / float(geometry["frameWidth"])
    visible_box = (
        sprite_x + source_bounds[0] * scale,
        sprite_y + source_bounds[1] * scale,
        sprite_x + (source_bounds[2] + 1) * scale,
        sprite_y + (source_bounds[3] + 1) * scale,
    )
    draw.rectangle(visible_box, outline=palette["cyan"], width=1)
    draw.ellipse(
        (
            sprite_anchor_x - 4,
            sprite_anchor_y - 4,
            sprite_anchor_x + 4,
            sprite_anchor_y + 4,
        ),
        fill=palette["ghost"],
    )
    if abs(record["offsetX"]) > 0.01 or abs(record["offsetY"]) > 0.01:
        draw.line(
            (root_x, ground_y, sprite_anchor_x, sprite_anchor_y),
            fill=palette["red"],
            width=3,
        )
    if record["contact"]:
        _draw_impact(
            draw,
            _impact_point(
                scenario["family"],
                scenario["movement"],
                tile_box,
            ),
            scenario["family"],
            scenario["movement"],
            palette,
        )
    heading = "BEFORE · CURRENT" if lane_index == 0 else "AFTER · PROPOSED"
    heading_color = palette["red"] if lane_index == 0 else palette["green"]
    title_font = _font(render["fontBoldFile"], 19)
    small_font = _font(render["fontFile"], 12)
    label_font = _font(render["fontBoldFile"], 14)
    draw.text((lane_left + 18, 14), heading, font=title_font, fill=heading_color)
    draw.text(
        (lane_left + 18, 39),
        record["label"],
        font=small_font,
        fill=palette["muted"],
    )
    visible_height = (source_bounds[3] - source_bounds[1] + 1) * scale
    draw.text(
        (lane_left + lane_width - 204, 16),
        f"VISIBLE {visible_height:.1f}px",
        font=label_font,
        fill=palette["text"],
    )
    draw.text(
        (lane_left + lane_width - 204, 38),
        f"SPRITE OFFSET {record['offsetX']:+.1f}, {record['offsetY']:+.1f}",
        font=small_font,
        fill=heading_color,
    )
    if record["contact"]:
        draw.text(
            (lane_left + 18, lane_height - 28),
            "CONTACT · TILE FACE OWNED BY IMPACT",
            font=label_font,
            fill=palette["impact"],
        )


def render_pair(
    config: dict[str, Any],
    scenario: dict[str, Any],
    before: dict[str, Any],
    after: dict[str, Any],
) -> Image.Image:
    render = config["render"]
    canvas = Image.new(
        "RGBA",
        (int(render["canvasWidth"]), int(render["laneHeight"])),
        config["palette"]["background"],
    )
    _render_lane(canvas, config, scenario, before, 0)
    _render_lane(canvas, config, scenario, after, 1)
    draw = ImageDraw.Draw(canvas)
    draw.line(
        (
            int(render["canvasWidth"]) // 2,
            0,
            int(render["canvasWidth"]) // 2,
            int(render["laneHeight"]),
        ),
        fill=config["palette"]["cyan"],
        width=2,
    )
    return canvas


def save_gif(frames: list[Image.Image], path: Path, duration_ms: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        path,
        save_all=True,
        append_images=frames[1:],
        duration=duration_ms,
        loop=0,
        disposal=2,
        optimize=False,
    )
