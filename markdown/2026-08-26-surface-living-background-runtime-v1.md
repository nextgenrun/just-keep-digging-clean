# Surface living background runtime V1

## Outcome

The three accepted Seedance Mini loops are now real `PlayScene` surface assets,
not animation-sandbox mockups. The default `town-air` loop replaces only the
upper Town Square beauty while it is decoded and playing. The authored slate
floor, terrain-masked earth facade, digging grid, collision, resources, damage,
drops, saves, merchants, and all underground renderers keep their existing
owners.

## Runtime choices

`values/worldVisualSurfacePacks.js` is the selection authority. Boot queues one
loop, never all three:

- `?surfaceMotion=soft-canopy` or `?surfaceMotion=1`
- `?surfaceMotion=town-air` or `?surfaceMotion=2` (default)
- `?surfaceMotion=layered-night` or `?surfaceMotion=3`
- `?surfaceMotion=0` for the byte-identical static beauty fallback

`?surfacePack=current-v2` remains the full pre-benchmark surface rollback, and
the separate `?surfaceRelief=1` review plate remains static.

## Playback and blending

Each silent H.264 file is 1800x534, 24 fps, 432 frames, and 18 seconds. Playback
is forward-only. The accepted closure overlaps the moving tail into the head;
there is no reverse leg, ping-pong turn, duplicated cycle, or short preview
timer. Measured scene-anchor drift is zero in all three sources, while each
contains visible ambient change.

`WorldVisualSurfaceMotionView` places the video at the exact existing beauty
baseline and world size. A two-axis alpha mask preserves both the authored top
sky feather and the 129 px right-side handoff into the continuous far world.
The video follows the existing high-flight visibility curve and pauses only
when that surface beauty is fully faded off-screen.

The static image remains underneath until Phaser emits a successful video
creation event with the expected dimensions. Missing cache data, decode errors,
unsupported video, or a dimension mismatch leave the static image visible.
Destroy stops playback and releases the video-owned mask without touching the
surface pack's borrowed terrain mask.

## Asset provenance

Runtime media and hashes live under
`sprites/backgrounds/start-zone-scenic-v1/living-background-v1/`. The promotion
tool verifies the accepted loop hashes, rejects any source marked as containing
ground, scales to the runtime beauty geometry, strips audio, preserves all 432
frames, and writes `surface-living-background-v1.manifest.json`.

## Validation

`testing/2026-08-26-surface-living-background-runtime-contract.mjs` checks all
selectors and rollbacks, one-video preload, media hashes and geometry, 18-second
forward-loop contracts, measured movement and camera lock, seam bounds, static
fallback behavior, two-axis feather ownership, high-flight pause/resume,
cleanup, and absence of gameplay mutation APIs.
