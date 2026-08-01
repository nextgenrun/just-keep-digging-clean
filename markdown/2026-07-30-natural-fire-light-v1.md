# Natural Fire Light V1

**Status:** selected production presentation

**Date:** 2026-07-30

## Outcome

Natural Fire V1 is the selected carried-light presentation after the live
torch-versus-lamp review. It keeps Fire Light V3's compact physical flame, but
removes the broad authored volume, atmosphere, and expanded illumination stack.
The surrounding cave light again uses the established procedural player-light
falloff, so the result stays close to the readable legacy torch while retaining
a small, visibly flickering fire source.

The default natural profile is:

- one visible authored layer: the compact flame;
- `0.88` flame alpha scale;
- `0.98` procedural world-glow scale;
- `0.96` procedural shader mix;
- `0.24` eye-adaptation overlay scale;
- no visible volume or atmosphere;
- no expanded illumination layers;
- no rays unless the diagnostic query is explicitly enabled.

The final live measurement recorded an approximately `0.450 x 0.607`-tile
flickering flame. Gameplay reveal, GP drain, darkness authority, saves,
collision, and world state are unchanged.

## Comparison and rollback

- Default or `?fireLightStyle=natural` selects Natural Fire V1.
- `?fireLightStyle=layered` restores the previous asset-heavy Fire Light V3
  stack exactly, including its base volume, atmosphere, expanded authored
  illumination, and stronger adaptation.
- `?fireLight=legacy` restores the untouched pre-Fire-V3 procedural torch.
- `?fireRays=1` remains a diagnostic-only opt-in; rays are absent by default.
- `?eyeAdaptation=0` disables exposure overlays without changing either light
  profile.

The old-school lamp remains available through
`?carriedLightStyle=lamp-review`, but it is review-only and was not selected as
the production carried light.

## Live side-by-side review

Open:

`testing/2026-07-30-natural-fire-live-compare.html`

The page runs two simultaneous Phaser/WebGL worlds:

- left: Natural Fire V1;
- right: untouched legacy procedural light.

Both frames use separate save slots but are synchronized to the same world
identity, standing tile, camera, GP, weather, solar phase, and torch state.
The page starts at 1000 m and exposes synchronized 140, 700, 1000, and 1800 m
depth controls.

Evidence is stored in:

`visual-approval-previews/natural-fire-vs-legacy-v1/live-simulation/`

`visual-approval-previews/natural-fire-vs-legacy-v1/deep-simulation/`

The settled deep run verified identical gameplay reach on both sides: 3.412
tiles near 700 m, 3.021 near 1000 m, and 2.973 near 1800 m, with darkness alpha
1 throughout. Natural Fire remains one authored compact flame plus 0.24 visual
adaptation; legacy has no authored source and no adaptation overlay. Both used
WebGL, all twenty Fire assets returned HTTP 200, and no UI or fatal errors
occurred. Cancelled biome-video requests in the report are expected when the
review harness jumps between depth bands.

## Authority

- `values/fireLightPresentation.js` owns the reversible presentation profiles.
- `FireLightSystem` resolves the profile and exposes diagnostic telemetry.
- `FireLightRenderer` owns the physical flame and optional layered assets.
- `LightSystem` owns authoritative gameplay light and the procedural world
  glow.
- `EyeAdaptationSystem` computes real adaptation state while the presentation
  profile scales only its visual overlays.
- `values/carriedLightLiveComparison.js` owns synchronized comparison values.
