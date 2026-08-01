# Approved Interactive World State Runtime

## Production allowlist

Only two families from `interactive-world-states-v1` are promoted:

- `cache`: a demand-loaded visual layer over existing `TILE_TYPES.CHEST`
  authority. Existing reward, buff, random-event, removal, and save timing stay
  in `SpecialTileSystem`.
- `memory-reliquary`: ten fixed authored alcove placements, one per underground
  biome. Opening records one existing Journey journal key and shows lore through
  the approved notification carousel. It never calls wallet, resources, stars,
  buffs, objectives, or reward systems.

All atlas frames remain 448 by 448 pixels. Cache frames display at roughly
2.65 tiles and reliquary frames at roughly 3.1 tiles, so both are downsampled at
the current 94-pixel tile size.

## Streaming and blending

The atlases are requested through PlayScene's existing runtime asset-load
coordinator only when the camera or player nears an eligible object. Frames are
registered on the loaded texture without rebuilding or upscaling source art.
Unused managed textures are released after the shared residency delay.

Each reliquary anchor is validated against the deterministic world before use:
three supported floor tiles and a three-by-four empty alcove are required. An
invalid anchor is omitted and logged; the runtime never searches for a
replacement or auto-populates another cave.

## Persistence

Reliquaries use keys shaped as `memory-reliquary:<id>` inside the existing
retention `discoveries.journal` array. Re-reading opened memories is allowed and
does not write another save. Disabling the presentation leaves collected keys
harmlessly intact and visible by authored title in Journey findings.

No save schema was added for animated caches. Their open state is read from the
existing `SpecialTileSystem.openedChestKeys` set.

## Rollback

- `?animatedCaches=0` restores the exact existing chest presentation and
  interaction path.
- `?memoryReliquaries=0` removes reliquary art, prompts, and interactions without
  deleting prior journal entries.
- The freight lift is not imported by PlayScene. Its entire implementation is
  isolated under
  `testing/animation-sandbox/freight-lift-prototype-v1/` and can be removed
  without touching saves or terrain.

## Freight-lift scope

The prototype uses two fixed stops in a roughly 1.5-screen pressure-foundry
shaft. The platform transform physically carries the current miner visual; it
does not teleport the player and does not add a jump mechanic.

This local route is the appropriate scale for the current world: a useful
authored connector inside one tall chamber. A world-spanning lift would compete
with Flight and the existing portal network, so it remains explicitly out of
scope.
