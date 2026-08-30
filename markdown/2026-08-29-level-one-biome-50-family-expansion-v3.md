# Level One 50-Family Expansion V3

Date: 2026-08-29

## Outcome

Level One now owns fifty named visual families across its full 0-2000 m field.
The former twenty families remain intact and thirty additional identities add
six new families to each of the five parent material regions. Every family has
four distinct generated roles: background, signature, ground, and foreground.

The generated scenic-role library is now 200 runtime assets. The V3 addition is
120 independent built-in ImageGen RGBA sources, not recolors or crops. A
companion pack adds sixty true ground-material plates, bringing the generated
family visual library to 260. Together with retained Level One art and seven
authored material joins, the production inventory is 483 media files and 863
effective selectable visuals after atlas frames are counted.

This is a presentation expansion only. It changes no terrain cells, collision,
tile HP, resources, drops, cave generation, discovery, progression, or saves.

## Spatial field

`values/levelOneBiomeField.js` places one hundred deterministic sites in twenty
staggered rows and five lateral territories per row. Every family is anchored
twice. Low-frequency X/depth warp and changing lateral offsets keep boundaries
curved, so digging sideways can enter a different identity and parent materials
can overlap across transition depths.

Measured field behavior remains inside the requested cadence: the median
interior vertical run is 83 m and the longest measured run is 130 m. Short edge
slices can still occur where a curved border clips a column; they do not become
full horizontal bands. The M-map resolves the same fifty names, unique colors,
and discovered boundary geometry from this field.

## Generated roles

Each family receives a distinct four-part composition:

- background: broad low-contrast depth shelves;
- signature: one unmistakable hero formation;
- ground: a dense mergeable terrain-edge landmark, not the terrain fill;
- foreground: a compact high-contrast decorative cluster.

All roles have independent deterministic seeds, jitter, scale, rotation, alpha,
origin, and render depth. Their placements are anchored to the field sites,
masked by authoritative terrain, streamed only near the camera, and released by
the existing visual asset cache.

The thirty new identities are:

- surface: Thornwake Hollows, Peat Lantern Fen, Rootbell Ossuary, Siltwood
  Warrens, Mossglass Reservoir, and Ironbark Sink;
- blue: Azure Bell Caves, Stormglass Conduits, Frozen Choir, Tideclock Chasm,
  Prism Kelp Vault, and Blue Salt Basilica;
- amber: Saffron Boneworks, Citrine Hivefault, Gilded Root Reliquary, Ochre
  Spiral Quarry, Sunwax Catacombs, and Bronze Pollen Rift;
- silver: Argent Choir, Quicksilver Loom, Moonwire Ravine, Pale Magnet
  Basilica, Glasssteel Sepulcher, and Starless Reflectory;
- magma: Cinder Organ, Slagheart Foundry, Ashen Crown Rift, Molten Chain
  Garden, Pyreclast Cathedral, and Blackglass Crucible.

## Image production evidence

Generation mode: built-in ImageGen, one independent call per distinct asset.
Every untouched source is `1536x1024` RGBA. The build validates dimensions,
alpha extrema, transparent and occupied coverage, and 120 unique source hashes;
it applies only a 28-pixel outer alpha safety falloff before writing optimized
RGBA WebPs and validating 120 unique runtime hashes.

- specification and art directions:
  `visual-approval-previews/level-one-biome-families-v3/2026-08-29-level-one-biome-50-family-expansion-specs-v3.json`;
- exact 120 prompts:
  `visual-approval-previews/level-one-biome-families-v3/2026-08-29-level-one-biome-50-family-prompts-v3.md`;
- untouched sources:
  `visual-approval-previews/level-one-biome-families-v3/sources/`;
- master and five parent-region contact sheets:
  `visual-approval-previews/level-one-biome-families-v3/`;
- alpha/hash/runtime manifest:
  `visual-approval-previews/level-one-biome-families-v3/2026-08-29-level-one-biome-50-family-manifest-v3.json`;
- runtime WebPs:
  `sprites/backgrounds/world-visual-v2/depth/level1-biome-generated-roles-v3/`.

Continuous ground fill is owned separately by the sixty-plate companion pack
documented in `markdown/2026-08-29-level-one-biome-ground-material-diversity-v1.md`.

## Rollback and validation

- `?levelOneSourceFamilies=0` removes all 200 generated family-role assets plus
  the sixty added ground plates and restores the retained selectors.
- `?levelOneBiomeField=0` disables the irregular Level One field.
- `testing/2026-08-29-level-one-biome-50-families-v3-contract.mjs` guards the
  30/50/120/200 counts, source/runtime uniqueness, all-role reachability,
  transparent WebPs, placement, demand streaming, map parity, rollback, and
  visual-only authority.
- `testing/2026-08-27-level-one-biome-field-contract.mjs` guards the complete
  0-2000 m field, measured cadence, parent transitions, M-map rendering, and
  483/863 production inventory.
