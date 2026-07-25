# Layered World Visual Port Plan

Quality and gameplay acceptance criteria are defined in
`markdown/2026-07-15-town-visual-benchmark.md`.

## Non-negotiable foundation

- `WorldModel`, `DigSystem`, and collision remain authoritative.
- Scenic systems may read tile type/HP but never mutate gameplay state.
- Every visual region has a world anchor, depth order, culling bounds, and query rollback.
- Every solid base tile can receive the seamless facade. Air remains literal, while resource and special identity is restored with compact non-square recognition art above the facade.

## Town proof of concept

1. Fix the approved sky/town plate to world coordinates.
2. Split its earth into tile-aware visual cells.
3. Preserve holes, damage cracks, resource/special recognition markers, drops, and NPC interaction.
4. Add separated motion: far clouds, world-space mist, smoke, restrained aura, and warm light masks.

## Approved Level 1 foundation

- Door thresholds, character floor, physics row 65, and the facade top share one world line.
- The first ten solid rows use a continuous 280-column skin while `WorldModel` remains authoritative per cell; native-94px chunks stream horizontally instead of remaining resident.
- Existing atlas clouds, weather, day/night sunlight, lamp/smoke motion, deep background chunks, and underground ambient particles are reused rather than duplicated.
- The deep living field now spans both active authored regions at `x0..279 / ty65..2064` with fixed sprite pools; the streamer also covers the final active depth chunk.
- Surface wind, gusts, fog, rain, and night response fade naturally over the first 96 underground tiles; deeper motion remains restrained and cave-appropriate.
- Below the ten-row surface skin, `WorldScenicFacadeSystem` projects native-density seamless biome materials through a camera-local `WorldModel` solidity mask from row 75 through row 5064. Its material view streams shared, world-grid-aligned image repeats rather than constructing full-band repeated canvases. Air removes the exact mask cell; integrated markers and cracks remain authoritative.
- The separated Level Two shaft adds pooled ember, steam, ash, and magma-aura motion through `x132..279 / y2065..5064`.
- Rollback switches remain independent: `level1Facade`, `worldFacade`, `worldLiving` (`level1Living` alias), `deepWorldLiving`, `townScenic`, `worldMotion`, `skylineVfx`, `worldMaster`, and `worldDepthMaster`.

## Port sequence

1. **Surface continuation:** produce overlapping world-anchored plates beyond the spawn viewport.
2. **Layer 1 shallow mine:** replace flat background chunks with rock/cave depth packs plus local crystal and drip motion.
3. **Layer 2 industrial/magma:** add distant machinery, heat haze, ember depth, and steam layers while retaining the tile facade contract.
4. **Deep/cave regions:** author biome-specific far, mid, silhouette, ground-facade, light-mask, and particle assets.
5. **Second world:** reuse the same descriptor/system contract with separate art and palette configuration.

## Layer pack per region

- Static far sky or cavern void.
- Slow parallax distant silhouettes.
- Midground scenery anchored to authored world bounds.
- Optional cloud/fog/smoke atlas actors.
- Tile-aware solid ground facade with crack feedback and resource/special recognition markers.
- Light masks and restrained foreground particles.

## Performance and approval gates

- Pool sprites, cull outside camera margins, and lower motion cadence below the FPS thresholds.
- Keep physics and save data independent of all art layers.
- Ship one region at a time behind a query flag, capture live gameplay, and approve before promoting the next region.
