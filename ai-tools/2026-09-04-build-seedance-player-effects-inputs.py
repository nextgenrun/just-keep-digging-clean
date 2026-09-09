"""Build exact-current reference anchors for the Seedance player/effects lab."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
LAB = ROOT / "testing/animation-sandbox/2026-09-04-seedance-player-effects-eur10-v1"
REFS = LAB / "references"
SIZE = (1280, 720)
FLOOR_Y = 652
CHROMA = (255, 0, 255, 255)
FLOOR = (22, 30, 42, 255)

WALK_SOURCE = ROOT / "visual-approval-previews/2026-08-15-survival-motion-locked-mesh-quality-v2/raw-2048/walk"
WALK_RUNTIME = ROOT / "sprites/character/survival-character-unified-v1/runtime/2026-08-25-survival-blender-v2-walk-sheet.webp"
SIDE_RUNTIME = ROOT / "sprites/character/survival-character-unified-v1/runtime/2026-08-25-survival-ual-player-v1-moving-side-dig-cross-sheet.webp"
DIRT_SOURCE = ROOT / "sprites/UI/loot-pickups/dirt.png"
STONE_SOURCE = ROOT / "sprites/UI/loot-pickups/stone.png"
COPPER_SOURCE = ROOT / "sprites/UI/loot-pickups/copper.png"
IRON_SOURCE = ROOT / "sprites/UI/loot-pickups/iron.png"
GOLD_SOURCE = ROOT / "sprites/UI/loot-pickups/gold.png"
MAGMA_SOURCE = ROOT / "sprites/backgrounds/world-visual-v2/semantic-decals-v1/imagegen-overlay-v3/masters/alpha/magma-crystal.png"
EMBER_SOURCE = ROOT / "sprites/backgrounds/world-visual-v2/semantic-decals-v1/imagegen-overlay-v3/masters/alpha/ember-ore.png"
BREAK_CORE_SOURCE = ROOT / "sprites/fx/tile-destruction-fx-v3/tile-break-core-v3.png"
XP_SOURCES = [
    ROOT / "sprites/UI/xp-gathering-v2/xp-mote-core-v2.png",
    ROOT / "sprites/UI/xp-gathering-v2/xp-cluster-orbit-v2.png",
    ROOT / "sprites/UI/xp-gathering-v2/xp-sigil-rune-v2.png",
    ROOT / "sprites/UI/xp-gathering-v2/xp-crest-core-v2.png",
    ROOT / "sprites/UI/xp-gathering-v2/xp-crest-crown-v2.png",
]
WAYWARD_SOURCE = ROOT / "sprites/celestial-engines/wayward-star-core-v1.png"
HOLLOW_SOURCE = ROOT / "sprites/celestial-engines/hollow-sun-core-v1.png"
STAR_HEART_SOURCE = ROOT / "sprites/celestial-engines/star-heart-core-v1.png"
LANCE_WAVE_SOURCE = ROOT / "sprites/celestial-engines/stellar-lance-wave-purple-v1.png"
LANCE_IMPACT_SOURCE = ROOT / "sprites/celestial-engines/stellar-lance-impact-purple-v1.png"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sheet_frame(path: Path, index: int, cell: int = 256, columns: int = 16) -> Image.Image:
    sheet = Image.open(path).convert("RGBA")
    left = (index % columns) * cell
    top = (index // columns) * cell
    return sheet.crop((left, top, left + cell, top + cell))


def alpha_crop(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    box = rgba.getchannel("A").getbbox()
    if not box:
        raise ValueError("Reference frame has no visible pixels")
    return rgba.crop(box)


def fitted(image: Image.Image, target_height: int) -> Image.Image:
    crop = alpha_crop(image)
    scale = target_height / crop.height
    return crop.resize((max(1, round(crop.width * scale)), target_height), Image.Resampling.LANCZOS)


def stage_plate(character: Image.Image, center_x: int, target_height: int) -> Image.Image:
    plate = Image.new("RGBA", SIZE, CHROMA)
    ImageDraw.Draw(plate).rectangle((0, FLOOR_Y, SIZE[0], SIZE[1]), fill=FLOOR)
    actor = fitted(character, target_height)
    plate.alpha_composite(actor, (round(center_x - actor.width / 2), FLOOR_Y - actor.height))
    return plate.convert("RGB")


def save(image: Image.Image, name: str) -> Path:
    path = REFS / name
    image.save(path, optimize=True)
    return path


def storyboard(frames: list[Image.Image], name: str) -> Path:
    plate = Image.new("RGBA", SIZE, CHROMA)
    ImageDraw.Draw(plate).rectangle((0, FLOOR_Y, SIZE[0], SIZE[1]), fill=FLOOR)
    slot_width = SIZE[0] / len(frames)
    for index, frame in enumerate(frames):
        actor = fitted(frame, 330)
        center_x = round(slot_width * (index + 0.5))
        plate.alpha_composite(actor, (round(center_x - actor.width / 2), FLOOR_Y - actor.height))
    return save(plate.convert("RGB"), name)


def impact_plate() -> Image.Image:
    plate = Image.new("RGBA", SIZE, (3, 5, 9, 255))
    draw = ImageDraw.Draw(plate)
    draw.rectangle((0, 594, SIZE[0], SIZE[1]), fill=(18, 13, 11, 255))
    dirt = alpha_crop(Image.open(DIRT_SOURCE).convert("RGBA"))
    dirt = dirt.resize((180, 180), Image.Resampling.NEAREST)
    plate.alpha_composite(dirt, (round(640 - dirt.width / 2), 594 - dirt.height))
    return plate.convert("RGB")


def clean_fx_plate() -> Image.Image:
    return Image.new("RGB", SIZE, (0, 0, 0))


def fitted_box(image: Image.Image, width: int, height: int, nearest: bool = False) -> Image.Image:
    crop = alpha_crop(image)
    scale = min(width / crop.width, height / crop.height)
    resampling = Image.Resampling.NEAREST if nearest else Image.Resampling.LANCZOS
    return crop.resize((max(1, round(crop.width * scale)), max(1, round(crop.height * scale))), resampling)


def style_board(images: list[tuple[Image.Image, bool]], name: str) -> Path:
    board = Image.new("RGBA", SIZE, (0, 0, 0, 255))
    slots = len(images)
    slot_width = SIZE[0] / slots
    for index, (source, nearest) in enumerate(images):
        art = fitted_box(source.convert("RGBA"), round(slot_width * 0.76), 500, nearest)
        x = round(slot_width * (index + 0.5) - art.width / 2)
        y = round(SIZE[1] / 2 - art.height / 2)
        board.alpha_composite(art, (x, y))
    return save(board.convert("RGB"), name)


def break_row(row: int) -> list[tuple[Image.Image, bool]]:
    atlas = Image.open(BREAK_CORE_SOURCE).convert("RGBA")
    return [
        (atlas.crop((column * 256, row * 208, (column + 1) * 256, (row + 1) * 208)), False)
        for column in range(4)
    ]


def main() -> int:
    REFS.mkdir(parents=True, exist_ok=True)
    required = [
        WALK_SOURCE / "frame-000.png", WALK_SOURCE / "frame-023.png", WALK_RUNTIME, SIDE_RUNTIME,
        DIRT_SOURCE, STONE_SOURCE, COPPER_SOURCE, IRON_SOURCE, GOLD_SOURCE, MAGMA_SOURCE, EMBER_SOURCE,
        BREAK_CORE_SOURCE, *XP_SOURCES, WAYWARD_SOURCE, HOLLOW_SOURCE, STAR_HEART_SOURCE,
        LANCE_WAVE_SOURCE, LANCE_IMPACT_SOURCE,
    ]
    missing = [str(path) for path in required if not path.is_file()]
    if missing:
        raise FileNotFoundError("\n".join(missing))

    walk_frames = [Image.open(WALK_SOURCE / f"frame-{index:03d}.png").convert("RGBA") for index in (0, 6, 12, 18, 23)]
    side_frames = [sheet_frame(SIDE_RUNTIME, index) for index in (0, 3, 6, 12, 21)]

    clean_plate = clean_fx_plate()
    outputs = [
        save(stage_plate(walk_frames[0], 640, 590), "walk-loop-first.png"),
        save(stage_plate(walk_frames[-1], 640, 590), "walk-loop-last.png"),
        storyboard(walk_frames, "walk-loop-storyboard.png"),
        save(stage_plate(side_frames[0], 470, 560), "side-dig-first.png"),
        save(stage_plate(side_frames[-1], 470, 560), "side-dig-last.png"),
        storyboard(side_frames, "side-dig-storyboard.png"),
        save(impact_plate(), "soil-impact-first.png"),
        save(impact_plate(), "soil-impact-last.png"),
        save(clean_plate, "fx-clean-first.png"),
        save(clean_plate, "fx-clean-last.png"),
        style_board([
            (Image.open(DIRT_SOURCE), True), (Image.open(STONE_SOURCE), True),
            (Image.open(COPPER_SOURCE), True), (Image.open(IRON_SOURCE), True),
            (Image.open(GOLD_SOURCE), True),
        ], "style-material-icons.png"),
        style_board([(Image.open(STONE_SOURCE), True), *break_row(2)], "style-stone-contact.png"),
        style_board([
            (Image.open(COPPER_SOURCE), True), (Image.open(IRON_SOURCE), True),
            (Image.open(GOLD_SOURCE), True), *break_row(5)[:1], *break_row(8)[:1],
        ], "style-metal-contact.png"),
        style_board([
            (Image.open(MAGMA_SOURCE), False), (Image.open(EMBER_SOURCE), False),
            *break_row(13)[:2],
        ], "style-crystal-contact.png"),
        style_board([
            (Image.open(MAGMA_SOURCE), False), (Image.open(EMBER_SOURCE), False),
            *break_row(12)[:2],
        ], "style-magma-contact.png"),
        style_board(break_row(0), "style-break-dirt.png"),
        style_board(break_row(2), "style-break-stone.png"),
        style_board(break_row(13), "style-break-crystal.png"),
        style_board([(Image.open(path), False) for path in XP_SOURCES], "style-xp-gathering.png"),
        style_board([(Image.open(WAYWARD_SOURCE), False)], "style-wayward-star.png"),
        style_board([(Image.open(HOLLOW_SOURCE), False)], "style-hollow-sun.png"),
        style_board([
            (Image.open(LANCE_WAVE_SOURCE), False), (Image.open(LANCE_IMPACT_SOURCE), False),
        ], "style-stellar-lance.png"),
        style_board([(Image.open(STAR_HEART_SOURCE), False)], "style-star-heart.png"),
    ]

    runtime_samples = LAB / "runtime-samples"
    runtime_samples.mkdir(parents=True, exist_ok=True)
    for label, image in (
        ("walk-current-frame-00.png", sheet_frame(WALK_RUNTIME, 0)),
        ("walk-current-frame-23.png", sheet_frame(WALK_RUNTIME, 23)),
        ("side-current-frame-00.png", side_frames[0]),
        ("side-current-contact-06.png", side_frames[2]),
        ("side-current-recovery-21.png", side_frames[-1]),
    ):
        image.save(runtime_samples / label, optimize=True)

    manifest = {
        "schemaVersion": "seedance-player-effects-inputs-v1",
        "reviewOnly": True,
        "productionChanged": False,
        "plate": {"width": SIZE[0], "height": SIZE[1], "floorY": FLOOR_Y},
        "sources": [
            {"path": path.relative_to(ROOT).as_posix(), "sha256": sha256(path)}
            for path in required
        ],
        "outputs": [
            {"path": path.relative_to(ROOT).as_posix(), "sha256": sha256(path)}
            for path in outputs
        ],
        "motionAuthority": {
            "walk": {"frames": [0, 6, 12, 18, 23], "loopBoundary": [23, 0]},
            "sideDig": {"frames": [0, 3, 6, 12, 21], "contactFrame": 6},
            "soilImpact": {"firstEqualsLast": True},
            "effectPlate": {"firstEqualsLast": True, "rgb": [0, 0, 0]},
        },
        "constraints": [
            "fixed camera and crop",
            "fixed feet or tile anchor",
            "forward-only motion",
            "no ping-pong or reversed frames",
            "no optical-flow interpolation",
            "no identity, costume, equipment, or silhouette replacement",
        ],
    }
    (LAB / "input-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"references": len(outputs), "manifest": str((LAB / "input-manifest.json").relative_to(ROOT))}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
