"""Build normalized transparent Titan silhouettes and Titan Walk presentation art."""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter


TITAN_IDS = (
    "mossback-wanderer",
    "bellhorn-grazer",
    "lantern-jaw",
    "archwalker",
    "shale-mother",
    "ribbon-wyrm",
    "crowned-mole",
    "hammerhead-pilgrim",
    "cathedral-stag",
    "hollowback-bear",
    "silver-strider",
    "mirror-ray",
    "needlecrown",
    "moon-shell",
    "veilwing",
    "ember-tusk",
    "furnace-drake",
    "ash-colossus",
    "magma-whale",
    "cinder-centipede",
    "obsidian-sleeper",
    "rift-heron",
    "star-eater",
    "deep-crown",
    "worldroot-titan",
)

GRID_SIZE = 5
SPRITE_SIZE = 256
SUBJECT_MAX_SIZE = 224
SUBJECT_BASELINE = 240
CONTACT_CELL_SIZE = 288
CONTACT_BACKGROUND = (5, 12, 22, 255)
CONTACT_CELL_COLOR = (10, 24, 38, 255)
CONTACT_INDEX_COLOR = (156, 204, 235, 255)
COMPONENT_ALPHA_THRESHOLD = 8
PLINTH_SIZE = (512, 320)
PLINTH_MAX_SIZE = (480, 286)
PLINTH_BASELINE = 304


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--out-dir", required=True, type=Path)
    parser.add_argument("--contact-sheet", required=True, type=Path)
    parser.add_argument("--plinth-input", type=Path)
    parser.add_argument("--plinth-output", type=Path)
    return parser.parse_args()


def grid_boundaries(length: int) -> list[int]:
    return [round(index * length / GRID_SIZE) for index in range(GRID_SIZE + 1)]


def keep_primary_component(cell: Image.Image) -> Image.Image:
    rgba = cell.convert("RGBA")
    alpha = rgba.getchannel("A")
    width, height = alpha.size
    alpha_bytes = alpha.tobytes()
    visited = bytearray(width * height)
    largest_component: list[int] = []

    for start in range(width * height):
        if visited[start] or alpha_bytes[start] <= COMPONENT_ALPHA_THRESHOLD:
            continue
        visited[start] = 1
        queue = deque([start])
        component: list[int] = []
        while queue:
            index = queue.popleft()
            component.append(index)
            x = index % width
            y = index // width
            for offset_x, offset_y in (
                (-1, -1), (0, -1), (1, -1),
                (-1, 0),           (1, 0),
                (-1, 1),  (0, 1),  (1, 1),
            ):
                neighbor_x = x + offset_x
                neighbor_y = y + offset_y
                if not (0 <= neighbor_x < width and 0 <= neighbor_y < height):
                    continue
                neighbor = neighbor_y * width + neighbor_x
                if visited[neighbor] or alpha_bytes[neighbor] <= COMPONENT_ALPHA_THRESHOLD:
                    continue
                visited[neighbor] = 1
                queue.append(neighbor)
        if len(component) > len(largest_component):
            largest_component = component

    if not largest_component:
        raise ValueError("Atlas cell contains no visible titan component")

    component_data = bytearray(width * height)
    for index in largest_component:
        component_data[index] = 255
    component_mask = Image.frombytes("L", (width, height), bytes(component_data))
    component_mask = component_mask.filter(ImageFilter.MaxFilter(3))
    rgba.putalpha(ImageChops.multiply(alpha, component_mask))
    return rgba


def normalize_sprite(cell: Image.Image) -> Image.Image:
    rgba = keep_primary_component(cell)
    alpha = rgba.getchannel("A")
    bounds = alpha.getbbox()
    if not bounds:
        raise ValueError("Atlas cell contains no visible titan pixels")

    subject = rgba.crop(bounds)
    scale = min(
        SUBJECT_MAX_SIZE / max(1, subject.width),
        SUBJECT_MAX_SIZE / max(1, subject.height),
    )
    resized = subject.resize(
        (
            max(1, round(subject.width * scale)),
            max(1, round(subject.height * scale)),
        ),
        Image.Resampling.LANCZOS,
    )

    sprite = Image.new("RGBA", (SPRITE_SIZE, SPRITE_SIZE), (0, 0, 0, 0))
    left = (SPRITE_SIZE - resized.width) // 2
    top = min(
        (SPRITE_SIZE - resized.height) // 2,
        SUBJECT_BASELINE - resized.height,
    )
    sprite.alpha_composite(resized, (left, max(0, top)))
    return sprite


def validate_sprite(sprite: Image.Image, titan_id: str) -> tuple[int, float]:
    alpha = sprite.getchannel("A")
    histogram = alpha.histogram()
    opaque_pixels = sum(histogram[17:])
    coverage = opaque_pixels / float(SPRITE_SIZE * SPRITE_SIZE)
    if not 0.02 <= coverage <= 0.72:
        raise ValueError(f"{titan_id}: suspicious alpha coverage {coverage:.3f}")
    if any(sprite.getpixel(point)[3] for point in (
        (0, 0),
        (SPRITE_SIZE - 1, 0),
        (0, SPRITE_SIZE - 1),
        (SPRITE_SIZE - 1, SPRITE_SIZE - 1),
    )):
        raise ValueError(f"{titan_id}: sprite corners are not transparent")
    return opaque_pixels, coverage


