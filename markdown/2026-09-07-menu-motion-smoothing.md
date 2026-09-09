# Menu motion and logo readability — 2026-09-07

The default boot/menu/loading scenery now uses v5. Each landscape moves more
slowly, with motion-compensated intermediate frames at 60 fps. The approved
source videos, original paintings, selected-scene behavior, useful loading tips
and OPEN BETA DEMO wording remain intact.

| Scenery | Slower motion than v4 | Encoded duration |
| --- | --- | --- |
| aurora | 46.88% | 29.92 s |
| lantern-forest | 43.75% | 22.28 s |
| luminous-grotto | 46.15% | 24.20 s |
| starfall | 48.44% | 29.92 s |
| ember-reaches | 57.35% | 31.83 s |
| quiet-foundry | 50% | 28.03 s |

The new H.264 backgrounds use the sources' native 1280 × 720 resolution. V4
upscaled that same source detail to 1920 × 1080 at 24 fps. Removing the baked
upscale reduces texture dimensions while the new intermediate frames provide
finer motion steps. Playback rate stays at 1; slowing a 24 fps clip in the browser
would have delivered fewer distinct frames each second. Original source motion
remains forward, with no camera animation or new generated content.

The encoded ends receive a 0.6-second closure at the final 60 fps cadence. V5
plays each closed loop with one native video decoder. This removes the spare
video's cold-load readiness failures, duplicate stream and runtime double blend.
Earlier v1–v4 comparisons retain their buffered 1800 ms dissolve, with staggered
startup for the optional second video.

The sharper static UNDERSTAR lettering now remains visible on its approved
stone backing. A small H.264 layer adds only colored light from the approved
logo animation at 60 fps. The previous transparent video replaced the complete
letter faces and ran at 0.67 playback rate, about 16 distinct source frames per
second. The revised layer retains that gentle movement speed in its frames and
plays at normal speed, with additive blending at 0.55 opacity. Letter outlines,
position and layout no longer depend on the animated matte. No new logo design
or generation request was made.

Reduced motion, data saver, menuMotion=0 and logoMotion=0 retain static artwork.
Existing pause/sleep/visibility and scene teardown ownership remain in place.
The review now loads the same stone backing as the game; it previously omitted
that texture. Its frame probe also excludes callbacks from a paused hidden
buffer instead of reporting those idle periods as visible playback stalls.

## Verification

- All seven output clips fully decoded at 60 fps with expected dimensions; source SHA-256 hashes remain unchanged. Exact decoded frame counts and boundary measurements are in smooth-v5-media-checks.json.
- The same aurora preview at a 60 fps render rate measured a 95th-percentile video-frame interval of 50.1 ms for v4 and 16.8 ms for the initial v5 output. This is a sampled browser comparison, not a guarantee for every device.
- Changed JavaScript syntax checks, the existing menu-first loading order, loading archive and main-menu native-resolution contracts passed. Scoped diff checks passed.
- Final native playback: all six scenes repeated with one background decoder, no media fallbacks, and the static logo visible while its H.264 lights played. Sampled 95th-percentile video-frame intervals were 16.8–33.4 ms.
- Pause held media time; resume advanced it. Forced media failure restored the original poster. Destroy returned to 12 baseline textures, zero scenery roots and zero CSS loading panels.
- A fresh save-disabled actual game boot reached the main menu and save selection with the readable logo, current scenery and OPEN BETA DEMO footer. No browser errors were captured. No world or portal traversal was repeated for this media change.
- Final browser/lifecycle evidence is recorded in smooth-v5-browser-proof.json; smooth-v5-game-menu.png and smooth-v5-save-menu.png are actual game captures.

Reproduction: values/menuMotionRefinement.json owns all export settings. Run
ai-tools/2026-09-07-build-smooth-menu.py, then the same script with --verify.
The build closes new loops automatically; --close can finalize an interrupted
batch. Existing v4 files remain available. Runtime settings are in
values/menuAtmosphere.js and values/branding.js.

Review: /testing/2026-09-07-menu-atmosphere/?loadingUiReview=1 provides scenery,
pause, error, progress and fade controls. loadingUiReview=clean gives a clean
view; scenery=ember-reaches (or another registered id) selects a landscape.
The game and normal review route both use v5. No remote deployment was made.
