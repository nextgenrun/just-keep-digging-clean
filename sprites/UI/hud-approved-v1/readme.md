# Approved HUD v1 runtime assets

Transparent frame assets derived from the player-approved 2026-07-13 HUD mockup. Phaser owns all live labels, fills, timers, mute state, hit targets, and animation; these PNGs supply presentation only.

- Runtime-loaded by `BootScene` under `ASSET_KEYS.ui.approvedHud`.
- Rebuilt with `ai-tools/2026-07-13-build-approved-hud-skin.py`.
- The source approval image and review sheet are under `visual-approval-previews/approved-player-hud-v1/`.
- Missing textures are intentionally non-fatal so the legacy HUD remains an automatic fallback.
