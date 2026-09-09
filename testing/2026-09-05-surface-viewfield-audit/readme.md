# Above-ground viewfield audit

September 5 current-checkout evidence and patch proposal. The capture runner uses
this checkout's canonical serve.py and a fresh, isolated, save-disabled E2E run.
Production assets and runtime source files are unchanged.

The final surface images move the player and camera together. Flight captures
freeze the survey actor's controller, keep the scenery updating, and wait for
camera coverage and pending sky assets to settle. Earlier camera-only and falling
actor captures are superseded. This is a visual survey, not a manual playthrough.

The local full-review profile resolves successfully, but the modular surface prop
layer still reads the demo compatibility facade for Level Two. Treat that missing
support art as a separate capability-plumbing defect, not a missing asset library.

- survey.json: camera/player/bounds, loaded scenery and existing review snapshots.
- gallery.html: original captures, each linked at full size.
- sheet-*.jpg: browser-rendered contact sheets of the original captures.
- observatory-motion-t0.png / t12.png: two times in the current ground review.

Run testing/2026-09-05-surface-viewfield-audit.mjs with bundled Node. The --sky
option retains the settled surface captures and refreshes the sky survey.
Run testing/2026-09-05-surface-audit-gallery.mjs to regenerate contact sheets.
