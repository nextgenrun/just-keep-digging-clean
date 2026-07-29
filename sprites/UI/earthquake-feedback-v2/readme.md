# Earthquake Feedback UI v2

Production Phaser artwork for restrained seismic feedback.

- `seismic-status-frame-v2.png` is the 2x compact status/recap plate. Phaser
  owns all labels, timers, progress, tint, visibility, and motion.
- `seismic-medallion-v2.png` is the reusable cave-in and offscreen hazard
  emblem. It remains only in the compact HUD and offscreen direction signal.
- `seismic-tile-fracture-v1.png`, `seismic-tile-collapse-v1.png`, and
  `seismic-rubble-return-v1.png` are the three 512x512 authored world-feedback
  sprites. Phaser may position, scale, rotate, and fade them but does not draw
  substitute impact geometry.
- `seismic-landing-footprint-v1.png`, `seismic-ceiling-fracture-v1.png`,
  `seismic-falling-boulder-v1.png`, and `seismic-impact-debris-v1.png` are the
  promoted one-to-one FallZone sequence. Their configured origins keep warning
  and impact art embedded in the ground plane. On contact, a second instance
  of the authored boulder briefly squashes at the ground edge beneath the
  debris instead of hovering or vanishing before contact.
- The status assets are packed deterministically by
  `ai-tools/2026-07-26-build-earthquake-feedback-ui-v2.py`.
- The status and tile-effect masters and prompt provenance are retained under
  `sources/`.
- The tile sprites are rebuilt deterministically by
  `ai-tools/2026-07-28-build-earthquake-tile-feedback-v1.py`.
- The FallZone sprites were rebuilt deterministically in
  `testing/animation-sandbox/earthquake-dodge-world-v1/` by
  `ai-tools/2026-07-28-build-earthquake-dodge-review-assets.py`, then promoted
  bit-for-bit under their production `seismic-*` names.

These images are presentation only and never own earthquake state, collision,
tile mutation, damage, rewards, or saves.
