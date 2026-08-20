"""Build review-only Steam About This Game motion assets from production art."""

from pathlib import Path
from math import pi, sin

from PIL import Image, ImageChops, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "steam-marketing" / "2026-08-16-motion-pack-v1"
CANVAS = (1170, 658)
RESAMPLE = Image.Resampling.LANCZOS

BLUE_BACKWALL = ROOT / "sprites/backgrounds/world-visual-v2/depth/level1-blue-backwall-a-v1.png"
MAGMA_BACKWALL = ROOT / "sprites/backgrounds/world-visual-v2/depth/level1-magma-backwall-v1.png"
STAR_COLOURS = {
    "cyan": (
        ROOT / "sprites/environment/star-block-crystal-v2/star-core-cyan-v2.png",
        ROOT / "sprites/environment/star-block-destruction-v1/star-fracture-cyan-v1.png",
    ),
    "lavender": (
        ROOT / "sprites/environment/star-block-crystal-v2/star-core-lavender-v2.png",
        ROOT / "sprites/environment/star-block-destruction-v1/star-fracture-lavender-v1.png",
    ),
    "gold": (
        ROOT / "sprites/environment/star-block-crystal-v2/star-core-gold-v2.png",
        ROOT / "sprites/environment/star-block-destruction-v1/star-fracture-gold-v1.png",
    ),
    "violet": (
        ROOT / "sprites/environment/star-block-crystal-v2/star-core-violet-v2.png",
        ROOT / "sprites/environment/star-block-destruction-v1/star-fracture-violet-v1.png",
    ),
}
BREAK_ATLAS = ROOT / "sprites/fx/tile-destruction-fx-v3/tile-break-core-v3.png"
UNDERSTAR = ROOT / "sprites/backgrounds/understar-ending-v1/understar-ending-backdrop-v1.webp"


def cover(image, size=CANVAS, zoom=1.0, offset=(0, 0)):
    source = image.convert("RGB")
    scale = max(size[0] / source.width, size[1] / source.height) * zoom
    resized = source.resize((round(source.width * scale), round(source.height * scale)), RESAMPLE)
    left = (resized.width - size[0]) // 2 + offset[0]
    top = (resized.height - size[1]) // 2 + offset[1]
    return resized.crop((left, top, left + size[0], top + size[1]))


def dark_backwall(path, brightness=0.46, blur=1.2):
    base = cover(Image.open(path))
    base = ImageEnhance.Brightness(base).enhance(brightness)
    base = ImageEnhance.Color(base).enhance(0.82)
    return base.filter(ImageFilter.GaussianBlur(blur))


def screen_sprite(base, sprite, center, size, alpha=1.0, rotation=0.0):
    art = sprite.convert("RGB").resize((round(size), round(size)), RESAMPLE)
    if rotation:
        art = art.rotate(rotation, Image.Resampling.BICUBIC, expand=True, fillcolor=(0, 0, 0))
    if alpha < 1:
        art = ImageEnhance.Brightness(art).enhance(max(0.0, alpha))
    layer = Image.new("RGB", CANVAS, "black")
    layer.paste(art, (round(center[0] - art.width / 2), round(center[1] - art.height / 2)))
    return ImageChops.screen(base, layer)


def alpha_sprite(base, sprite, center, size, alpha=1.0):
    scale = size / sprite.width
    art = sprite.resize((round(sprite.width * scale), round(sprite.height * scale)), RESAMPLE)
    if alpha < 1:
        art = art.copy()
        art.putalpha(art.getchannel("A").point(lambda value: round(value * max(0.0, alpha))))
    out = base.convert("RGBA")
    out.alpha_composite(art, (round(center[0] - art.width / 2), round(center[1] - art.height / 2)))
    return out.convert("RGB")


def save_motion(frames, stem, duration_ms, poster_index):
    OUTPUT.mkdir(parents=True, exist_ok=True)
    frames[poster_index].save(OUTPUT / f"{stem}-poster.png", optimize=True)
    frames[0].save(
        OUTPUT / f"{stem}.webp",
        save_all=True,
        append_images=frames[1:],
        duration=duration_ms,
        loop=0,
        quality=88,
        method=6,
        minimize_size=True,
    )


