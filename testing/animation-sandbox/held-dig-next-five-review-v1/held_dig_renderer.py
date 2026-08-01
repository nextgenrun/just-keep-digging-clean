"""Render synchronized Before/After held-dig review frames."""

from __future__ import annotations

from typing import Any

from PIL import Image, ImageDraw, ImageFont


def load_font(path: str, size: int) -> ImageFont.ImageFont:
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def planted_foot(
    manifest: dict[str, Any],
    phase: int,
    flip_x: bool,
) -> tuple[float, float]:
    markers = manifest["actions"]["run"]["rig_markers"]["frames"][str(phase)]
    foot = max((markers["foot_l"], markers["foot_r"]), key=lambda point: point[1])
    return (
        256 - float(foot[0]) if flip_x else float(foot[0]),
        float(foot[1]),
    )


def target_box(
    config: dict[str, Any],
    record: dict[str, Any],
    actor_x: float,
    ground_y: float,
) -> tuple[float, float, float, float] | None:
    build = config["build"]
    scale = build["reviewScale"]
    tile = build["tileSizePx"] * scale
    if record["target"] == "side-right":
        left = actor_x + build["sideTargetFaceOffsetPx"] * scale
        return left, ground_y - tile, left + tile, ground_y
    if record["target"] == "side-left":
        right = actor_x - build["sideTargetFaceOffsetPx"] * scale
        return right - tile, ground_y - tile, right, ground_y
    if record["target"] == "up-right":
        left = actor_x + build["diagonalTargetFaceOffsetPx"] * scale
        return left, ground_y - tile * 2, left + tile, ground_y - tile
    return None


def draw_background(
    draw: ImageDraw.ImageDraw,
    config: dict[str, Any],
    panel_left: int,
    record: dict[str, Any],
) -> tuple[float, float]:
    build, palette = config["build"], config["palette"]
    width, height = build["panelWidth"], build["panelHeight"]
    ground_y = height - build["groundInsetPx"]
    actor_x = panel_left + build["actorRootX"]
    draw.rectangle(
        (panel_left, 0, panel_left + width, height),
        fill=palette["panelAlt"] if panel_left else palette["panel"],
    )
    scale = build["reviewScale"]
    tile = build["tileSizePx"] * scale
    scroll = float(record["scrollPx"]) * scale
    grid_x = panel_left - (scroll % tile)
    while grid_x <= panel_left + width:
        draw.line((grid_x, 0, grid_x, ground_y), fill=palette["grid"], width=1)
        grid_x += tile
    draw.rectangle(
        (panel_left, ground_y, panel_left + width, height),
        fill="#14262b",
    )
    ground_grid_x = panel_left - (scroll % (tile / 2))
    while ground_grid_x <= panel_left + width:
        draw.line(
            (ground_grid_x, ground_y, ground_grid_x, height),
            fill=palette["grid"],
            width=1,
        )
        ground_grid_x += tile / 2
    draw.line(
        (panel_left, ground_y, panel_left + width, ground_y),
        fill=palette["ground"],
        width=2,
    )
    return actor_x, ground_y


def draw_target(
    draw: ImageDraw.ImageDraw,
    config: dict[str, Any],
    record: dict[str, Any],
    actor_x: float,
    ground_y: float,
) -> None:
    palette = config["palette"]
    box = target_box(config, record, actor_x, ground_y)
    if not box:
        return
    draw.rectangle(
        box,
        fill=palette["impact"] if record["contact"] else palette["tile"],
        outline=palette["impact"] if record["contact"] else palette["tileEdge"],
        width=3 if record["contact"] else 2,
    )
    if record["contact"]:
        center_x = (box[0] + box[2]) / 2
        center_y = (box[1] + box[3]) / 2
        draw.line(
            (center_x - 22, center_y, center_x + 22, center_y),
            fill="#fff1b3",
            width=3,
        )
        draw.line(
            (center_x, center_y - 22, center_x, center_y + 22),
            fill="#fff1b3",
            width=3,
        )


