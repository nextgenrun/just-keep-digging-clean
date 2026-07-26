from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[2]
PACKAGE = ROOT / "sprites" / "character" / "arc-core-review-v3"
SOURCE = PACKAGE / "source"
PISKEL = PACKAGE / "piskel"
RUNTIME = PACKAGE / "runtime"
PACK_PATH = ROOT / "values" / "arcCoreReview.sprite.json"
PISKEL_TOOLS = ROOT / "tools" / "piskel-mcp"
sys.path.insert(0, str(PISKEL_TOOLS))

from piskel_document import make_piskel, read_piskel  # noqa: E402


CANVAS = 512
VIEWPORT = (1280, 720)
BODY_AND_FX = [
    ("small.body", "small-arc-master-v3.png"),
    ("small.ring", "small-arc-gyro-ring-v2.png"),
    ("small.cloud", "small-arc-cloud-v2.png"),
    ("small.beam", "small-arc-twin-beam-v3.png"),
    ("small.impact", "small-arc-impact-v3.png"),
    ("omega.body", "omega-arc-master-v2.png"),
    ("omega.sigil", "omega-arc-lattice-sigil-v2.png"),
    ("omega.cloud", "omega-arc-cloud-v2.png"),
    ("omega.beam", "omega-arc-lattice-beam-v3.png"),
    ("omega.impact", "omega-arc-impact-v3.png"),
]
STAGE_TILES = [
    ("stage.dirt", "arc-stage-dirt-v3.png"),
    ("stage.stone", "arc-stage-stone-v3.png"),
    ("stage.floor", "arc-stage-floor-v3.png"),
    ("stage.bedrock", "arc-stage-bedrock-v3.png"),
]
SINGLE_FRAMES = [
    ("stage.background", "arc-stage-background-v3.png"),
    ("ui.hud", "arc-review-hud-v3.png"),
]


def digest(image: Image.Image) -> str:
    return hashlib.sha256(image.convert("RGBA").tobytes()).hexdigest()


def file_digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def alpha_bounds(image: Image.Image) -> list[int]:
    bounds = image.convert("RGBA").getchannel("A").getbbox()
    return list(bounds or (0, 0, 0, 0))


