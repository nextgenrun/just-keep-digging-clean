# Living HD menu scenery - 2026-09-07

Historical v4 pass. The current v5 runtime is documented in
[Menu motion smoothing](2026-09-07-menu-motion-smoothing.md).

The boot, main menu, save menu and loading screens now use the v4 scenery. It keeps the stronger physical motion from v3, with individually reduced speed and clean, full-color presentation. One selected landscape repeats into itself indefinitely; the six backgrounds never rotate automatically.

## Timing and image quality

All six silent MP4s are 1920 x 1080 at 24 fps. They are high-quality local Lanczos upscales of the generated 720p source videos, not native 1080p generations or AI detail reconstruction. No sharpening, blur, delta masking or global color filter is added. The exports total 83,173,110 bytes (79.32 MiB). Linear frame blending provides intermediate frames during retiming; none of the decoded export sequences contains a duplicate-frame pause.

| Scenery | Speed reduction from v3 | File duration |
| --- | --- | --- |
| aurora | 32.35% | 14.88 s |
| starfall | 30.30% | 14.38 s |
| lantern-forest | 14.81% | 11.83 s |
| luminous-grotto | 17.86% | 12.21 s |
| ember-reaches | 20.69% | 12.71 s |
| quiet-foundry | 23.33% | 13.08 s |

The full-frame dimming overlays and the 0.68 v3 background attenuation are removed. Shared background opacity is 1, and the original poster hides after video reveal to avoid a static double image. The loading panel retains its own contrast and steady layout. Boot splash, world loading, main menu and save selection now use the same presentation values instead of separate dimming overrides. The game's existing high render-density preset uses a 1920x1080 backing canvas.

Movement comes from the generated aurora, meteor trails, forest mist/flames, flowing water, volcanic plumes and foundry steam/mechanisms. The camera composition stays fixed. The grotto's exaggerated central cyan mist is covered with the original cave artwork through a feathered holdout while the water and outer flames continue moving. All six source PNG hashes remain unchanged.

## Infinite repeat and lifecycle

The export bakes a forward circular overlap. `MenuBackgroundView.js` primes a second instance of the same selected MP4, dissolves for approximately 1.8 seconds before the active file ends, and rewinds the outgoing instance while hidden. The displayed repeat period is shorter than file duration because these ends overlap.

The overlap compensates for container opacity, keeping combined rendered opacity constant. The original poster remains available for reduced motion, data saver, still mode and primary-media failure. Pause/sleep and tab visibility suspend playback. Teardown releases the two dynamic textures and owned events/timers. Readiness timers suspend with playback and do not discard a clip that the native decoder has already prepared. Buffered clips hold their final frame when rendering is delayed; a late handoff can still start and rewind remains hidden. Native looping is enabled only when the optional buffer fails.

## Verification

- All six HD scenes played through the production loading component and completed multiple natural buffered handoffs. Each used two identical URLs, recorded zero native wraps, and kept rendered opacity at 1. Poster opacity was 0 during active playback.
- Sampled 95th-percentile frame intervals were approximately 50-67 ms in this browser run. The repeat checks establish hidden rewind and stable brightness; they do not guarantee immunity to unrelated system/browser frame drops.
- Pause held media time exactly at 10.607 seconds across observations. Primary-video failure removed both videos and restored poster opacity to 1. Destroy returned to 11 baseline textures and zero atmosphere roots; recreation restored one root and two videos.
- A final return from the real game exposed a preview readiness timeout, followed by a native wrap during a roughly one-second rendering gap. Those diagnostics are retained in the browser proof. The readiness and buffered-end guards were then corrected; a fresh normal-route reload decoded, completed two handoffs, and recorded no fallback or native restart, with video opacity 1 and poster opacity 0. The three focused contracts passed again after this correction.
- `living-hd-proof.json` records source/output hashes, dimensions, frame counts, zero audio streams, per-scene speed and encoded-boundary measurements. `hd-motion-browser-proof.json` and `hd-v4-*.jpg` record real loading-view playback.
- The existing menu-first loading order, loading-minigame archive and main-menu native-resolution contracts passed. Changed JavaScript syntax and scoped diff checks passed. No generation credential was found in scoped source, manifests or reports.

Fresh actual-game boot reached loading completion, the opening cinematic, main menu and save selection with save writes disabled by `?jkd_e2e=1`. The brighter scenery and readable foreground controls were visually checked in both real menus; `hd-v4-game-menu.jpg` and `hd-v4-game-save-menu.jpg` record those views. A full world/portal gameplay traversal is outside this media refinement and was not repeated.

## Review and reproduction

Use the canonical `serve.py` and open `/testing/2026-09-07-menu-atmosphere/`. This normal route and the game use v4. `?motionReview=v1`, `v2` and `v3` retain earlier comparisons. Preview loop join, pause, error, fallback, destruction/recreation and still controls remain available.

`values/menuAtmosphereLiving.json` owns generation and scene timing; `values/menuAtmosphere.js` owns runtime presentation. `ai-tools/2026-09-07-build-menu-hd.py` rebuilds from the retained raw sources using FFmpeg and NumPy. The corrected grotto source is `raw-v3-04-natural.mp4`. Tailwind remains compiled locally without Preflight, and the vendored Radash module handles cancellable resize debouncing.

`generation-v3.json` records the successful stronger generations and an uncertain grotto revision request that timed out without a job ID; it is not retried automatically. `upscale-v4.json` records an unsuccessful remote upscale attempt that rejected a data URL before returning a job ID. Final HD exports were completed locally. No runtime API or external CDN is required. Older proof files describe historical treatments rather than current resolution, timing or opacity.
