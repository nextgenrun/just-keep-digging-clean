# Titan Chambers Production v2

**Status:** production  
**Date:** 2026-07-26  
**Scope:** 25 visual-only Cave Titans, their underground chambers, archive
vignettes, surface collection, streaming, unlock presentation, health, and
rollback

**2026-07-28 encounter amendment:** discovery now requires complete clearance
of the compact creature's alpha-derived terrain footprint. See
`2026-07-28-titan-clues-and-creature-footprint-unlock.md`.

**2026-07-28 seamless-blend amendment:** production streaming now defaults to
v3 transparent organic-edge derivatives of the approved chamber paintings.
Each chamber receives the exact live depth-biome tint and lightning response of
the surrounding scenic backdrop. Opaque v2 remains a query-selectable rollback.

## Outcome

All 25 Cave Titans now own an individually authored high-resolution chamber
card. The production variants dissolve into the neighboring biome instead of
showing an opaque rectangular edge. The previous 256x256 alpha creatures remain intact for Boot-safe archive
thumbnails, underground footprint authority, and visual rollback. Underground
discovery zones now span the approved colossal range of 15-22 tiles wide and
8-13 tiles tall. The surface collection uses its own 25 identity-matched
768x768 stance cutouts; chamber compositions are never repurposed as statues.

The cards are scenery only. They do not add combat, loot, XP, stats, collision,
platforms, rewards, or new save authority.

## Asset Contract

- Source: 25 dated built-in ImageGen PNG masters under
  `sprites/backgrounds/titan-chambers-v2/sources/`
- Source/rollback runtime: 25 opaque `1536x848` v2 WebP cards at quality 92
- Production runtime: 25 transparent `1536x848` v3 WebP cards at quality 94,
  preserving the approved paintings with deterministic irregular alpha feather
- Visual QA:
  `visual-approval-previews/titan-chambers-production-v2/2026-07-26-titan-chambers-contact-sheet-v2-complete.png`
- Seam QA:
  `visual-approval-previews/titan-chambers-production-v3/2026-07-28-mossback-seam-comparison-v3.png`
  and
  `visual-approval-previews/titan-chambers-production-v3/2026-07-28-titan-chambers-blended-contact-sheet-v3.png`
- Source/rollback hash inventory:
  `sprites/backgrounds/titan-chambers-v2/2026-07-26-titan-chambers-production-manifest-v2.json`
- Production alpha/hash inventory:
  `sprites/backgrounds/titan-chambers-v3/2026-07-28-titan-chambers-production-manifest-v3.json`
- Prompt provenance:
  `sprites/backgrounds/titan-chambers-v2/2026-07-26-imagegen-prompt-manifest-v2.md`
- Source normalization tool:
  `ai-tools/2026-07-26-build-titan-chambers-v2.py`
- Seam derivation tool:
  `ai-tools/2026-07-28-build-titan-chambers-v3.py`

Every card uses a distinct composition rather than a shared background with
palette changes. The v3 pass did not invoke a new generation model or repaint
the approved ImageGen artwork.

## Runtime Lifecycle

1. Boot loads the 25 compact Titan sprites, 25 transparent surface stances, and
   one Titan Walk plinth. The 25 high-resolution chamber cards remain streamed.
2. `TitanDiscoverySystem` builds 25 deterministic large clear-area zones from
   originally diggable cells.
3. `TitanDiscoveryGuidance` maintains an approved-HUD direction/depth cue when
   an undiscovered chamber is within 72 vertical metres.
4. `TitanChamberStream` requests only the nearest cards within 24 tiles and
   keeps at most two world cards resident.
5. When a card is ready, it attaches as independent chamber scenery behind the
   compact creature. Its organic transparent edge reveals the neighboring
   biome card, and the shared depth-grade resolver applies the same tint and
   lightning response to both layers without changing coverage progress or save
   state.
6. The compact creature stays fixed behind authoritative terrain. Dug cells
   expose its actual silhouette tile by tile, while the approved HUD reports the
   number of covering cells still solid.
7. Destroying the final cell in the alpha-derived creature footprint triggers
   the existing ring, grit, glow, crossing, collection echo, canonical retention
   write, save request, archive entry, and matching surface Titan Walk stance.
