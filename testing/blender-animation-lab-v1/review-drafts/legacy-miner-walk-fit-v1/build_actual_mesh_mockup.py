"""Package the real Blender renders into deterministic review images and loops."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


SESSION_ROOT = Path(__file__).resolve().parent
PROOF_ROOT = SESSION_ROOT / "proof-renders"
FRAME_ROOT = SESSION_ROOT / "animation-frames"
OUTPUT_ROOT = SESSION_ROOT / "actual-mesh-output"
SAMPLE_FRAMES = (1, 7, 12, 18)
VISUALIZATION_ROOT = Path(
    r"C:\Users\Mila\.codex\visualizations\2026\07\29"
    r"\019fafb8-c82d-79e0-96a8-5f2f06d9ff4f"
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    name = "segoeuib.ttf" if bold else "segoeui.ttf"
    path = Path(r"C:\Windows\Fonts") / name
    try:
        return ImageFont.truetype(str(path), size=size)
    except OSError:
        return ImageFont.load_default()


def checker(size: tuple[int, int], cell: int = 32) -> Image.Image:
    image = Image.new("RGBA", size, (82, 92, 104, 255))
    draw = ImageDraw.Draw(image)
    alternate = (70, 79, 90, 255)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if ((x // cell) + (y // cell)) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill=alternate)
    return image


def exact_render_panel(path: Path, size: int) -> Image.Image:
    source = Image.open(path).convert("RGBA")
    backdrop = checker(source.size)
    backdrop.alpha_composite(source)
    return backdrop.convert("RGB").resize((size, size), Image.Resampling.LANCZOS)


def build_contact_sheet() -> Path:
    panel = 384
    margin = 48
    gap = 16
    header = 142
    row_label = 42
    row_gap = 26
    footer = 70
    width = margin * 2 + panel * 4 + gap * 3
    height = (
        margin
        + header
        + row_label
        + panel
        + row_gap
        + row_label
        + panel
        + footer
        + margin
    )
    sheet = Image.new("RGB", (width, height), (13, 18, 25))
    draw = ImageDraw.Draw(sheet)
    title_font = font(42, bold=True)
    subtitle_font = font(22)
    label_font = font(24, bold=True)
    frame_font = font(18, bold=True)
    footer_font = font(20)

    draw.text(
        (margin, margin),
        "LEGACY MINER — ACTUAL MESH FIT TEST",
        font=title_font,
        fill=(245, 248, 252),
    )
    draw.text(
        (margin, margin + 58),
        "SK_LegacyMiner_Meshy_v2 • Jog_Fwd_Loop • 22 mapped bones • review only",
        font=subtitle_font,
        fill=(155, 190, 218),
    )

    first_label_y = margin + header
    first_row_y = first_label_y + row_label
    second_label_y = first_row_y + panel + row_gap
    second_row_y = second_label_y + row_label
    draw.text(
        (margin, first_label_y),
        "CURRENT SURVIVAL MOTION SOURCE",
        font=label_font,
        fill=(190, 198, 208),
    )
    draw.text(
        (margin, second_label_y),
        "FITTED LEGACY MINER — ACTUAL GLB / UASSET MESH PAIR",
        font=label_font,
        fill=(255, 193, 92),
    )

    sources: list[Path] = []
    for column, frame in enumerate(SAMPLE_FRAMES):
        x = margin + column * (panel + gap)
        for row_y, prefix in (
            (first_row_y, "current-survival"),
            (second_row_y, "fitted-legacy-miner"),
        ):
            path = PROOF_ROOT / f"{prefix}-walk-frame-{frame:04d}.png"
            sources.append(path)
            panel_image = exact_render_panel(path, panel)
            sheet.paste(panel_image, (x, row_y))
            draw.rectangle(
                (x, row_y, x + panel - 1, row_y + panel - 1),
                outline=(116, 133, 151),
                width=2,
            )
        badge = f"FRAME {frame:02d}"
        badge_box = draw.textbbox((0, 0), badge, font=frame_font)
        badge_width = badge_box[2] - badge_box[0] + 22
        draw.rounded_rectangle(
            (x + 12, second_row_y + 12, x + 12 + badge_width, second_row_y + 46),
            radius=8,
            fill=(18, 24, 32),
        )
        draw.text(
            (x + 23, second_row_y + 18),
            badge,
            font=frame_font,
            fill=(247, 250, 253),
        )

    footer_y = second_row_y + panel + 24
    draw.text(
        (margin, footer_y),
        "No image generation • native skin weights preserved • productionChanged: false",
        font=footer_font,
        fill=(147, 165, 181),
    )
    path = OUTPUT_ROOT / "legacy-miner-actual-mesh-fit-contact-sheet.png"
    sheet.save(path, format="PNG", optimize=True)
    return path


def alpha_union_bbox(frames: list[Image.Image]) -> tuple[int, int, int, int]:
    union: tuple[int, int, int, int] | None = None
    for frame in frames:
        bbox = frame.getchannel("A").getbbox()
        if bbox is None:
            continue
        if union is None:
            union = bbox
        else:
            union = (
                min(union[0], bbox[0]),
                min(union[1], bbox[1]),
                max(union[2], bbox[2]),
                max(union[3], bbox[3]),
            )
    if union is None:
        raise RuntimeError("The actual Meshy animation frames are empty")
    return union


def padded_square_bbox(
    bbox: tuple[int, int, int, int],
    canvas_size: tuple[int, int],
) -> tuple[int, int, int, int]:
    center_x = (bbox[0] + bbox[2]) / 2
    center_y = (bbox[1] + bbox[3]) / 2
    side = max(bbox[2] - bbox[0], bbox[3] - bbox[1])
    side = min(max(canvas_size), round(side * 1.28))
    left = round(center_x - side / 2)
    top = round(center_y - side / 2)
    left = max(0, min(canvas_size[0] - side, left))
    top = max(0, min(canvas_size[1] - side, top))
    return (left, top, left + side, top + side)


def presentation_frame(frame: Image.Image, crop: tuple[int, int, int, int]) -> Image.Image:
    background = checker(frame.size, cell=24)
    background.alpha_composite(frame)
    return background.convert("RGB").crop(crop).resize(
        (512, 512),
        Image.Resampling.LANCZOS,
    )


def build_loop() -> tuple[Path, Path, Path, list[Path]]:
    frame_paths = sorted(FRAME_ROOT.glob("frame-*.png"))
    if len(frame_paths) != 24:
        raise RuntimeError(f"Expected 24 actual Meshy frames, found {len(frame_paths)}")
    frames = [Image.open(path).convert("RGBA") for path in frame_paths]
    crop = padded_square_bbox(alpha_union_bbox(frames), frames[0].size)
    presentation = [presentation_frame(frame, crop) for frame in frames]

    webp = OUTPUT_ROOT / "legacy-miner-actual-walk-fit-loop.webp"
    presentation[0].save(
        webp,
        format="WEBP",
        save_all=True,
        append_images=presentation[1:],
        duration=42,
        loop=0,
        lossless=True,
        method=6,
    )
    gif = OUTPUT_ROOT / "legacy-miner-actual-walk-fit-loop.gif"
    presentation[0].save(
        gif,
        format="GIF",
        save_all=True,
        append_images=presentation[1:],
        duration=42,
        loop=0,
        disposal=2,
    )
    still = OUTPUT_ROOT / "legacy-miner-actual-walk-fit-frame-0007.png"
    presentation[6].save(still, format="PNG", optimize=True)
    return webp, gif, still, frame_paths


def main() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    VISUALIZATION_ROOT.mkdir(parents=True, exist_ok=True)
    (OUTPUT_ROOT / "readme.md").write_text(
        "# Actual Meshy character output\n\n"
        "Deterministic composites and animation loops made only from the Blender "
        "renders of `legacy-miner-meshy-rigged-v2.glb`. No generated character "
        "pixels are used.\n",
        encoding="utf-8",
    )
    contact_sheet = build_contact_sheet()
    webp, gif, still, frame_paths = build_loop()
    outputs = (contact_sheet, webp, gif, still)
    for path in outputs:
        target = VISUALIZATION_ROOT / path.name
        target.write_bytes(path.read_bytes())

    report = {
        "schema": "dig-game-actual-mesh-mockup-v1",
        "source": "legacy-miner-meshy-rigged-v2.glb",
        "generativePixelsUsed": False,
        "sourceFrameCount": len(frame_paths),
        "sourceFrames": [
            {"path": str(path), "sha256": sha256(path)}
            for path in frame_paths
        ],
        "outputs": [
            {
                "path": str(path),
                "sha256": sha256(path),
                "visualizationCopy": str(VISUALIZATION_ROOT / path.name),
            }
            for path in outputs
        ],
    }
    report_path = OUTPUT_ROOT / "actual-mesh-output-report.json"
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(
        "ACTUAL_MESH_MOCKUP_OK "
        f"frames={len(frame_paths)} "
        f"contactSheet={contact_sheet} "
        f"loop={webp}"
    )


if __name__ == "__main__":
    main()
