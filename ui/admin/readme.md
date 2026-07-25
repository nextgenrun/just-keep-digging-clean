# Admin Health

This directory owns the DOM-only admin presentation for runtime canary data.

Open the game with `?adminHealth=1` to show the health badge and expandable
report. In development, `Ctrl+Shift+F12` also toggles it. Production hosts can
set `globalThis.__JKD_ADMIN_HEALTH__ = true` before `main.js` loads.

The panel reads `RuntimeCanarySystem`; it never changes game state. Reports are
also available from `window.__jkdHealth.snapshot()`.
