# Surface living background layered V2

## Purpose

The original Seedance Mini pass moved the right objects but treated the forest
as one shared motion field. V2 keeps the real authored surface and final
one-video runtime boundary while breaking that synchronized motion offline.

## Three game-time candidates

- `?surfaceMotion=natural` (`4`) retimes four wide canopy regions from the calm
  Town Air source. This is the strongest natural-tree candidate.
- `?surfaceMotion=depth` (`5`) lightly mixes the three accepted Seedance loops
  across depth/position to test a more layered atmosphere.
- `?surfaceMotion=stars` (`6`) keeps the canopy calmer and spends more of the
  motion budget on fourteen tiny stationary, independently pulsing stars.

The existing `town-air` V1 remains the default. `?surfaceMotion=0` still gives
the byte-identical static fallback.

## Loop and ownership contract

All three outputs are 1800 x 534, 24 fps, 432 frames, and exactly 18 seconds.
Canopy time curves are monotonic and meet at the common first/last anchor; there
is no ping-pong or reverse playback. Star periods divide 18 seconds exactly.
Measured seam change stays below an already occurring per-frame motion peak in
each file.

The lower structure-lock mask removes nearly all generated building/trunk
motion. The video still contains only the upper scenic beauty: the slate floor,
earth, underground world, collision, tile HP, drops, saves, and gameplay remain
separate and authoritative.

## Measured result

At 450 x 134 and the full 24 fps cadence, the former Town Air canopy-zone motion
correlation measures 0.9556. The V2 candidates measure 0.5744 (`natural`),
0.6994 (`depth`), and 0.6073 (`stars`). Lower-structure mean frame-step motion
falls from 0.3758 to 0.0784, 0.0550, and 0.0693 respectively. Each final asset
still has one runtime decoder because all layers are baked before Phaser loads
the selected file.
