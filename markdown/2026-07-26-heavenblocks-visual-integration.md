# Heavenblocks Visual Integration

**Date:** 2026-07-26
**Scope:** Visual production placement only

The approved Cloud Reef, Angel Heavenblock, and Devil Eclipse Scar concepts
are now present in the existing world sky band. No world dimensions, surface
row, save-depth identity, mining tiles, collision, portals, relic rules, or
crafting rules were changed.

## Placement

All three regions use the open far-right sky lane beginning at tile x 220:

| Region | Top-left tile | Native display size |
| --- | --- | --- |
| Devil Eclipse Scar | 220, 11 | 1920 x 1080 px |
| Angel Heavenblock | 220, 29 | 1920 x 1080 px |
| Lower Sky Cloud Reef | 220, 47 | 1920 x 1080 px |

The source PNGs are 1672 by 941 and each backdrop/façade pair is scaled
together to the full 1920 by 1080 world viewport. Backdrops receive 12 percent
centered overscan so camera tracking cannot reveal a rectangular edge, while
the transparent façades retain the exact composition size. The lane remains
inside the existing 280-tile-wide world and 65-row sky band.
It does not cover the existing V11 Level 1 island, Level 2 island, divider, or
surface portal landmarks.

## Runtime seam

`values/heavenblocksVisualConfig.js` owns the region positions, asset paths,
render depths, and explicit visual-only boundary. The already-created
`V11SkyIslandVisualSystem` loads and renders each region as:

1. an opaque environmental backdrop at depth -9.8;
2. a transparent island/structure façade at depth -0.55.

This path is created independently of the scenic or legacy world renderer, so
both render modes receive the same sky art without altering dirty scene setup
or frame-update paths.

## Reversible comparison

The visuals are enabled by default. Add `?heavenblocksVisuals=0` to the URL to
hide the three new regions without changing any persistent state.

For visual QA only, run with `?jkd_e2e=1` and press `Ctrl+Alt+H` to cycle the
camera through Devil, Angel, and Lower Sky. It moves only the debug camera, is
unavailable in normal play, and does not create progression or save state.

## Deferred by design

The following remain planning-only:

- relic-based access and consumption;
- traversable/minable Heavenblock tilemaps and collision;
- portals or ascent travel;
- biome completion state;
- Arc Core recipe, station, costs, and save migration.
