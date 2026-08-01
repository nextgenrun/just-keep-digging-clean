"""Build 1,000 high-resolution solid interactable state sprites.

The library is intentionally review-only and collision-free with the companion
FX/UI library being generated in another Codex task.  It contains tangible
world objects only: 10 biomes x 10 object families x 10 physical states.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Iterator

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
REVIEW_DIR = (
    ROOT / "visual-approval-previews" / "interactive-world-states-v1"
)
RUNTIME_DIR = ROOT / "sprites" / "environment" / "interactive-world-states-v1"
PROMPT_MANIFEST_PATH = (
    REVIEW_DIR / "2026-07-29-interactive-world-states-prompts-v1.json"
)
LIBRARY_MANIFEST_PATH = (
    REVIEW_DIR / "2026-07-29-interactive-world-states-manifest-v1.json"
)
CHROMA_HELPER = Path(
    "C:/Users/Mila/.codex/skills/.system/imagegen/scripts/remove_chroma_key.py"
)

GRID = (5, 2)
FRAME_SIZE = (448, 448)
SAFE_CONTENT_SIZE = (424, 424)
STATE_IDS = (
    "dormant",
    "proximity-ready",
    "activation-01",
    "activation-02",
    "activation-03",
    "active-loop-a",
    "active-loop-b",
    "resolved-success",
    "depleted-spent",
    "damaged-broken",
)

FAMILY_SPECS = (
    {
        "id": "cache",
        "label": "Treasure Cache",
        "role": "large treasure cache or expedition strongbox",
        "scaleClass": "major-multi-tile",
        "widthTiles": [5, 8],
        "heightTiles": [3, 5],
        "states": (
            "dormant and securely closed",
            "proximity-ready with its physical lock or latch raised, no aura",
            "first activation pose with outer clasps loosening",
            "second activation pose with the lid cracked open",
            "third activation pose with the lid half-open",
            "active mechanical pose A with the lid open and inner fittings visible",
            "active mechanical pose B with an alternate inner mechanism position",
            "resolved and fully open with an empty fitted interior",
            "depleted or spent, closed crooked with its lock removed",
            "damaged and broken with split housing and snapped bands",
        ),
    },
    {
        "id": "transit-aperture",
        "label": "Transit Aperture",
        "role": "large freestanding transport aperture or portal frame",
        "scaleClass": "hero-multi-tile",
        "widthTiles": [6, 10],
        "heightTiles": [7, 12],
        "states": (
            "dormant with the central opening physically sealed",
            "proximity-ready with latches raised, no aura",
            "first activation pose with the physical iris beginning to separate",
            "second activation pose with the opening widening",
            "third activation pose with the empty aperture fully assembled",
            "active mechanical alignment A around an empty center",
            "active mechanical alignment B around an empty center",
            "resolved open frame with physical confirmation tabs extended",
            "depleted or spent with the opening physically obstructed",
            "damaged and broken with a cracked incomplete frame",
        ),
    },
    {
        "id": "depth-gate",
        "label": "Depth Gate",
        "role": "large tunnel security gate, vault door, or depth bulkhead",
        "scaleClass": "hero-multi-tile",
        "widthTiles": [7, 12],
        "heightTiles": [6, 10],
        "states": (
            "dormant, sealed, and fully blocking the passage",
            "proximity-ready with the physical key mechanism exposed",
            "first activation pose with locking bars retracting",
            "second activation pose with the door or shutter cracked open",
            "third activation pose with the passage mostly open",
            "active mechanical pose A in the open mechanism",
            "active mechanical pose B in the open mechanism",
            "resolved with the barrier fully retracted from a clear opening",
            "depleted or spent and visibly jammed in a safe partial pose",
            "damaged and broken with bent bars and fractured housing",
        ),
    },
    {
        "id": "extraction-rig",
        "label": "Extraction Rig",
        "role": "ore, crystal, sap, coolant, or resource extraction station",
        "scaleClass": "major-multi-tile",
        "widthTiles": [6, 10],
        "heightTiles": [5, 9],
        "states": (
            "dormant with all tools and intake parts retracted",
            "proximity-ready with the input cradle mechanically extended",
            "first activation pose with clamps closing",
            "second activation pose with drill, siphon, or collector extending",
            "third activation pose with the collection vessel engaged",
            "active mechanism pose A during extraction",
            "active mechanism pose B during extraction",
            "resolved with its physical collection vessel visibly full",
            "depleted or spent with the intake dry and vessel removed",
            "damaged and broken with snapped tools and ruptured housing",
        ),
    },
    {
        "id": "memory-reliquary",
        "label": "Memory Reliquary",
        "role": "solid lore archive, discovery shrine, or memory reliquary",
        "scaleClass": "major-multi-tile",
        "widthTiles": [4, 8],
        "heightTiles": [5, 9],
        "states": (
            "dormant and physically sealed",
            "proximity-ready with its outer latch or cover lifted",
            "first activation pose with outer leaves opening",
            "second activation pose with the inner archive emerging",
            "third activation pose with the archive fully presented",
            "active reading pose A with a physical tablet, relief, or record",
            "active reading pose B with an alternate physical presentation",
            "resolved with the record secured in a clearly completed position",
            "depleted or spent with the record slot visibly empty",
            "damaged and broken with fractured archive pieces",
        ),
    },
    {
        "id": "repair-station",
        "label": "Repair Station",
        "role": "solid repair, calibration, or upgrade workstation",
        "scaleClass": "major-multi-tile",
        "widthTiles": [6, 10],
        "heightTiles": [4, 8],
        "states": (
            "dormant with work arms and tools folded",
            "proximity-ready with the tool rack mechanically raised",
            "first activation pose with one work arm extending",
            "second activation pose with the repair cradle unlocking",
            "third activation pose fully arranged for work",
            "active work pose A with tools in one position",
            "active work pose B with tools in a second position",
            "resolved with clamps open and a physical completion marker",
            "depleted or spent with consumable trays empty",
            "damaged and broken with bent arms and scattered fixed parts",
        ),
    },
    {
        "id": "refining-machine",
        "label": "Refining Machine",
        "role": "solid refinery, separator, distiller, or conversion machine",
        "scaleClass": "hero-multi-tile",
        "widthTiles": [7, 12],
        "heightTiles": [5, 10],
        "states": (
            "dormant with hopper, chamber, and output closed",
            "proximity-ready with the input hopper mechanically open",
            "first activation pose with valves or gears engaged",
            "second activation pose with the processing chamber closed",
            "third activation pose with the output assembly extending",
            "active processing pose A with mechanisms in one alignment",
            "active processing pose B with mechanisms in another alignment",
            "resolved with a clean finished output in its physical tray",
            "depleted or spent with residue and empty input fittings",
            "damaged and broken with a ruptured chamber and bent mechanisms",
        ),
    },
    {
        "id": "checkpoint-beacon",
        "label": "Checkpoint Beacon",
        "role": "solid checkpoint, route beacon, waystone, or survey marker",
        "scaleClass": "major-multi-tile",
        "widthTiles": [3, 6],
        "heightTiles": [6, 11],
        "states": (
            "dormant with mast or marker physically collapsed",
            "proximity-ready with its base collar unlocked",
            "first activation pose with the mast beginning to rise",
            "second activation pose with lenses or marker fins deploying",
            "third activation pose fully erected",
            "active mechanical orientation A",
            "active mechanical orientation B",
            "resolved with a physical route-confirmation tab or pennant",
            "depleted or spent with the mast safely lowered and fittings empty",
            "damaged and broken with a snapped mast and fractured base",
        ),
    },
    {
        "id": "freight-lift",
        "label": "Freight Lift",
        "role": "solid freight elevator, basket lift, winch, or transport machinery",
        "scaleClass": "hero-multi-tile",
        "widthTiles": [8, 14],
        "heightTiles": [7, 12],
        "states": (
            "dormant and parked with cage or platform latched",
            "proximity-ready with the control linkage mechanically exposed",
            "first activation pose with the cage latch releasing",
            "second activation pose with pulleys and platform beginning to move",
            "third activation pose at mid-travel",
            "active travel pose A with one pulley alignment",
            "active travel pose B with a second pulley alignment",
            "resolved and securely docked at the destination stop",
            "depleted or spent and visibly stalled in a safe position",
            "damaged and broken with snapped cable, bent cage, and split winch",
        ),
    },
    {
        "id": "choice-apparatus",
        "label": "Choice Apparatus",
        "role": "solid gamble, choice, offering, or route-selection apparatus",
        "scaleClass": "major-multi-tile",
        "widthTiles": [4, 8],
        "heightTiles": [5, 9],
        "states": (
            "dormant with all selectors and offering slots sealed",
            "proximity-ready with two or three physical selectors emerging",
            "first activation pose with the selector mechanism turning",
            "second activation pose with offering slots beginning to open",
            "third activation pose with all physical choices presented",
            "active mechanism pose A with one neutral alignment",
            "active mechanism pose B with another neutral alignment",
            "resolved with exactly one physical chute, socket, or route committed",
            "depleted or spent with all selectors withdrawn and slots empty",
            "damaged and broken with cracked selectors and split housing",
        ),
    },
)

BIOME_SPECS = (
    {
        "id": "weathered-roots",
        "name": "Weathered Roots",
        "keyColor": "#FF00FF",
        "visualLanguage": (
            "dark damp oak, intertwined ancient roots, wet umber stone, "
            "oxidized bronze, amber seed-glass, moss, and pale shelf fungi"
        ),
        "objects": (
            "Rootbound Expedition Cache",
            "Ancient Knot Transit Arch",
            "Living Timber Depth Gate",
            "Amber Sap Extraction Press",
            "Elder-Ring Memory Reliquary",
            "Fungal Field Repair Bench",
            "Resin Distillation Still",
            "Seedglass Trail Waystone",
            "Rootshaft Basket Lift",
            "Mycelial Choice Altar",
        ),
    },
    {
        "id": "blue-caverns",
        "name": "Blue Caverns",
        "keyColor": "#FF00FF",
        "visualLanguage": (
            "wet cobalt limestone, translucent ice and blue crystal, dark "
            "iron, silver chains, cyan tideglass, and pale mineral deposits"
        ),
        "objects": (
            "Drowned Observatory Coffer",
            "Cobalt Tideglass Aperture",
            "Frozen Chain Floodgate",
            "Caustic Crystal Siphon",
            "Leviathan Echo Reliquary",
            "Iceglass Tuning Bench",
            "Brine Prism Separator",
            "Aurora Sonar Beacon",
            "Flooded Cage Elevator",
            "Moonpool Choice Engine",
        ),
    },
    {
        "id": "amber-depths",
        "name": "Amber Depths",
        "keyColor": "#FF00FF",
        "visualLanguage": (
            "honeyglass resin, fossil ivory, gilded brass, ochre sandstone, "
            "warm amber crystal, preserved insect motifs, and dark leather"
        ),
        "objects": (
            "Honeyglass Fossil Cache",
            "Clockwork Iris Transit Ring",
            "Resin Vault Gate",
            "Amber Vein Tapping Rig",
            "Gilded Insect Archive",
            "Fossilwright Repair Dais",
            "Resin Fractionator",
            "Sunstone Route Marker",
            "Counterweight Archive Lift",
            "Scarab Choice Cabinet",
        ),
    },
    {
        "id": "silver-core",
        "name": "Silver Core",
        "keyColor": "#FF00FF",
        "visualLanguage": (
            "mirror-silver crystal, mercury glass, lunar gears, graphite "
            "stone, brushed nickel, pale blue-white mineral light, and black rubber"
        ),
        "objects": (
            "Mercury-Sealed Mint Chest",
            "Lunar Gear Transit Aperture",
            "Mirrored Organ Security Gate",
            "Magnetic Crystal Extractor",
            "Eclipsed Memory Reliquary",
            "Mirrorforge Calibration Bench",
            "Quicksilver Purifier",
            "Polarity Wayfinder",
            "Suspended Ore Elevator",
            "Reflecting Choice Automaton",
        ),
    },
    {
        "id": "core-magma",
        "name": "Core Magma",
        "keyColor": "#FF00FF",
        "visualLanguage": (
            "layered basalt, black obsidian, forged iron, ceramic heat "
            "shields, ember-orange glass, lava-red seams, and pale ash"
        ),
        "objects": (
            "Basalt Ember Strongbox",
            "Furnace Sun Transit Arch",
            "Obsidian Blast Door",
            "Lava Wheel Tapping Station",
            "Cinder Oath Reliquary",
            "Heatshield Repair Forge",
            "Magma Crucible Refiner",
            "Ember Pressure Beacon",
            "Chain Bucket Lift",
            "Volcanic Wager Engine",
        ),
    },
    {
        "id": "slagworks",
        "name": "Slagworks",
        "keyColor": "#FF00FF",
        "visualLanguage": (
            "soot-black iron, riveted copper, broken rail steel, scorched "
            "brick, chain and hose assemblies, molten orange residue, and grease"
        ),
        "objects": (
            "Riveted Salvage Locker",
            "Rotary Drum Transit Frame",
            "Crane-Yard Security Shutter",
            "Molten Runoff Skimmer",
            "Foreman Record Reliquary",
            "Chainhose Maintenance Bench",
            "Slag Separation Tumbler",
            "Pressure Gauge Checkpoint",
            "Broken-Rail Freight Lift",
            "Industrial Choice Dispenser",
        ),
    },
    {
        "id": "obsidian-catacombs",
        "name": "Obsidian Catacombs",
        "keyColor": "#00FF00",
        "visualLanguage": (
            "blackglass, carved ash stone, tarnished silver, deep violet "
            "crystal, funerary chains, bone-white inlays, and smoky quartz"
        ),
        "objects": (
            "Blackglass Funerary Coffer",
            "Memory Iris Passage Arch",
            "Reliquary Chain Crypt Gate",
            "Violet Shard Extractor",
            "Ancestral Echo Reliquary",
            "Glassbone Mending Table",
            "Ash-Memory Distiller",
            "Eclipse Grave Waystone",
            "Sarcophagus Platform Lift",
            "Oracle Urn Apparatus",
        ),
    },
    {
        "id": "pressure-foundry",
        "name": "Pressure Foundry",
        "keyColor": "#FF00FF",
        "visualLanguage": (
            "industrial blue steel, brass valves, red oxide, thick pipes, "
            "coolant glass, white condensate residue, gauges, and dark gaskets"
        ),
        "objects": (
            "Condenser Tool Vault",
            "Valve Iris Transit Aperture",
            "Piston Pressure Bulkhead",
            "Coolant Recovery Pump",
            "Turbine Record Reliquary",
            "Gasket Repair Station",
            "Steam Condensate Separator",
            "Indicator Tower Checkpoint",
            "Hydraulic Cage Elevator",
            "Boiler Logic Selector",
        ),
    },
    {
        "id": "blackglass-abyss",
        "name": "Blackglass Abyss",
        "keyColor": "#00FF00",
        "visualLanguage": (
            "black prismatic glass, dark star-metal, spectral cyan and "
            "violet crystal, fractured mirror planes, pale gold fittings, and void-black stone"
        ),
        "objects": (
            "Prismatic Void Cache",
            "Infinite Mirror Transit Arch",
            "Eclipse Seal Gate",
            "Spectral Fracture Harvester",
            "Star-Map Memory Reliquary",
            "Prism Alignment Workstation",
            "Refraction Separator",
            "Fractured Planet Beacon",
            "Mirror Bridge Freight Lift",
            "Paradox Choice Prism",
        ),
    },
    {
        "id": "starfire-rift",
        "name": "Starfire Rift",
        "keyColor": "#00FF00",
        "visualLanguage": (
            "deep indigo star-metal, iridescent nebula crystal, pale gold "
            "orbital rings, cyan and rose starfire glass, meteor stone, and fine celestial mechanisms"
        ),
        "objects": (
            "Comet-Metal Expedition Vault",
            "Cosmic Iris Transit Ring",
            "Orbital Seal Gate",
            "Nebula Crystal Collector",
            "Binary Star Reliquary",
            "Celestial Repair Array",
            "Starfire Conversion Crucible",
            "Aurora Navigation Beacon",
            "Orbital Chain Lift",
            "Fate Constellation Engine",
        ),
    },
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def slug_label(value: str) -> str:
    return value.replace("-", " ").title()


def iter_designs() -> Iterator[dict[str, object]]:
    for biome in BIOME_SPECS:
        objects = biome["objects"]
        if len(objects) != len(FAMILY_SPECS):
            raise RuntimeError(f"{biome['id']}: expected 10 object names")
        for family, object_name in zip(FAMILY_SPECS, objects):
            asset_id = f"{biome['id']}-{family['id']}"
            yield {
                "assetId": asset_id,
                "biomeId": biome["id"],
                "biomeName": biome["name"],
                "familyId": family["id"],
                "familyLabel": family["label"],
                "objectName": object_name,
                "role": family["role"],
                "scaleClass": family["scaleClass"],
                "widthTiles": family["widthTiles"],
                "heightTiles": family["heightTiles"],
                "visualLanguage": biome["visualLanguage"],
                "keyColor": biome["keyColor"],
                "statePrompts": family["states"],
                "sourceFile": (
                    f"{asset_id}-chroma-master-v1.webp"
                ),
                "runtimeFile": (
                    f"{asset_id}-states-atlas-v1.webp"
                ),
            }


def build_prompt(design: dict[str, object]) -> str:
    states = design["statePrompts"]
    row_one = ", ".join(
        f"({index + 1}) {states[index]}" for index in range(5)
    )
    row_two = ", ".join(
        f"({index + 1}) {states[index]}" for index in range(5, 10)
    )
    key_name = (
        "magenta" if design["keyColor"].upper() == "#FF00FF" else "green"
    )
    return (
        "Create one high-resolution professional 2D Phaser game sprite-state "
        f"atlas for the underground biome {str(design['biomeName']).upper()}. "
        f"Subject: {str(design['objectName']).upper()}, {design['role']}. "
        "This is a SOLID TANGIBLE PHYSICAL WORLD OBJECT, not an effect, not "
        "scenery, not a background, not UI. Build it from this exact biome "
        f"visual language: {design['visualLanguage']}. Orthographic 3/4 side "
        "view suitable for a polished 2D digging action game; strong readable "
        "silhouette, painterly-realistic fantasy materials, crisp hand-painted "
        "detail, consistent camera, footprint, ground anchor, scale, and "
        "lighting across every state. No character, text, numbers, labels, "
        "logos, letter-like symbols, or floor tile.\n\n"
        "Lay out exactly TEN isolated full-object sprites in a strict 5 "
        "columns by 2 rows grid, left-to-right. Row 1 states: "
        f"{row_one}. Row 2 states: {row_two}. Each cell contains exactly one "
        "complete object, centered, same footprint and ground anchor, with no "
        "cropping. Separate every cell with wide clean gutters. Use a flat "
        f"uniform pure chroma {key_name} {design['keyColor']} background only, "
        "with no gradient, floor, border, label, caption, or cast shadow "
        f"extending into gutters. Do not use that chroma {key_name} anywhere "
        "on the object. Keep openings genuinely empty and filled only by the "
        "chroma background. The object should read as a "
        f"{design['scaleClass']} prop spanning about "
        f"{design['widthTiles'][0]}-{design['widthTiles'][1]} game tiles wide "
        f"and {design['heightTiles'][0]}-{design['heightTiles'][1]} tiles tall "
        f"when composited over {design['biomeName']} cave backgrounds. "
        "No particles, free-floating glow, aura, energy surface, beams, "
        "smoke, sparks, weather, hazard effects, decals, HUD, interface "
        "panels, actors, loose scenery, or decorative scene elements."
    )


def prompt_records() -> list[dict[str, object]]:
    records = []
    for index, design in enumerate(iter_designs()):
        record = dict(design)
        record["index"] = index
        record["prompt"] = build_prompt(design)
        records.append(record)
    if len(records) != 100:
        raise RuntimeError("Expected exactly 100 state-sheet designs")
    if len({record["assetId"] for record in records}) != 100:
        raise RuntimeError("State-sheet asset IDs must be unique")
    return records


def write_prompt_manifest(records: list[dict[str, object]]) -> None:
    REVIEW_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "version": 1,
        "date": "2026-07-29",
        "mode": "built-in ImageGen solid interactable state sheets",
        "reviewOnly": True,
        "runtimeWired": False,
        "collisionBoundary": {
            "included": [
                "solid tangible in-world interactables",
                "large multi-tile physical object states",
                "biome-matched machinery and architecture",
            ],
            "excluded": [
                "particles and VFX",
                "mining and ability effects",
                "weather and hazards",
                "ambience and lighting-only companions",
                "UI and HUD",
                "characters and NPCs",
                "generic background overlays",
                "generic foreground textures and loose scenery props",
            ],
        },
        "formula": {
            "biomes": 10,
            "familiesPerBiome": 10,
            "statesPerFamily": 10,
            "totalAssets": 1000,
            "sourceSheets": 100,
        },
        "grid": list(GRID),
        "stateIds": list(STATE_IDS),
        "records": records,
    }
    PROMPT_MANIFEST_PATH.write_text(
        json.dumps(payload, indent=2) + "\n",
        encoding="utf-8",
    )


def source_path(design: dict[str, object]) -> Path:
    return REVIEW_DIR / str(design["sourceFile"])


def runtime_path(design: dict[str, object]) -> Path:
    return RUNTIME_DIR / str(design["runtimeFile"])


def ingest_source(raw_source: Path, asset_id: str) -> dict[str, object]:
    designs = {design["assetId"]: design for design in iter_designs()}
    design = designs.get(asset_id)
    if not design:
        raise RuntimeError(f"Unknown asset ID: {asset_id}")
    if not raw_source.is_file():
        raise RuntimeError(f"Generated ImageGen source not found: {raw_source}")
    REVIEW_DIR.mkdir(parents=True, exist_ok=True)
    destination = source_path(design)
    with Image.open(raw_source) as image:
        rgb = image.convert("RGB")
        width, height = rgb.size
        if width < 1400 or height < 800:
            raise RuntimeError(
                f"{raw_source.name}: source {rgb.size} is below high-resolution floor"
            )
        ratio = width / max(1, height)
        if not 1.45 <= ratio <= 2.2:
            raise RuntimeError(
                f"{raw_source.name}: unexpected 5x2 sheet aspect ratio {ratio:.3f}"
            )
        rgb.save(destination, "WEBP", quality=96, method=6)
    return {
        "assetId": asset_id,
        "source": destination.relative_to(ROOT).as_posix(),
        "size": [width, height],
        "sha256": sha256(destination),
        "bytes": destination.stat().st_size,
    }


def cell_bounds(
    width: int,
    height: int,
    column: int,
    row: int,
) -> tuple[int, int, int, int]:
    left = round(column * width / GRID[0])
    right = round((column + 1) * width / GRID[0])
    top = round(row * height / GRID[1])
    bottom = round((row + 1) * height / GRID[1])
    return left, top, right, bottom


def normalize_frame(
    cell: Image.Image,
    asset_id: str,
    state_index: int,
) -> tuple[Image.Image, dict[str, object]]:
    alpha = cell.getchannel("A")
    bounds = alpha.point(lambda value: 255 if value >= 10 else 0).getbbox()
    if not bounds:
        raise RuntimeError(
            f"{asset_id} state {state_index}: no isolated solid object"
        )
    isolated = cell.crop(bounds)
    scale = min(
        SAFE_CONTENT_SIZE[0] / isolated.width,
        SAFE_CONTENT_SIZE[1] / isolated.height,
        1.25,
    )
    if abs(scale - 1.0) > 0.001:
        isolated = isolated.resize(
            (
                max(1, round(isolated.width * scale)),
                max(1, round(isolated.height * scale)),
            ),
            Image.Resampling.LANCZOS,
        )
    frame = Image.new("RGBA", FRAME_SIZE, (0, 0, 0, 0))
    left = (FRAME_SIZE[0] - isolated.width) // 2
    top = FRAME_SIZE[1] - 12 - isolated.height
    frame.alpha_composite(isolated, (left, top))
    pixels = frame.load()
    for y in range(frame.height):
        for x in range(frame.width):
            red, green, blue, value = pixels[x, y]
            if value < 3:
                pixels[x, y] = (0, 0, 0, 0)
    alpha = frame.getchannel("A")
    opaque = sum(alpha.histogram()[12:])
    coverage = opaque / (FRAME_SIZE[0] * FRAME_SIZE[1])
    if not 0.035 <= coverage <= 0.84:
        raise RuntimeError(
            f"{asset_id} state {state_index}: suspicious alpha coverage "
            f"{coverage:.4f}"
        )
    corners = (
        (0, 0),
        (FRAME_SIZE[0] - 1, 0),
        (0, FRAME_SIZE[1] - 1),
        (FRAME_SIZE[0] - 1, FRAME_SIZE[1] - 1),
    )
    if any(alpha.getpixel(point) > 0 for point in corners):
        raise RuntimeError(f"{asset_id} state {state_index}: opaque corner")
    return frame, {
        "sourceCropBounds": list(bounds),
        "normalizedObjectSize": list(isolated.size),
        "alphaCoverage": round(coverage, 6),
        "rgbaSha256": hashlib.sha256(frame.tobytes()).hexdigest(),
    }


def chroma_to_alpha(source: Path, destination: Path) -> None:
    if not CHROMA_HELPER.is_file():
        raise RuntimeError(f"Missing ImageGen chroma helper: {CHROMA_HELPER}")
    command = [
        sys.executable,
        str(CHROMA_HELPER),
        "--input",
        str(source),
        "--out",
        str(destination),
        "--auto-key",
        "border",
        "--soft-matte",
        "--transparent-threshold",
        "14",
        "--opaque-threshold",
        "92",
        "--despill",
        "--edge-contract",
        "1",
        "--edge-feather",
        "1",
        "--force",
    ]
    completed = subprocess.run(
        command,
        check=False,
        capture_output=True,
        text=True,
    )
    if completed.returncode != 0:
        raise RuntimeError(
            f"Chroma removal failed for {source.name}:\n"
            f"{completed.stdout}\n{completed.stderr}"
        )


def build_atlas(
    design: dict[str, object],
    temporary_dir: Path,
) -> tuple[dict[str, object], list[dict[str, object]]]:
    source = source_path(design)
    if not source.is_file():
        raise RuntimeError(f"Missing ImageGen source: {source}")
    alpha_path = temporary_dir / f"{design['assetId']}-alpha.png"
    chroma_to_alpha(source, alpha_path)
    with Image.open(alpha_path) as opened:
        alpha_master = opened.convert("RGBA")
    width, height = alpha_master.size
    atlas = Image.new(
        "RGBA",
        (FRAME_SIZE[0] * GRID[0], FRAME_SIZE[1] * GRID[1]),
        (0, 0, 0, 0),
    )
    entries = []
    for state_index, state_id in enumerate(STATE_IDS):
        column = state_index % GRID[0]
        row = state_index // GRID[0]
        cell = alpha_master.crop(
            cell_bounds(width, height, column, row)
        )
        frame, metrics = normalize_frame(
            cell,
            str(design["assetId"]),
            state_index,
        )
        atlas.alpha_composite(
            frame,
            (column * FRAME_SIZE[0], row * FRAME_SIZE[1]),
        )
        entries.append({
            "id": f"{design['assetId']}-{state_id}",
            "biomeId": design["biomeId"],
            "familyId": design["familyId"],
            "objectName": design["objectName"],
            "stateId": state_id,
            "stateIndex": state_index,
            "scaleClass": design["scaleClass"],
            "widthTiles": design["widthTiles"],
            "heightTiles": design["heightTiles"],
            "crop": [
                column * FRAME_SIZE[0],
                row * FRAME_SIZE[1],
                *FRAME_SIZE,
            ],
            **metrics,
        })
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    destination = runtime_path(design)
    atlas.save(
        destination,
        "WEBP",
        quality=92,
        method=6,
        exact=True,
    )
    alpha_master.close()
    return {
        "assetId": design["assetId"],
        "biomeId": design["biomeId"],
        "familyId": design["familyId"],
        "objectName": design["objectName"],
        "source": source.relative_to(ROOT).as_posix(),
        "runtime": destination.relative_to(ROOT).as_posix(),
        "sourceSize": [width, height],
        "sourceSha256": sha256(source),
        "runtimeSha256": sha256(destination),
        "runtimeBytes": destination.stat().st_size,
        "frameCount": len(STATE_IDS),
    }, entries


def checkerboard(size: tuple[int, int], cell: int = 18) -> Image.Image:
    image = Image.new("RGB", size, (34, 39, 48))
    draw = ImageDraw.Draw(image)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle(
                    (x, y, x + cell - 1, y + cell - 1),
                    fill=(51, 58, 70),
                )
    return image


def build_biome_contact_sheet(
    biome: dict[str, object],
    atlases: list[dict[str, object]],
) -> Path:
    biome_atlases = [
        atlas for atlas in atlases if atlas["biomeId"] == biome["id"]
    ]
    columns = 2
    rows = math.ceil(len(biome_atlases) / columns)
    thumb_size = (960, 384)
    cell_size = (990, 430)
    sheet = Image.new(
        "RGB",
        (columns * cell_size[0], rows * cell_size[1] + 58),
        (11, 14, 20),
    )
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    draw.text(
        (18, 18),
        f"{biome['name']} - 100 tangible states",
        fill=(242, 244, 248),
        font=font,
    )
    for index, atlas_record in enumerate(biome_atlases):
        with Image.open(ROOT / atlas_record["runtime"]) as opened:
            image = opened.convert("RGBA")
        image.thumbnail(thumb_size, Image.Resampling.LANCZOS)
        preview = checkerboard(thumb_size)
        preview.paste(
            image,
            (
                (thumb_size[0] - image.width) // 2,
                (thumb_size[1] - image.height) // 2,
            ),
            image,
        )
        left = (index % columns) * cell_size[0] + 15
        top = (index // columns) * cell_size[1] + 55
        sheet.paste(preview, (left, top))
        draw.text(
            (left, top + thumb_size[1] + 8),
            f"{atlas_record['familyId']} - {atlas_record['objectName']}",
            fill=(224, 230, 238),
            font=font,
        )
    path = (
        REVIEW_DIR
        / f"2026-07-29-{biome['id']}-interactive-states-contact-v1.jpg"
    )
    sheet.save(path, "JPEG", quality=90, optimize=True)
    return path


def build_overview_contact_sheet(contact_paths: list[Path]) -> Path:
    columns = 2
    rows = math.ceil(len(contact_paths) / columns)
    thumb_size = (900, 990)
    sheet = Image.new(
        "RGB",
        (columns * 920, rows * 1010),
        (9, 12, 18),
    )
    for index, path in enumerate(contact_paths):
        with Image.open(path) as opened:
            image = opened.convert("RGB")
        image.thumbnail(thumb_size, Image.Resampling.LANCZOS)
        left = (index % columns) * 920 + 10
        top = (index // columns) * 1010 + 10
        sheet.paste(image, (left, top))
    destination = (
        REVIEW_DIR
        / "2026-07-29-interactive-world-states-overview-v1.jpg"
    )
    sheet.save(destination, "JPEG", quality=88, optimize=True)
    return destination


def build_library(records: list[dict[str, object]]) -> dict[str, object]:
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    atlases = []
    entries = []
    with tempfile.TemporaryDirectory(
        prefix="interactive-world-states-v1-"
    ) as temporary:
        temporary_dir = Path(temporary)
        for design in records:
            atlas, atlas_entries = build_atlas(design, temporary_dir)
            atlases.append(atlas)
            entries.extend(atlas_entries)
    if len(atlases) != 100:
        raise RuntimeError(f"Expected 100 atlases, got {len(atlases)}")
    if len(entries) != 1000:
        raise RuntimeError(f"Expected 1,000 entries, got {len(entries)}")
    hashes = [entry["rgbaSha256"] for entry in entries]
    if len(set(hashes)) != 1000:
        raise RuntimeError(
            f"Expected 1,000 unique RGBA frames, got {len(set(hashes))}"
        )
    source_hashes = [atlas["sourceSha256"] for atlas in atlases]
    if len(set(source_hashes)) != 100:
        raise RuntimeError("Expected 100 unique ImageGen source sheets")
    contacts = [
        build_biome_contact_sheet(biome, atlases)
        for biome in BIOME_SPECS
    ]
    overview = build_overview_contact_sheet(contacts)
    manifest = {
        "version": 1,
        "date": "2026-07-29",
        "reviewOnly": True,
        "runtimeWired": False,
        "mode": "high-resolution solid interactable physical-state atlases",
        "nonOverlapContract": {
            "companionLibraryOwns": [
                "particles and VFX",
                "mining and ability effects",
                "weather and hazards",
                "ambience and lighting-only companions",
                "UI and HUD states",
            ],
            "thisLibraryOwns": [
                "solid tangible in-world interactables",
                "multi-tile physical object-state sequences",
            ],
        },
        "counts": {
            "biomes": len(BIOME_SPECS),
            "familiesPerBiome": len(FAMILY_SPECS),
            "sourceSheets": len(atlases),
            "atlases": len(atlases),
            "statesPerAtlas": len(STATE_IDS),
            "totalAssets": len(entries),
            "uniqueRgbaFrames": len(set(hashes)),
            "uniqueSourceSheets": len(set(source_hashes)),
        },
        "grid": list(GRID),
        "frameSize": list(FRAME_SIZE),
        "atlasSize": [
            FRAME_SIZE[0] * GRID[0],
            FRAME_SIZE[1] * GRID[1],
        ],
        "stateIds": list(STATE_IDS),
        "biomes": [
            {
                "id": biome["id"],
                "name": biome["name"],
                "visualLanguage": biome["visualLanguage"],
            }
            for biome in BIOME_SPECS
        ],
        "families": [
            {
                key: family[key]
                for key in (
                    "id",
                    "label",
                    "role",
                    "scaleClass",
                    "widthTiles",
                    "heightTiles",
                )
            }
            for family in FAMILY_SPECS
        ],
        "atlases": atlases,
        "entries": entries,
        "contactSheets": [
            path.relative_to(ROOT).as_posix()
            for path in [*contacts, overview]
        ],
        "promptManifest": PROMPT_MANIFEST_PATH.relative_to(ROOT).as_posix(),
    }
    LIBRARY_MANIFEST_PATH.write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    return manifest


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build the 1,000-asset interactive world-state library."
    )
    parser.add_argument(
        "--prompts-only",
        action="store_true",
        help="Write and validate the prompt manifest without building atlases.",
    )
    parser.add_argument(
        "--emit-prompt-batch",
        nargs=2,
        type=int,
        metavar=("START", "COUNT"),
        help="Print a JSON prompt batch for built-in ImageGen orchestration.",
    )
    parser.add_argument(
        "--ingest",
        nargs=2,
        metavar=("GENERATED_IMAGE", "ASSET_ID"),
        help="Compress one built-in ImageGen output into its named source slot.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    records = prompt_records()
    write_prompt_manifest(records)
    if args.emit_prompt_batch:
        start, count = args.emit_prompt_batch
        if start < 0 or count < 1 or start + count > len(records):
            raise RuntimeError("Prompt batch is outside the 0..99 design range")
        print(json.dumps([
            {
                "index": record["index"],
                "assetId": record["assetId"],
                "prompt": record["prompt"],
            }
            for record in records[start:start + count]
        ]))
        return
    if args.ingest:
        raw_source, asset_id = args.ingest
        print(json.dumps(
            ingest_source(Path(raw_source).resolve(), asset_id),
            indent=2,
        ))
        return
    if args.prompts_only:
        print(json.dumps({
            "promptManifest": PROMPT_MANIFEST_PATH.relative_to(ROOT).as_posix(),
            "sourceSheets": len(records),
            "totalAssets": len(records) * len(STATE_IDS),
        }, indent=2))
        return
    manifest = build_library(records)
    print(json.dumps(manifest["counts"], indent=2))
    for path in manifest["contactSheets"]:
        print(path)


if __name__ == "__main__":
    main()
