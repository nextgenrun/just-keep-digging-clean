# Living horizons: continuous world candidate

The local review now carries the Observatory's independently moving atmosphere through the actual world. Four cloud depths, a continuous sky field, and softer forest/backdrop joins replace the empty flight areas and abrupt background edges. The source artwork is reused from this checkout.

[Open the live comparison](http://127.0.0.1:8195/testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/) - [Watch the final travel clip](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa/living-horizons-final.mp4) - [Captured world survey](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa/gallery.html)

## What changed

- Four parallax planes reuse 54 existing Observatory wisps. Each has its own forward speed; clouds stream in outside the camera bounds instead of resetting within the view.
- The original wisp atlases contain residual opaque dark sky. Runtime copies remove that matte and feather the outer pixels, eliminating the moving rectangular patches. The source files remain unchanged.
- Overlapping sky cards cover horizontal travel and the full review altitude range. The previous repeated upper forest band is suppressed in the candidate.
- The distant forest has its own camera parallax. Its joins respect mirrored images, and the top fade removes repeated baked moons while retaining the mountains and trees.
- Distant Heavenblocks paintings are feathered and graded into the sky. Solid island and portal geometry stays grounded.
- Surface prop admission reads the same gameplay capability owner used by the scene, allowing the full-review profile to show its supporting props.
- Atmosphere responds to the existing weather input. Images are pooled with a 180-sprite total cap, and owned textures are released when the scene stops.

The strongest earlier benchmark is [Observatory V16](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/2026-09-05-surface-viewfield-audit/observatory-v16-t12.png). This candidate extends its atmospheric components into the continuous game renderer. It does not reproduce the entire Observatory painting in every region.

## How to review

The viewer runs the checkout's actual PlayScene through canonical serve.py. Use **Current world / Layered candidate** to compare. Drag or use the arrow keys, choose a location, and use the altitude slider to inspect the forest-to-sky transition. **Slow travel** shows parallax; **Hold atmosphere** isolates camera movement. **Play here** restores the real player controller.

The review query is layeredSky=1. Normal entry remains on the current renderer. The viewer uses the existing E2E save-disabled route and the full-review gameplay profile in an isolated review world.

The local server is at port 8195. To restart it, run Python against:
testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/serve-review.py

## Validation and evidence

| Check | Result |
| --- | --- |
| Broad camera survey | 49 captures completed: 14 surface, 30 flight, and 5 comparison views; all five contact sheets visually inspected. |
| Latest horizon correction | Six fresh positions passed: forest joins at X100/117/134, Town handoff, open sky, and Heavenblocks. |
| Latest browser errors | Zero page errors and zero failed requests in the six-position final run. |
| Motion and pause | Continuous forward motion checked in the broad run; final run confirmed a frozen clock during pause and advancing motion after resume. |
| Actual controls | Browser input moved the player about 180 px horizontally and raised the player about 1176 px in flight. |
| Sprite budget | Active plus pooled clouds stayed within 180 in the latest six-position run. |
| Lifecycle | PlayScene stop removed the inspector and all owned clean-alpha, feather, and mask textures. |
| Final recording | 14-second recording of the final runtime, including a held camera and slow travel. |
| Existing Observatory contract | Passed. |
| Scoped whitespace check | Passed. |

[Final verification JSON](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa/final-verification.json) - [Latest check script](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/2026-09-06-layered-final-review.mjs)

The 49-view script completed its captures, input assertions, and comparisons, then failed while serializing its teardown return value. It is evidence for the captured views and input checks, not a clean suite pass. The separate final six-view run completed successfully and persisted its results before exit. The broad survey predates only the final top fade that removes baked forest moons.

Two older fixture tests remain failing: sky/underground cohesion encounters image.texture in the unchanged terrain view, and the surface prop fixture expects an active Level Two prop with its demo setup. The latter failure was also reproduced using the prior prop admission implementation. These are reported separately from the passing browser checks; full repository health is not claimed.

## Remaining work from the full-world proposal

This is a working atmospheric candidate, not the completed regional art pass. Repeated mountain silhouettes still make long surface stretches feel similar. Portal corridors and solid Heavenblocks terrain retain conspicuous rectangular construction. Region-specific midground silhouettes and prop composition from the [full viewfield patch proposal](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/markdown/2026-09-05-above-ground-viewfield-patch-proposal.md) remain the next material work.

The Town video and all source art are unchanged. This review does not constitute a full manual playthrough, low-end GPU performance test, or complete weather/day-cycle acceptance pass.

## Main code

[Composition and motion values](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/values/worldVisualLayeredSkyReview.js) - [Cloud field](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/world/rendering/scenic-world/WorldVisualLayeredCloudField.js) - [Sky and edge owner](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/world/rendering/scenic-world/WorldVisualLayeredSkyReview.js)

Source provenance: existing sky-base-v3.png and the upper, horizon, lower, and near cloud-wisps-v5 atlases under testing/animation-sandbox/2026-08-30-observatory-authored-layers-v3/pack. Registration is copied from that pack into values/worldVisualLayeredSkyAssets.js. No generated replacement artwork was added.

