"""Build the 200-object above-ground and sky prop library.

Ten ImageGen alpha masters are split into deterministic atlas frames, packed
into lossless WebP atlases, described by generated values modules, validated
against the protected surface/portal interaction corridors, and rendered into
review sheets. Runtime placement remains additive to the existing surface kit.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "sprites" / "environment" / "surface-sky-props-v3"
SOURCE_ROOT = ASSET_ROOT / "sources"
REVIEW_ROOT = ROOT / "visual-approval-previews" / "surface-sky-props-v3"
GENERATED_ROOT = ROOT / "values" / "generated" / "worldVisualPropLibraryV3"
MANIFEST_PATH = ASSET_ROOT / "2026-07-29-surface-sky-props-v3-manifest.json"

GRID_COLUMNS = 5
GRID_ROWS = 4
ATLAS_PADDING_PX = 5
ALPHA_THRESHOLD = 8
TILE_SIZE = 94
PLAYER_HEIGHT_METERS = 1.75
PLAYER_VISIBLE_HEIGHT_TILES = 0.80
WORLD_PIXELS_PER_METER = TILE_SIZE * PLAYER_VISIBLE_HEIGHT_TILES / PLAYER_HEIGHT_METERS

SIZE_SCALES = {"small": 0.84, "standard": 1.0, "large": 1.12}
LANE_SCALES = {"rear": 0.94, "mid": 1.0, "front": 1.04}
DYNAMIC_SCALE_MAX = {"surface": 1.08, "sky": 1.06}
SURFACE_LANES = (
    "rear", "mid", "front", "mid", "rear",
    "front", "mid", "rear", "front", "mid",
    "rear", "front", "mid", "rear", "front",
    "mid", "rear", "front", "mid", "rear",
)
SURFACE_SIZES = (
    "small", "standard", "standard", "large", "small",
    "standard", "large", "small", "standard", "small",
    "large", "standard", "small", "standard", "large",
    "small", "standard", "large", "small", "standard",
)
SKY_LANES = (
    "rear", "mid", "front", "mid", "rear",
    "front", "mid", "rear", "front", "mid",
)
SKY_SIZES = (
    "small", "standard", "small", "large", "standard",
    "small", "standard", "small", "large", "standard",
)


@dataclass(frozen=True)
class Item:
    slug: str
    label: str
    height_meters: float
    motion_profile: str


@dataclass(frozen=True)
class Category:
    slug: str
    label: str
    scope: str
    source_filename: str
    items: tuple[Item, ...]


def items(*definitions: tuple[str, str, float, str]) -> tuple[Item, ...]:
    return tuple(Item(*definition) for definition in definitions)


CATEGORIES = (
    Category(
        "arrival-forge", "Arrival Forge", "surface",
        "2026-07-29-01-arrival-forge-alpha-master-v3.png",
        items(
            ("coal-sacks", "Coal Sack Trio", .42, "fabric"),
            ("cooling-trough", "Low Cooling Trough", .52, "emissive"),
            ("smith-tool-rack", "Smithing Tool Rack", 1.05, "hanging"),
            ("chained-ore-crate", "Chained Ore Crate", .58, "hanging"),
            ("anvil-stump", "Anvil Stump", .68, "rigid"),
            ("quenching-buckets", "Quenching Bucket Cluster", .45, "emissive"),
            ("iron-ingots", "Stacked Iron Ingots", .38, "rigid"),
            ("small-bellows", "Small Bellows", .72, "mechanical"),
            ("slag-basket", "Slag Basket", .55, "emissive"),
            ("leaning-tools", "Leaning Tongs and Hammers", .95, "hanging"),
            ("scorched-brace", "Scorched Timber Brace", 1.15, "rigid"),
            ("ember-brazier", "Compact Ember Brazier", .62, "emissive"),
            ("wheeled-ore-tub", "Wheeled Ore Tub", .62, "mechanical"),
            ("chain-and-hook", "Coiled Chain and Hook", .48, "hanging"),
            ("firewood-bundle", "Firewood Bundle", .55, "rigid"),
            ("banded-barrel", "Iron-Banded Barrel", .72, "rigid"),
            ("broken-gears", "Broken Gear Pile", .42, "mechanical"),
            ("low-coal-cart", "Low Coal Cart", .70, "mechanical"),
            ("smith-apron-stand", "Smith Apron and Gloves Stand", .92, "fabric"),
            ("ash-shovel-bucket", "Ash Shovel and Clinker Bucket", .58, "hanging"),
        ),
    ),
    Category(
        "caravan-rest", "Caravan Rest", "surface",
        "2026-07-29-02-caravan-rest-alpha-master-v3.png",
        items(
            ("rolled-bedroll", "Rolled Bedroll", .30, "fabric"),
            ("folding-table", "Folding Travel Table", .65, "rigid"),
            ("cooking-tripod", "Cooking Tripod and Cauldron", .95, "hanging"),
            ("luggage-stack", "Luggage Stack", .72, "fabric"),
            ("tether-post", "Tether Post and Rope", 1.00, "hanging"),
            ("feed-trough", "Feed Trough", .55, "rigid"),
            ("water-keg", "Water Keg Stand", .75, "rigid"),
            ("travel-chest", "Travel Chest and Satchel", .58, "fabric"),
            ("canvas-repair-frame", "Canvas Repair Frame", 1.00, "fabric"),
            ("firewood-rack", "Firewood Rack", .65, "rigid"),
            ("boot-drying-stand", "Boot Drying Stand", .90, "hanging"),
            ("rope-hardware", "Rope and Climbing Hardware", .65, "hanging"),
            ("camp-stools", "Camp Stools", .55, "rigid"),
            ("travel-brazier", "Travel Brazier", .60, "emissive"),
            ("wheel-repair-stand", "Wheel Repair Stand", 1.20, "mechanical"),
            ("hook-lantern", "Hook Lantern", 1.05, "emissive"),
            ("pack-saddle-rack", "Pack Saddle Rack", 1.10, "fabric"),
            ("map-cases", "Map Case and Scroll Tubes", .70, "fabric"),
            ("camp-cookware", "Camp Cookware", .52, "hanging"),
            ("blank-signpost", "Blank Caravan Signpost", 1.30, "rigid"),
        ),
    ),
    Category(
        "starwell-herb", "Starwell Herb Court", "surface",
        "2026-07-29-03-starwell-herb-alpha-master-v3.png",
        items(
            ("herb-planter", "Herb Planter", .65, "foliage"),
            ("drying-rack", "Herb Drying Rack", 1.05, "hanging"),
            ("astrolabe", "Brass Astrolabe", 1.00, "mechanical"),
            ("herb-basket", "Herb Basket", .50, "foliage"),
            ("apothecary-crate", "Apothecary Crate", .65, "rigid"),
            ("mortar-station", "Mortar Station", .55, "mechanical"),
            ("rain-barrel", "Rain Barrel", .75, "rigid"),
            ("lens-case", "Telescope Lens Case", .45, "rigid"),
            ("star-chart-table", "Blank Star-Chart Table", .75, "fabric"),
            ("sundial", "Stone Sundial", .85, "mechanical"),
            ("vial-shelf", "Vial Shelf", .95, "emissive"),
            ("seed-drawers", "Seed Drawers", .75, "rigid"),
            ("moonflower-trellis", "Moonflower Trellis", 1.30, "foliage"),
            ("herb-peg-stand", "Herb Peg Stand", 1.05, "hanging"),
            ("irrigation-pots", "Irrigation Pots and Watering Can", .60, "foliage"),
            ("balance-scale", "Apothecary Balance Scale", .85, "mechanical"),
            ("specimen-basket", "Specimen Basket", .55, "foliage"),
            ("blue-lantern-trio", "Blue-Glass Lantern Trio", .70, "emissive"),
            ("alpine-shrub-pots", "Alpine Shrub Pots", .75, "foliage"),
            ("celestial-rods", "Celestial Rod Holder", .90, "hanging"),
        ),
    ),
    Category(
        "timberwright", "Timberwright Yard", "surface",
        "2026-07-29-04-timberwright-alpha-master-v3.png",
        items(
            ("log-pile", "Log Pile", .65, "rigid"),
            ("sawhorses", "Sawhorses", .80, "rigid"),
            ("wedges-mallet", "Wedges and Mallet", .45, "rigid"),
            ("rope-spool", "Rope Spool", .70, "mechanical"),
            ("pulley-frame", "Pulley Frame", 1.30, "hanging"),
            ("saw-workbench", "Saw Workbench", .75, "mechanical"),
            ("brace-bundle", "Timber Brace Bundle", .70, "rigid"),
            ("clamp-rack", "Clamp Rack", 1.00, "hanging"),
            ("shaving-basket", "Wood Shaving Basket", .55, "foliage"),
            ("wheel-rack", "Wheel Rack", 1.05, "mechanical"),
            ("plank-stack", "Plank Stack", .55, "rigid"),
            ("tool-chest", "Timberwright Tool Chest", .65, "rigid"),
            ("grindstone", "Grindstone", .90, "mechanical"),
            ("auger-chisel-rack", "Auger and Chisel Rack", .85, "hanging"),
            ("scaffold-poles", "Scaffold Poles", 1.05, "rigid"),
            ("chain-block", "Chain Block", 1.15, "hanging"),
            ("crate-frame", "Open Crate Frame", .90, "rigid"),
            ("resin-brush-station", "Resin and Brush Station", .70, "emissive"),
            ("chopping-block", "Chopping Block", .55, "rigid"),
            ("offcut-cart", "Offcut Cart", .75, "mechanical"),
        ),
    ),
    Category(
        "observatory", "Heavenblocks Observatory", "surface",
        "2026-07-29-05-observatory-alpha-master-v3.png",
        items(
            ("horizon-compass", "Horizon Compass", .80, "mechanical"),
            ("streamer-bundle", "Streamer Bundle Peg", .90, "fabric"),
            ("squat-telescope", "Squat Telescope", 1.05, "mechanical"),
            ("observatory-lens-case", "Observatory Lens Case", .50, "rigid"),
            ("observatory-chart-table", "Blank Observatory Chart Table", .70, "fabric"),
            ("stone-bench", "Observatory Stone Bench", .65, "rigid"),
            ("weather-vane", "Weather Vane", 1.20, "mechanical"),
            ("calibration-weights", "Calibration Weights", .50, "mechanical"),
            ("marker-stones", "Marker Stones", .45, "rigid"),
            ("signal-pennants", "Signal Pennants", 1.05, "fabric"),
            ("star-dial", "Star Dial", .80, "mechanical"),
            ("instrument-crate", "Instrument Crate", .65, "rigid"),
            ("hourglass", "Large Hourglass", .75, "mechanical"),
            ("observatory-planter", "Observatory Alpine Planter", .65, "foliage"),
            ("stone-stool", "Stone Stool", .50, "rigid"),
            ("lens-polish-station", "Lens Polish Station", .70, "mechanical"),
            ("direction-posts", "Short Blank Direction Posts", .75, "rigid"),
            ("folded-cover", "Folded Instrument Cover", .45, "fabric"),
            ("anemometer", "Anemometer", 1.00, "mechanical"),
            ("slate-rack", "Slate Rack", .90, "hanging"),
        ),
    ),
    Category(
        "frontier-survey", "Frontier Survey Garden", "surface",
        "2026-07-29-06-frontier-survey-alpha-master-v3.png",
        items(
            ("survey-tripod", "Survey Tripod", 1.00, "mechanical"),
            ("frontier-map-table", "Blank Frontier Map Table", .70, "fabric"),
            ("soil-sample-crates", "Soil Sample Crates", .65, "rigid"),
            ("gabion-basket", "Gabion Basket", .70, "rigid"),
            ("seed-bed", "Seed Bed", .40, "foliage"),
            ("young-sapling", "Young Sapling", 1.25, "foliage"),
            ("irrigation-jugs", "Irrigation Jugs", .55, "foliage"),
            ("split-rail", "Split Rail", .72, "rigid"),
            ("repair-tool-rack", "Repair Tool Rack", 1.00, "hanging"),
            ("specimen-drawers", "Specimen Drawers", .80, "rigid"),
            ("soil-auger", "Soil Auger", .85, "mechanical"),
            ("mineral-tray", "Mineral Tray", .45, "emissive"),
            ("hand-winch", "Hand Winch", .90, "mechanical"),
            ("twine-and-stakes", "Twine and Stakes", .55, "hanging"),
            ("survey-wheelbarrow", "Survey Wheelbarrow", .70, "mechanical"),
            ("rain-gauge", "Rain Gauge", .90, "mechanical"),
            ("pruning-bench", "Pruning Bench", .80, "rigid"),
            ("reed-mat", "Reed Mat", .35, "fabric"),
            ("bee-skeps", "Bee Skeps", .75, "foliage"),
            ("frontier-lantern", "Frontier Lantern", 1.00, "emissive"),
        ),
    ),
    Category(
        "far-east", "Far-East Expedition Overlook", "surface",
        "2026-07-29-07-far-east-alpha-master-v3.png",
        items(
            ("far-telescope", "Far-East Telescope", 1.15, "mechanical"),
            ("expedition-map-cases", "Expedition Map Cases", .65, "fabric"),
            ("climbing-crate", "Climbing Crate", .70, "hanging"),
            ("expedition-chests", "Expedition Chests", .80, "rigid"),
            ("signal-lantern", "Signal Lantern", 1.00, "emissive"),
            ("folded-flags", "Folded Signal Flags", .75, "fabric"),
            ("expedition-stool", "Expedition Stool", .50, "rigid"),
            ("boot-rack", "Boot Rack", .55, "hanging"),
            ("supply-barrels", "Supply Barrels", .85, "rigid"),
            ("belay-frame", "Belay Frame", 1.20, "hanging"),
            ("survey-beacon", "Survey Beacon", 1.15, "emissive"),
            ("specimen-table", "Specimen Table", .75, "rigid"),
            ("shelter-bundle", "Shelter Bundle", .65, "fabric"),
            ("ice-tools", "Ice Tools", .90, "hanging"),
            ("overlook-brazier", "Overlook Brazier", .70, "emissive"),
            ("expedition-cairn", "Expedition Cairn", .70, "rigid"),
            ("drying-line", "Expedition Drying Line", 1.25, "fabric"),
            ("sewing-station", "Expedition Sewing Station", .65, "fabric"),
            ("food-crate", "Food Crate and Cookware", .60, "hanging"),
            ("overlook-rail", "Overlook Rail", .95, "rigid"),
        ),
    ),
    Category(
        "sky-islands", "V11 Portal Sky Islands", "sky",
        "2026-07-29-08-sky-islands-alpha-master-v3.png",
        items(
            ("cyan-crystal-foot", "Cyan Crystal Foot", .55, "emissive"),
            ("cyan-cable-spool", "Cyan Cable Spool", .50, "mechanical"),
            ("cyan-antenna", "Cyan Antenna", .75, "mechanical"),
            ("cyan-aether-battery", "Cyan Aether Battery", .65, "emissive"),
            ("cyan-lantern", "Cyan Sky Lantern", .65, "emissive"),
            ("cyan-cloud-anchor", "Cyan Cloud Anchor", .55, "hanging"),
            ("cyan-tool-case", "Cyan Tool Case", .45, "rigid"),
            ("cyan-wind-vane", "Cyan Wind Vane", .70, "mechanical"),
            ("cyan-conduit", "Cyan Conduit", .55, "emissive"),
            ("cyan-service-chest", "Cyan Service Chest", .55, "rigid"),
            ("indigo-chain-anchor", "Indigo Chain Anchor", .60, "hanging"),
            ("indigo-ember-battery", "Indigo Ember Battery", .65, "emissive"),
            ("indigo-crystal-rack", "Indigo Crystal Rack", .70, "emissive"),
            ("indigo-boundary-posts", "Indigo Boundary Posts", .75, "rigid"),
            ("indigo-gauge-box", "Indigo Gauge Box", .55, "mechanical"),
            ("indigo-copper-coil", "Indigo Copper Coil", .50, "mechanical"),
            ("indigo-ballast-stones", "Indigo Ballast Stones", .45, "rigid"),
            ("indigo-ash-pennant", "Indigo Ash Pennant", .75, "fabric"),
            ("indigo-junction-box", "Indigo Junction Box", .55, "emissive"),
            ("indigo-toolkit", "Indigo Toolkit", .45, "rigid"),
        ),
    ),
    Category(
        "cloud-angel", "Cloud Reef and Angel Heavenblock", "sky",
        "2026-07-29-09-cloud-angel-alpha-master-v3.png",
        items(
            ("cloudgrass-planter", "Cloudgrass Planter", .60, "foliage"),
            ("turbine-vane", "Aether Turbine Vane", .70, "mechanical"),
            ("shell-basin", "Cloud Shell Basin", .55, "emissive"),
            ("wind-chime", "Cloud Reef Wind Chime", .75, "hanging"),
            ("cloud-crystal-tray", "Cloud Crystal Tray", .50, "emissive"),
            ("bridge-repair-kit", "Cloud Bridge Repair Kit", .55, "rigid"),
            ("driftwood-bench", "Cloud Driftwood Bench", .60, "rigid"),
            ("condensation-jars", "Condensation Jars", .50, "emissive"),
            ("fin-antenna", "Cloud Fin Antenna", .75, "mechanical"),
            ("cloudstone-cairn", "Cloudstone Cairn", .60, "rigid"),
            ("gold-feather-relic", "Gold Feather Relic", .65, "floating"),
            ("broken-halo", "Broken Halo Fragment", .55, "emissive"),
            ("angel-ribbon-frame", "Angel Ribbon Frame", .75, "fabric"),
            ("gold-lantern", "Angel Gold Lantern", .70, "emissive"),
            ("angel-offering-bowl", "Angel Offering Bowl", .45, "emissive"),
            ("wing-vane", "Angel Wing Vane", .75, "mechanical"),
            ("angel-urns", "Angel Urn Cluster", .60, "rigid"),
            ("light-crystals", "Angel Light Crystals", .55, "emissive"),
            ("gilded-chain-anchor", "Gilded Chain Anchor", .65, "hanging"),
            ("celestial-seat", "Celestial Seat", .70, "rigid"),
        ),
    ),
    Category(
        "devil-eclipse", "Devil Eclipse Scar", "sky",
        "2026-07-29-10-devil-eclipse-alpha-master-v3.png",
        items(
            ("obsidian-thorns", "Obsidian Thorns", .70, "emissive"),
            ("eclipse-chain-winch", "Eclipse Chain Winch", .75, "mechanical"),
            ("ember-urns", "Devil Ember Urns", .60, "emissive"),
            ("crimson-pennants", "Crimson Pennants", .80, "fabric"),
            ("eclipse-glass-shard", "Broken Eclipse Glass Shard", .65, "emissive"),
            ("cinder-basket", "Cinder Basket", .55, "emissive"),
            ("basalt-seat", "Basalt Seat", .65, "rigid"),
            ("pressure-vent", "Pressure Vent", .70, "mechanical"),
            ("crystal-cage", "Eclipse Crystal Cage", .75, "emissive"),
            ("hook-rack", "Devil Hook Rack", .75, "hanging"),
            ("furnace-lens", "Furnace Lens", .70, "emissive"),
            ("meteor-pile", "Meteor Pile", .55, "emissive"),
            ("soot-chest", "Soot Chest", .60, "rigid"),
            ("crimson-lantern", "Crimson Lantern", .75, "emissive"),
            ("slag-ballast", "Slag Ballast", .55, "rigid"),
            ("incense-vessel", "Incense Vessel", .60, "emissive"),
            ("eclipse-instrument", "Eclipse Measuring Instrument", .75, "mechanical"),
            ("spiked-posts", "Spiked Boundary Posts", .75, "rigid"),
            ("cracked-sample-tray", "Cracked Sample Tray", .50, "emissive"),
            ("devil-repair-bench", "Devil Repair Bench", .70, "mechanical"),
        ),
    ),
)

SURFACE_INTERVALS = {
    "arrival-forge": ((151.75, 160.90),),
    "caravan-rest": ((161.10, 179.80),),
    "starwell-herb": ((180.15, 185.20), (190.80, 199.80)),
    "timberwright": ((200.20, 219.70),),
    "observatory": ((220.10, 242.70),),
    "frontier-survey": ((243.20, 259.70),),
    "far-east": ((260.20, 279.70),),
}

SURFACE_PROTECTED_ZONES = (
    ("town-square-interactions", ("level1",), 0.0, 22.75),
    ("level1-ground-sky-portal", ("level1",), 91.5, 96.5),
    ("heavenblock-surface-gates", ("level1",), 102.5, 117.5),
    ("tunnel-bridge-arc-core", (), 116.25, 151.50),
    ("level2-ground-sky-portal", ("level2",), 185.5, 190.5),
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    mask = image.getchannel("A").point(
        lambda value: 255 if value > ALPHA_THRESHOLD else 0
    )
    bbox = mask.getbbox()
    if bbox is None:
        raise RuntimeError("Atlas source cell contains no visible alpha")
    return bbox


def extract_frames(category: Category) -> list[dict]:
    source_path = SOURCE_ROOT / category.source_filename
    if not source_path.exists():
        raise FileNotFoundError(source_path)
    with Image.open(source_path) as opened:
        source = opened.convert("RGBA")
    rgba = np.asarray(source).copy()
    mask = (rgba[:, :, 3] > 1).astype(np.uint8)
    count, labels, stats, centroids = cv2.connectedComponentsWithStats(mask, 8)
    labels_by_cell: dict[int, list[int]] = {
        index: [] for index in range(GRID_COLUMNS * GRID_ROWS)
    }
    for component in range(1, count):
        if int(stats[component, cv2.CC_STAT_AREA]) < 4:
            continue
        center_x, center_y = centroids[component]
        column = max(
            0,
            min(GRID_COLUMNS - 1, round(center_x / source.width * GRID_COLUMNS - .5)),
        )
        row = max(
            0,
            min(GRID_ROWS - 1, round(center_y / source.height * GRID_ROWS - .5)),
        )
        labels_by_cell[row * GRID_COLUMNS + column].append(component)

    frames: list[dict] = []
    for index, item in enumerate(category.items):
        assigned_labels = labels_by_cell[index]
        if not assigned_labels:
            raise RuntimeError(f"{category.slug}/{item.slug}: no alpha components assigned")
        component_mask = np.isin(labels, assigned_labels)
        cell_rgba = rgba.copy()
        cell_rgba[~component_mask] = 0
        cell = Image.fromarray(cell_rgba, "RGBA")
        left, top, right, bottom = alpha_bbox(cell)
        subject = cell.crop((left, top, right, bottom))
        row, column = divmod(index, GRID_COLUMNS)
        nominal = (
            round(column * source.width / GRID_COLUMNS),
            round(row * source.height / GRID_ROWS),
            round((column + 1) * source.width / GRID_COLUMNS),
            round((row + 1) * source.height / GRID_ROWS),
        )
        margins = (
            left - nominal[0],
            top - nominal[1],
            nominal[2] - right,
            nominal[3] - bottom,
        )
        frames.append({
            "item": item,
            "image": subject,
            "sourceCell": {
                "x": left,
                "y": top,
                "width": right - left,
                "height": bottom - top,
            },
            "sourceMargins": margins,
        })
    return frames


def pack_atlas(category: Category, frames: list[dict]) -> tuple[Path, Path, list[dict]]:
    row_frames = [
        frames[row * GRID_COLUMNS:(row + 1) * GRID_COLUMNS]
        for row in range(GRID_ROWS)
    ]
    row_heights = [
        max(frame["image"].height for frame in row) + ATLAS_PADDING_PX * 2
        for row in row_frames
    ]
    row_widths = [
        sum(frame["image"].width + ATLAS_PADDING_PX * 2 for frame in row)
        for row in row_frames
    ]
    atlas = Image.new(
        "RGBA",
        (max(row_widths), sum(row_heights)),
        (0, 0, 0, 0),
    )

    packed: list[dict] = []
    y = 0
    for row_index, row in enumerate(row_frames):
        x = 0
        for frame in row:
            image = frame["image"]
            frame_x = x + ATLAS_PADDING_PX
            frame_y = y + ATLAS_PADDING_PX
            atlas.alpha_composite(image, (frame_x, frame_y))
            asset_id = f"{category.slug}-{frame['item'].slug}"
            packed.append({
                **frame,
                "assetId": asset_id,
                "atlasFrame": {
                    "x": frame_x,
                    "y": frame_y,
                    "width": image.width,
                    "height": image.height,
                },
            })
            x += image.width + ATLAS_PADDING_PX * 2
        y += row_heights[row_index]

    webp_path = ASSET_ROOT / f"surface-sky-props-v3-{category.slug}.webp"
    json_path = ASSET_ROOT / f"surface-sky-props-v3-{category.slug}.json"
    atlas.save(webp_path, "WEBP", lossless=True, quality=100, method=6)

    texture_frames = {}
    for frame in packed:
        rect = frame["atlasFrame"]
        texture_frames[frame["assetId"]] = {
            "frame": {
                "x": rect["x"],
                "y": rect["y"],
                "w": rect["width"],
                "h": rect["height"],
            },
            "rotated": False,
            "trimmed": False,
            "spriteSourceSize": {
                "x": 0, "y": 0, "w": rect["width"], "h": rect["height"],
            },
            "sourceSize": {"w": rect["width"], "h": rect["height"]},
            "pivot": {"x": .5, "y": 1},
        }
    atlas_json = {
        "frames": texture_frames,
        "meta": {
            "app": "2026-07-29-build-surface-sky-props-v3.py",
            "version": "3",
            "image": webp_path.name,
            "format": "RGBA8888",
            "size": {"w": atlas.width, "h": atlas.height},
            "scale": "1",
        },
    }
    json_path.write_text(json.dumps(atlas_json, indent=2) + "\n", encoding="utf-8")
    return webp_path, json_path, packed


def rendered_width_tiles(asset: dict, lane: str, size_variant: str, scope: str) -> float:
    aspect = asset["expectedSource"]["width"] / asset["expectedSource"]["height"]
    scale = SIZE_SCALES[size_variant] * LANE_SCALES.get(lane, 1.0)
    scale *= DYNAMIC_SCALE_MAX[scope]
    width_px = asset["heightMeters"] * WORLD_PIXELS_PER_METER * aspect * scale
    return width_px / TILE_SIZE


def split_for_intervals(values: list[dict], interval_count: int) -> list[list[dict]]:
    if interval_count == 1:
        return [values]
    left_count = len(values) // 2
    return [values[:left_count], values[left_count:]]


def pack_surface_placements(category: Category, assets: list[dict]) -> list[dict]:
    intervals = SURFACE_INTERVALS[category.slug]
    indexed = [
        {
            "asset": asset,
            "index": index,
            "lane": SURFACE_LANES[index],
            "sizeVariant": SURFACE_SIZES[index],
        }
        for index, asset in enumerate(assets)
    ]
    placements_by_index: dict[int, dict] = {}
    for lane in ("rear", "mid", "front"):
        lane_items = [entry for entry in indexed if entry["lane"] == lane]
        groups = split_for_intervals(lane_items, len(intervals))
        for interval, group in zip(intervals, groups):
            if not group:
                continue
            widths = [
                rendered_width_tiles(
                    entry["asset"], lane, entry["sizeVariant"], "surface"
                )
                for entry in group
            ]
            free = interval[1] - interval[0] - sum(widths)
            if free <= 0:
                raise RuntimeError(
                    f"{category.slug}/{lane}: props cannot fit authored interval {interval}"
                )
            spacing = free / (len(group) + 1)
            cursor = interval[0] + spacing
            for entry, width in zip(group, widths):
                tile_x = cursor + width / 2
                placements_by_index[entry["index"]] = {
                    "id": f"surface-v3-{entry['asset']['id']}",
                    "scope": "surface",
                    "assetId": entry["asset"]["id"],
                    "worldRegion": category.slug,
                    "level": "level2",
                    "tileX": round(tile_x, 4),
                    "lane": lane,
                    "sizeVariant": entry["sizeVariant"],
                    "flipX": entry["index"] % 4 in (2, 3),
                }
                cursor = tile_x + width / 2 + spacing
    return [placements_by_index[index] for index in range(len(assets))]


def sky_island_placements(category: Category, assets: list[dict]) -> list[dict]:
    placements = []
    for local_index, asset in enumerate(assets):
        level_index = 0 if local_index < 10 else 1
        index = local_index % 10
        x_offset = 62 if level_index else 0
        if index < 4:
            tile_x = (80.48, 83.95, 91.95, 95.52)[index] + x_offset
            tile_y = 18.0
            floating = False
        else:
            tile_x = (81.6, 84.7, 87.9, 90.8, 93.8, 95.4)[index - 4] + x_offset
            tile_y = (15.55, 15.45, 14.75, 15.55, 15.45, 15.65)[index - 4]
            floating = True
        placements.append({
            "id": f"sky-v3-{asset['id']}",
            "scope": "sky",
            "assetId": asset["id"],
            "worldRegion": f"v11-level-{level_index + 1}-sky-island",
            "tileX": tile_x,
            "tileY": tile_y,
            "lane": SKY_LANES[index],
            "sizeVariant": SKY_SIZES[index],
            "flipX": index % 4 in (1, 2),
            "floating": floating,
            **({"motionProfile": "floating"} if floating else {}),
        })
    return placements


def heavenblock_placements(
    category: Category,
    assets: list[dict],
    start_index: int,
    count: int,
    region_id: str,
    floor_tile_y: float,
) -> list[dict]:
    safe_intervals = ((225.45, 229.55), (232.45, 235.55), (238.45, 239.90))
    selected = assets[start_index:start_index + count]
    lane_sequence = SURFACE_LANES if count > 10 else SKY_LANES
    indexed = [
        {
            "asset": asset,
            "index": index,
            "lane": lane_sequence[index],
            "sizeVariant": SKY_SIZES[index % len(SKY_SIZES)],
        }
        for index, asset in enumerate(selected)
    ]
    placements_by_index: dict[int, dict] = {}
    for lane in ("rear", "mid", "front"):
        lane_items = [entry for entry in indexed if entry["lane"] == lane]
        item_count = len(lane_items)
        third_count = 2 if item_count >= 7 else 1
        second_count = max(1, round((item_count - third_count) * .4))
        first_count = item_count - second_count - third_count
        cursor = 0
        groups = []
        for group_count in (first_count, second_count, third_count):
            groups.append(lane_items[cursor:cursor + group_count])
            cursor += group_count
        for interval, group in zip(safe_intervals, groups):
            widths = [
                rendered_width_tiles(
                    entry["asset"], lane, entry["sizeVariant"], "sky"
                )
                for entry in group
            ]
            free = interval[1] - interval[0] - sum(widths)
            if group and free <= 0:
                raise RuntimeError(
                    f"{region_id}/{lane}: props cannot fit safe interval {interval}"
                )
            spacing = free / (len(group) + 1) if group else 0
            x_cursor = interval[0] + spacing
            for entry, width in zip(group, widths):
                tile_x = x_cursor + width / 2
                placements_by_index[entry["index"]] = {
                    "id": f"sky-v3-{entry['asset']['id']}",
                    "scope": "sky",
                    "assetId": entry["asset"]["id"],
                    "worldRegion": region_id,
                    "tileX": round(tile_x, 4),
                    "tileY": floor_tile_y,
                    "lane": lane,
                    "sizeVariant": entry["sizeVariant"],
                    "flipX": entry["index"] % 4 in (1, 2),
                    "floating": False,
                }
                x_cursor = tile_x + width / 2 + spacing
    return [placements_by_index[index] for index in range(len(selected))]


def build_sky_placements(category: Category, assets: list[dict]) -> list[dict]:
    if category.slug == "sky-islands":
        return sky_island_placements(category, assets)
    if category.slug == "cloud-angel":
        return [
            *heavenblock_placements(
                category, assets, 0, 10, "lower-sky-cloud-reef", 49.0
            ),
            *heavenblock_placements(
                category, assets, 10, 10, "angel-heavenblock", 32.0
            ),
        ]
    if category.slug == "devil-eclipse":
        return heavenblock_placements(
            category, assets, 0, 20, "devil-eclipse-scar", 14.0
        )
    raise RuntimeError(f"Unknown sky category: {category.slug}")


def rectangles_intersect(left: dict, right: dict) -> bool:
    return (
        left["right"] > right["left"]
        and left["left"] < right["right"]
        and left["bottom"] > right["top"]
        and left["top"] < right["bottom"]
    )


def validate_placements(assets_by_id: dict[str, dict], placements: list[dict]) -> None:
    seen = set()
    protected_portals = []
    for left in (81, 85, 89, 93, 143, 147, 151, 155):
        protected_portals.append({
            "id": f"v11-portal-{left}",
            "left": left,
            "right": left + 2,
            "top": 16,
            "bottom": 18,
        })
    protected_portals.extend((
        {"id": "v11-pillar-1", "left": 87.25, "right": 88.75, "top": 15.0, "bottom": 18.0},
        {"id": "v11-pillar-2", "left": 149.25, "right": 150.75, "top": 15.0, "bottom": 18.0},
    ))
    heavenblock_exclusions = (
        (224, 1.35), (231, 1.35), (237, 1.35),
    )

    for placement in placements:
        if placement["id"] in seen:
            raise RuntimeError(f"Duplicate placement: {placement['id']}")
        seen.add(placement["id"])
        asset = assets_by_id[placement["assetId"]]
        width = rendered_width_tiles(
            asset, placement["lane"], placement["sizeVariant"], placement["scope"]
        )
        height = (
            asset["heightMeters"]
            * WORLD_PIXELS_PER_METER
            * SIZE_SCALES[placement["sizeVariant"]]
            * LANE_SCALES.get(placement["lane"], 1.0)
            * DYNAMIC_SCALE_MAX[placement["scope"]]
            / TILE_SIZE
        )
        rect = {
            "left": placement["tileX"] - width / 2,
            "right": placement["tileX"] + width / 2,
            "top": placement.get("tileY", 0) - height,
            "bottom": placement.get("tileY", 0),
        }
        placement["maximumRenderedBoundsTiles"] = {
            key: round(value, 4) for key, value in rect.items()
        }

        if placement["scope"] == "surface":
            for zone_id, levels, left, right in SURFACE_PROTECTED_ZONES:
                if levels and placement["level"] not in levels:
                    continue
                if rect["right"] > left and rect["left"] < right:
                    raise RuntimeError(
                        f"{placement['id']} overlaps protected surface zone {zone_id}"
                    )
            if 218 < rect["right"] and rect["left"] < 243 and height > 2.05:
                raise RuntimeError(
                    f"{placement['id']} exceeds the Heavenblocks surface flight lane"
                )
            continue

        if placement["worldRegion"].startswith("v11-level-"):
            for protected in protected_portals:
                if rectangles_intersect(rect, protected):
                    raise RuntimeError(
                        f"{placement['id']} overlaps {protected['id']}"
                    )
            continue

        if rect["left"] < 223 or rect["right"] > 240:
            raise RuntimeError(f"{placement['id']} leaves its Heavenblock platform")
        for center_x, radius in heavenblock_exclusions:
            if rect["right"] > center_x - radius and rect["left"] < center_x + radius:
                raise RuntimeError(
                    f"{placement['id']} overlaps Heavenblock interaction at x={center_x}"
                )

    if len(seen) != 200:
        raise RuntimeError(f"Expected 200 unique placements, found {len(seen)}")


def load_font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    candidates = (
        Path("C:/Windows/Fonts/arialbd.ttf") if bold else Path("C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/segoeuib.ttf") if bold else Path("C:/Windows/Fonts/segoeui.ttf"),
    )
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size=size)
    return ImageFont.load_default()


def checkerboard(size: tuple[int, int], cell: int = 16) -> Image.Image:
    image = Image.new("RGBA", size, (13, 24, 35, 255))
    draw = ImageDraw.Draw(image)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle(
                    (x, y, min(size[0], x + cell), min(size[1], y + cell)),
                    fill=(19, 34, 46, 255),
                )
    return image


def fit_image(image: Image.Image, width: int, height: int) -> Image.Image:
    scale = min(width / image.width, height / image.height, 1.0)
    return image.resize(
        (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
        Image.Resampling.LANCZOS,
    )


def build_category_review(category: Category, frames: list[dict]) -> Path:
    card_width, card_height, title_height = 250, 200, 66
    board = checkerboard(
        (GRID_COLUMNS * card_width, title_height + GRID_ROWS * card_height),
        20,
    )
    draw = ImageDraw.Draw(board)
    title_font = load_font(28, bold=True)
    label_font = load_font(16, bold=True)
    detail_font = load_font(14)
    draw.rectangle((0, 0, board.width, title_height), fill=(8, 17, 27, 255))
    draw.text((22, 14), f"{category.label} - 20 runtime props", font=title_font, fill=(244, 215, 139, 255))

    for index, frame in enumerate(frames):
        row, column = divmod(index, GRID_COLUMNS)
        left = column * card_width
        top = title_height + row * card_height
        draw.rectangle(
            (left + 4, top + 4, left + card_width - 4, top + card_height - 4),
            outline=(70, 103, 121, 255),
            width=2,
        )
        prop = fit_image(frame["image"], card_width - 30, card_height - 66)
        board.alpha_composite(
            prop,
            (
                left + (card_width - prop.width) // 2,
                top + 12 + (card_height - 68 - prop.height) // 2,
            ),
        )
        item = frame["item"]
        draw.text(
            (left + 12, top + card_height - 48),
            f"{index + 1:02d}  {item.label}",
            font=label_font,
            fill=(224, 234, 238, 255),
        )
        draw.text(
            (left + 12, top + card_height - 26),
            f"{item.height_meters:.2f} m | {item.motion_profile}",
            font=detail_font,
            fill=(135, 193, 218, 255),
        )
    path = REVIEW_ROOT / f"2026-07-29-{category.slug}-20-props-v3.png"
    board.convert("RGB").save(path, "PNG", optimize=True)
    return path


def build_overview(category_frames: list[tuple[Category, list[dict]]]) -> Path:
    label_width, cell_width, row_height = 260, 88, 112
    title_height = 70
    board = checkerboard(
        (label_width + cell_width * 20, title_height + row_height * len(category_frames)),
        16,
    )
    draw = ImageDraw.Draw(board)
    title_font = load_font(30, bold=True)
    group_font = load_font(18, bold=True)
    index_font = load_font(11, bold=True)
    draw.rectangle((0, 0, board.width, title_height), fill=(7, 16, 27, 255))
    draw.text((22, 16), "Surface + Sky Prop Library V3 - all 200 runtime objects", font=title_font, fill=(247, 218, 143, 255))
    for row, (category, frames) in enumerate(category_frames):
        top = title_height + row * row_height
        tint = (14, 37, 50, 255) if category.scope == "surface" else (25, 25, 55, 255)
        draw.rectangle((0, top, label_width, top + row_height), fill=tint)
        draw.text((16, top + 25), category.label, font=group_font, fill=(229, 237, 240, 255))
        draw.text((16, top + 54), category.scope.upper(), font=index_font, fill=(117, 210, 238, 255))
        for column, frame in enumerate(frames):
            left = label_width + column * cell_width
            draw.rectangle(
                (left + 2, top + 2, left + cell_width - 2, top + row_height - 2),
                outline=(62, 88, 106, 255),
            )
            prop = fit_image(frame["image"], cell_width - 10, row_height - 24)
            board.alpha_composite(
                prop,
                (
                    left + (cell_width - prop.width) // 2,
                    top + 4 + (row_height - 22 - prop.height) // 2,
                ),
            )
            draw.text(
                (left + 5, top + row_height - 18),
                f"{column + 1:02d}",
                font=index_font,
                fill=(196, 214, 221, 255),
            )
    path = REVIEW_ROOT / "2026-07-29-all-200-surface-sky-props-overview-v3.png"
    board.convert("RGB").save(path, "PNG", optimize=True)
    return path


def js_object(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def write_generated_module(
    category: Category,
    atlas: dict,
    assets: list[dict],
    placements: list[dict],
) -> Path:
    export_name = "".join(
        part.capitalize() if index else part
        for index, part in enumerate(category.slug.split("-"))
    )
    payload = {"atlas": atlas, "assets": assets, "placements": placements}
    content = (
        "// Generated by ai-tools/2026-07-29-build-surface-sky-props-v3.py.\n"
        "// Rebuild from the checked-in alpha masters; do not hand-edit.\n\n"
        "const deepFreeze = value => {\n"
        "  if (!value || typeof value !== \"object\" || Object.isFrozen(value)) return value;\n"
        "  Object.freeze(value);\n"
        "  Object.values(value).forEach(deepFreeze);\n"
        "  return value;\n"
        "};\n\n"
        f"export const {export_name} = deepFreeze({js_object(payload)});\n"
    )
    path = GENERATED_ROOT / f"{category.slug}.generated.js"
    path.write_text(content, encoding="utf-8")
    return path


def write_generated_index(categories: Iterable[Category]) -> Path:
    imports = []
    names = []
    for category in categories:
        export_name = "".join(
            part.capitalize() if index else part
            for index, part in enumerate(category.slug.split("-"))
        )
        imports.append(
            f'import {{ {export_name} }} from "./{category.slug}.generated.js";'
        )
        names.append(export_name)
    content = (
        "// Generated by ai-tools/2026-07-29-build-surface-sky-props-v3.py.\n"
        "// Rebuild from the checked-in alpha masters; do not hand-edit.\n\n"
        + "\n".join(imports)
        + "\n\n"
        + f"export const WORLD_VISUAL_PROP_GROUPS_V3 = Object.freeze([{','.join(names)}]);\n"
        + "export const WORLD_VISUAL_PROP_ATLASES_V3 = Object.freeze(\n"
        + "  WORLD_VISUAL_PROP_GROUPS_V3.map(group => group.atlas),\n"
        + ");\n"
        + "export const WORLD_VISUAL_SURFACE_PROP_ASSETS_V3 = Object.freeze(\n"
        + "  WORLD_VISUAL_PROP_GROUPS_V3.filter(group => group.atlas.scope === \"surface\")\n"
        + "    .flatMap(group => group.assets),\n"
        + ");\n"
        + "export const WORLD_VISUAL_SKY_PROP_ASSETS_V3 = Object.freeze(\n"
        + "  WORLD_VISUAL_PROP_GROUPS_V3.filter(group => group.atlas.scope === \"sky\")\n"
        + "    .flatMap(group => group.assets),\n"
        + ");\n"
        + "export const WORLD_VISUAL_SURFACE_PROP_PLACEMENTS_V3 = Object.freeze(\n"
        + "  WORLD_VISUAL_PROP_GROUPS_V3.filter(group => group.atlas.scope === \"surface\")\n"
        + "    .flatMap(group => group.placements),\n"
        + ");\n"
        + "export const WORLD_VISUAL_SKY_PROP_PLACEMENTS_V3 = Object.freeze(\n"
        + "  WORLD_VISUAL_PROP_GROUPS_V3.filter(group => group.atlas.scope === \"sky\")\n"
        + "    .flatMap(group => group.placements),\n"
        + ");\n"
        + "export const WORLD_VISUAL_PROP_ASSET_BY_ID_V3 = Object.freeze(Object.fromEntries(\n"
        + "  [...WORLD_VISUAL_SURFACE_PROP_ASSETS_V3, ...WORLD_VISUAL_SKY_PROP_ASSETS_V3]\n"
        + "    .map(asset => [asset.id, asset]),\n"
        + "));\n"
        + "export const WORLD_VISUAL_PROP_RUNTIME_ASSETS_V3 = Object.freeze(Object.fromEntries(\n"
        + "  [...WORLD_VISUAL_SURFACE_PROP_ASSETS_V3, ...WORLD_VISUAL_SKY_PROP_ASSETS_V3]\n"
        + "    .map(asset => [asset.id, Object.freeze({ key: asset.atlasKey, frame: asset.frame })]),\n"
        + "));\n"
    )
    path = GENERATED_ROOT / "index.js"
    path.write_text(content, encoding="utf-8")
    return path


def main() -> None:
    ASSET_ROOT.mkdir(parents=True, exist_ok=True)
    REVIEW_ROOT.mkdir(parents=True, exist_ok=True)
    GENERATED_ROOT.mkdir(parents=True, exist_ok=True)

    all_assets: list[dict] = []
    all_placements: list[dict] = []
    atlases: list[dict] = []
    generated_modules: list[Path] = []
    category_reviews: list[Path] = []
    category_frames: list[tuple[Category, list[dict]]] = []
    module_payloads = []

    for category in CATEGORIES:
        extracted = extract_frames(category)
        webp_path, json_path, packed = pack_atlas(category, extracted)
        atlas_key = f"surface-sky-props-v3-{category.slug}"
        atlas = {
            "id": category.slug,
            "label": category.label,
            "scope": category.scope,
            "key": atlas_key,
            "path": webp_path.relative_to(ROOT).as_posix(),
            "dataPath": json_path.relative_to(ROOT).as_posix(),
            "imageSha256": sha256(webp_path),
            "dataSha256": sha256(json_path),
            "dimensions": {
                "width": Image.open(webp_path).width,
                "height": Image.open(webp_path).height,
            },
            "frameCount": len(packed),
        }
        assets = []
        for frame in packed:
            item = frame["item"]
            rect = frame["atlasFrame"]
            aspect = rect["width"] / rect["height"]
            assets.append({
                "id": frame["assetId"],
                "label": item.label,
                "scope": category.scope,
                "categoryId": category.slug,
                "atlasKey": atlas_key,
                "frame": frame["assetId"],
                "heightMeters": item.height_meters,
                "expectedSource": {
                    "width": rect["width"],
                    "height": rect["height"],
                },
                "motionProfile": item.motion_profile,
                "visualInfluenceRadiusTiles": round(
                    max(.62, item.height_meters * aspect * .62), 3
                ),
                "sourceCell": frame["sourceCell"],
                "sourceMargins": list(frame["sourceMargins"]),
                "atlasFrame": rect,
            })
        placements = (
            pack_surface_placements(category, assets)
            if category.scope == "surface"
            else build_sky_placements(category, assets)
        )
        all_assets.extend(assets)
        all_placements.extend(placements)
        atlases.append(atlas)
        module_payloads.append((category, atlas, assets, placements))
        category_reviews.append(build_category_review(category, extracted))
        category_frames.append((category, extracted))

    validate_placements(
        {asset["id"]: asset for asset in all_assets},
        all_placements,
    )

    for category, atlas, assets, placements in module_payloads:
        generated_modules.append(
            write_generated_module(category, atlas, assets, placements)
        )
    generated_index = write_generated_index(CATEGORIES)
    overview = build_overview(category_frames)

    manifest = {
        "version": "surface-sky-props-v3-2026-07-29",
        "generatedBy": "ai-tools/2026-07-29-build-surface-sky-props-v3.py",
        "imageGeneration": {
            "mode": "OpenAI built-in image generation",
            "sourceStyle": "premium painterly-realistic side-on Dig Game world props",
            "sourceCount": 10,
            "sourceGrid": {"columns": GRID_COLUMNS, "rows": GRID_ROWS},
        },
        "counts": {
            "total": len(all_assets),
            "surface": sum(asset["scope"] == "surface" for asset in all_assets),
            "sky": sum(asset["scope"] == "sky" for asset in all_assets),
            "atlases": len(atlases),
            "placements": len(all_placements),
        },
        "physicalScale": {
            "tileSize": TILE_SIZE,
            "playerHeightMeters": PLAYER_HEIGHT_METERS,
            "playerVisibleHeightTiles": PLAYER_VISIBLE_HEIGHT_TILES,
            "worldPixelsPerMeter": WORLD_PIXELS_PER_METER,
            "sizeScales": SIZE_SCALES,
            "laneScales": LANE_SCALES,
            "dynamicScaleMaximum": DYNAMIC_SCALE_MAX,
        },
        "protectedPlacementContract": {
            "surfaceZones": [
                {"id": zone[0], "levels": list(zone[1]), "leftTile": zone[2], "rightTile": zone[3]}
                for zone in SURFACE_PROTECTED_ZONES
            ],
            "v11PortalSlots": [81, 85, 89, 93, 143, 147, 151, 155],
            "v11Pillars": [88, 150],
            "heavenblockInteractionCenters": [224, 231, 237],
            "heavenblockInteractionRadiusTiles": 1.35,
        },
        "atlases": atlases,
        "assets": all_assets,
        "placements": all_placements,
        "generatedModules": [
            path.relative_to(ROOT).as_posix()
            for path in [*generated_modules, generated_index]
        ],
        "reviewOutputs": [
            path.relative_to(ROOT).as_posix()
            for path in [*category_reviews, overview]
        ],
    }
    MANIFEST_PATH.write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        f"Built {len(all_assets)} props ({manifest['counts']['surface']} surface / "
        f"{manifest['counts']['sky']} sky) across {len(atlases)} atlases."
    )
    print(f"Manifest: {MANIFEST_PATH.relative_to(ROOT)}")
    print(f"Overview: {overview.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
