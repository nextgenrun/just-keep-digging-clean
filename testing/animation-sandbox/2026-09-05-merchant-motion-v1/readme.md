# Merchant motion sandbox - 2026-09-05

Open http://127.0.0.1:8080/testing/animation-sandbox/2026-09-05-merchant-motion-v1/index.html using this checkout's serve.py.

Review all six original merchant paintings with locally weighted joint motion, individual gestures, blinking, pause, slow motion, timeline scrubbing, game-size viewing and focused inspection. Compare uses five existing v13 idle videos and the Magma static baseline; it does not run the production activity scheduler.

The approved motion tuning and source-space joints now live in values/merchantMotion.js and values/merchantMotionRigs.js. The sandbox wrappers retain review controls and compatibility. The sandbox uses WebGL 2. These are articulated existing paintings, not a newly generated sprite-sheet pack. The game and this review share the renderer and authored poses; production imports no sandbox UI.

## Verification

On 2026-09-05, the local browser loaded and rendered all six merchants. Each
signature pose was inspected in the enlarged view. The five existing alpha
videos played successfully at quarter speed; the sixth comparison is the
Magma static image. All new canvases and existing videos stayed frozen when
paused. Calm-idle selection, timeline scrubbing, comparison, focus/back,
dark/light backgrounds and 99.2 px game-size rendering were checked.

No browser console warnings or errors were recorded in the final check.
The new-motion overview was observed at 60 fps in this browser; the view with
all five additional comparison videos was observed at 52 fps. These are local
sandbox observations, not a full-game performance benchmark.

`validation.json` records 264 sampled joint poses, including maximum blinks:
all triangles retained positive area, reference foot drift was zero, and
entry/exit poses matched the idle transforms. JavaScript syntax checks passed.
This geometric check complements the visual review; it does not establish
subjective art acceptance. The user approved this motion and requested game integration; see markdown/2026-09-05-merchant-motion-runtime.md.
