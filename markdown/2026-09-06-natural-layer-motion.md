# Natural layered motion — 6 September 2026

The layeredSky preview now has visible motion at a stationary camera: rolling
mist, independent cloud banks, falling water detail, renewed spray, and wind in
Level 2 treetops. Source paintings and the Town Square video are unchanged.

## What changed

- Four atmosphere planes move at 11 / 19 / 31 / 44 pixels per second before
  the existing weather wind multiplier. Their generated alpha art also deforms
  internally, with broad rolling turbulence and finer moving structure.
- Calm weather retains a prevailing wind direction. Stronger wind can turn
  the layers gradually. Integrated wind distance drives internal turbulence,
  cloud positions, tree motion, and spray, avoiding jumps when wind changes.
- Seven waterfall channels use three overlapping flow phases, irregular
  falling detail and accelerating travel. The visual pass removed repeated
  wave bands; cliff and architecture pixels keep their original position.
- Each waterfall continuously renews five soft spray wisps. They spread,
  rise, enlarge and dissipate over different lifetimes instead of swinging
  together on a shared loop. These reuse the existing generated cloud atlas.
- Level 2 forest crowns bend and flutter with the wind; their roots stay fixed.
  Mountains retain their separate camera-parallax depths.

The shader confines each sample to its own atlas frame. The cloud/foliage
pipelines share the existing motion clock and are released with their owner.
The production default remains unchanged; this is the existing layeredSky=1
comparison preview. Canvas fallback retains wind translation and spray;
internal water, cloud and foliage deformation require WebGL.

## Evidence

The real PlayScene was recorded with the camera fixed for 12 seconds: 717
captured frames, approximately 59.75 samples per second. In that run the four
planes travelled approximately 104 / 179 / 293 / 415 pixels. The exported
60 fps clip preserves elapsed time. Capture cadence is not a benchmark for
other machines.

- Four fresh day, dusk, night and storm views; no page, request or shader errors.
- Isolated rendered comparisons prove motion within water, cloud and foliage
  textures at fixed object positions. Sampled cliff and root pixels have zero
  difference. This separates texture animation from camera or sprite movement.
- Pause/resume and teardown pass, including both new atmosphere pipelines.
- 50 camera/zoom geometry cases and 3,150 sky coverage samples pass. Calm-wind
  direction stability and gradual reversal under strong wind also pass.
- Existing clock/weather, phase boundary, white-fleck and Level 2 scope checks pass.
- Scoped diff whitespace checks pass. This is focused visual/runtime validation,
  not a claim that the full repository test suite ran.

[Play the updated preview](http://127.0.0.1:8195/testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/?revision=natural-motion-v2).
[Motion clip](../testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa-natural-motion/natural-layer-motion.mp4).
[Runtime checks](../testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa-natural-motion/motion-verification.json).
[Material pixel checks](../testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa-natural-motion/material-motion-verification.json).

Motion tuning lives in values/layeredAtmosphereMotion.js,
values/levelTwoScenicMotion.js and values/worldVisualLayeredSkyReview.js.
Earlier generation prompts and asset provenance remain in
sprites/backgrounds/world-visual-v2/regenerated-horizon-v2/.

Town Square video SHA256:
1650f7a88e2445ef9ab1be954680e4a8d5ffb51b2ccd8e7def5bec19726132d6

The current review has moved exclusively to Level 1. Its background polish and
fresh evidence are documented in [Level 1 background polish](2026-09-06-level-one-background-polish.md).
Earlier Level 2 clips on this page are historical.
