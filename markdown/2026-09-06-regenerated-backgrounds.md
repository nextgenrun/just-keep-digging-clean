# Level 2 living scenery and regenerated background patch

The Level 2 preview now opens at Crownfall Sanctuary (X196), with darker detailed mountain layers, three waterfall landmarks, seven flowing water channels and localized drifting spray. Valley mist and near haze are restricted to Level 2 (X132–279). The earlier continuous sky/mountain replacement remains available across the world. The existing Town Square video is byte-identical.

[Open playable preview](http://127.0.0.1:8195/testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/?revision=level2-living-final) · [Motion and capture gallery](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa-regenerated/gallery.html)

## Water and layered motion

Moonfall Reach (X155), Crownfall Sanctuary (X196) and Eastern Cascades (X258) sit behind the surface trees and gameplay props. Their rock and architecture remain fixed in their own parallax plane. A WebGL shader samples moving water detail only inside bright waterfall channels; separate cloud-atlas sprites provide drifting spray at the base. Mountain planes, forest, high clouds, valley mist and near haze use different scroll factors and wind speeds.

The motion is verified independently of camera travel. Two isolated renders at shader times 0 and 0.73 seconds show about 14 RGB levels of average change in a waterfall patch, while the neighboring rock patch is pixel-identical. [Pixel motion proof](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa-regenerated/water-motion-verification.json).

## Existing time and weather systems

The renderer reads DayNightCycle and WeatherSystem directly. It does not introduce another clock or weather simulation.

- The interpolated clock palette drives sky and horizon colors, mountain lighting and star visibility. Daylight hides the generated night sky.
- Existing cloud cover, precipitation, fog and storm amounts control cloud/mist density and tint.
- Signed wind and gust strength drive cloud travel, including smooth changes in direction.
- Existing rain, snow, lightning, seasons, sun and moon retain their own systems.

The review has time and weather selectors and uses the existing systemPacing=0 switch in its disposable, save-disabled session so clock progression is visible immediately. Production progression and demo profiles are not changed by this follow-up.

## White flecks and legacy backgrounds

DayNightCycle no longer creates its duplicate large procedural star dots in the regenerated view. GroundEffectsAtmosphere omits its old firefly, wind-mote and mist layer there. Real precipitation remains active.

The candidate excludes the old far forest, sky foundation/cards, accent clouds, Observatory wisps, weather cloud paintings and all six Heavenblock backdrop/facade paintings. A new transparent rock skin aligns to the real island platforms. Portal arches, altars, collision surfaces, ground props and the Town video retain their owners.

The old/new comparison remains available. The regenerated renderer uses layeredSky=1; the game default has not been switched.

## Art pipeline

The active pack contains eight generated background source files plus the separate generated island skin. The richer mountain and waterfall generations returned RGB instead of the requested alpha. Those checkerboard/black-background versions were rejected. Further built-in ImageGen edits supplied explicit magenta mattes, which the renderer composites into owned alpha textures with edge-spill removal. Source PNGs are copied byte-for-byte from the tool; the original forest, cloud and island alpha remains intact.

[Asset folder and provenance](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/sprites/backgrounds/world-visual-v2/regenerated-horizon-v2/readme.md) · [Latest exact prompts and selections](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/sprites/backgrounds/world-visual-v2/regenerated-horizon-v2/2026-09-06-level2-motion-prompts.json) · [Native sizes and hashes](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/sprites/backgrounds/world-visual-v2/regenerated-horizon-v2/manifest.json).

## Validation

- 35 fresh actual-game captures: 23 overlapping surface views across X7–271 and 12 flight views. Zero page errors and failed requests. Walking moved 1,035 world pixels; flight gained about 643 pixels of height.
- Nine actual-game time/weather captures: dawn, day, dusk, night, storm, rain and winter snow across the Level 2 landmarks. Real clock progression, weather response and zero old white-fleck sprites were checked.
- 12 close island captures plus a wide view verified the new skins and absence of old facade/backdrop textures.
- 50 camera/zoom geometry cases and 3,150 opaque-sky coverage samples passed, along with source-scale limits, admission gates, underground culling and cleanup.
- All sampled generated mountain/landmark textures have transparent background areas and zero visible magenta pixels.
- Water motion, atmosphere pause/resume, canvas/frame/inspector cleanup and actual waterfall-pipeline removal passed.
- Existing environment-systems and Heavenblocks layout contracts passed. Scoped diff checks passed.
- The delivered H.264 motion clip is 1470×826 and 13.33 seconds, recorded from actual Level 2 walking and flight.

[World results](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa-regenerated/final-verification.json) · [Weather results](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa-regenerated/level2-environment-verification.json) · [Island results](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa-regenerated/island-verification.json).

Town video SHA-256:
1650f7a88e2445ef9ab1be954680e4a8d5ffb51b2ccd8e7def5bec19726132d6

Validation used fresh isolated Chrome against the checkout's canonical serve.py runtime on port 8195. Water flow requires the WebGL renderer; its Canvas fallback retains the painting and moving mist. A full repository test pass is not claimed. The earlier Town motion fixture's unrelated stale index cache-revision assertion remains documented in the prior review.

The real BEDROCK columns at X119/X132 and the island platform collision rows were not changed. See the [collision ownership audit](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/markdown/2026-09-06-background-collision-ownership-audit.md).

The natural-motion follow-up and fixed-camera 60 fps clip are documented in
[2026-09-06 Natural layered motion](2026-09-06-natural-layer-motion.md).
