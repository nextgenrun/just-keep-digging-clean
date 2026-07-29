# Additive Surface Props V2

Seven ImageGen-authored Level 2 chapter anchors extend the existing
`surface-props-v1` production kit. They do not replace its well, wagon,
pergola, bench, handcart, supplies, fence, plants, or lantern.

## Production set

- `level2-forge-shelter-v2.webp`
- `level2-camp-kitchen-v2.webp`
- `level2-herb-station-v2.webp`
- `level2-timber-gantry-v2.webp`
- `level2-observatory-v2.webp`
- `level2-survey-station-v2.webp`
- `level2-expedition-shelter-v2.webp`

All seven are separate lossless-alpha WebPs. None contains a landscape, sky,
moon, sun, celestial body, ground strip, player, collision, or UI. Runtime
placement remains bottom-centered, physically scaled from the 1.75 m player,
terrain-supported, camera-streamed, and presentation-only.

## Provenance

The built-in ImageGen path produced one chroma source per asset. The installed
ImageGen `remove_chroma_key.py` helper created the alpha masters in
`sources/alpha-masters/`. The deterministic
`ai-tools/2026-07-28-build-additive-surface-props-v2.py` tool trims, scales,
validates, losslessly encodes, hashes, and assembles the combined scale sheet.

See `2026-07-28-surface-props-v2-manifest.json` for dimensions, alpha coverage,
physical heights, clear openings, paths, and hashes.

## Runtime boundary

The assets extend `values/worldVisualSurfacePropAssets.js`,
`values/assetKeys.js`, and the authored Level 2 placement layout. The original
surface background, surface texture/material system, Titan Walk, portals,
Heavenblock gates, terrain, collision, and saves remain unchanged.

The complete additive presentation retains `?surfaceProps=0`,
`?surfacePropsL1=0`, and `?surfacePropsL2=0` rollback.
