"""Build review-only in-game placement boards for the 10K visual library."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "visual-approval-previews/2026-07-29-high-impact-review-library-v1"
MANIFEST_PATH = PACKAGE / "manifest.json"
OUTPUT = PACKAGE / "mockups"
NOTICE = "REVIEW COMPOSITE — NOT WIRED"
FONT_REGULAR = Path("C:/Windows/Fonts/segoeui.ttf")
FONT_SEMIBOLD = Path("C:/Windows/Fonts/seguisb.ttf")


def font(size: int, semibold: bool = False) -> ImageFont.FreeTypeFont:
    candidate = FONT_SEMIBOLD if semibold else FONT_REGULAR
    return ImageFont.truetype(str(candidate), size) if candidate.exists() else ImageFont.load_default()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def placement(
    semantic: str,
    x: int,
    y: int,
    scale: float,
    profile: str = "p00-source",
    alpha: float = 1.0,
    blend: str = "normal",
    z: int = 1,
) -> dict:
    return {
        "semantic": semantic,
        "profile": profile,
        "x": x,
        "y": y,
        "scale": scale,
        "alpha": alpha,
        "blend": blend,
        "z": z,
    }


BOARD_SPECS = [
    {
        "id": "01-mining-contact-and-break",
        "title": "Mining contact, material read, and final break",
        "base": "testing/2026-07-29-imagegen-ground-damage-production-runtime.png",
        "consumer": "DigSystem / SpecialBlockEffectsManager / tile contact point",
        "risk": "Must remain tile-anchored and never conceal damage-stage readability.",
        "placements": [
            placement("dry-topsoil-pick-contact-burst", 520, 470, 0.48, "p07-compact-read", 0.92),
            placement("weathered-limestone-chip-burst", 690, 505, 0.46, "p04-highlight-safe", 0.90),
            placement("copper-ore-warm-spark-impact", 835, 442, 0.42, "p02-emphasized", 0.88, "additive", 2),
            placement("reinforced-stone-final-break-burst", 1000, 515, 0.58, "p08-broad-read", 0.92, "normal", 3),
        ],
    },
    {
        "id": "02-quickslash-and-thunder",
        "title": "Quickslash silhouette plus Thunder Strike hierarchy",
        "base": "visual-approval-previews/2026-07-26-comparison-quickslash-after-v1.png",
        "consumer": "Quickslash and ThunderStrike visual systems at player/contact/world layers",
        "risk": "Peak arcs must stay behind HUD and cannot erase the player silhouette.",
        "placements": [
            placement("quickslash-main-arc-f03", 805, 505, 0.88, "p02-emphasized", 0.92, "additive", 2),
            placement("quickslash-contact-f03", 1030, 555, 0.52, "p04-highlight-safe", 0.90, "additive", 3),
            placement("thunder-bolt-descent-f03", 1285, 330, 1.05, "p02-emphasized", 0.86, "additive", 1),
            placement("thunder-ground-slam-f03", 1275, 675, 0.78, "p08-broad-read", 0.92, "additive", 4),
        ],
    },
    {
        "id": "03-rain-and-weather-contact",
        "title": "Rain depth layers with ground and ceiling contact",
        "base": "visual-approval-previews/overground-texture-audit-v2-imagegen/03-live-runtime-resource-context-rain.png",
        "consumer": "WeatherParticleTextures / WeatherImpactRainController / occlusion contact samples",
        "risk": "Weather may only resolve on sampled surfaces and must not become screen-space noise.",
        "placements": [
            placement("foreground-rain-streak", 210, 275, 0.80, "p01-restrained", 0.58),
            placement("foreground-rain-streak", 580, 250, 0.82, "p05-cool-context", 0.58),
            placement("midground-rain-streak", 950, 290, 0.68, "p01-restrained", 0.48),
            placement("rain-ground-splash-f03", 380, 610, 0.34, "p04-highlight-safe", 0.82, "additive", 3),
            placement("rain-ground-splash-f03", 890, 620, 0.30, "p07-compact-read", 0.78, "additive", 3),
            placement("rain-ceiling-impact-f03", 690, 145, 0.32, "p04-highlight-safe", 0.74, "additive", 3),
        ],
    },
    {
        "id": "04-titan-deep-ambience",
        "title": "Titan discovery focus with restrained deep ambience",
        "base": "visual-approval-previews/titan-collection-mockups-v1/sources/2026-07-26-current-underground-reference.png",
        "consumer": "Titan chamber discovery layer / light companion layer / ambient pool",
        "risk": "Discovery focus must remain sparse; persistent glow cannot flatten chamber darkness.",
        "placements": [
            placement("titan-discovery-ring", 650, 420, 0.90, "p02-emphasized", 0.88, "additive", 2),
            placement("titan-resonance-glow", 650, 390, 0.66, "p05-cool-context", 0.80, "additive", 1),
            placement("titan-chamber-dust", 445, 390, 0.58, "p01-restrained", 0.44),
            placement("titan-chamber-dust", 850, 420, 0.54, "p03-shadow-safe", 0.40),
            placement("prism-flare", 650, 315, 0.34, "p04-highlight-safe", 0.74, "additive", 3),
        ],
    },
    {
        "id": "05-wurm-hazard-warning",
        "title": "Graveborer Wurm approach and dodge-readable warning",
        "base": "visual-approval-previews/earthquake-dodge-layering-v1/01-warning-footprint.png",
        "consumer": "GraveborerWurmVisualSystem warning, burrow path, and light companion layers",
        "risk": "The safe lateral/Flight route must stay visible without requiring a jump.",
        "placements": [
            placement("wurm-ground-warning", 610, 565, 0.88, "p08-broad-read", 0.90, "additive", 2),
            placement("wurm-warning-pulse-f03", 610, 535, 0.80, "p02-emphasized", 0.82, "additive", 3),
            placement("wurm-burrow-ridge", 805, 570, 0.66, "p06-warm-context", 0.76),
            placement("hazard-warning-light-loop-f03", 610, 500, 0.58, "p04-highlight-safe", 0.66, "additive", 1),
            placement("cave-in-warning-f03", 1015, 525, 0.52, "p07-compact-read", 0.76, "additive", 2),
        ],
    },
    {
        "id": "06-earthquake-impact",
        "title": "Earthquake rock lane, impact, and settle hierarchy",
        "base": "visual-approval-previews/earthquake-dodge-layering-v1/03-safe-impact.png",
        "consumer": "EarthquakeHazardOverlay falling-rock, impact, and rubble-settle phases",
        "risk": "Impact art must match the authoritative FallZone and preserve the safe corridor.",
        "placements": [
            placement("earthquake-ceiling-fracture-f03", 425, 145, 0.58, "p03-shadow-safe", 0.86),
            placement("earthquake-falling-rock-passage-f03", 450, 350, 0.64, "p02-emphasized", 0.90),
            placement("earthquake-rock-impact-f03", 455, 610, 0.70, "p08-broad-read", 0.94, "additive", 3),
            placement("earthquake-rubble-settle-f03", 690, 625, 0.54, "p01-restrained", 0.76),
            placement("rock-landing-marker-f03", 455, 570, 0.46, "p04-highlight-safe", 0.68, "additive", 1),
        ],
    },
    {
        "id": "07-modal-ui",
        "title": "ESC modal shell, cards, controls, and selection state",
        "base": "visual-approval-previews/star-pillar-talent-tree-esc-v1/2026-07-28-current-esc-shell-reference.png",
        "consumer": "UiModalShell / PhaserUiKit / approved art-backed modal controls",
        "risk": "Nine-slice boundaries, text-safe zones, focus state, and pointer hit areas require separate approval.",
        "placements": [
            placement("modal-shell", 640, 365, 2.40, "p03-shadow-safe", 0.88),
            placement("modal-header-cap", 640, 125, 0.96, "p04-highlight-safe", 0.95, "additive", 2),
            placement("content-card-normal", 445, 385, 0.82, "p01-restrained", 0.92, "normal", 3),
            placement("content-card-selected", 815, 385, 0.82, "p02-emphasized", 0.96, "additive", 4),
            placement("button-hover", 640, 625, 0.70, "p04-highlight-safe", 0.96, "normal", 5),
        ],
    },
    {
        "id": "08-hud-state-layer",
        "title": "HUD meters, cooldowns, depth, and critical feedback",
        "base": "visual-approval-previews/2026-07-26-aaa-ability-bar-review-v2.png",
        "consumer": "HUDSystem / XPProgressBar / ability cooldown state renderers",
        "risk": "HUD promotion needs native-scale legibility, overlap testing, and low-GP accessibility checks.",
        "placements": [
            placement("ui-gp-meter-state-s03", 260, 120, 0.66, "p02-emphasized", 0.96),
            placement("ui-xp-meter-state-s03", 835, 875, 0.74, "p01-restrained", 0.94),
            placement("ui-cooldown-ring-state-s03", 640, 800, 0.50, "p04-highlight-safe", 0.96, "additive", 3),
            placement("ui-cooldown-ring-state-s04", 835, 800, 0.50, "p05-cool-context", 0.96, "additive", 3),
            placement("ui-depth-plate-state-s03", 1440, 110, 0.58, "p03-shadow-safe", 0.94),
            placement("critical-gp-corners", 835, 470, 1.65, "p01-restrained", 0.40, "additive", 1),
        ],
    },
]


def load_candidate(manifest: dict, spec: dict) -> tuple[dict, dict]:
    sources = [item for item in manifest["sources"] if item["semanticName"] == spec["semantic"]]
    if len(sources) != 1:
        raise ValueError(f"Expected one source for {spec['semantic']}, found {len(sources)}")
    source = sources[0]
    if spec["profile"] == "p00-source":
        return source, source
    variants = [
        item for item in manifest["derivatives"]
        if item["sourceId"] == source["id"] and item["profileSlug"] == spec["profile"]
    ]
    if len(variants) != 1:
        raise ValueError(f"Expected one {spec['profile']} derivative for {source['id']}")
    return variants[0], source


def composite_candidate(canvas: Image.Image, asset: Image.Image, spec: dict) -> tuple[Image.Image, dict]:
    width = max(1, round(asset.width * spec["scale"]))
    height = max(1, round(asset.height * spec["scale"]))
    asset = asset.resize((width, height), Image.Resampling.LANCZOS)
    if spec["alpha"] < 1:
        alpha = asset.getchannel("A").point(lambda value: round(value * spec["alpha"]))
        asset.putalpha(alpha)
    left, top = round(spec["x"] - width / 2), round(spec["y"] - height / 2)
    layer = Image.new("RGBA", canvas.size)
    layer.alpha_composite(asset, (left, top))
    if spec["blend"] == "additive":
        bright = ImageChops.add(canvas.convert("RGB"), layer.convert("RGB"))
        canvas = Image.composite(bright, canvas.convert("RGB"), layer.getchannel("A")).convert("RGBA")
    else:
        canvas = Image.alpha_composite(canvas, layer)
    return canvas, {"left": left, "top": top, "width": width, "height": height}


def watermark(image: Image.Image) -> None:
    draw = ImageDraw.Draw(image, "RGBA")
    label_font = font(24, True)
    bounds = draw.textbbox((0, 0), NOTICE, font=label_font)
    width = bounds[2] - bounds[0] + 38
    draw.rounded_rectangle((image.width - width - 18, 16, image.width - 18, 62), 10, fill=(20, 10, 24, 220), outline=(255, 92, 226, 255), width=2)
    draw.text((image.width - width + 1, 25), NOTICE, font=label_font, fill=(255, 238, 255, 255))


def build_board(manifest: dict, spec: dict) -> tuple[Path, dict]:
    base_path = ROOT / spec["base"]
    base = Image.open(base_path).convert("RGBA")
    composite = base.copy()
    placements = []
    for index, item in enumerate(sorted(spec["placements"], key=lambda value: value["z"]), 1):
        candidate, source = load_candidate(manifest, item)
        asset_path = PACKAGE / candidate["path"]
        asset = Image.open(asset_path).convert("RGBA")
        composite, pixels = composite_candidate(composite, asset, item)
        placements.append({
            "placementId": f"{spec['id']}-p{index:02d}",
            "candidateId": candidate["id"],
            "sourceId": source["id"],
            "sourceMasterId": source["masterId"],
            "semanticName": source["semanticName"],
            "candidatePath": candidate["path"],
            "candidateSha256": candidate["sha256"],
            "sourceSha256": source["sha256"],
            "transform": {
                "anchor": {"x": 0.5, "y": 0.5},
                "x": item["x"], "y": item["y"],
                "scaleX": item["scale"], "scaleY": item["scale"],
                "rotationDegrees": 0, "alpha": item["alpha"],
            },
            "blend": item["blend"],
            "z": item["z"],
            "renderedPixels": pixels,
        })
    watermark(composite)
    header, footer, margin, gap = 82, 72, 24, 32
    board = Image.new("RGB", (base.width * 2 + margin * 2 + gap, base.height + header + footer), "#0a0b13")
    draw = ImageDraw.Draw(board)
    draw.text((margin, 15), spec["title"], font=font(29, True), fill="#f6efff")
    draw.text((margin, 52), "CURRENT VERIFIED CAPTURE", font=font(18, True), fill="#9dc8d8")
    draw.text((margin + base.width + gap, 52), NOTICE, font=font(18, True), fill="#ff74e6")
    board.paste(base.convert("RGB"), (margin, header))
    board.paste(composite.convert("RGB"), (margin + base.width + gap, header))


    ids = ", ".join(dict.fromkeys(item["sourceId"].split("-")[0] for item in placements))
    draw.text((margin, header + base.height + 12), f"Offline placement study • Candidate sources: {ids}", font=font(16), fill="#dbd4e5")
    draw.text((margin, header + base.height + 38), spec["risk"], font=font(15), fill="#afabb9")
    output_path = OUTPUT / f"{spec['id']}.png"
    board.save(output_path, optimize=True)
    saved = Image.open(output_path).convert("RGB")
    left_crop = saved.crop((margin, header, margin + base.width, header + base.height))
    left_exact = ImageChops.difference(left_crop, base.convert("RGB")).getbbox() is None
    if not left_exact:
        raise RuntimeError(f"Left panel differs from source capture: {spec['id']}")
    return output_path, {
        "id": spec["id"],
        "title": spec["title"],
        "status": "review-only-not-wired",
        "compositeType": "offline-placement-study",
        "baseCapture": {"path": spec["base"], "sha256": sha256(base_path), "verifiedExistingCapture": True},
        "viewport": {"width": base.width, "height": base.height},
        "leftPanelExactPixelCopy": left_exact,
        "plannedConsumer": spec["consumer"],
        "implementationRisk": spec["risk"],
        "placements": placements,
        "output": {"path": relative(output_path), "sha256": sha256(output_path), "width": board.width, "height": board.height},
    }


def contact_sheet(board_records: list[dict]) -> Path:
    columns, cell_w, cell_h, header = 2, 650, 260, 92
    rows = (len(board_records) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * cell_w + 36, header + rows * cell_h + 24), "#080912")
    draw = ImageDraw.Draw(sheet)
    draw.text((24, 12), "10K VISUAL LIBRARY — ACTUAL GAME CONTEXT MAP", font=font(30, True), fill="#f5f0ff")
    draw.text((24, 54), NOTICE, font=font(22, True), fill="#ff69df")
    for index, record in enumerate(board_records):
        board = Image.open(ROOT / record["output"]["path"]).convert("RGB")
        board.thumbnail((612, 202), Image.Resampling.LANCZOS)
        column, row = index % columns, index // columns
        x, y = 18 + column * cell_w, header + row * cell_h
        draw.text((x, y), f"{index + 1:02d}  {record['title']}", font=font(16, True), fill="#e8e1f1")
        sheet.paste(board, (x, y + 30))
        draw.rectangle((x - 1, y + 29, x + board.width, y + 30 + board.height), outline="#654b72", width=2)
    path = OUTPUT / "00-implementation-map.png"
    sheet.save(path, optimize=True)
    return path


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    board_records = []
    for spec in BOARD_SPECS:
        path, record = build_board(manifest, spec)
        board_records.append(record)
        print(f"built {relative(path)}")
    map_path = contact_sheet(board_records)
    mockup_manifest = {
        "schemaVersion": 1,
        "libraryId": manifest["libraryId"],
        "createdAtUtc": datetime.now(timezone.utc).isoformat(),
        "status": "review-only-not-wired",
        "notice": NOTICE,
        "runtimeChanged": False,
        "mainManifestIntentionallyUnchanged": True,
        "reasonMainManifestUnchanged": "Preserves the sealed 10K build manifest; mockups have independent review provenance.",
        "method": "Existing verified screenshots are copied pixel-exact on the left; candidate assets are composited offline on the right.",
        "counts": {
            "boards": len(board_records),
            "placements": sum(len(item["placements"]) for item in board_records),
            "contactSheets": 1,
        },
        "boards": board_records,
        "implementationMap": {
            "path": relative(map_path),
            "sha256": sha256(map_path),
            "width": Image.open(map_path).width,
            "height": Image.open(map_path).height,
        },
    }
    output_manifest = OUTPUT / "mockup-manifest.json"
    output_manifest.write_text(json.dumps(mockup_manifest, indent=2) + "\n", encoding="utf-8")
    print(f"built {relative(map_path)}")
    print(f"built {relative(output_manifest)}")
    print(json.dumps(mockup_manifest["counts"], indent=2))


if __name__ == "__main__":
    main()
