# Level One biome library alignment V1

Date: 2026-08-30

Scope: Level One only, X0-131 and 0-2000 m

Authority: presentation only

## Outcome

All 639 registered Level One production files are now reachable in the authored
world. The inventory contains 423 family-specific files (200 base generated
roles, 92 depth-variant media, 110 true-ground materials, and 21 boundary
cutouts) plus 216 shared materials, backdrops, enhancers, terrain plates, caps,
cohesion art, structures, and detail atlases. No additional art was required
because the audit found routing holes, not missing visual roles.

Every family also resolves a non-empty inherited background pool, ground
structure pool, five texture frames, five prop frames, two complete four-role
sites, its true-ground set, and one unique M-map identity.

## Alignment behavior

- The 400 generated-role spatial anchors remain unchanged.
- Sixty-four base role files that substitutions previously orphaned now render
  once as restrained terrain-masked foundations. Their newer identity, scenic,
  or landmark art remains the primary layer.
- Foundation alpha is 58-68% of the role alpha and scale is 96-108%, depending
  on role. This fills transparent composition gaps without doubling every
  replacement or introducing new map sites.
- The 481 boundary anchors remain unchanged. Two smaller tangent-aligned layers
  expose the otherwise unreachable Cobalt/Silver alternatives, so all 21
  boundary files participate through 483 rendered layers.
- All 110 family ground files were already selected by the runtime; their
  routing was verified and left untouched.

All images remain demand-streamed, terrain-masked, deterministic, and visual
only. Tile types, HP, collision, digging, drops, rewards, progression, saves,
and Levels 2+ are unchanged.

## Verification

`testing/2026-08-30-level-one-biome-library-alignment-v1-contract.mjs` verifies:

- all 200 base role files and all 92 depth-variant media are selected;
- all 382 effective role selections are reachable;
- all 110 true-ground files are selected in real terrain plate routing;
- all 21 boundary files are selected;
- every family has complete background, ground, structure, texture, prop,
  generated-role, and M-map routing;
- the 400 role anchors and 481 boundary anchors are unchanged; and
- the alignment remains presentation-only.

`testing/2026-08-30-level-one-production-media-reachability-v1-contract.mjs`
independently resolves every production layer and fails if any of the 639 media
files is registered but unreachable.

Focused legacy contracts also pass. Browser QA covered 31, 101, 351, 707,
1101, 1461, and 1801 m plus the M-map at 1801 m, with no console warnings or
errors.

## Rollback

- `?levelOneSourceFamilies=0` removes the generated role library and its
  alignment layers.
- `?undergroundTerrainVariation=0` removes family ground routing with the
  retained terrain variation.
- `?levelOneBiomeField=0` restores the legacy field and removes its boundaries.
