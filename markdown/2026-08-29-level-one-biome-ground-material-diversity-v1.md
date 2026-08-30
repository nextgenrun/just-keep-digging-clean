# Level One Biome Ground Material Diversity V1

Date: 2026-08-29

## Outcome

The 50-family Level One field now changes the ground itself, not only scenic
overlays. The thirty added families each own two independent `1536x1024`
ImageGen terrain plates, adding sixty full-coverage materials to the thirty-six
retained Level One terrain concepts. The resulting true-ground library contains
ninety-six concepts across 0-2000 m.

The separate scenic-role library remains 200 transparent background, signature,
terrain-edge landmark, and foreground assets. Together those two generated
systems provide 260 family-specific images. The complete measured Level One
inventory is 483 production media files and 863 selectable visual pieces after
atlas frames are counted.

## Gap closed

The earlier V3 `ground` role is intentionally a transparent terrain-clinging
landmark. It does not fill solid terrain. The new material plates are continuous
ground surfaces selected by the terrain-variation renderer, clipped by its
authoritative solid-tile mask, and shaded by the existing lighting path.

Each added identity has a structurally different primary and secondary plate.
The set covers root/peat/wood/glass surface geology, bell/crystal/ice/tideglass
blue geology, bone/honey/resin/quarry amber geology, choir/loom/magnet/glasssteel
silver geology, and organ/slag/ash/chain/cathedral/blackglass magma geology.
These are independent sources rather than recolors or crops.

## Spatial and transition behavior

The same organic X/depth field selects ground, scenic roles, backdrops,
structures, foreground details, and M-map identity. Median vertical territory
length is 83 m and the longest measured run is 130 m; lateral digging can cross
families because boundaries are warped rather than horizontal bands.

Seven authored transparent material-join formations now cover every parent
material adjacency produced by the field. The expansion added the measured
Cobalt/Silver join and the boundary sampler now checks both directions on each
axis so angled or narrow joins remain legible.

## Production and validation

Generation used built-in ImageGen once per distinct plate. The builder requires
all sixty untouched PNG sources to be `1536x1024`, fully opaque through every
outer edge, visually non-flat, and hash-unique. Runtime WebPs preserve the
established complementary left/top incoming feather while retaining right and
bottom coverage for overlap.

- source, prompt, hash, opacity, variance, and runtime manifest:
  `visual-approval-previews/level-one-biome-ground-materials-v1/2026-08-29-level-one-biome-ground-material-manifest-v1.json`;
- master and five regional ground contact sheets:
  `visual-approval-previews/level-one-biome-ground-materials-v1/`;
- runtime materials:
  `sprites/backgrounds/world-visual-v2/depth/level1-biome-ground-materials-v1/`;
- reproducible builder:
  `ai-tools/2026-08-29-build-level-one-biome-ground-materials-v1.py`.

`testing/2026-08-29-level-one-biome-ground-materials-v1-contract.mjs` verifies
the 30/60/96/260 counts, exact hashes, dimensions, alpha, source opacity,
full-field reachability, terrain masking, demand streaming, and visual-only
authority. The complete field contract verifies 50 identities, seven boundary
families, M-map parity, the measured cadence, and the 483/863 inventory.

## Authority and rollback

No tile type, HP, collision, resource, drop, cave generation, discovery,
progression, or save data changes. Assets are requested only around visible
terrain and released through the existing visual asset cache.

- `?levelOneSourceFamilies=0` removes the 200 family roles and sixty added
  ground plates, restoring the retained terrain partitions.
- `?levelOneBiomeField=0` disables the organic Level One field and its boundary
  placements.
