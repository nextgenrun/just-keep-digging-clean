# Level One Biome Generated Roles V2

Date: 2026-08-29

Historical milestone: V3 now extends this retained twenty-family/eighty-role
base to fifty families and 200 generated role assets. See
`2026-08-29-level-one-biome-50-family-expansion-v3.md` for the current totals.

## Outcome

This V2 milestone presents twenty visual families through four distinct generated
roles per family: background, retained hero signature, ground structure, and
foreground overlay. Sixty new independent ImageGen sources join the twenty V1
signatures, producing an eighty-asset generated runtime library.

No retained art was replaced. At this milestone, the Level One library contained
302 production media files and 682 effective selectable visuals after atlas
frames are counted.

## Placement and diversity

`values/levelOneBiomeVisualFamilies.js` owns the family/role mapping and nine
independent deterministic seed streams. Each role has its own lateral and
vertical jitter, scale, rotation, origin, alpha, and render depth. The four
assets therefore do not stack as a repeated card:

- backgrounds establish a wide, quieter silhouette behind the terrain;
- signatures retain the main landmark identity;
- ground formations sit lower and reinforce local geology;
- foreground overlays add closer edge and prop-scale shapes.

`WorldVisualLevelOneBiomeGeneratedRoleView` anchors placements to the same
profile seeds used by the organic Level One territory field. The existing
80-150 m measured cadence remains intact, but warped X/depth borders mean a
player can cross into another family by digging sideways as well as downward.
The M-map continues to resolve its names, colors, and curved borders from that
same field rather than a second set of horizontal bands.

All generated roles are world-anchored, demand-streamed near the camera,
terrain-masked, and placed beneath gameplay feedback. They are presentation
only: they do not alter collision, tile HP/type, digging, resources, drops,
caves, discovery, saves, or map authority.

## Image production

Built-in ImageGen produced one independent `1536x1024` RGBA source for each of
the sixty new family/role combinations. The processing step validates size,
genuine alpha, occupied coverage, transparency, and unique hashes; applies
only a 28-pixel outer alpha falloff; then writes optimized RGBA WebPs.

Evidence:

- untouched sources and review notes:
  `visual-approval-previews/level-one-biome-generated-roles-v2/sources/`;
- exact prompts:
  `visual-approval-previews/level-one-biome-generated-roles-v2/2026-08-29-level-one-biome-generated-role-prompts-v2.md`;
- checkerboard contact sheet:
  `visual-approval-previews/level-one-biome-generated-roles-v2/2026-08-29-level-one-biome-generated-roles-contact-v2.jpg`;
- processing manifest:
  `visual-approval-previews/level-one-biome-generated-roles-v2/2026-08-29-level-one-biome-generated-roles-v2.json`;
- runtime WebPs:
  `sprites/backgrounds/world-visual-v2/depth/level1-biome-generated-roles-v2/`.

## Streaming, rollback, and validation

`WorldVisualUndergroundDetailLayer` resolves only role assets near the active
camera bounds through the existing `WorldVisualAssetCache`, then releases
unused textures. The existing twenty signatures use the same lifecycle.

- `?levelOneSourceFamilies=0` restores the shared five-parent presentation and
  removes all eighty generated family-role assets.
- `?levelOneBiomeField=0` removes the full irregular Level One territory field.
- `testing/2026-08-29-level-one-biome-generated-roles-v2-contract.mjs` guards
  role inventory, distinct seeds/depths, source manifest, terrain masking,
  demand streaming, rollback, and visual-only authority.
- `testing/2026-08-29-level-one-biome-source-families-v1-contract.mjs` retains
  the disjoint 5-to-20 source-family partition contract.
- `testing/2026-08-27-level-one-biome-field-contract.mjs` guards the 0-2000 m
  X/depth field and measured cadence. The V3 contract owns current M-map parity
  and the companion ground-material pass owns the current 483/863 totals.
