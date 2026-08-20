import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def config_argument():
    for argument in sys.argv[1:]:
        if argument.startswith("--config="):
            return Path(argument.split("=", 1)[1]).resolve()
    raise RuntimeError("Missing required --config argument")


def centered(draw, bounds, text, font, fill):
    box = draw.textbbox((0, 0), text, font=font)
    width = box[2] - box[0]
    height = box[3] - box[1]
    x = bounds[0] + (bounds[2] - bounds[0] - width) / 2
    y = bounds[1] + (bounds[3] - bounds[1] - height) / 2
    draw.text((x, y), text, font=font, fill=fill)


def main():
    config_path = config_argument()
    root = config_path.parents[1]
    config = json.loads(config_path.read_text(encoding="utf-8"))
    preview = config["preview"]
    display = preview["displaySizePx"]
    header = preview["headerHeightPx"]
    footer = preview["footerHeightPx"]
    background = tuple(preview["backgroundColor"])
    text_color = tuple(preview["textColor"])
    accent = tuple(preview["accentColor"])
    font = ImageFont.load_default(size=20)
    small = ImageFont.load_default(size=16)
    frames = [int(value) for value in config["test"]["renderFrames"]]
    corrected_root = root / config["correctedOutputRoot"]
    rest = Image.open(corrected_root / f"frame-{frames[0]:03d}.png").convert("RGBA")
    rest.thumbnail((display, display), Image.Resampling.LANCZOS)

    animation = []
    contact = Image.new("RGBA", (display * len(frames), header + display + footer), background)
    for index, frame in enumerate(frames):
        moving = Image.open(corrected_root / f"frame-{frame:03d}.png").convert("RGBA")
        moving.thumbnail((display, display), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (display * 2, header + display + footer), background)
        canvas.alpha_composite(rest, (0, header))
        canvas.alpha_composite(moving, (display, header))
        draw = ImageDraw.Draw(canvas)
        draw.line((display, 0, display, header + display + footer), fill=accent, width=2)
        centered(draw, (0, 0, display, header), preview["leftTitle"], font, text_color)
        centered(draw, (display, 0, display * 2, header), preview["rightTitle"], font, accent)
        caption = preview["captions"][str(frame)]
        centered(draw, (0, header + display, display * 2, header + display + footer), caption, small, text_color)
        animation.append(canvas.convert("P", palette=Image.Palette.ADAPTIVE))

        contact.alpha_composite(moving, (index * display, header))
        contact_draw = ImageDraw.Draw(contact)
        centered(contact_draw, (index * display, 0, (index + 1) * display, header), caption, small, accent)
        centered(contact_draw, (index * display, header + display, (index + 1) * display, header + display + footer), f"FRAME {frame}", small, text_color)

    gif_path = root / preview["outputGif"]
    contact_path = root / preview["outputContactSheet"]
    gif_path.parent.mkdir(parents=True, exist_ok=True)
    animation[0].save(
        gif_path,
        save_all=True,
        append_images=animation[1:],
        duration=preview["frameDurationMs"],
        loop=0,
        disposal=2,
    )
    contact.convert("RGB").save(contact_path, quality=95)
    print(f"BASIC_RIG_TEST_PREVIEW_OK gif={gif_path} contact={contact_path}")


if __name__ == "__main__":
    main()
