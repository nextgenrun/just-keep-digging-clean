# Animated logo visibility and efficient menu motion review

Open `http://127.0.0.1:8080/testing/2026-09-09-menu-logo-motion/` after starting `serve-review.py` with Python. Uses the existing range-capable production handler on loopback only.

Three animated logo treatments, six selected-scene loops, loading/menu composition, pause/resume, and current/optimized video comparison. Only one scenery player and one logo player run; title changes preserve playback. Device reduced-motion/save-data preferences and `?menuMotion=0` retain still artwork. No save or account APIs are used.

`review.js` composes existing Phaser UI, `logo.js` owns the approved full alpha animation and shared-texture contour, `cadence.js` reports the review players' native frame callbacks and decoded/dropped counts. CSS/Tailwind styles only the review shell; the game composition uses Phaser and its existing loading panel.

Values: `../../values/menuMotionReview20260909.json`. Builder: `../../ai-tools/2026-09-09-optimize-menu-motion.py`. Results and limitations: `../../markdown/2026-09-09-menu-logo-motion-review.md`.

Quiet sky was approved and applied to the local game on 9 September. No live deployment was performed. `optimized-media.json`, `optimized-final-browser.json`, and `current-final-browser.json` describe the final files. Preliminary evidence is explicitly named first or described in the report.

`approved-runtime.patch` is the scoped integration diff. The runtime loading fixture lives at `../2026-09-07-menu-atmosphere/?motionReview=v6`; `approved-runtime-*.json` records media state and destruction/recreation checks.
