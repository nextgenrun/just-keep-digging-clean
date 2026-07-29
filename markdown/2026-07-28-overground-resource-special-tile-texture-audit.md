# Overground resource and special-tile texture audit

Date: 2026-07-28  
Status: approved wide-variation embedded-resource direction promoted  
Scope: default semantic renderer, streamed Level 1 facade, deep scenic facade,
resource recognition, and previously approved special tiles

## Final correction

Resources are not blocks or isolated emblems. They are transparent, top-down
2D seams, plates, ribs, pockets, and mineral clusters embedded across the
current ground material.

The rejected opaque resource blocks, perspective slabs, isometric cuts,
extruded sides, baked ground squares, HTML effects, and Phaser-drawn ore lines
are not part of the production default. Resource identity comes from authored
ImageGen pixels; Phaser only loads and places the raster frames.

## Approved resource set

All ten resources use newly authored ImageGen ground formations:

| Resource | Readable embedded identity |
|---|---|
| Stone | broad pale fractured stone plates |
| Copper | branching native-copper veins with turquoise oxidation |
| Bronze | warm bronze plate fans with restrained patina |
| Iron | dark parallel iron ribs with rust-red seams |
| Steel | cold silver-blue needle bands |
| Silver | bright liquid-silver ribbons |
| Gold | rounded native-gold nodules connected by a bold vein |
| Obsidian | flat black-glass shards with violet/cyan fractures |
| Ember Ore | porous dark cinder pockets with contained orange embers |
| Magma Crystal | angular red-orange crystal seams |

Each resource has six genuinely different deterministic 188 px variants in
the semantic atlas and six 94 px counterparts in the facade recognition atlas.
Both atlases contain real alpha, so the live soil, stone, or volcanic geology
remains visible beneath the resource.

## Runtime assets

- Semantic resource atlas:
  `sprites/backgrounds/world-visual-v2/semantic-decals-v1/resource-ground-veins-imagegen-2d-v6.png`
- Facade and fallback recognition atlas:
  `sprites/backgrounds/world-scenic-regions-v1/level1-ground-recognition-atlas-v7.png`
- Inspectable per-resource references:
  `sprites/tiles/resource-ground-veins-imagegen-v6-2d/`
- ImageGen sources, alpha sheets, and hashes:
  `sprites/backgrounds/world-visual-v2/semantic-decals-v1/imagegen-ground-veins-2d-v6/`
- In-game ground comparison:
  `visual-approval-previews/overground-texture-audit-v8-wide-embedded-runtime/`

The default semantic and facade routes both use these transparent assets. The
old procedural resource-vein renderer is disabled by default; the explicit
`?resourceVeins=1` comparison remains available for diagnosis only.

The legacy single-layer tilemap still keeps its existing opaque resource
textures as an isolated rollback. A transparent resource cannot replace a
single-layer terrain tile without creating a hole, so that compatibility path
is not promoted as the production presentation.

## Special tiles and GP tiers

The approved special-tile family is deliberately unchanged by this resource
correction.

- Teleport Up keeps the latest approved
  `sprites/tiles/special-tiles-v2/teleport-tile.webp`.
- Gem Power keeps five visually distinct tiers: 100, 250, 500, 1000, and
  1700 GP.
- The five GP textures remain individually preloaded and their depth-based
  restore values remain authoritative in `values/specialBlocks.js`.
- Speed, XP, Crit, Berserk, Combo, Legend, Ancient Relic, geode, chest, and
  glow-crystal frames retain the approved family.
- The fixed sky-island eclipse gate remains separate from Teleport Up and
  continues to use `TELEPORT_PORTAL_CONFIG.canonicalAssetPath`.

The shared special atlas remains:

`sprites/backgrounds/world-visual-v2/semantic-decals-v1/special-blocks-imagegen-gp-tiers-v3.png`

It contains 12 complete ImageGen frames and no second emissive overlay.

## Gameplay boundary

This is a presentation-only change. Tile IDs, HP, digging, collision, rewards,
saves, GP restoration, portal capacity, FIFO replacement, and safe return
behavior are unchanged.

## Rebuild and validation

Rebuild the deterministic atlases, references, manifest, and QA board with:

```powershell
python ai-tools/2026-07-28-build-wide-embedded-resource-overlays-v6.py
```

Run the runtime contract with:

```powershell
node testing/2026-07-28-overground-texture-clarity-contract.mjs
```

The builder uses ten checked-in ImageGen chroma sources and their approved
alpha-extraction results. It validates six unique frames per resource, packs
the 60 resource frames, then copies the 18 approved v6 special frames
pixel-for-pixel into v7. It does not generate substitute art procedurally.
