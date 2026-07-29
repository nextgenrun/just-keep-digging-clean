# Additive Surface Landscape Runtime V2

**Date:** 2026-07-28  
**Status:** production wired  
**Scope:** additive props and restrained prop-anchored atmosphere only

## Outcome

The approved landscape mockups now inform Level 2 composition without being
baked into the game. The original nine-piece Level 2 prop kit remains active
and is reused throughout six irregular visual chapters. Seven new isolated,
high-resolution ImageGen cutouts supply one recognisable anchor per chapter:

- Arrival Forge Shelter
- Caravan Camp Kitchen
- Starwell Herb Station
- Timberwright Gantry
- Heavenblocks Observatory
- Frontier Survey Station
- Far-East Expedition Shelter

All seven retain transparent boundaries and bottom contact, use lossless WebP,
and scale from the live 1.75 m player profile. Walk-through openings are at
least 2.20 m. The generated manifest records exact dimensions, alpha coverage,
physical dimensions, paths, and SHA-256 hashes.

## Composition and safety

The authored layout uses 34 placements rather than a repeating prop interval.
Original benches, wagons, carts, supplies, plants, fences, pergolas, and
lanterns remain visible around the new chapter anchors. Full rendered
footprints—not center points—must stay clear of:

- the enlarged Level 1 Titan Walk;
- town interactions;
- Level 1 and Level 2 ground portals;
- Heavenblock gates;
- the tunnel/bridge/Arc Core transition.

The Level 2 Heavenblocks flight corridor additionally rejects an intersecting
prop when its rendered physical height exceeds 2.05 m. Level 1 receives no new
modular props because its existing town, Titan Walk, gates, portal, and
transition already provide authored visual coverage.

## Atmosphere

Six camera-streamed smoke, steam, and ground-mist accents sit beside selected
Level 2 chapters. They reuse approved frames from the existing
`atmosphere-screen.webp` ImageGen atlas with SCREEN blending, low alpha, slow
movement, and restrained weather/light response. There is no procedural
substitute art.

## Explicitly unchanged

- v11 background and its crop
- sky and day/night celestial system
- moon, sun, eclipse, and weather authority
- surface textures and terrain materials
- Titan, portal, Heavenblock, town, and Arc Core assets
- collision, world generation, saves, progression, and rewards

No mockup panorama or contact sheet is preloaded. In particular, no baked moon
from any proposal image can enter runtime.

## Rollback

- Complete modular props plus their atmosphere: `?surfaceProps=0`
- Level 2 props only: `?surfacePropsL2=0`
- Atmosphere accents only: `?surfaceAtmosphere=0`

The original background and sky do not need rollback because they were never
changed.

## Verification

- `testing/2026-07-26-surface-props-contract.mjs`
- `testing/2026-07-28-additive-surface-landscape-contract.mjs`
- `testing/2026-07-28-natural-surface-and-drop-through-contract.mjs`
- `sprites/environment/surface-props-v2/2026-07-28-surface-props-v2-manifest.json`
- `visual-approval-previews/surface-props-v2-additive-runtime/2026-07-28-existing-plus-additive-prop-scale-sheet-v2.png`
