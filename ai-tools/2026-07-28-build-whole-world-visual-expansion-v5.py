"""Build the additive whole-world visual expansion V5 production package.

The 100 built-in ImageGen originals remain untouched in Codex's generated-image
archive. This builder copies them into the review library, then derives:

- 50 opaque scenic background cards;
- 40 irregularly feathered authoritative-ground material plates;
- 10 alpha-isolated, overlap-safe surface-ground strips;
- 10 x 20-frame exposed-ground cap atlases; and
- one 16-frame irregular scenic-card blend-mask atlas.
"""

from __future__ import annotations

import hashlib
import json
import math
import random
import shutil
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
GENERATED_DIR = Path(
    r"C:\Users\Mila\.codex\generated_images"
    r"\019f9bc1-a932-7b01-b43b-3d804f0345c6"
)
REVIEW_DIR = ROOT / "visual-approval-previews" / "whole-world-visual-expansion-v5"
SOURCE_DIR = REVIEW_DIR / "sources"
BACKGROUND_DIR = (
    ROOT / "sprites" / "backgrounds" / "world-visual-v2" / "depth"
    / "biome-expansion-v5"
)
TERRAIN_DIR = (
    ROOT / "sprites" / "backgrounds" / "world-visual-v2" / "depth"
    / "terrain-variation-v5"
)
SURFACE_DIR = (
    ROOT / "sprites" / "backgrounds" / "world-visual-v2" / "surface"
    / "surface-ground-variation-v5"
)
MANIFEST_PATH = REVIEW_DIR / "2026-07-28-whole-world-visual-expansion-v5.json"
PROMPT_MANIFEST_PATH = REVIEW_DIR / "2026-07-28-imagegen-prompt-manifest.md"
BACKGROUND_CONTACT_PATH = REVIEW_DIR / "2026-07-28-backgrounds-contact-sheet-v5.jpg"
TERRAIN_CONTACT_PATH = REVIEW_DIR / "2026-07-28-terrain-contact-sheet-v5.jpg"
SURFACE_CONTACT_PATH = REVIEW_DIR / "2026-07-28-surface-ground-contact-sheet-v5.png"

EXPECTED_SIZE = (1536, 1024)
PLATE_FEATHER = (192, 128)
CAP_SIZE = (256, 96)
CAP_GRID = (5, 4)
CAP_COUNT = 20
MASK_FRAME_SIZE = (384, 256)
MASK_GRID = (4, 4)
MASK_FEATHER = (48, 32)
SURFACE_SIZE = (1536, 160)
SURFACE_OVERLAP_PX = 192
SURFACE_BOTTOM_FADE_PX = 48

BIOMES = (
    ("weathered-roots", "Weathered Roots"),
    ("blue-caverns", "Blue Caverns"),
    ("amber-depths", "Amber Depths"),
    ("silver-core", "Silver Core"),
    ("core-magma", "Core Magma"),
    ("slagworks", "Slagworks"),
    ("obsidian-catacombs", "Obsidian Catacombs"),
    ("pressure-foundry", "Pressure Foundry"),
    ("blackglass-abyss", "Blackglass Abyss"),
    ("starfire-rift", "Starfire Rift"),
)

