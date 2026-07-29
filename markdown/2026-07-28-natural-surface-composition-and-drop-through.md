# Natural Surface Composition and Drop-Through

**Date:** 2026-07-28  
**Status:** production wired  
**Asset quality:** existing approved ImageGen cutouts and surface raster only

## Outcome

Level 2 uses authored visual chapters instead of near-equal prop intervals.
Thirty-four independent placements combine the retained nine-piece Level 2
kit with seven additive ImageGen chapter anchors, alternating tight
compositions with deliberate breathing spaces. Each placement selects `small`,
`standard`, or `large`; the renderer combines that named variant with
restrained rear/mid/front perspective while retaining the 1.75 m player as the
physical baseline. Level 1 deliberately has no modular prop placements because
the existing town, enlarged 25-slot Titan Walk, portals, Heavenblock gates, and
transition already own the complete town-to-tunnel corridor.

The complete Titan Walk is a calculated protected range sourced from the live
25-slot gallery configuration. It includes the full 3x creature/plinth width
plus two tiles of padding. Prop validation compares the full rendered
footprint—not only its center—against that range, the town, portals, and the
tunnel/bridge transition. The Heavenblocks flight lane also applies a
2.05-meter maximum rendered height to every intersecting footprint.

Six subtle smoke, steam, and ground-mist accents reuse the existing approved
ImageGen atmosphere atlas beside specific Level 2 prop chapters. They are
camera-streamed and lighting/weather responsive. No background, sky, moon,
celestial body, terrain texture, collision, save, or gameplay state changed.

## Continuous surface

The approved 48 px `town-surface-edge-thin-v2.png` alpha raster now repeats at
the Town Square's calibrated physical scale across all 280 surface columns.
Mirrored three-pixel overlaps eliminate horizontal gaps. Its exact wet-slate
core also supplies the masked 1801x48 Town Square handoff, replacing the former
139 px facade so the first underground row stays visible. The cap sits behind
authoritative terrain, so intact cells keep their material and damage feedback
while dug top cells retain a finished ground line instead of exposing a broken
visual seam.

Biome surface-variation cards are disabled in production, and the semantic
bedrock mask explicitly excludes both town-floor tile types. Level 1 and Level 2
therefore use the same Town Square source, height, and material everywhere,
without a bedrock texture repainting the platform.

The surface line is also a one-way collision contact. A fresh DOWN/S press
releases it only when:

- the player is standing at the surface boundary;
- every column under the measured body has AIR in the first row below;
- the surface cells are the dedicated `FLOOR_TOWN_1` or `FLOOR_TOWN_2` type.

The release persists only until the body clears the surface row. It does not
dig, mutate, reward, or save a tile. Legacy saved dug keys can no longer erase
either unbreakable town-floor type. A final world-authority pass normalizes the
complete surface to those floor types and clears one full AIR row beneath it,
so ordinary mineable tiles begin two rows below the surface. This prevents both
surface-art overlap and a hitbox trap during the S drop.

The same contact is one-way during flight: upward movement from below ignores
the complete town-floor row, overlap recovery cannot push the player back
underground mid-ascent, and descent from above still lands normally. The empty
clearance row renders the preloaded scenic fallback immediately while its
requested biome card streams, so safe traversal never exposes a black gap.

## Rollback

- Props: `?surfaceProps=0`
- Level 1 props: `?surfacePropsL1=0`
- Level 2 props: `?surfacePropsL2=0`
- Prop atmosphere only: `?surfaceAtmosphere=0`
- Continuous visual ground: `?surfaceEdge=0`
- One-way surface/drop input: `?surfaceDrop=0`

## Verification

- `testing/2026-07-26-surface-props-contract.mjs`
- `testing/2026-07-28-additive-surface-landscape-contract.mjs`
- `testing/2026-07-28-natural-surface-and-drop-through-contract.mjs`
- `testing/2026-07-17-scenic-surface-bedrock-feedback-contract.mjs`
- `testing/2026-07-29-surface-backdrop-fallback-contract.mjs`
- `testing/2026-07-16-player-collision-contract.mjs`

With `?jkd_e2e=1`, `Ctrl+Alt+F10` cycles the protected Titan Walk and
representative Level 2 prop clusters.
