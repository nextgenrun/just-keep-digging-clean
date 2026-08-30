# Level One Biome Source Families V1

Date: 2026-08-29

## Outcome

Level One now has twenty visual source families instead of twenty names routed
through only five shared asset pools. The five parent materials remain intact
for stable transition geology, lighting, and rollback, while each named biome
profile owns a disjoint slice of every retained visual layer plus one new
ImageGen signature formation.

This is the requested four-times source-family expansion:

- 5 parent material families remain authoritative for material joins;
- 20 profile-level visual source families now drive presentation;
- all 75 Level One backdrops, 36 terrain plates, 25 ground structures, and 200
  localized detail frames participate exactly once inside their parent
  family's four profile subsets;
- 20 independently generated `1536x1024` RGBA signature formations add one
  unmistakable foreground identity per profile.

At the V1 milestone, the Level One inventory was 242 media files representing
622 selectable visual pieces after atlas frames were counted. The follow-up
generated-role V2 expansion retains all of them and raises the current totals
to 302 production media files and 682 effective selectable visuals.

## Profile identity contract

`values/levelOneBiomeVisualFamilies.js` is the source of truth. Every profile
owns:

- three or four semantically matched backdrop cards;
- one or two terrain plates;
- one or two ground-structure plates;
- five exclusive foreground-texture frames;
- five exclusive overlay-prop frames, including distributed multi-tile props;
- independent backdrop, terrain, structure, texture, prop, and signature seeds;
- one unique generated signature formation.

The four profile subsets within a parent material are disjoint and their union
is the complete retained parent pool. No approved asset is discarded and no
asset is duplicated merely to inflate the count.

## Dynamic placement

The signature view places each profile formation at the irregular world-space
site that creates its curved territory. This ties large foreground identity to
the same X/depth field used by backdrops, terrain, structures, localized props,
and the M map. The placement therefore follows the warped biome borders rather
than horizontal depth bands.

Signatures are demand-streamed near the camera, world-anchored, clipped by the
authoritative solid-terrain mask, and rendered below gameplay feedback. They
do not create collision or write tile type, HP, digging, drops, caves,
resources, map discovery, or saves.

## Image production

Built-in ImageGen produced one distinct RGBA source for each of the twenty
profiles. The production build:

1. validates exact `1536x1024` size and genuine alpha;
2. requires at least 25% transparent canvas and bounded occupied coverage;
3. applies only a 28-pixel outer alpha falloff to prevent clipped card edges;
4. writes optimized RGBA WebPs;
5. verifies twenty unique source and runtime hashes;
6. emits a checkerboard contact sheet and manifest.

Prompts and untouched sources live under
`visual-approval-previews/level-one-biome-source-families-v1/`.

## Rollback and evidence

- `?levelOneSourceFamilies=0` restores the former five shared visual pools and
  removes the twenty signature formations.
- `?levelOneBiomeField=0` still removes the complete irregular Level One field.
- `testing/2026-08-29-level-one-biome-source-families-v1-contract.mjs` guards
  the 5-to-20 multiplier, complete disjoint pool partition, independent seeds,
  generated alpha inventory, seed coverage, runtime wiring, and visual-only
  boundary.
- `testing/2026-08-27-level-one-biome-field-contract.mjs` guards the updated
  302-file / 682-selection inventory and existing 80-150 m field cadence.
- `markdown/2026-08-29-level-one-biome-generated-roles-v2.md` documents the
  four-role expansion layered on top of this source-family milestone.