def build_contact_sheet(sprites: list[Image.Image]) -> Image.Image:
    size = GRID_SIZE * CONTACT_CELL_SIZE
    sheet = Image.new("RGBA", (size, size), CONTACT_BACKGROUND)
    draw = ImageDraw.Draw(sheet)
    for index, sprite in enumerate(sprites):
        column = index % GRID_SIZE
        row = index // GRID_SIZE
        left = column * CONTACT_CELL_SIZE
        top = row * CONTACT_CELL_SIZE
        draw.rounded_rectangle(
            (
                left + 8,
                top + 8,
                left + CONTACT_CELL_SIZE - 8,
                top + CONTACT_CELL_SIZE - 8,
            ),
            radius=18,
            fill=CONTACT_CELL_COLOR,
        )
        sheet.alpha_composite(
            sprite,
            (
                left + (CONTACT_CELL_SIZE - SPRITE_SIZE) // 2,
                top + (CONTACT_CELL_SIZE - SPRITE_SIZE) // 2,
            ),
        )
        draw.text(
            (left + 18, top + 16),
            f"{index + 1:02d}",
            fill=CONTACT_INDEX_COLOR,
        )
    return sheet


def normalize_plinth(source: Image.Image) -> Image.Image:
    rgba = source.convert("RGBA")
    alpha = rgba.getchannel("A")
    bounds = alpha.point(
        lambda value: 255 if value > COMPONENT_ALPHA_THRESHOLD else 0
    ).getbbox()
    if not bounds:
        raise ValueError("Titan Walk plinth contains no visible pixels")

    subject = rgba.crop(bounds)
    scale = min(
        PLINTH_MAX_SIZE[0] / max(1, subject.width),
        PLINTH_MAX_SIZE[1] / max(1, subject.height),
    )
    resized = subject.resize(
        (
            max(1, round(subject.width * scale)),
            max(1, round(subject.height * scale)),
        ),
        Image.Resampling.LANCZOS,
    )
    output = Image.new("RGBA", PLINTH_SIZE, (0, 0, 0, 0))
    left = (PLINTH_SIZE[0] - resized.width) // 2
    top = PLINTH_BASELINE - resized.height
    output.alpha_composite(resized, (left, top))

    normalized_alpha = output.getchannel("A")
    coverage = sum(normalized_alpha.histogram()[17:]) / float(
        PLINTH_SIZE[0] * PLINTH_SIZE[1]
    )
    if not 0.08 <= coverage <= 0.72:
        raise ValueError(f"Titan Walk plinth has suspicious alpha coverage {coverage:.3f}")
    if any(output.getpixel(point)[3] for point in (
        (0, 0),
        (PLINTH_SIZE[0] - 1, 0),
        (0, PLINTH_SIZE[1] - 1),
        (PLINTH_SIZE[0] - 1, PLINTH_SIZE[1] - 1),
    )):
        raise ValueError("Titan Walk plinth corners are not transparent")
    return output


def main() -> None:
    args = parse_args()
    atlas = Image.open(args.input).convert("RGBA")
    x_bounds = grid_boundaries(atlas.width)
    y_bounds = grid_boundaries(atlas.height)
    args.out_dir.mkdir(parents=True, exist_ok=True)

    sprites: list[Image.Image] = []
    for index, titan_id in enumerate(TITAN_IDS):
        column = index % GRID_SIZE
        row = index // GRID_SIZE
        cell = atlas.crop((
            x_bounds[column],
            y_bounds[row],
            x_bounds[column + 1],
            y_bounds[row + 1],
        ))
        sprite = normalize_sprite(cell)
        _, coverage = validate_sprite(sprite, titan_id)
        output_path = args.out_dir / f"{index + 1:02d}-{titan_id}.png"
        sprite.save(output_path, optimize=True)
        sprites.append(sprite)
        print(f"{output_path.name}: coverage={coverage:.3f}")

    contact_sheet = build_contact_sheet(sprites)
    args.contact_sheet.parent.mkdir(parents=True, exist_ok=True)
    contact_sheet.save(args.contact_sheet, optimize=True)
    print(f"contact-sheet={args.contact_sheet}")

    if bool(args.plinth_input) != bool(args.plinth_output):
        raise ValueError("--plinth-input and --plinth-output must be supplied together")
    if args.plinth_input and args.plinth_output:
        plinth = normalize_plinth(Image.open(args.plinth_input))
        args.plinth_output.parent.mkdir(parents=True, exist_ok=True)
        plinth.save(args.plinth_output, optimize=True)
        print(f"plinth={args.plinth_output}")


if __name__ == "__main__":
    main()
