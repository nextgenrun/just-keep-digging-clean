# Admin Health

This directory owns the DOM-only admin presentation for runtime canary data.

Open the game with `?adminHealth=1` to show the health badge and expandable
report. In development, `Ctrl+Shift+F12` also toggles it. Production hosts can
set `globalThis.__JKD_ADMIN_HEALTH__ = true` before `main.js` loads.

The panel reads `RuntimeCanarySystem`; it never changes game state. Reports are
also available from `window.__jkdHealth.snapshot()`. The expanded report shows
rolling frame-time p95/p99, worst-frame, one-percent-low FPS, and long-frame
counts supplied by the read-only performance telemetry system. A separate row
shows sampled p95 time for HUD, gameplay, world, effects, camera/light, and
continuous scenic work. In scenic mode the streaming row also shows full world
syncs avoided, last sync duration, pending/resident/cancelled assets,
visible-card demand, and scheduler state. Legacy mode keeps its
background-candidate and tile-window counters.
