# HUD cohesion v1

ImageGen-authored production chrome that brings the bottom tutorial, action
bar, and inventory hint into the approved blackened-steel, aged-bronze, and
icy-cyan HUD family.

- `tutorial-current-action-v1.png` is a 1024x256 RGBA frame. Its circular
  guide well and long two-line copy bay contain no baked text; Phaser owns the
  live step badge, current action, next promise, and remapped key labels.
- `celestial-actionbar-v2.png` is a 1024x320 RGBA five-slot foundation with
  five equal icon wells, five aligned live-number tabs, and two live metric
  plaques. Ability state, activation, drag ordering, locks, GP, and mining
  damage remain runtime-owned.
- `inventory-keycap-v1.png` is a 128x128 RGBA empty keycap. The remappable
  inventory label is rendered live at 25x25 display size over the bag art.

The three assets were generated separately with the built-in ImageGen workflow
against the approved player/world-state HUD and inventory references. Sources
used a flat green background; the installed chroma helper supplied a soft
matte and despill, followed by alpha-cropping and Lanczos downscaling. Original
generated sources remain in the Codex generated-image store.

Runtime routing is owned by `values/assetKeys.js`, `values/approvedHudSkin.js`,
`values/celestialActionBar.js`, and `ui/scenes/BootScene.js`. Older objective
and action-bar assets remain untouched for rollback and comparison.
