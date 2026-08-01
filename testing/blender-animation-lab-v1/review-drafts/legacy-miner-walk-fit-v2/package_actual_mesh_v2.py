"""Package only the deterministic Blender renders of the real Meshy miner."""

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


def font(
    size: int,
    bold: bool = False,
) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    name = "segoeuib.ttf" if bold else "segoeui.ttf"
    path = Path(r"C:\Windows\Fonts") / name
    try:
        return ImageFont.truetype(str(path), size=size)
    except OSError:
        return ImageFont.load_default()


def checker(size: tuple[int, int], cell: int = 28) -> Image.Image:
    image = Image.new("RGBA", size, (82, 92, 104, 255))
    draw = ImageDraw.Draw(image)
    alternate = (70, 79, 90, 255)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if ((x // cell) + (y // cell)) % 2:
                draw.rectangle(
                    (x, y, x + cell - 1, y + cell - 1),
                    fill=alternate,
                )
    return image


def exact_panel(path: Path, size: int) -> Image.Image:
    if not path.is_file():
        raise FileNotFoundError(path)
    source = Image.open(path).convert("RGBA")
    backdrop = checker(source.size)
    backdrop.alpha_composite(source)
    return backdrop.convert("RGB").resize(
        (size, size),
        Image.Resampling.LANCZOS,
    )


def build_contact_sheet() -> Path:
    panel = 320
    margin = 46
    gap = 14
    title_height = 130
    label_height = 38
    row_gap = 18
    footer_height = 72
    width = margin * 2 + panel * 4 + gap * 3
    height = (
        margin
        + title_height
        + (label_height + panel) * 3
        + row_gap * 2
        + footer_height
        + margin
    )
    sheet = Image.new("RGB", (width, height), (13, 18, 25))
    draw = ImageDraw.Draw(sheet)
    draw.text(
        (margin, margin),
        "REAL MESH RETARGET — FAILED V1 VS CORRECTED V2",
        font=font(36, bold=True),
        fill=(245, 248, 252),
    )
    draw.text(
        (margin, margin + 52),
        "legacy-miner-meshy-rigged-v2.glb • Jog_Fwd_Loop • identical sampled frames",
        font=font(20),
        fill=(155, 190, 218),
    )

    rows = (
        (
            "SOURCE SURVIVAL MOTION",
            "source-survival",
            (190, 198, 208),
        ),
        (
            "FAILED V1 — WRONG RIG BASIS + REVERSED SPINE",
            "failed-v1-meshy",
            (235, 112, 112),
        ),
        (
            "CORRECTED V2 — HIERARCHY + JOINT-DIRECTION RETARGET",
            "corrected-v2-meshy",
            (117, 218, 157),
        ),
    )
    row_y = margin + title_height
    for label, prefix, color in rows:
        draw.text(
            (margin, row_y),
            label,
            font=font(22, bold=True),
            fill=color,
        )
        panel_y = row_y + label_height
        for column, frame in enumerate(SAMPLE_FRAMES):
            x = margin + column * (panel + gap)
            path = PROOF_ROOT / f"{prefix}-frame-{frame:04d}.png"
            sheet.paste(exact_panel(path, panel), (x, panel_y))
            draw.rectangle(
                (x, panel_y, x + panel - 1, panel_y + panel - 1),
                outline=(116, 133, 151),
                width=2,
            )
            badge = f"FRAME {frame:02d}"
            badge_font = font(16, bold=True)
            bbox = draw.textbbox((0, 0), badge, font=badge_font)
            badge_width = bbox[2] - bbox[0] + 20
            draw.rounded_rectangle(
                (
                    x + 10,
                    panel_y + 10,
                    x + 10 + badge_width,
                    panel_y + 41,
                ),
                radius=7,
                fill=(18, 24, 32),
            )
            draw.text(
                (x + 20, panel_y + 16),
                badge,
                font=badge_font,
                fill=(247, 250, 253),
            )
        row_y = panel_y + panel + row_gap

    draw.text(
        (margin, height - margin - 46),
        "Real GLB pixels only • native weights • evaluated shoe grounding • productionChanged: false",
        font=font(18),
        fill=(147, 165, 181),
    )
    output = OUTPUT_ROOT / "legacy-miner-corrected-retarget-contact-sheet.png"
    sheet.save(output, format="PNG", optimize=True)
    return output


def alpha_union_bbox(
    frames: list[Image.Image],
) -> tuple[int, int, int, int]:
    union = None
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
        raise RuntimeError("The corrected real-Meshy frames are empty")
    return union


def padded_square_bbox(
    bbox: tuple[int, int, int, int],
    canvas: tuple[int, int],
) -> tuple[int, int, int, int]:
    center_x = (bbox[0] + bbox[2]) / 2
    center_y = (bbox[1] + bbox[3]) / 2
    side = min(
        max(canvas),
        round(max(bbox[2] - bbox[0], bbox[3] - bbox[1]) * 1.25),
    )
    left = max(0, min(canvas[0] - side, round(center_x - side / 2)))
    top = max(0, min(canvas[1] - side, round(center_y - side / 2)))
    return (left, top, left + side, top + side)


def presentation_frame(
    frame: Image.Image,
    crop: tuple[int, int, int, int],
) -> Image.Image:
    background = checker(frame.size, cell=24)
    background.alpha_composite(frame)
    return background.convert("RGB").crop(crop).resize(
        (512, 512),
        Image.Resampling.LANCZOS,
    )


def build_loop() -> tuple[Path, Path, Path, list[Path]]:
    frame_paths = sorted(FRAME_ROOT.glob("frame-*.png"))
    if len(frame_paths) != 24:
        raise RuntimeError(
            f"Expected 24 corrected real-Meshy frames, found {len(frame_paths)}"
        )
    frames = [Image.open(path).convert("RGBA") for path in frame_paths]
    crop = padded_square_bbox(alpha_union_bbox(frames), frames[0].size)
    presentation = [
        presentation_frame(frame, crop)
        for frame in frames
    ]
    webp = OUTPUT_ROOT / "legacy-miner-corrected-walk-loop.webp"
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
    gif = OUTPUT_ROOT / "legacy-miner-corrected-walk-loop.gif"
    presentation[0].save(
        gif,
        format="GIF",
        save_all=True,
        append_images=presentation[1:],
        duration=42,
        loop=0,
        disposal=2,
    )
    still = OUTPUT_ROOT / "legacy-miner-corrected-walk-frame-0007.png"
    presentation[6].save(still, format="PNG", optimize=True)
    return webp, gif, still, frame_paths


def main() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    VISUALIZATION_ROOT.mkdir(parents=True, exist_ok=True)
    contact_sheet = build_contact_sheet()
    webp, gif, still, frame_paths = build_loop()
    outputs = (contact_sheet, webp, gif, still)
    for path in outputs:
        (VISUALIZATION_ROOT / path.name).write_bytes(path.read_bytes())
    report = {
        "schema": "dig-game-actual-mesh-retarget-review-v2",
        "source": "legacy-miner-meshy-rigged-v2.glb",
        "generativePixelsUsed": False,
        "productionChanged": False,
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
    report_path.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        "ACTUAL_MESH_RETARGET_V2_PACKAGE_OK "
        f"frames={len(frame_paths)} "
        f"contactSheet={contact_sheet} "
        f"loop={webp}"
    )


if __name__ == "__main__":
    main()
