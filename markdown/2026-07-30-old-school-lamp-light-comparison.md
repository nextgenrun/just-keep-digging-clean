# Old-school lamp carried-light comparison

Date: 2026-07-30

## Outcome

The old-school miner safety lamp is implemented as a review-only alternative
to Fire Light V3. It uses the same gameplay light authority, darkness mask,
GP state, weather input, collision sampler, and eye-adaptation layer, but it
has its own carried-light class, seven authored atlas roles, and ray renderer.

The user selected the fire direction after the live review. The lamp remains
available for comparison, but Natural Fire V1 is the production default.

Open the real game with:

`?carriedLightStyle=lamp-review`

For the actual live simultaneous comparison, open:

`testing/2026-07-30-old-school-lamp-live-compare.html`

Both Phaser/WebGL worlds share tile, camera, GP, weather, day/night, darkness, and inputs.

Removing that query immediately restores Fire Light V3. The selector does not
change saves, gameplay visibility, GP drain, world state, or the default
carried-light choice.

## Visual distinction

Natural Fire V1 is an exposed flame with one compact authored source over the
legacy-style procedural falloff. The previous broad layered Fire Light V3 stack
is retained only behind `?fireLightStyle=layered`.

The safety lamp reads as a shielded glass-and-brass source: steadier flame,
tighter amber volume, glass-rib penumbra, restrained dust, and a controlled
floor bounce. The lamp is handle-anchored to the character socket so the body
hangs below the hand while its glass chamber is the illumination origin.
Visible reflector rays are intentionally absent in the normal review and remain
available only as the explicit `?fireRays=1` collision diagnostic.

## Authored asset package

Seven built-in ImageGen masters were normalized into seven exact
1252 by 1252 atlases. Each atlas has a 4 by 4 grid of 313 by 313 frames:

1. physical safety lamp;
2. shielded amber volume;
3. reflector and glass-caustic rays;
4. glass-rib penumbra;
5. floor and near-wall bounce;
6. glass-filtered hot core;
7. sparse dust and soot atmosphere.

The package contains 112 authored components: sixteen physical-lamp frames
and 96 authored light frames. All seven assets retain immutable source masters,
registered-source Piskels, editable polished-work Piskels, original-runtime
rollback Piskels, horizontal strips, hashes, and prompt provenance.

Integer-only registration reduced every worst group drift range below one
pixel while preserving light energy and enforcing true-black three-pixel cell
borders.

## Runtime boundary

`OldSchoolLampLightSystem` is deliberately separate from `FireLightSystem`.
It reuses only shared lighting services that represent common physical state:
the character socket contract, eye adaptation, solid-tile ray tracing, and
lighting/weather snapshots.

`OldSchoolLampLightRenderer` owns the six layered lamp visuals and physical
fixture. `OldSchoolLampRayRenderer` retains three authored forward/reflected
assets and clamps them at the first solid tile only when explicitly enabled.
With the normal query it allocates no ray sprites.

`LightSystem` chooses the lamp class only when the review query is present.
`BootScene` likewise queues the seven lamp atlases only for that review,
keeping the default startup and Fire Light V3 asset path unchanged.

## Review and rollback

- Live simultaneous A/B:
  `testing/2026-07-30-old-school-lamp-live-compare.html`
- Live evidence:
  `visual-approval-previews/old-school-lamp-light-v1/live-simulation/`
  (full/clear, low/rain, resynced screenshots plus JSON runtime report)
- In-game A/B:
  `visual-approval-previews/old-school-lamp-light-v1/01-torch-vs-lamp-ingame.png`
- Asset library:
  `visual-approval-previews/old-school-lamp-light-v1/02-lamp-asset-library.png`
- Anchor evidence:
  `visual-approval-previews/old-school-lamp-light-v1/03-lamp-anchor-drift.png`
- Runtime and Piskel manifest:
  `sprites/environment/old-school-lamp-light-v1/manifest.json`
- Exact ImageGen prompts:
  `sprites/environment/old-school-lamp-light-v1/source-masters/prompts.json`

Rollback is query-only: remove `carriedLightStyle=lamp-review`. Deleting the
review class and asset package is not required to restore the production
presentation.
