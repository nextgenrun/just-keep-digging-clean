# Earthquake Feedback UI v2

Production Phaser artwork for restrained seismic feedback.

- `seismic-status-frame-v2.png` is the 2x compact status/recap plate. Phaser
  owns all labels, timers, progress, tint, visibility, and motion.
- `seismic-medallion-v2.png` is the reusable cave-in and offscreen hazard
  emblem. Dynamic countdown arcs and direction text remain live.
- Both runtime assets are packed deterministically by
  `ai-tools/2026-07-26-build-earthquake-feedback-ui-v2.py`.
- The generated master and prompt provenance are retained under `sources/`.

These images are presentation only and never own earthquake state, collision,
tile mutation, damage, rewards, or saves.
