# Deep weather performance pass

## Result and limits

Implemented a scoped reduction in active weather work. The reported severe
lag beyond 800m has **not** been reproduced or proven resolved in gameplay.
No deployment was performed.

## Current code findings

- `WeatherSystem._getDepthFactors()` fades outdoor precipitation over 18
  depth tiles and finishes the underground rain signal fade at 760. At 800m,
  newly spawning rain streaks are not expected. Severe sustained lag there
  cannot be attributed to a growing rain population from this code alone.
- `WeatherOcclusionSampler` ignored the depth already supplied by its caller.
  It sampled viewport columns every 120ms even after weather fully faded.
- Rain checked swept collisions before culling drops left far behind by a
  camera move or teleport. It also allocated a new survivor array every frame.
- Splash/ripple actors also allocated a new survivor array each update.
- `WeatherLightningController._timers` retained every completed thunder timer
  until scene destruction. Storm fullscreen flashes and thunder continue at
  depth in the existing design; this pass preserves that behavior.
- The current layered rain profile allows 640 drops and 150 impact actors.
  Default rendering uses a 1920x1080 backing canvas. These are configured
  budgets, not measured resident populations or proof of the lag's cause.
- Surface-mask collision arrays are disabled in the active configuration.
  A proposed column-index optimization was removed because it would not help
  the active game.

## Changes

- Beyond the existing complete weather fade, return a sheltered empty
  occlusion snapshot with current camera bounds and no terrain queries.
  Surface return resamples immediately; explicit weather debug retains the
  original geometric sampling. Weather simulation, wetness decay, clock,
  gameplay state, audio and lighting still update normally.
- Cull out-of-view rain before raycasting, retaining the existing cull margin.
- Compact rain and impact actor arrays in place, preserving survivor order,
  collision handling and sprite pooling.
- Remove thunder timers from the retained list when their callbacks run.

## Verification

`node testing/2026-09-12-weather-performance-contract.mjs` passed:

- 1,000 simulated frames at 800m: original sampling path performed 12,125
  solidity queries; the depth-aware path performed zero.
- Surface return, resize and explicit debug sampling pass.
- Offscreen rain performs zero collision rays.
- Mixed removed/visible rain retains all survivors in the original array.
- After 1,000 completed thunder callbacks, zero completed timers remain.

Existing suites passed:

- `2026-07-28-weather-swept-collision-contract.mjs`
- `2026-07-28-weather-world-precipitation-contract.mjs`
- `2026-08-30-weather-transition-polish-contract.mjs`
- `2026-09-06-layered-weather-visual-contract.mjs`
- `2026-08-30-recorded-weather-ambience-contract.mjs`

Syntax and scoped diff whitespace checks passed. Operation counts are fixture
evidence, not FPS measurements.

## Runtime profiling coverage

The isolated in-app browser encountered a failed dynamic import of
`ui/scenes/RuntimeScenes.js`, then exceeded the initial fixture's four-minute
readiness timeout after retrying. A cached reload also remained in loading.
No clear/storm gameplay comparison, GPU timing, or before/after FPS result
was obtained. Do not interpret the browser transport/loading failure as a
confirmed product performance regression.

`testing/2026-09-12-depth-weather-profile.html` provides a reusable local
fixture with `jkd_e2e=1`, a temporary world, and staged clear/storm comparisons
at the surface, 800m and 1200m. Its deep rooms are synthetic, not natural
digging-progression evidence. It reports CPU update/render submission times,
frame intervals and object counts; those are not direct GPU timings.

Next evidence needed to isolate the remaining complaint is a successful
hardware-browser capture at the affected depth, including normal digging:
weather versus clear, total update versus rendering, texture residency and
frame spikes. Avoid reducing authored art quality or changing gameplay
timing on the basis of unmeasured suspicions.
