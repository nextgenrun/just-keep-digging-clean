# Runtime feature residency and save scheduling (2026-07-30)

## Outcome

This pass removes large optional visual libraries and repeated full-save work
from frame-critical startup/gameplay paths without changing source pixels,
render scale, animation timing, gameplay state, or save schema.

The same audited Boot graph changed from 492 visual files to 403. Transfer drops
from about 149.8 MiB to about 99.5 MiB, while estimated decoded RGBA drops from
about 758.7 MiB to about 552.3 MiB before selected WorldLoad assets. The exact
removed set is 89 source images, 50.2805 MiB on disk, and 206.3526 MiB decoded.
No image was resized or re-encoded for this result.

| Deferred group | Files | Transfer MiB | Decoded MiB |
|---|---:|---:|---:|
| Star Block steady, pulse, and release FX | 24 | 23.26 | 113.98 |
| Starlight Talent Tree | 29 | 16.52 | 48.30 |
| Titan archive portraits | 25 | 1.64 | 6.25 |
| World Map frame | 1 | 0.84 | 6.00 |
| All Campfire tiers | 10 | 8.01 | 31.82 |

## Full-quality feature residency

`BootScene` keeps gameplay-critical terrain, character, HUD, Titan surface
stances, and active world art eager. It defers only feature-bounded libraries:

- Star Block FX prefetch through the shared serialized runtime coordinator when
  a Star Block enters the 48-tile demand radius. The sampler runs every 750 ms
  until demand is found. Each rarity pool waits for all of its exact textures;
  no partial-rarity placeholder is presented.
- Talents and the physical Star Pillar retain the atomic Starlight group while
  their view exists. Titan Archive and World Map use the same rule.
- Closing a view destroys its Phaser objects first, then releases its consumer.
  Manager-owned textures leave after a 5-second anti-thrash delay.
- `WorldLoadScene`, which already owns the Phaser loader transition, queues only
  the save slot's current Campfire tier and its next upgrade. Campfire adopts
  the current texture and keeps it visible until an exact upgraded texture is
  fully ready.
- The feature manager never evicts an unadopted Boot/external texture. Cancelled
  tabs and overlays cancel their queued subscribers and discard only partial
  manager-owned results.

`RuntimeTextureMemoryTracker` estimates decoded residency from real source
width and height at four bytes per pixel. Runtime health reports the result and
uses a 704 MiB high watermark with a 640 MiB low watermark. Closed, unused
feature groups are the only automatic eviction candidates.

## Save-spike scheduling

Routine `queueDugTilesSave()` calls no longer clone, sanitize, stringify, write,
and back up the full world immediately for every mutation. The scheduler:

- coalesces mutation bursts behind a 350 ms debounce;
- runs capture and persistence in `requestIdleCallback` where available;
- forces execution no later than 1.8 seconds after the first queued mutation;
- falls back to a short timer when the idle API is unavailable;
- records recent capture, write, and total p95/max timings.

Manual Save, main-menu/restart transitions, visibility loss, page hide, and
scene shutdown remain immediate. Shutdown queues a fresh snapshot before the
scheduler is destroyed. The existing save payload version, sanitizers,
localStorage write, rotating backup, optional endpoint, and Hardcore guards are
unchanged.

## Telemetry and rollback

The admin health panel now exposes decoded texture MiB versus budget, ready and
loading feature-group counts, and save capture/write/total p95 values.

- `?runtimeFeatureAssets=0` restores eager feature visual loading.
- `?runtimeAssetBitmap=0` keeps the shared queue but uses serialized Phaser image
  decode.
- `?runtimeAssetQueue=0` restores the complete eager/legacy runtime-loading path
  and therefore also disables feature deferral.

## Contracts

- `testing/2026-07-30-runtime-feature-asset-tiering-contract.mjs`
- `testing/2026-07-30-play-scene-save-scheduling-contract.mjs`
- `testing/2026-07-29-runtime-asset-load-coordinator-contract.mjs`

The contracts resolve every real deferred asset path, guard Boot and rollback
routing, prove manager ownership/cancellation/eviction, verify lazy exact-art
renderer recovery, check selected Campfire loading, prove save coalescing and
forced lifecycle persistence, and validate decoded-memory release accounting.
