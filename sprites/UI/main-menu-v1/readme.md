# Main Menu V1

High-resolution authored bitmap plates for the production main-menu buttons.

- Runtime size: `2150x430` RGBA for both idle and selected states.
- Display contract: `260x52` logical pixels, leaving more than 4x source density
  at the Ultra 2x backing resolution.
- The selected state is derived offline from the same approved source so button
  geometry cannot shift during hover or keyboard selection.
- Build with `python ai-tools/2026-08-03-build-main-menu-v1.py`.
- Runtime ownership and rollback live in `values/mainMenuPresentation.js`.
  `?mainMenuArt=0` restores the prior Phaser Graphics plates.

Do not resize these files at runtime beyond the declared display contract and
do not replace them with procedural or HTML substitutes.
