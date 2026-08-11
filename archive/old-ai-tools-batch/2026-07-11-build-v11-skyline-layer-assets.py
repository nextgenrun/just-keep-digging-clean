"""Build non-destructive layers for the v11 skyline weather mockup.

The source artwork remains untouched. Static windmill blades are inpainted from
the mockup base, while the town and windmill structures are exported as
transparent foreground occlusion layers for correct animation depth.
"""

from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "sprites/backgrounds/world-v11-test/level-1-band-01-ground-row-65-master.png"
OUTPUT = ROOT / "testing/animation-sandbox/v11-skyline-weather-mockup-v2/assets"
WIDTH = 1001
HEIGHT = 430


def blade_mask() -> np.ndarray:
    mask = Image.new("L", (WIDTH, HEIGHT), 0)
    draw = ImageDraw.Draw(mask)
    # Centers and baked blade tips measured from the authored v11 surface crop.
    # Narrow strokes avoid erasing either tower while the small tip discs cover
    # the broader wooden sails.
    rotors = (
        ((725, 334), ((716, 300), (754, 322), (738, 365), (697, 347))),
        ((857, 318), ((848, 290), (878, 304), (871, 342), (833, 333))),
    )
    for (cx, cy), tips in rotors:
        for tx, ty in tips:
            draw.line((cx, cy, tx, ty), fill=255, width=7)
            draw.ellipse((tx - 7, ty - 7, tx + 7, ty + 7), fill=255)
        draw.ellipse((cx - 8, cy - 8, cx + 8, cy + 8), fill=255)
    return np.array(mask.filter(ImageFilter.GaussianBlur(1.2)))


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE).convert("RGB").crop((0, 0, WIDTH, HEIGHT))
    bgr = cv2.cvtColor(np.array(source), cv2.COLOR_RGB2BGR)
    clean_bgr = cv2.inpaint(bgr, blade_mask(), 3, cv2.INPAINT_TELEA)
    clean = Image.fromarray(cv2.cvtColor(clean_bgr, cv2.COLOR_BGR2RGB))
    clean.save(OUTPUT / "skyline-base-clean.webp", "WEBP", quality=94, method=6)

    # The cleaned town foreground hides deep clouds behind the mountain/town
    # silhouette without reintroducing the static blades.
    town_alpha = Image.new("L", (WIDTH, HEIGHT), 0)
    alpha_pixels = town_alpha.load()
    for y in range(HEIGHT):
        alpha = int(np.clip((y - 266) / 62, 0, 1) * 255)
        for x in range(WIDTH):
            alpha_pixels[x, y] = alpha
    town = clean.convert("RGBA")
    town.putalpha(town_alpha.filter(ImageFilter.GaussianBlur(2)))
    town.save(OUTPUT / "town-foreground.png", optimize=True)

    # Exact authored towers and hubs occlude the animated rotors. The polygons
    # are deliberately narrow so the moving blades remain visible behind them.
    windmill_mask = Image.new("L", (WIDTH, HEIGHT), 0)
    draw = ImageDraw.Draw(windmill_mask)
    draw.polygon([(718, 329), (732, 329), (742, 407), (707, 407)], fill=255)
    draw.ellipse((716, 325, 734, 343), fill=255)
    draw.polygon([(850, 313), (864, 313), (875, 403), (842, 403)], fill=255)
    draw.ellipse((848, 309, 866, 327), fill=255)
    windmill = source.convert("RGBA")
    windmill.putalpha(windmill_mask.filter(ImageFilter.GaussianBlur(.6)))
    windmill.save(OUTPUT / "windmill-foreground.png", optimize=True)

    source.save(OUTPUT / "source-reference.webp", "WEBP", quality=90, method=6)
    print(f"Built layered skyline assets in {OUTPUT}")


if __name__ == "__main__":
    main()