def draw_actor(
    canvas: Image.Image,
    draw: ImageDraw.ImageDraw,
    config: dict[str, Any],
    manifest: dict[str, Any],
    record: dict[str, Any],
    actor_x: float,
    ground_y: float,
    accent: str,
) -> None:
    build, palette = config["build"], config["palette"]
    scale = build["reviewScale"]
    display_size_px = float(record.get("displaySizePx") or build["displaySizePx"])
    display = round(display_size_px * scale)
    visual_offset_x = float(record.get("visualOffsetPx") or 0) * scale
    sprite = record["frame"].resize((display, display), Image.Resampling.LANCZOS)
    if record["flipX"]:
        sprite = sprite.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    sprite_x = round(actor_x + visual_offset_x - display * build["visualOriginX"])
    sprite_y = round(ground_y - display * build["visualOriginY"])
    canvas.alpha_composite(sprite, (sprite_x, sprite_y))
    collider_w = build["playerBodyWidthPx"] * scale
    collider_h = build["playerBodyHeightPx"] * scale
    draw.rectangle(
        (
            actor_x - collider_w / 2,
            ground_y - collider_h,
            actor_x + collider_w / 2,
            ground_y,
        ),
        outline=palette["collider"],
        width=2,
    )
    visual_root_x = actor_x + visual_offset_x
    draw.line(
        (actor_x, ground_y - 8, visual_root_x, ground_y - 8),
        fill=accent,
        width=2,
    )
    draw.ellipse(
        (
            visual_root_x - 3,
            ground_y - 11,
            visual_root_x + 3,
            ground_y - 5,
        ),
        fill=accent,
    )
    phase = record.get("runPhase")
    if phase is not None:
        foot = planted_foot(manifest, int(phase), bool(record["flipX"]))
        frame_scale = display / build["frameWidth"]
        foot_x = (
            actor_x
            + visual_offset_x
            + (foot[0] - build["frameWidth"] * build["visualOriginX"]) * frame_scale
        )
        foot_y = ground_y + (foot[1] - build["frameHeight"] * build["visualOriginY"]) * frame_scale
        draw.ellipse(
            (foot_x - 4, foot_y - 4, foot_x + 4, foot_y + 4),
            fill=accent,
        )


def draw_labels(
    draw: ImageDraw.ImageDraw,
    config: dict[str, Any],
    scenario: dict[str, Any],
    record: dict[str, Any],
    panel_left: int,
    heading: str,
    accent: str,
    index: int,
    total: int,
) -> None:
    build, palette = config["build"], config["palette"]
    regular = load_font(build["fontFile"], 14)
    small = load_font(build["fontFile"], 12)
    bold = load_font(build["fontBoldFile"], 18)
    draw.rounded_rectangle(
        (panel_left + 14, 12, panel_left + 570, 82),
        radius=10,
        fill="#061015d9",
        outline=accent,
        width=2,
    )
    draw.text((panel_left + 28, 22), heading, font=bold, fill=accent)
    draw.text(
        (panel_left + 28, 49),
        record["label"],
        font=regular,
        fill=palette["text"],
    )
    display_size = float(record.get("displaySizePx") or build["displaySizePx"])
    apparent_scale = float(record.get("apparentScale") or 1)
    draw.text(
        (panel_left + 386, 24),
        f"FRAME {index + 1:02d}/{total:02d}",
        font=small,
        fill=palette["muted"],
    )
    draw.text(
        (panel_left + 386, 49),
        f"{display_size:.0f} PX  •  TORSO {apparent_scale * 100:.1f}%",
        font=small,
        fill=palette["amber"],
    )
    if record["event"]:
        draw.rounded_rectangle(
            (panel_left + 18, build["panelHeight"] - 65, panel_left + 265, build["panelHeight"] - 26),
            radius=8,
            fill=accent,
        )
        draw.text(
            (panel_left + 31, build["panelHeight"] - 56),
            record["event"],
            font=bold,
            fill="#061015",
        )
    if record["contact"]:
        draw.rounded_rectangle(
            (panel_left + 392, build["panelHeight"] - 63,
             panel_left + 584, build["panelHeight"] - 27),
            radius=7,
            fill="#061015e8",
        )
        draw.text(
            (panel_left + 405, build["panelHeight"] - 52),
            "CONTACT • UNCHANGED",
            font=small,
            fill=palette["impact"],
        )


def render_pair(
    config: dict[str, Any],
    manifest: dict[str, Any],
    scenario: dict[str, Any],
    before: list[dict[str, Any]],
    after: list[dict[str, Any]],
    index: int,
) -> Image.Image:
    build, palette = config["build"], config["palette"]
    canvas = Image.new(
        "RGBA",
        (build["canvasWidth"], build["panelHeight"]),
        palette["background"],
    )
    draw = ImageDraw.Draw(canvas)
    rows = (
        (0, before[index], "BEFORE • CURRENT HANDOFF", palette["red"]),
        (build["panelWidth"], after[index], "AFTER • SCALE + ANCHOR LOCK", palette["green"]),
    )
    for panel_left, record_value, heading, accent in rows:
        actor_x, ground_y = draw_background(draw, config, panel_left, record_value)
        draw_target(draw, config, record_value, actor_x, ground_y)
        draw_actor(canvas, draw, config, manifest, record_value, actor_x, ground_y, accent)
        draw_labels(
            draw,
            config,
            scenario,
            record_value,
            panel_left,
            heading,
            accent,
            index,
            len(before),
        )
    draw.line(
        (build["panelWidth"], 0, build["panelWidth"], build["panelHeight"]),
        fill=palette["cyan"],
        width=3,
    )
    return canvas