def center_existing(image: Image.Image) -> Image.Image:
    frame = image.convert("RGBA")
    if frame.size != (CANVAS, CANVAS):
        frame = ImageOps.contain(
            frame,
            (CANVAS, CANVAS),
            Image.Resampling.LANCZOS,
        )
        canvas = Image.new("RGBA", (CANVAS, CANVAS))
        canvas.alpha_composite(
            frame,
            ((CANVAS - frame.width) // 2, (CANVAS - frame.height) // 2),
        )
        frame = canvas
    bounds = frame.getchannel("A").getbbox()
    if not bounds:
        raise ValueError("Cannot align an empty image")
    center_x = (bounds[0] + bounds[2]) / 2
    center_y = (bounds[1] + bounds[3]) / 2
    offset = (round(CANVAS / 2 - center_x), round(CANVAS / 2 - center_y))
    aligned = Image.new("RGBA", (CANVAS, CANVAS))
    aligned.alpha_composite(frame, offset)
    return aligned


def normalize_effect(image: Image.Image, padding: int = 18) -> Image.Image:
    frame = image.convert("RGBA")
    bounds = frame.getchannel("A").getbbox()
    if not bounds:
        raise ValueError("Cannot normalize an empty effect")
    subject = frame.crop(bounds)
    subject = ImageOps.contain(
        subject,
        (CANVAS - padding * 2, CANVAS - padding * 2),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (CANVAS, CANVAS))
    canvas.alpha_composite(
        subject,
        ((CANVAS - subject.width) // 2, (CANVAS - subject.height) // 2),
    )
    return canvas


def normalize_tile(image: Image.Image) -> Image.Image:
    frame = image.convert("RGBA")
    bounds = frame.getchannel("A").getbbox()
    if not bounds:
        raise ValueError("Cannot normalize an empty tile")
    subject = frame.crop(bounds)
    square = ImageOps.pad(
        subject,
        (CANVAS, CANVAS),
        Image.Resampling.LANCZOS,
        color=(0, 0, 0, 0),
    )
    return square.convert("RGBA")


def split_quadrants(path: Path) -> list[Image.Image]:
    atlas = Image.open(path).convert("RGBA")
    half_w, half_h = atlas.width // 2, atlas.height // 2
    return [
        atlas.crop((0, 0, half_w, half_h)),
        atlas.crop((half_w, 0, atlas.width, half_h)),
        atlas.crop((0, half_h, half_w, atlas.height)),
        atlas.crop((half_w, half_h, atlas.width, atlas.height)),
    ]


def piskel_entry(project_id: str, size: tuple[int, int], count: int) -> dict:
    return {
        "id": project_id,
        "displayName": project_id.replace("-", " ").title(),
        "frameSize": list(size),
        "frameCount": count,
        "sheetColumns": min(count, 5),
        "fps": 12,
    }


def write_piskel(
    path: Path,
    project_id: str,
    frames: list[Image.Image],
    roles: list[str],
    force: bool,
) -> list[Image.Image]:
    if path.exists() and not force:
        raise FileExistsError(f"Refusing to overwrite {path}")
    frames = [
        Image.alpha_composite(Image.new("RGBA", frame.size), frame.convert("RGBA"))
        for frame in frames
    ]
    data = make_piskel(
        piskel_entry(project_id, frames[0].size, len(frames)),
        frames,
    )
    anchor = [frames[0].width // 2, frames[0].height // 2]
    data["jkdAlignment"] = {
        "policy": "fixed-canvas-zero-drift",
        "anchorPx": anchor,
        "origin": [0.5, 0.5],
        "driftTolerancePx": 0,
        "roles": [
            {
                "frameIndex": index,
                "role": role,
                "alphaBounds": alpha_bounds(frame),
                "pixelSha256": digest(frame),
            }
            for index, (role, frame) in enumerate(zip(roles, frames))
        ],
    }
    path.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
    roundtrip, width, height, _ = read_piskel(path)
    if (width, height) != frames[0].size or len(roundtrip) != len(frames):
        raise ValueError(f"Piskel round-trip shape mismatch: {path}")
    if [digest(frame) for frame in roundtrip] != [digest(frame) for frame in frames]:
        raise ValueError(f"Piskel round-trip pixel mismatch: {path}")
    return roundtrip


def save_runtime(
    frames: list[Image.Image],
    definitions: list[tuple[str, str]],
) -> list[dict]:
    files = []
    for frame, (role, filename) in zip(frames, definitions):
        output = RUNTIME / filename
        frame.save(output, "PNG", optimize=True)
        files.append({
            "type": "image",
            "key": f"arc-core-review-v3-{role.replace('.', '-')}",
            "url": filename,
            "role": role,
            "sha256": file_digest(output),
        })
    return files


def build_source_frames() -> tuple[list[Image.Image], list[Image.Image]]:
    v2 = ROOT / "sprites" / "character" / "arc-core-review-v2" / "runtime"
    existing = [
        center_existing(Image.open(v2 / filename))
        for filename in (
            "small-arc-master-v3.png",
            "small-arc-gyro-ring-v2.png",
            "small-arc-cloud-v2.png",
        )
    ]
    existing += [
        center_existing(Image.open(v2 / filename))
        for filename in (
            "omega-arc-master-v2.png",
            "omega-arc-lattice-sigil-v2.png",
            "omega-arc-cloud-v2.png",
        )
    ]
    effects = [
        normalize_effect(frame)
        for frame in split_quadrants(
            SOURCE / "2026-07-26-arc-dig-vfx-atlas-v3-alpha.png"
        )
    ]
    body_fx = existing[:3] + effects[:2] + existing[3:] + effects[2:]
    tiles = [
        normalize_tile(frame)
        for frame in split_quadrants(
            SOURCE / "2026-07-26-arc-stage-tile-atlas-v3-alpha.png"
        )
    ]
    return body_fx, tiles


def update_pack(files: list[dict], sources: list[str]) -> None:
    pack = json.loads(PACK_PATH.read_text(encoding="utf-8"))
    pack.pop("arcCoreReviewV2", None)
    pack["arcCoreReviewV3"] = {
        "path": "../../../sprites/character/arc-core-review-v3/runtime/",
        "files": files,
    }
    meta = pack["spriteMeta"]
    meta.update({
        "schemaVersion": 3,
        "packageId": "arc-core-review-v3",
        "pipeline": "piskel-roundtrip",
        "piskelSources": sources,
        "canvasSizePx": CANVAS,
        "anchorPx": [CANVAS // 2, CANVAS // 2],
        "stageRoles": {
            "background": "stage.background",
            "dirt": "stage.dirt",
            "stone": "stage.stone",
            "floor": "stage.floor",
            "bedrock": "stage.bedrock",
        },
        "hudRole": "ui.hud",
    })
    for mode_id, prefix in (
        ("arcCoreSmall", "small"),
        ("arcCoreOmega", "omega"),
    ):
        meta["modes"][mode_id]["beamRole"] = f"{prefix}.beam"
        meta["modes"][mode_id]["impactRole"] = f"{prefix}.impact"
    PACK_PATH.write_text(json.dumps(pack, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    PISKEL.mkdir(parents=True, exist_ok=True)
    RUNTIME.mkdir(parents=True, exist_ok=True)

    body_fx, tiles = build_source_frames()
    background = ImageOps.fit(
        Image.open(SOURCE / "2026-07-26-arc-stage-background-v3.png").convert("RGBA"),
        VIEWPORT,
        Image.Resampling.LANCZOS,
    )
    hud = Image.open(
        SOURCE / "2026-07-26-arc-review-hud-v3-alpha.png"
    ).convert("RGBA").resize(VIEWPORT, Image.Resampling.LANCZOS)

    projects = [
        ("arc-core-body-and-fx-v3.piskel", body_fx, BODY_AND_FX),
        ("arc-core-stage-tiles-v3.piskel", tiles, STAGE_TILES),
        ("arc-core-stage-background-v3.piskel", [background], [SINGLE_FRAMES[0]]),
        ("arc-core-review-hud-v3.piskel", [hud], [SINGLE_FRAMES[1]]),
    ]
    files: list[dict] = []
    sources: list[str] = []
    for filename, frames, definitions in projects:
        path = PISKEL / filename
        roles = [role for role, _ in definitions]
        roundtrip = write_piskel(path, path.stem, frames, roles, args.force)
        files.extend(save_runtime(roundtrip, definitions))
        sources.append(str(path.relative_to(ROOT)).replace("\\", "/"))
    update_pack(files, sources)
    print(f"Built {len(files)} zero-drift Arc assets through {len(projects)} Piskel projects")


if __name__ == "__main__":
    main()
