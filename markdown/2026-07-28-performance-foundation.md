# Performance foundation — 2026-07-28

## Outcome

This pass adds measurement and removes the largest avoidable renderer bursts
without changing digging, collision, world generation, progression, or saves.

The production `scenic-v2` renderer now:

- keeps day/night and weather tint updates at 20 Hz;
- skips full terrain-mask, semantic-pool, damage-decal, and gameplay-effect
  rescans while the snapped camera window is unchanged;
- resynchronizes immediately when the camera window, low-FPS mode, or a visible
  gameplay tile changes;
- starts at most one missing material/backdrop asset per cache loader batch;
- reports sync counts, skipped work, sync time, tile invalidations, and streamed
  asset state through runtime health.

The second-stage pass keeps the exact same visual output while:

- demanding only visible backdrop, terrain-variation, and ground-structure
  cards; an 18 by 12 tile window resolves fewer than the complete twelve-card
  biome library, normally four to six depth cards;
- cancelling obsolete queued cards before their image/video decode begins;
- suppressing Phaser tint, alpha, position, display-size, rotation, and
  visibility setters only when the live value is already exact;
- reusing the sky crossfade viewport and four target records instead of
  allocating arrays, frozen records, and a weight map every frame;
- avoiding a duplicate continuous-layer refresh on scenic sync frames;
- clearing animated chest/crystal Graphics once when their nearby set becomes
  empty instead of clearing empty buffers every frame;
- sharing one post-movement player-tile sample across world visuals, cave
  effects, glows, star-pillar work, and lighting;
- sampling named PlayScene/scenic phases every thirty frames and exposing their
  rolling p95 values in the admin health panel.

The legacy rollback renderer now:

- spatially indexes the authored background manifest instead of scanning every
  background object on every update;
- skips stationary-camera background work and queues one large texture batch at
  a time;
- paints a new 256-row tilemap window into hidden buffers over bounded row
  batches, then swaps it atomically; long teleports keep an immediate path.

## Rollbacks

- `?scenicStreamScheduler=0` restores periodic full scenic syncs.
- `?scenicAssetScheduler=0` restores eager scenic cache queuing.
- `?scenicDemandStreaming=0` restores full-region scenic asset residency.
- `?worldStreamScheduler=0` restores legacy background scanning/batching.
- `?tileStreamStaging=0` restores synchronous legacy tile-window repaint.
- `?worldVisualRuntime=legacy` selects the complete legacy renderer.

## Verification contract

`testing/2026-07-28-performance-foundation-contract.mjs` covers rolling frame
statistics, named spans, scenic stable-window skipping and rollback, lighting
refresh, one-at-a-time scenic asset batches, visible-card demand, obsolete-load
cancellation, exact-state setter guards, complete scenic cache accounting,
sampled phase cadence, indexed background equivalence, stationary-camera skips,
one-at-a-time legacy texture batches, staged tile rows, teleport fallback, and
atomic tile-layer swaps.
