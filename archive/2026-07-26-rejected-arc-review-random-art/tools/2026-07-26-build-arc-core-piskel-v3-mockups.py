"""Compose clean Arc Core v3 motion mockups from the runtime raster roles.

These deterministic boards are asset-composition previews, not browser
screenshots. The browser capture remains a separate release-review gate.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


SIZE = (1280, 720)
ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "sprites/character/arc-core-review-v3/runtime"


def load(name: str) -> Image.Image:
    return Image.open(RUNTIME / name).convert("RGBA")


ART = {
    "background": load("arc-stage-background-v3.png"),
    "dirt": load("arc-stage-dirt-v3.png"),
    "stone": load("arc-stage-stone-v3.png"),
    "floor": load("arc-stage-floor-v3.png"),
    "bedrock": load("arc-stage-bedrock-v3.png"),
    "small_body": load("small-arc-master-v3.png"),
    "small_energy": load("small-arc-gyro-ring-v2.png"),
    "small_cloud": load("small-arc-cloud-v2.png"),
    "small_beam": load("small-arc-twin-beam-v3.png"),
    "small_impact": load("small-arc-impact-v3.png"),
    "omega_body": load("omega-arc-master-v2.png"),
    "omega_energy": load("omega-arc-lattice-sigil-v2.png"),
    "omega_cloud": load("omega-arc-cloud-v2.png"),
    "omega_beam": load("omega-arc-lattice-beam-v3.png"),
    "omega_impact": load("omega-arc-impact-v3.png"),
}


def scaled(image: Image.Image, width: float, height: float) -> Image.Image:
    target = (max(1, round(width)), max(1, round(height)))
    return image.resize(target, Image.Resampling.LANCZOS)


def place(
    canvas: Image.Image,
    image: Image.Image,
    center: tuple[float, float],
    size: tuple[float, float],
    *,
    alpha: float = 1.0,
    angle: float = 0.0,
) -> None:
    layer = scaled(image, *size)
    if angle:
        layer = layer.rotate(
            -angle,
            resample=Image.Resampling.BICUBIC,
            expand=True,
        )
    if alpha < 1:
        channel = layer.getchannel("A").point(
            lambda value: round(value * max(0.0, min(1.0, alpha))),
        )
        layer.putalpha(channel)
    position = (
        round(center[0] - layer.width / 2),
        round(center[1] - layer.height / 2),
    )
    canvas.alpha_composite(layer, position)


def stage() -> Image.Image:
    canvas = ART["background"].copy()
    for column in range(-1, 15):
        tile = ART["floor"] if column % 3 else ART["bedrock"]
        place(canvas, tile, (column * 94 + 47, 705), (95, 95), alpha=0.98)
    return canvas


def wall(
    canvas: Image.Image,
    *,
    left: int,
    top: int,
    columns: int,
    rows: int,
    tile_size: int = 94,
) -> None:
    for row in range(rows):
        for column in range(columns):
            selector = (column * 3 + row * 5) % 4
            tile = ART["stone"] if selector in (0, 3) else ART["dirt"]
            place(
                canvas,
                tile,
                (
                    left + column * tile_size + tile_size / 2,
                    top + row * tile_size + tile_size / 2,
                ),
                (tile_size + 1, tile_size + 1),
                alpha=0.98,
            )


def small_idle() -> Image.Image:
    canvas = stage()
    wall(canvas, left=825, top=423, columns=3, rows=3)
    center = (470, 505)
    place(canvas, ART["small_body"], center, (154, 154))
    place(canvas, ART["small_energy"], center, (86, 86), alpha=0.58, angle=18)
    place(canvas, ART["small_energy"], center, (56, 56), alpha=0.34, angle=-31)
    return canvas


def small_dig() -> Image.Image:
    canvas = stage()
    wall(canvas, left=795, top=423, columns=4, rows=3)
    center = (405, 517)
    contact = (889, 517)
    place(canvas, ART["small_body"], center, (154, 154))
    place(canvas, ART["small_energy"], center, (102, 102), alpha=0.82, angle=42)
    place(canvas, ART["small_beam"], (640, 517), (510, 150), alpha=0.95)
    place(canvas, ART["small_impact"], contact, (226, 226), alpha=0.28, angle=-14)
    place(canvas, ART["small_impact"], contact, (194, 194), alpha=0.9, angle=4)
    return canvas


def small_cloud() -> Image.Image:
    canvas = stage()
    center = (532, 492)
    place(canvas, ART["small_cloud"], center, (248, 248), alpha=0.64, angle=24)
    place(canvas, ART["small_body"], center, (148, 148), alpha=0.62)
    place(canvas, ART["small_energy"], center, (132, 132), alpha=0.82, angle=-42)
    place(canvas, ART["small_cloud"], center, (292, 292), alpha=0.46, angle=-15)
    return canvas


def omega_stage() -> Image.Image:
    canvas = stage()
    wall(canvas, left=830, top=-18, columns=6, rows=8)
    return canvas


def omega_idle() -> Image.Image:
    canvas = omega_stage()
    center = (410, 360)
    place(canvas, ART["omega_body"], center, (452, 452))
    place(canvas, ART["omega_energy"], center, (174, 174), alpha=0.56, angle=8)
    place(canvas, ART["omega_energy"], center, (112, 112), alpha=0.28, angle=-16)
    return canvas


def omega_dig() -> Image.Image:
    canvas = omega_stage()
    center = (350, 360)
    contact = (1018, 360)
    place(canvas, ART["omega_body"], center, (452, 452))
    place(canvas, ART["omega_energy"], center, (202, 202), alpha=0.78, angle=18)
    place(canvas, ART["omega_beam"], (665, 360), (660, 612), alpha=0.9)
    place(canvas, ART["omega_impact"], contact, (660, 660), alpha=0.22, angle=-9)
    place(canvas, ART["omega_impact"], contact, (590, 590), alpha=0.78, angle=3)
    return canvas


def omega_cloud() -> Image.Image:
    canvas = stage()
    center = (590, 360)
    place(canvas, ART["omega_cloud"], center, (610, 610), alpha=0.64, angle=10)
    place(canvas, ART["omega_body"], center, (430, 430), alpha=0.58)
    place(canvas, ART["omega_energy"], center, (350, 350), alpha=0.76, angle=-12)
    place(canvas, ART["omega_cloud"], center, (680, 680), alpha=0.4, angle=-7)
    return canvas


FRAMES = (
    ("01-small-idle.png", small_idle),
    ("02-small-dig.png", small_dig),
    ("03-small-cloud-exit.png", small_cloud),
    ("04-omega-idle.png", omega_idle),
    ("05-omega-dig.png", omega_dig),
    ("06-omega-cloud-exit.png", omega_cloud),
)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for name, render in FRAMES:
        output = args.output_dir / name
        if output.exists() and not args.force:
            raise FileExistsError(f"Refusing to overwrite {output}")
        render().convert("RGB").save(output, optimize=True)
    print(f"Wrote {len(FRAMES)} Arc Piskel runtime-art mockups")


if __name__ == "__main__":
    main()
