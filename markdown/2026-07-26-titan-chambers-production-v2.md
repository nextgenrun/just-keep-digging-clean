# Titan Chambers Production v2

**Status:** production  
**Date:** 2026-07-26  
**Scope:** 25 visual-only Cave Titans, their underground chambers, archive
vignettes, surface collection, streaming, unlock presentation, health, and
rollback

## Outcome

All 25 Cave Titans now own an individually authored high-resolution chamber
card. The previous 256x256 alpha creatures remain intact for Boot-safe archive
thumbnails, surface miniatures, and visual rollback. Underground discovery zones
now span the approved colossal range of 15-22 tiles wide and 8-13 tiles tall.

The cards are scenery only. They do not add combat, loot, XP, stats, collision,
platforms, rewards, or new save authority.

## Asset Contract

- Source: 25 dated built-in ImageGen PNG masters under
  `sprites/backgrounds/titan-chambers-v2/sources/`
- Runtime: 25 opaque `1536x848` WebP cards at quality 92
- Encoded inventory: 8.65 MB total
- Visual QA:
  `visual-approval-previews/titan-chambers-production-v2/2026-07-26-titan-chambers-contact-sheet-v2-complete.png`
- Hash/size inventory:
  `sprites/backgrounds/titan-chambers-v2/2026-07-26-titan-chambers-production-manifest-v2.json`
- Prompt provenance:
  `sprites/backgrounds/titan-chambers-v2/2026-07-26-imagegen-prompt-manifest-v2.md`
- Rebuild tool:
  `ai-tools/2026-07-26-build-titan-chambers-v2.py`

Every card uses a distinct composition rather than a shared background with
palette changes.

## Runtime Lifecycle

1. Boot loads only the 25 compact Titan sprites and one Titan Walk plinth.
2. `TitanDiscoverySystem` builds 25 deterministic large clear-area zones from
   originally diggable cells.
3. `TitanChamberStream` requests only the nearest cards within 24 tiles and
   keeps at most two world cards resident.
4. When a card is ready, it replaces the compact underground fallback without
   changing zone progress or save state.
5. Authoritative solid terrain stays above the image, so unmined cells mask it
   naturally. Dug air reveals the painted chamber.
6. Clearing the final original zone cell triggers the existing ring, grit,
   glow, crossing, collection echo, canonical retention write, save request,
   archive entry, and surface Titan Walk miniature.
7. A discovered archive selection pins only that card long enough to show its
   high-resolution vignette. Selection change or archive close releases it.
8. Leaving the chamber's release range destroys its world images and removes
   stream-owned texture memory.

The high-resolution card remains spatially anchored; only a restrained additive
breathing glow is applied. Compact rollback silhouettes retain their existing
slow drift. Archive vignettes receive a bounded 0.8% living pulse.

## Memory and Performance

One decoded `1536x848` RGBA texture is approximately 4.97 MiB. Normal play keeps
at most two chamber textures visible. An open archive may pin one additional
selection, keeping the intended upper working set near 15 MiB rather than
decoding all 25 at Boot.

Stream state is published under `globalThis.__jkdTitanDiscoveries.chambers`:

- `registered`
- `resident`
- `pending`
- `pinned`
- `loaded`
- `failedAssets`
- `ready`

Load failure keeps the compact v1 presentation active and publishes
`titan-chamber-stream-failed` through the runtime canary/admin health path.

## Authority Boundaries

- `values/titanDiscoveries.js` owns identities, large zone dimensions, asset
  routes, stream limits, reveal values, archive values, queries, and health
  labels.
- `systems/visual/TitanChamberStream.js` owns dynamic texture residency and the
  compact-to-chamber visual swap.
- `systems/visual/TitanDiscoverySystem.js` owns discovery progress, unlock
  presentation, health aggregation, and surface-gallery coordination.
- `RetentionProgressSystem` remains the only Titan discovery save authority.
- `WorldModel` remains the only terrain, HP, digging, and collision authority.
- `TitanArchiveView` reads canonical retention ids and never discovers a Titan.

## Rollback

- `?titanChambers=0` disables all high-resolution requests and restores the
  compact underground sprites while keeping Titan discoveries, archive,
  surface collection, and saves active.
- `?titans=0` disables and de-queues the complete Titan presentation without
  altering terrain, rewards, collision, or saved ids.

No legacy asset was overwritten or deleted.

## Validation

- `testing/2026-07-26-titan-chamber-production-contract.mjs`
  - 25 unique WebP cards
  - exact dimensions and manifest hashes
  - 15-22 by 8-13 tile zones
  - no high-resolution Boot preload
  - stream attach/release and compact fallback restoration
  - archive pinning
  - rollback and renderer parity
- `testing/2026-07-26-titan-discovery-contract.mjs`
  - canonical retention
  - all zones and surface slots
  - final-cell unlock
  - save request
  - archive states
  - both renderer lifecycles
  - cleanup and health
