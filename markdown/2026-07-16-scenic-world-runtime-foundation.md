# Scenic world runtime foundation

The visible world now has a clean replacement boundary instead of another facade over the old stack.

## Authority split

- `WorldModel` remains the hidden simulation grid for collision, digging, HP, resources, saves, and exact tile coordinates.
- `WorldVisualRuntime` is the only visible-world renderer in the default mode.
- The prior tilemap, Tiled object placement, v11 background master, facade experiments, and coordinate-bound living backdrops are constructed only by `?worldVisualRuntime=legacy`.

This prevents damage or digging from revealing a lower-quality fallback tile. The new terrain is one continuous material field clipped by the hidden solid/air state, with damage and resource feedback rendered as diegetic veins and cracks.

## First production region kit

The v2 surface kit contains separately authored production plates:

- moonlit mountain/forest far background;
- transparent high-detail mining-town midground;
- transparent continuous walk-surface edge;
- seamless dark earth material.

The surface baseline is anchored to the authoritative floor row. The background is world anchored; only cloud atmosphere receives slow bounded motion. Terrain materials cover every row from `65` through `5064` through contiguous depth bands.

Only the surface pack is preloaded. The renderer streams a single high-resolution
depth material when the camera enters its band and releases the prior non-surface
pack. This is the same bounded contract used by future normal, AO, emissive, and
Meshy-baked prop companions.

## Runtime and rollback

Default: `scenic-v2`.

Rollback: `?worldVisualRuntime=legacy`.

There is no mixed mode. Scenic startup fails when a required region texture or full-depth material coverage is missing rather than revealing square legacy art.

## Tiled retirement boundary

The generated Tiled layout remains temporarily as hidden gameplay compatibility. It no longer owns visible rendering in scenic mode. Save payload v7 records `layoutId` and `layoutRevision`, so a future procedural `WorldBlueprint` can use a new identity without importing old dug coordinates.

Physical archival of the Tiled layout, exporter, tilemap renderer, v11 manifest streamer, and facade stack happens only after the new gameplay blueprint reproduces required landmarks and the rollback path is no longer active.

## Next production pass

1. Replace the hidden Tiled layout with a semantic, versioned world blueprint.
2. Add packed normal/roughness/emissive companion maps and a scenic terrain WebGL pipeline.
3. Use image generation for large scene layers and use Meshy only as an offline
   geometry donor for selected buildings, entrances, machinery, rock arches,
   crystals, and foreground occluders. Bake every model to registered 2D passes;
   do not ship a 3D world runtime.
4. Author unique regional hero packs and transition packs while keeping deterministic complete coverage.
5. Move retired imports and tools into a dated archive after gameplay and visual parity checks.