def build_star_break(colour, core_path, fracture_path):
    background = dark_backwall(BLUE_BACKWALL, brightness=0.38)
    core = Image.open(core_path)
    fracture = Image.open(fracture_path)
    frames = []
    frame_count = 48

    for index in range(frame_count):
        t = index / frame_count
        base = background.copy()
        pulse = 1.0 + 0.035 * sin(t * 6 * pi)

        if t < 0.31:
            energy = 0.86 + (t / 0.31) * 0.24
            base = screen_sprite(base, core, (585, 355), 300 * pulse, energy)
        elif t < 0.43:
            local = (t - 0.31) / 0.12
            base = screen_sprite(base, core, (585, 355), 302 + 36 * local, 1.18 - 0.5 * local)
            base = screen_sprite(base, fracture, (585, 354), 300 + 185 * local, 0.28 + 0.95 * local)
        elif t < 0.63:
            local = (t - 0.43) / 0.20
            base = screen_sprite(base, fracture, (585, 350 - 24 * local), 485 + 175 * local, 1.08 - 0.92 * local)
            base = screen_sprite(base, core, (585, 350 - 42 * local), 170 + 35 * local, 0.78 + 0.18 * local)
        elif t < 0.86:
            local = (t - 0.63) / 0.23
            base = screen_sprite(base, core, (585, 308 - 118 * local), 205 + 35 * local, 0.96 - 0.22 * local, rotation=5 * sin(local * pi))
        else:
            local = (t - 0.86) / 0.14
            base = screen_sprite(base, core, (585, 190 - 22 * local), 240 - 32 * local, 0.74 * (1 - local))
        frames.append(base)

    save_motion(frames, f"star-block-break-release-{colour}-loop-v1", 80, 22)


def crop_break_frames(row):
    atlas = Image.open(BREAK_ATLAS).convert("RGBA")
    return [atlas.crop((column * 256, row * 208, (column + 1) * 256, (row + 1) * 208)) for column in range(4)]


def build_material_breaks():
    blue = dark_backwall(BLUE_BACKWALL, brightness=0.34)
    magma = dark_backwall(MAGMA_BACKWALL, brightness=0.32)
    families = [crop_break_frames(2), crop_break_frames(12), crop_break_frames(14)]
    centers = [(305, 365), (585, 345), (865, 365)]
    starts = [4, 17, 30]
    frames = []
    frame_count = 45

    for index in range(frame_count):
        mix = 0.5 + 0.5 * sin((index / frame_count) * 2 * pi)
        base = Image.blend(blue, magma, 0.08 + 0.08 * mix)
        for family, center, start in zip(families, centers, starts):
            age = index - start
            if 0 <= age < 11:
                phase = min(3, age // 2)
                fade = 1.0 if age < 7 else max(0.0, 1 - (age - 7) / 4)
                size = 340 + min(age, 5) * 10
                base = alpha_sprite(base, family[phase], center, size, fade)
        frames.append(base)

    save_motion(frames, "three-material-break-montage-loop-v1", 90, 20)


def build_understar_reveal():
    source = Image.open(UNDERSTAR)
    frames = []
    frame_count = 42
    for index in range(frame_count):
        t = index / frame_count
        wave = 0.5 - 0.5 * cos_like(t * 2 * pi)
        frame = cover(source, zoom=1.0 + 0.025 * wave, offset=(round(8 * sin(t * 2 * pi)), 0))
        frame = ImageEnhance.Brightness(frame).enhance(0.92 + 0.10 * wave)
        frame = ImageEnhance.Color(frame).enhance(0.96 + 0.08 * wave)
        frames.append(frame)
    save_motion(frames, "understar-reveal-ambient-loop-v1", 95, 20)


def cos_like(value):
    return sin(value + pi / 2)


if __name__ == "__main__":
    for star_colour, paths in STAR_COLOURS.items():
        build_star_break(star_colour, *paths)
    build_material_breaks()
    build_understar_reveal()
    print(f"Built Steam motion pack: {OUTPUT}")