# One built-in ImageGen call produced each distinct source. File IDs are pinned
# so the build never accidentally imports unrelated images from the same thread.
SOURCE_FILES = (
    ("bg-starfire-rift-terminal-rift-overlook-v5", "exec-6337ef89-ab76-4476-b729-f2406a47321c.png"),
    ("bg-weathered-roots-rootwater-sink-valley-v5", "exec-3518dffe-db12-4db9-8f52-c7c457bc653f.png"),
    ("bg-weathered-roots-shale-root-escarpment-v5", "exec-8a662e1b-8931-4de9-a4bf-badfc6f57b7a.png"),
    ("bg-blue-caverns-cobalt-river-switchback-v5", "exec-6a81ace8-f44b-4201-a23b-c20e27aeeb9a.png"),
    ("bg-blue-caverns-glacial-fault-overlook-v5", "exec-158ecc1c-1ae9-4736-a552-1ff0227103d5.png"),
    ("bg-blue-caverns-amber-silt-handoff-v5", "exec-bfb479ad-557a-42b6-af9a-b310a70bd46e.png"),
    ("bg-amber-depths-resin-tide-escarpment-v5", "exec-ee6618eb-e211-4a5b-b6c5-7c73674a6712.png"),
    ("bg-amber-depths-fossil-forest-gorge-v5", "exec-f1e016e0-1e39-4aca-86c6-30635e7f4296.png"),
    ("bg-amber-depths-argent-calcite-handoff-v5", "exec-dbe7c605-ed05-4fe6-8727-0fd13f52e6a9.png"),
    ("bg-silver-core-mercury-delta-terraces-v5", "exec-8dad22f6-11ef-4e72-9d12-7f663f48bdfc.png"),
    ("bg-silver-core-magnetic-shear-horizon-v5", "exec-efa0c744-c8d8-4ede-908d-a8bfc52522d4.png"),
    ("bg-silver-core-ember-metal-handoff-v5", "exec-142c1d50-a95a-4fc2-b8d1-0fb086cea624.png"),
    ("bg-core-magma-lava-braided-canyon-v5", "exec-ae575d6d-b63f-422c-8c5b-6b9066b4ba29.png"),
    ("bg-core-magma-caldera-wall-crossing-v5", "exec-3fbaba02-bc15-4b44-ac91-caab6c2a3a9a.png"),
    ("bg-core-magma-basalt-storm-gallery-v5", "exec-516dda4d-c6c4-4b6d-bb72-81f5809c24eb.png"),
    ("bg-core-magma-slag-heat-handoff-v5", "exec-65cc34ed-eb38-4471-9566-eaffb9aac8e4.png"),
    ("bg-slagworks-iron-river-sorting-yard-v5", "exec-5b7f8587-44a7-45cc-9e9e-b6ebb59c69f3.png"),
    ("bg-slagworks-collapsed-bloomery-terraces-v5", "exec-aa21f26d-b804-4a7d-ba58-b072eee2a017.png"),
    ("bg-slagworks-cooling-viaduct-horizon-v5", "exec-b10d0633-07de-4f30-b433-0b16d1bc478e.png"),
    ("bg-slagworks-crucible-waste-delta-v5", "exec-4fd1cb05-46e9-415f-baa9-986db6346fe5.png"),
    ("bg-slagworks-copper-salt-vent-field-v5", "exec-0169a625-1f5a-484c-8df3-1ea2e3ad0595.png"),
    ("bg-slagworks-blackslag-handoff-v5", "exec-d2d6de28-7f48-438c-afc4-ebe57ce14702.png"),
    ("bg-obsidian-catacombs-glass-fjord-escarpment-v5", "exec-617727a0-9af0-424a-bff2-157cabb5c520.png"),
    ("bg-obsidian-catacombs-violet-ash-switchback-v5", "exec-3cef1d47-59eb-45f1-bff8-215e710a6465.png"),
    ("bg-obsidian-catacombs-crypt-quarry-horizon-v5", "exec-af22448f-309f-41eb-a8ab-aa9773ea3028.png"),
    ("bg-obsidian-catacombs-shattered-column-rain-v5", "exec-22c7aada-1ae1-4438-a2b3-1659a2a54c58.png"),
    ("bg-obsidian-catacombs-voidwater-trench-v5", "exec-acd41701-f6b3-4dd2-8f9b-b5b1dcb09033.png"),
    ("bg-obsidian-catacombs-condenser-ruin-handoff-v5", "exec-f563643e-29d6-4074-a316-d8d6978bdb34.png"),
    ("bg-pressure-foundry-piston-ravine-crossing-v5", "exec-32b165d3-75ab-4db0-8230-28c212dc7958.png"),
    ("bg-pressure-foundry-boiler-canopy-delta-v5", "exec-c2297ebb-8a2a-4bc7-9326-a774ba6c8a56.png"),
    ("bg-pressure-foundry-pressure-pipe-horizon-v5", "exec-9f0c1130-2d98-4309-aa22-4907a5ecba83.png"),
    ("bg-pressure-foundry-cyan-condensate-falls-v5", "exec-1f42e377-603e-46fa-b55b-138f138c2743.png"),
    ("bg-pressure-foundry-rivet-cliff-reservoir-v5", "exec-088e04f4-8e45-4789-8dff-7e0ef6793cd8.png"),
    ("bg-pressure-foundry-turbine-graveyard-slope-v5", "exec-901c18c4-7515-4fbd-916e-a9ccf6327c87.png"),
    ("bg-pressure-foundry-prism-coolant-handoff-v5", "exec-ad3e28df-451a-4d2f-aa6c-bd4942286272.png"),
    ("bg-blackglass-abyss-prism-rift-escarpment-v5", "exec-b9f5360a-fb68-45bb-9b7f-ba4fdf019bef.png"),
    ("bg-blackglass-abyss-eclipse-shard-delta-v5", "exec-b94e8111-3430-43fd-9d0a-6c02ffebcfee.png"),
    ("bg-blackglass-abyss-star-map-fault-valley-v5", "exec-2fa23f8e-9886-4886-b65e-78c7a2cf8ea3.png"),
    ("bg-blackglass-abyss-black-mirror-tideway-v5", "exec-92161836-4994-439b-a22a-fa3133c68306.png"),
    ("bg-blackglass-abyss-spectral-scree-horizon-v5", "exec-26d6813b-801a-4a7d-8299-67fa3ef4e1d8.png"),
    ("bg-blackglass-abyss-fractured-orbit-terraces-v5", "exec-86c8bdc2-8db3-4759-8d31-6614486e6320.png"),
    ("bg-blackglass-abyss-violet-gravity-shear-v5", "exec-b2b58a8e-b52c-4425-a152-4051c4f151f2.png"),
    ("bg-blackglass-abyss-starfire-handoff-corridor-v5", "exec-57a62fdb-7e78-4dc3-a9d3-a22065fd2be3.png"),
    ("bg-starfire-rift-comet-river-terraces-v5", "exec-06d21c03-7f89-431a-903e-ef1f6dc12cea.png"),
    ("bg-starfire-rift-nebula-quartz-escarpment-v5", "exec-6981c938-1c3f-4be8-9c9e-3e7b4d64d84e.png"),
    ("bg-starfire-rift-binary-light-faultfield-v5", "exec-a375b0e0-754a-4957-95af-86856afb5704.png"),
    ("bg-starfire-rift-celestial-current-canyon-v5", "exec-1a542cc8-727c-4210-a10c-23789e65d13f.png"),
    ("bg-starfire-rift-star-metal-archipelago-v5", "exec-cd8da51e-aef8-4ba0-a403-138ed240618e.png"),
    ("bg-starfire-rift-cosmic-ash-watercourse-v5", "exec-41253597-cc59-4bc9-9a54-1b96a93eebc9.png"),
    ("bg-starfire-rift-aurora-crystal-horizon-v5", "exec-d399af87-3d73-4340-889e-958365f4d634.png"),
    ("terrain-weathered-roots-lightning-root-braided-clay-v5", "exec-7cdaf040-15d0-48e4-af69-e5cadea776fb.png"),
    ("terrain-weathered-roots-ironwater-loam-avulsion-v5", "exec-370712e9-ee54-414e-864d-ff7662bf2bae.png"),
    ("terrain-blue-caverns-glacial-fan-calcite-v5", "exec-bcbeacac-fbb5-46e7-98e6-1127300fcc19.png"),
    ("terrain-blue-caverns-cobalt-turbidite-tear-v5", "exec-64f80c2b-1010-4649-a267-36acc1dac8a6.png"),
    ("terrain-amber-depths-resin-delta-breccia-v5", "exec-f82ebe6b-3a67-4a2e-a53e-c01a15e4638f.png"),
    ("terrain-amber-depths-fossil-sun-ripple-fault-v5", "exec-cc1f4683-5bb8-44eb-99f3-05438231a783.png"),
    ("terrain-silver-core-mercury-slickenside-fan-v5", "exec-1668a140-43b1-4d48-bc0f-9cdc765bdc7a.png"),
    ("terrain-silver-core-magnetite-needle-avalanche-v5", "exec-5db4c3e2-2d85-48ad-a605-0ca32ff1bdda.png"),
    ("terrain-core-magma-lava-bomb-impact-field-v5", "exec-769ee193-98bb-4962-ba2c-4708d938fdb5.png"),
    ("terrain-core-magma-basalt-ropefold-shear-v5", "exec-287cfabd-bf44-4568-bf1a-a494811bb54b.png"),
    ("terrain-core-magma-ember-dike-branching-v5", "exec-4f6c14cf-374c-4e09-b71b-dad4b4666d13.png"),
    ("terrain-slagworks-clinker-avalanche-scab-v5", "exec-d43912e3-a901-4efd-b93b-fa597100ce57.png"),
    ("terrain-slagworks-copper-salt-boil-v5", "exec-5be447d1-0b6e-41d0-8d01-ffa59e908823.png"),
    ("terrain-slagworks-rail-iron-breccia-v5", "exec-25d9d8ed-cefe-47b3-aa3d-4908274119c5.png"),
    ("terrain-slagworks-refractory-spall-fan-v5", "exec-f35d02c5-6456-4f6d-a146-8f5ef19b1823.png"),
    ("terrain-slagworks-quenched-slag-river-v5", "exec-4dc48a54-fddd-4877-bea8-2d35383695d1.png"),
    ("terrain-obsidian-catacombs-blackglass-conchoidal-storm-v5", "exec-7bdaa098-2cd4-4864-86fa-0b4042e46032.png"),
    ("terrain-obsidian-catacombs-violet-ash-debris-flow-v5", "exec-f4c57ef8-f4e6-4ca2-966f-1484b3862f23.png"),
    ("terrain-obsidian-catacombs-crypt-lime-prism-vein-v5", "exec-e2cd80ee-03f3-47a8-8e99-f3c90ea83337.png"),
    ("terrain-obsidian-catacombs-obsidian-pillow-fracture-v5", "exec-e4085cf5-2bf8-4e1c-a3de-d89eecfa4772.png"),
    ("terrain-obsidian-catacombs-cold-lava-shard-avulsion-v5", "exec-97b0bb7e-3cd7-4dba-a06b-fe987abcdfbc.png"),
    ("terrain-pressure-foundry-boiler-scale-blisterfield-v5", "exec-0ee61723-41fa-46d3-8a4e-00e19045835b.png"),
    ("terrain-pressure-foundry-cyan-coolant-mineral-delta-v5", "exec-d89cbb5b-a4dd-402b-8fa5-444f5df24455.png"),
    ("terrain-pressure-foundry-rivet-iron-sediment-fan-v5", "exec-298ccaa1-a409-48ba-9ec6-491ba98c2dba.png"),
    ("terrain-pressure-foundry-pressure-spall-shockwave-v5", "exec-9a210fca-bd3b-4185-8421-39d85a70a2fb.png"),
    ("terrain-pressure-foundry-condenser-salt-lace-v5", "exec-a905c41f-39a5-490a-bcfe-fc0d446be27a.png"),
    ("terrain-pressure-foundry-turbine-carbon-shear-v5", "exec-1c54061c-09a8-40c3-ae14-2a8c27a415f5.png"),
    ("terrain-blackglass-abyss-prism-splinter-breccia-v5", "exec-f319b6ad-7d08-426a-a145-113ffd665b90.png"),
    ("terrain-blackglass-abyss-eclipse-dust-turbidite-v5", "exec-556b6bc8-712e-465d-bf65-5d7245999b90.png"),
    ("terrain-blackglass-abyss-starlight-fracture-web-v5", "exec-6e4f09f1-4ce0-4eaf-8054-d8411a011f17.png"),
    ("terrain-blackglass-abyss-mirrorstone-tidal-shear-v5", "exec-b266b9ec-c082-48b9-aabf-4a8505cf2f9a.png"),
    ("terrain-blackglass-abyss-voidglass-impact-spray-v5", "exec-135bbc2e-ee45-4581-b121-5625248a93ae.png"),
    ("terrain-blackglass-abyss-spectral-mineral-avulsion-v5", "exec-820a34a7-ff41-4ccb-bb44-77e8c378dffe.png"),
    ("terrain-starfire-rift-cometglass-debris-stream-v5", "exec-a323fa76-c741-439a-9737-9b3501c8ed0f.png"),
    ("terrain-starfire-rift-nebula-quartz-lightning-v5", "exec-42c3b6ae-76c8-43ae-83a1-9c524f134f8d.png"),
    ("terrain-starfire-rift-star-metal-spherule-field-v5", "exec-a094ff4c-b002-4a05-be1b-ac5e9cb65b13.png"),
    ("terrain-starfire-rift-cosmic-ash-aurora-shear-v5", "exec-24137fce-a56d-4b55-ba5e-afcd4738642d.png"),
    ("terrain-starfire-rift-binary-crystal-melt-vein-v5", "exec-8ca74f16-1d55-4338-b50c-af6fbeefe6e4.png"),
    ("terrain-starfire-rift-celestial-breccia-cascade-v5", "exec-21701390-362b-4694-9ae2-a3820c6813f5.png"),
    ("terrain-starfire-rift-terminal-rift-meteorite-flow-v5", "exec-5d51e6e8-dab5-4a58-844b-2a170c9d5d79.png"),
    ("surface-rain-polished-slate-and-loam-v5", "exec-52fb78fc-f50c-4029-979e-cbf3e4cec96f.png"),
    ("surface-mossy-stone-root-break-v5", "exec-e1c80bdd-35fd-4bc9-ac71-dde15aa13cae.png"),
    ("surface-weathered-cobble-clay-v5", "exec-080a3fae-98db-47fb-8e84-e78c057728c5.png"),
    ("surface-frost-wet-slate-v5", "exec-0fe08cd6-4b9e-487b-9f8a-281ab0131305.png"),
    ("surface-ironwater-gravel-v5", "exec-51a1185a-753b-4d4e-b4d6-f64f49a3840d.png"),
    ("surface-storm-scoured-earth-v5", "exec-d85f2085-ab74-42ed-bcb3-151f31828d19.png"),
    ("surface-orchard-root-stone-v5", "exec-526bf4ae-7d0a-4ac1-a682-2a0e0537a338.png"),
    ("surface-broken-town-slate-v5", "exec-107944ee-ad50-42f0-b83f-27df75c69777.png"),
    ("surface-mist-soaked-peat-stone-v5", "exec-e94c1986-77cc-46e2-a570-7e26c1171359.png"),
    ("surface-eastern-expedition-rock-v5", "exec-fdcfba01-e56e-4b17-b722-bacf6215097a.png"),
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def smoothstep(values: np.ndarray) -> np.ndarray:
    values = np.clip(values, 0.0, 1.0)
    return values * values * (3.0 - 2.0 * values)


def kind_for(stem: str) -> str:
    if stem.startswith("bg-"):
        return "background"
    if stem.startswith("terrain-"):
        return "terrain"
    if stem.startswith("surface-"):
        return "surface"
    raise RuntimeError(f"Unknown source kind: {stem}")


def biome_for(stem: str) -> str:
    if stem.startswith("surface-"):
        return "surface"
    prefix = "bg-" if stem.startswith("bg-") else "terrain-"
    for biome_id, _ in BIOMES:
        if stem.startswith(f"{prefix}{biome_id}-"):
            return biome_id
    raise RuntimeError(f"Unknown source biome: {stem}")


def source_folder(kind: str) -> str:
    return {
        "background": "backgrounds",
        "terrain": "terrain",
        "surface": "surface",
    }[kind]


def require_image(path: Path) -> None:
    if not path.is_file():
        raise RuntimeError(f"Missing pinned ImageGen source: {path}")
    with Image.open(path) as image:
        if image.size != EXPECTED_SIZE:
            raise RuntimeError(
                f"{path.name}: expected {EXPECTED_SIZE}, found {image.size}"
            )


def copy_sources() -> list[dict[str, object]]:
    copied: list[dict[str, object]] = []
    if len(SOURCE_FILES) != 100 or len({stem for stem, _ in SOURCE_FILES}) != 100:
        raise RuntimeError("Pinned ImageGen source inventory must contain 100 unique assets")
    for index, (stem, generated_name) in enumerate(SOURCE_FILES, start=1):
        source = GENERATED_DIR / generated_name
        require_image(source)
        kind = kind_for(stem)
        destination = SOURCE_DIR / source_folder(kind) / f"{stem}.png"
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)
        copied.append({
            "index": index,
            "id": stem,
            "kind": kind,
            "biomeId": biome_for(stem),
            "generatedOriginal": str(source),
            "reviewSource": destination.relative_to(ROOT).as_posix(),
            "sourceSha256": sha256(destination),
        })
    return copied