8. A discovered archive selection pins only that card long enough to show its
   high-resolution vignette. Selection change or archive close releases it.
9. Leaving the chamber's release range destroys its world images and removes
   stream-owned texture memory.

The high-resolution card and sealed compact creature remain spatially anchored.
Only the card's outer boundary is feathered; its focal center stays fully
readable. Restrained additive glow is applied as cover is removed. Discovered
compact creatures may use their existing travel motion. Archive vignettes
receive a bounded 0.8% living pulse.

## Memory and Performance

One decoded `1536x848` RGBA texture is approximately 4.97 MiB. Normal play keeps
at most two chamber textures visible. An open archive may pin one additional
selection, keeping the intended upper working set near 15 MiB rather than
decoding all 25 at Boot.

Each decoded 768x768 surface stance is 2.25 MiB, or 56.25 MiB for the complete
resident surface collection. These are fixed transparent creature cutouts, not
additional chamber cards, physics bodies, or animated frame atlases.

Stream state is published under `globalThis.__jkdTitanDiscoveries.chambers`:

- `registered`
- `resident`
- `pending`
- `pinned`
- `loaded`
- `failedAssets`
- `ready`
- `blendEnabled`
- `assetVersion`

Load failure keeps the compact v1 presentation active and publishes
`titan-chamber-stream-failed` through the runtime canary/admin health path.

## Authority Boundaries

- `values/titanDiscoveries.js` owns identities, large zone dimensions, v3/v2
  asset routing, stream limits, reveal values, archive values, queries, and
  health labels.
- `values/worldVisualDepthBackdrops.js` owns the shared depth-biome grading
  resolver used by both backdrop segments and Titan chamber cards.
- `values/titanDiscoveryExperience.js` owns encounter admission, resonance
  guidance, player-facing copy, and narrow rollback queries.
- `systems/visual/TitanChamberStream.js` owns dynamic texture residency and the
  independent behind-creature chamber-card layer.
- `systems/visual/TitanDiscoveryGuidance.js` owns the approved-HUD direction
  and depth cue without revealing locked identities.
- `systems/visual/TitanDiscoverySystem.js` owns discovery progress, unlock
  presentation, health aggregation, and surface-gallery coordination.
- `RetentionProgressSystem` remains the only Titan discovery save authority.
- `WorldModel` remains the only terrain, HP, digging, and collision authority.
- `TitanArchiveView` reads canonical retention ids and never discovers a Titan.

## Rollback

- `?titanChamberBlend=0` keeps high-resolution streaming active but selects the
  retained opaque v2 cards.
- `?titanChambers=0` disables streamed 1536x848 chamber-card requests while
  retaining the sharp 768x768 stance, compact basalt dais, exact covering-tile
  resonance, Titan discoveries, archive, surface collection, and saves.
- `?titanGuidance=0` disables the resonance cue only.
- `?titanEncounter=legacy` uses the stricter full rectangular-zone clear plus
  proximity requirement.
- `?titans=0` disables and de-queues the complete Titan presentation without
  altering terrain, rewards, collision, or saved ids.

No legacy asset was overwritten or deleted.

## Validation

- `testing/2026-07-26-titan-chamber-production-contract.mjs`
  - 25 unique v2 rollback and 25 unique v3 production WebP cards
  - exact dimensions, alpha flags/chunks, edge/center metrics, and manifest
    hashes
  - 15-22 by 8-13 tile zones
  - no high-resolution Boot preload
  - stream attach/release and compact fallback restoration
  - archive pinning
  - shared depth-biome tint
  - blend/chamber rollback and renderer parity
- `testing/2026-07-26-titan-discovery-contract.mjs`
  - canonical retention
  - all zones and surface slots
  - final creature-cover tile unlock
  - save request
  - archive states
  - both renderer lifecycles
  - cleanup and health
- `testing/2026-07-26-titan-discovery-experience-contract.mjs`
  - first-seven depth guidance
  - explicit 700 m coverage
  - locked-name protection
  - creature-cover/default and rectangular-clear/legacy behavior
- `testing/2026-07-28-titan-creature-footprint-contract.mjs`
  - exact approved-PNG alpha mask parity for all 25 Titans
  - no unlock while any covering tile remains
  - fixed compact-creature progressive reveal