def low_frequency_wave(
    length: int,
    phase: float,
    period_a: float,
    period_b: float,
) -> np.ndarray:
    positions = np.arange(length, dtype=np.float32)
    return (
        np.sin(positions * math.tau / period_a + phase)
        + 0.45 * np.sin(positions * math.tau / period_b + phase * 1.71)
    )


def irregular_feather_alpha(
    size: tuple[int, int],
    feather: tuple[int, int],
    seed: int,
) -> np.ndarray:
    width, height = size
    fx, fy = feather
    rng = random.Random(seed)
    x = np.arange(width, dtype=np.float32)
    y = np.arange(height, dtype=np.float32)
    vertical_wave = low_frequency_wave(
        height,
        rng.uniform(0.0, math.tau),
        rng.uniform(171.0, 249.0),
        rng.uniform(61.0, 103.0),
    )
    horizontal_wave = low_frequency_wave(
        width,
        rng.uniform(0.0, math.tau),
        rng.uniform(239.0, 381.0),
        rng.uniform(89.0, 157.0),
    )
    left_width = np.clip(fx + vertical_wave * fx * 0.12, fx * 0.72, fx * 1.28)
    right_width = np.clip(
        fx + np.roll(vertical_wave, height // 3) * fx * 0.12,
        fx * 0.72,
        fx * 1.28,
    )
    top_width = np.clip(fy + horizontal_wave * fy * 0.14, fy * 0.7, fy * 1.3)
    bottom_width = np.clip(
        fy + np.roll(horizontal_wave, width // 4) * fy * 0.14,
        fy * 0.7,
        fy * 1.3,
    )
    horizontal = smoothstep(x[None, :] / left_width[:, None])
    horizontal *= smoothstep(x[::-1][None, :] / right_width[:, None])
    vertical = smoothstep(y[:, None] / top_width[None, :])
    vertical *= smoothstep(y[::-1][:, None] / bottom_width[None, :])
    return horizontal * vertical


def build_background(entry: dict[str, object], source: Path) -> dict[str, object]:
    image = Image.open(source).convert("RGB")
    runtime_name = source.stem.removeprefix("bg-") + ".webp"
    runtime_path = BACKGROUND_DIR / runtime_name
    runtime_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(runtime_path, "WEBP", quality=88, method=6)
    return {
        **entry,
        "runtime": runtime_path.relative_to(ROOT).as_posix(),
        "width": image.width,
        "height": image.height,
        "runtimeSha256": sha256(runtime_path),
        "runtimeBytes": runtime_path.stat().st_size,
    }


def build_terrain(entry: dict[str, object], source: Path) -> dict[str, object]:
    image = Image.open(source).convert("RGB")
    seed = int(hashlib.sha256(source.stem.encode()).hexdigest()[:8], 16)
    alpha = np.round(
        irregular_feather_alpha(image.size, PLATE_FEATHER, seed) * 255.0
    ).astype(np.uint8)
    rgba = np.dstack((np.asarray(image, dtype=np.uint8), alpha))
    runtime_name = source.stem.removeprefix("terrain-") + ".webp"
    runtime_path = TERRAIN_DIR / runtime_name
    runtime_path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(rgba, "RGBA").save(
        runtime_path,
        "WEBP",
        quality=90,
        method=6,
        exact=True,
    )
    return {
        **entry,
        "runtime": runtime_path.relative_to(ROOT).as_posix(),
        "width": image.width,
        "height": image.height,
        "featherPx": list(PLATE_FEATHER),
        "featherShape": "irregular-low-frequency",
        "alphaMin": int(alpha.min()),
        "alphaMax": int(alpha.max()),
        "runtimeSha256": sha256(runtime_path),
        "runtimeBytes": runtime_path.stat().st_size,
    }


def estimate_chroma(rgb: np.ndarray) -> np.ndarray:
    red = rgb[..., 0].astype(np.int16)
    green = rgb[..., 1].astype(np.int16)
    blue = rgb[..., 2].astype(np.int16)
    candidates = (
        (green >= 170)
        & (green - red >= 65)
        & (green - blue >= 65)
    )
    if int(candidates.sum()) < rgb.shape[0] * rgb.shape[1] * 0.18:
        raise RuntimeError("Surface source has too little connected chroma field")
    return np.median(rgb[candidates], axis=0).astype(np.float32)


def smooth_columns(values: np.ndarray, radius: int = 10) -> np.ndarray:
    kernel = np.ones(radius * 2 + 1, dtype=np.float32)
    kernel /= kernel.sum()
    padded = np.pad(values, (radius, radius), mode="edge")
    return np.convolve(padded, kernel, mode="valid")


def extract_surface_alpha(
    image: Image.Image,
) -> tuple[np.ndarray, np.ndarray, dict[str, object]]:
    rgb_u8 = np.asarray(image.convert("RGB"), dtype=np.uint8)
    rgb = rgb_u8.astype(np.float32)
    chroma = estimate_chroma(rgb_u8)
    distance = np.linalg.norm(rgb - chroma[None, None, :], axis=2)
    dominance = rgb[..., 1] - np.maximum(rgb[..., 0], rgb[..., 2])
    chroma_like = (distance < 92.0) & (dominance > 54.0)
    solid_score = (~chroma_like).astype(np.int16)
    run = np.zeros_like(solid_score)
    for offset in range(7):
        run[:-6] += solid_score[offset:offset + solid_score.shape[0] - 6]
    boundary = np.argmax(run >= 5, axis=0).astype(np.float32)
    missing = ~np.any(run >= 5, axis=0)
    if np.any(missing):
        boundary[missing] = np.median(boundary[~missing])
    boundary = smooth_columns(boundary, 7)

    rows = np.arange(rgb.shape[0], dtype=np.float32)[:, None]
    geometric_alpha = np.clip((rows - boundary[None, :] + 2.0) / 6.0, 0.0, 1.0)
    edge_alpha = np.clip((distance - 10.0) / 82.0, 0.0, 1.0)
    alpha = np.maximum(geometric_alpha, edge_alpha * (rows >= boundary[None, :]))
    alpha[rows < boundary[None, :] - 3.0] = 0.0
    alpha[rows > boundary[None, :] + 6.0] = 1.0
    alpha = smoothstep(alpha)

    safe_alpha = np.maximum(alpha[..., None], 0.04)
    decontaminated = (
        rgb - chroma[None, None, :] * (1.0 - alpha[..., None])
    ) / safe_alpha
    decontaminated = np.clip(decontaminated, 0.0, 255.0)
    decontaminated[alpha < 0.01] = 0.0
    rgba = np.dstack((
        decontaminated.astype(np.uint8),
        np.round(alpha * 255.0).astype(np.uint8),
    ))
    return rgba, boundary, {
        "chromaRgb": [int(round(value)) for value in chroma],
        "sourceBoundaryYMin": round(float(boundary.min()), 2),
        "sourceBoundaryYMax": round(float(boundary.max()), 2),
    }


def build_surface(entry: dict[str, object], source: Path) -> dict[str, object]:
    image = Image.open(source).convert("RGB")
    source_rgba, boundary, alpha_stats = extract_surface_alpha(image)
    alpha_review_path = (
        SOURCE_DIR / "surface-alpha" / f"{source.stem}-alpha.png"
    )
    alpha_review_path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(source_rgba, "RGBA").save(
        alpha_review_path,
        "PNG",
        optimize=True,
    )

    width, height = SURFACE_SIZE
    low = float(np.percentile(boundary, 4))
    high = float(np.percentile(boundary, 96))
    span = max(20.0, high - low)
    destination_boundary = np.clip(
        7.0 + (boundary - low) / span * 48.0,
        4.0,
        60.0,
    )
    columns = np.arange(width)
    strip = np.zeros((height, width, 4), dtype=np.uint8)
    for y in range(height):
        valid = y >= destination_boundary
        source_y = np.clip(
            np.round(boundary + (y - destination_boundary) * 2.35),
            0,
            source_rgba.shape[0] - 1,
        ).astype(np.int32)
        sampled = source_rgba[source_y, columns].copy()
        sampled[~valid, 3] = 0
        strip[y] = sampled

    x = np.arange(width, dtype=np.float32)
    side = smoothstep(
        np.minimum(x, x[::-1]) / float(SURFACE_OVERLAP_PX)
    )
    bottom = smoothstep(
        np.arange(height, dtype=np.float32)[::-1]
        / float(SURFACE_BOTTOM_FADE_PX)
    )
    feather = side[None, :] * bottom[:, None]
    strip[..., 3] = np.round(strip[..., 3].astype(np.float32) * feather).astype(np.uint8)

    runtime_path = SURFACE_DIR / f"{source.stem}.webp"
    runtime_path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(strip, "RGBA").save(
        runtime_path,
        "WEBP",
        quality=91,
        method=6,
        exact=True,
    )
    coverage = float(np.count_nonzero(strip[..., 3] >= 128) / strip[..., 3].size)
    return {
        **entry,
        "alphaReview": alpha_review_path.relative_to(ROOT).as_posix(),
        "runtime": runtime_path.relative_to(ROOT).as_posix(),
        "width": width,
        "height": height,
        "overlapPx": SURFACE_OVERLAP_PX,
        "bottomFadePx": SURFACE_BOTTOM_FADE_PX,
        "opaqueCoverage": round(coverage, 6),
        "runtimeSha256": sha256(runtime_path),
        "runtimeBytes": runtime_path.stat().st_size,
        **alpha_stats,
    }


def cap_alpha(frame_seed: int) -> np.ndarray:
    width, height = CAP_SIZE
    x = np.arange(width, dtype=np.float32)
    rng = random.Random(frame_seed)
    boundary = (
        61.0
        + 10.0 * np.sin(x * math.tau / rng.uniform(87.0, 153.0) + rng.random() * math.tau)
        + 5.5 * np.sin(x * math.tau / rng.uniform(33.0, 61.0) + rng.random() * math.tau)
        + 2.5 * np.sin(x * math.tau / rng.uniform(17.0, 31.0) + rng.random() * math.tau)
    )
    boundary = np.clip(boundary, 42.0, 86.0)
    rows = np.arange(height, dtype=np.float32)[:, None]
    vertical = smoothstep(np.clip((boundary[None, :] + 10.0 - rows) / 10.0, 0.0, 1.0))
    side = smoothstep(np.minimum(x, x[::-1]) / 18.0)[None, :]
    return vertical * side


def build_cap_atlas(
    biome_id: str,
    sources: list[Path],
    biome_index: int,
) -> dict[str, object]:
    frame_width, frame_height = CAP_SIZE
    columns, rows = CAP_GRID
    atlas = Image.new("RGBA", (frame_width * columns, frame_height * rows))
    opened = [Image.open(path).convert("RGB") for path in sources]
    frames: list[dict[str, object]] = []
    for frame_index in range(CAP_COUNT):
        source_index = frame_index % len(opened)
        source = opened[source_index]
        rng = random.Random(20260728 + biome_index * 1009 + frame_index * 67)
        crop_x = rng.randrange(0, source.width - frame_width + 1)
        crop_y = rng.randrange(0, source.height - frame_height + 1)
        crop = source.crop((
            crop_x,
            crop_y,
            crop_x + frame_width,
            crop_y + frame_height,
        ))
        alpha = np.round(
            cap_alpha(20260728 + biome_index * CAP_COUNT + frame_index) * 255.0
        ).astype(np.uint8)
        rgba = np.dstack((np.asarray(crop, dtype=np.uint8), alpha))
        frame = Image.fromarray(rgba, "RGBA")
        left = (frame_index % columns) * frame_width
        top = (frame_index // columns) * frame_height
        atlas.alpha_composite(frame, (left, top))
        frames.append({
            "index": frame_index,
            "source": sources[source_index].stem,
            "crop": [crop_x, crop_y, frame_width, frame_height],
        })
    for image in opened:
        image.close()
    runtime_path = TERRAIN_DIR / f"{biome_id}-exposed-top-caps-v5.webp"
    atlas.save(runtime_path, "WEBP", quality=91, method=6, exact=True)
    return {
        "biomeId": biome_id,
        "runtime": runtime_path.relative_to(ROOT).as_posix(),
        "frameWidth": frame_width,
        "frameHeight": frame_height,
        "columns": columns,
        "rows": rows,
        "frameCount": CAP_COUNT,
        "frames": frames,
        "runtimeSha256": sha256(runtime_path),
        "runtimeBytes": runtime_path.stat().st_size,
    }


def build_backdrop_mask_atlas() -> dict[str, object]:
    frame_width, frame_height = MASK_FRAME_SIZE
    columns, rows = MASK_GRID
    atlas = Image.new("RGBA", (frame_width * columns, frame_height * rows))
    x = np.arange(frame_width, dtype=np.float32)
    y = np.arange(frame_height, dtype=np.float32)
    for bits in range(16):
        alpha = np.ones((frame_height, frame_width), dtype=np.float32)
        vertical_wave = low_frequency_wave(
            frame_height,
            bits * 0.71 + 0.4,
            91.0,
            43.0,
        )
        horizontal_wave = low_frequency_wave(
            frame_width,
            bits * 0.53 + 0.8,
            137.0,
            59.0,
        )
        left_width = np.clip(
            MASK_FEATHER[0] + vertical_wave * 5.0,
            36.0,
            62.0,
        )
        right_width = np.clip(
            MASK_FEATHER[0] + np.roll(vertical_wave, 61) * 5.0,
            36.0,
            62.0,
        )
        top_width = np.clip(
            MASK_FEATHER[1] + horizontal_wave * 4.0,
            23.0,
            43.0,
        )
        bottom_width = np.clip(
            MASK_FEATHER[1] + np.roll(horizontal_wave, 97) * 4.0,
            23.0,
            43.0,
        )
        if bits & 1:
            alpha *= smoothstep(x[None, :] / left_width[:, None])
        if bits & 2:
            alpha *= smoothstep(x[::-1][None, :] / right_width[:, None])
        if bits & 4:
            alpha *= smoothstep(y[:, None] / top_width[None, :])
        if bits & 8:
            alpha *= smoothstep(y[::-1][:, None] / bottom_width[None, :])
        alpha_u8 = np.round(alpha * 255.0).astype(np.uint8)
        white = np.full_like(alpha_u8, 255)
        frame = Image.fromarray(
            np.dstack((white, white, white, alpha_u8)),
            "RGBA",
        )
        atlas.paste(
            frame,
            ((bits % columns) * frame_width, (bits // columns) * frame_height),
        )
    runtime_path = TERRAIN_DIR / "backdrop-card-blend-mask-atlas-v5.png"
    atlas.save(runtime_path, "PNG", optimize=True)
    return {
        "runtime": runtime_path.relative_to(ROOT).as_posix(),
        "frameWidth": frame_width,
        "frameHeight": frame_height,
        "columns": columns,
        "rows": rows,
        "frameCount": 16,
        "edgeBits": {"left": 1, "right": 2, "top": 4, "bottom": 8},
        "featherPxAtMaskScale": list(MASK_FEATHER),
        "shape": "irregular-low-frequency",
        "runtimeSha256": sha256(runtime_path),
        "runtimeBytes": runtime_path.stat().st_size,
    }


def checkerboard(size: tuple[int, int], cell: int = 12) -> Image.Image:
    canvas = Image.new("RGB", size, (29, 34, 41))
    draw = ImageDraw.Draw(canvas)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill=(49, 57, 67))
    return canvas


def contact_sheet(
    entries: list[dict[str, object]],
    destination: Path,
    *,
    columns: int,
    cell_size: tuple[int, int],
    alpha_preview: bool,
) -> None:
    cell_width, cell_height = cell_size
    rows = math.ceil(len(entries) / columns)
    sheet = Image.new("RGB", (cell_width * columns, cell_height * rows), (13, 16, 21))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for index, entry in enumerate(entries):
        path = ROOT / str(entry["runtime"])
        image = Image.open(path).convert("RGBA")
        bounds = (cell_width - 10, cell_height - 32)
        image.thumbnail(bounds, Image.Resampling.LANCZOS)
        canvas = checkerboard(bounds) if alpha_preview else Image.new("RGB", bounds, (8, 10, 14))
        left = (canvas.width - image.width) // 2
        top = (canvas.height - image.height) // 2
        canvas.paste(image, (left, top), image if alpha_preview else None)
        cell_left = (index % columns) * cell_width + 5
        cell_top = (index // columns) * cell_height + 4
        sheet.paste(canvas, (cell_left, cell_top))
        draw.text(
            (cell_left + 2, cell_top + canvas.height + 5),
            str(entry["id"])[:49],
            fill=(232, 236, 243),
            font=font,
        )
        image.close()
    if destination.suffix.lower() == ".jpg":
        sheet.save(destination, "JPEG", quality=89, optimize=True)
    else:
        sheet.save(destination, "PNG", optimize=True)


def write_docs(entries: list[dict[str, object]]) -> None:
    backgrounds = [entry for entry in entries if entry["kind"] == "background"]
    terrain = [entry for entry in entries if entry["kind"] == "terrain"]
    surface = [entry for entry in entries if entry["kind"] == "surface"]
    inventory = "\n".join(
        f"- `{entry['id']}` ({entry['kind']}, {entry['biomeId']})"
        for entry in entries
    )
    PROMPT_MANIFEST_PATH.write_text(
        "# Whole-World Visual Expansion V5 - ImageGen Prompt Manifest\n\n"
        "Generation mode: built-in ImageGen, one distinct call per 1536x1024 source.\n\n"
        "## Shared visual contract\n\n"
        "- Premium hand-painted 2D raster art; no HTML, canvas, procedural, or cheap overlay art.\n"
        "- Background buildings, bridges, roots, ruins, rails, and machines remain distant scenery.\n"
        "- Terrain paintings fill only the authoritative solid destructible-ground mask.\n"
        "- Surface sources use a flat green isolation field solely to recover their painted alpha edge.\n"
        "- Strong asymmetric macro events replace centered circles, safe wallpaper, and repeated folds.\n"
        "- Outer card edges remain compositionally quiet for overlap blending.\n"
        "- No players, creatures, UI, text, logos, tile grids, or gameplay collision silhouettes.\n\n"
        "## Accepted inventory\n\n"
        f"{inventory}\n",
        encoding="utf-8",
    )
    (REVIEW_DIR / "readme.md").write_text(
        "# Whole-World Visual Expansion V5\n\n"
        f"This additive review and production package contains {len(backgrounds)} scenic "
        f"backgrounds, {len(terrain)} underground terrain paintings, and {len(surface)} "
        "surface-ground edge sources. Every previous V2/V3/V4 asset remains installed.\n\n"
        "## Runtime ownership\n\n"
        "- Scenic cards are non-colliding background only.\n"
        "- Terrain plates, exposed caps, and surface strips are clipped by the existing "
        "authoritative solid-terrain mask.\n"
        "- No asset changes tile type, HP, collision, drops, resources, save data, or world layout.\n"
        "- `?biomeBackdropExpansionV5=0`, `?undergroundTerrainExpansionV5=0`, and "
        "`?surfaceGroundVariation=0` independently restore the exact prior pool for each layer.\n\n"
        "## Seam treatment\n\n"
        "Background cards use a 16-frame irregular feather mask. Each next biome starts "
        "128 px inside the previous raster composition and enters through that irregular "
        "mask. Terrain plates use 192x128 px low-frequency irregular feathers and the "
        "same 128 px depth-band overlap. Surface strips overlap by 192 px, fade into the "
        "installed base ground, and are never mirrored.\n",
        encoding="utf-8",
    )


def main() -> None:
    REVIEW_DIR.mkdir(parents=True, exist_ok=True)
    BACKGROUND_DIR.mkdir(parents=True, exist_ok=True)
    TERRAIN_DIR.mkdir(parents=True, exist_ok=True)
    SURFACE_DIR.mkdir(parents=True, exist_ok=True)

    copied = copy_sources()
    background_entries: list[dict[str, object]] = []
    terrain_entries: list[dict[str, object]] = []
    surface_entries: list[dict[str, object]] = []
    terrain_sources_by_biome: dict[str, list[Path]] = {
        biome_id: [] for biome_id, _ in BIOMES
    }

    for entry in copied:
        source = ROOT / str(entry["reviewSource"])
        if entry["kind"] == "background":
            background_entries.append(build_background(entry, source))
        elif entry["kind"] == "terrain":
            terrain_entries.append(build_terrain(entry, source))
            terrain_sources_by_biome[str(entry["biomeId"])].append(source)
        else:
            surface_entries.append(build_surface(entry, source))

    cap_entries = [
        build_cap_atlas(biome_id, terrain_sources_by_biome[biome_id], biome_index)
        for biome_index, (biome_id, _biome_name) in enumerate(BIOMES)
    ]
    mask_entry = build_backdrop_mask_atlas()

    contact_sheet(
        background_entries,
        BACKGROUND_CONTACT_PATH,
        columns=5,
        cell_size=(308, 226),
        alpha_preview=False,
    )
    contact_sheet(
        terrain_entries,
        TERRAIN_CONTACT_PATH,
        columns=5,
        cell_size=(308, 226),
        alpha_preview=True,
    )
    contact_sheet(
        surface_entries,
        SURFACE_CONTACT_PATH,
        columns=2,
        cell_size=(772, 138),
        alpha_preview=True,
    )
    all_entries = background_entries + terrain_entries + surface_entries
    write_docs(all_entries)

    deep_biomes = {
        "core-magma",
        "slagworks",
        "obsidian-catacombs",
        "pressure-foundry",
        "blackglass-abyss",
        "starfire-rift",
    }
    deep_master_count = sum(
        entry["biomeId"] in deep_biomes for entry in all_entries
    )
    manifest = {
        "version": 5,
        "generatedOn": "2026-07-28",
        "generatedWith": "built-in ImageGen",
        "sourceDimensions": list(EXPECTED_SIZE),
        "counts": {
            "imageGenMasters": len(all_entries),
            "backgrounds": len(background_entries),
            "terrainPlates": len(terrain_entries),
            "surfaceGroundSources": len(surface_entries),
            "deepMastersCoreMagmaOrLower": deep_master_count,
            "capAtlasFiles": len(cap_entries),
            "capFrames": len(cap_entries) * CAP_COUNT,
            "backgroundBlendMaskFrames": mask_entry["frameCount"],
            "runtimeFiles": (
                len(background_entries)
                + len(terrain_entries)
                + len(surface_entries)
                + len(cap_entries)
                + 1
            ),
        },
        "contracts": {
            "promotion": "additive; V2/V3/V4 assets remain installed and selectable",
            "background": "scenery only; no collision or playable ledges",
            "ground": "authoritative terrain geometry mask remains the only ground authority",
            "motion": "existing image/video motion remains independent of this static expansion",
            "rollback": {
                "background": "?biomeBackdropExpansionV5=0",
                "terrain": "?undergroundTerrainExpansionV5=0",
                "surface": "?surfaceGroundVariation=0",
            },
        },
        "geometry": {
            "background": {
                "width": EXPECTED_SIZE[0],
                "height": EXPECTED_SIZE[1],
                "overlapPx": list(PLATE_FEATHER),
                "crossBiomeOverlapYPx": 128,
                "blendMask": "irregular-low-frequency",
            },
            "terrain": {
                "width": EXPECTED_SIZE[0],
                "height": EXPECTED_SIZE[1],
                "featherPx": list(PLATE_FEATHER),
                "crossBiomeOverlapYPx": 128,
                "featherShape": "irregular-low-frequency",
            },
            "surface": {
                "width": SURFACE_SIZE[0],
                "height": SURFACE_SIZE[1],
                "overlapPx": SURFACE_OVERLAP_PX,
                "bottomFadePx": SURFACE_BOTTOM_FADE_PX,
            },
        },
        "backgrounds": background_entries,
        "terrainPlates": terrain_entries,
        "surfaceGround": surface_entries,
        "capAtlases": cap_entries,
        "backgroundBlendMaskAtlas": mask_entry,
        "contactSheets": [
            BACKGROUND_CONTACT_PATH.relative_to(ROOT).as_posix(),
            TERRAIN_CONTACT_PATH.relative_to(ROOT).as_posix(),
            SURFACE_CONTACT_PATH.relative_to(ROOT).as_posix(),
        ],
        "promptManifest": PROMPT_MANIFEST_PATH.relative_to(ROOT).as_posix(),
    }
    MANIFEST_PATH.write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(manifest["counts"], indent=2))


if __name__ == "__main__":
    main()
