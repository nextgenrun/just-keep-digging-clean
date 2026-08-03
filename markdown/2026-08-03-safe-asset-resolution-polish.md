# Safe Asset Resolution and Menu Polish

## Scope

This pass is presentation-only. It does not change world generation, collision,
mining, rewards, input bindings, menu actions, save data, camera coordinates,
or the logical `1280x720` gameplay viewport.

The repository-wide visual inventory covered 9,521 raster files under
`sprites/`: 7,181 PNG, 2,299 WebP, and 41 JPG files. The existing authored
surface, underground scenic cards, semantic resource art, HUD, characters, and
world props were retained byte-for-byte. Bulk resizing those assets would risk
alpha halos, atlas-frame drift, memory growth, and recognition regressions.

## Evidence and changes

- The existing native-density renderer was exercised in a real hidden Edge
  session at Ultra: `1280x720` logical coordinates, `2560x1440` WebGL backing,
  healthy boot state, and no captured UI errors.
- Real PlayScene surface and texture-gallery captures were inspected. Their
  authored terrain, characters, HUD, and semantic resource art were already
  crisp; no blanket resampling was justified.
- The remaining obvious production mismatch was the main menu's three
  procedurally drawn button plates. They now use one ImageGen-authored,
  alpha-clean high-resolution family with deterministic idle and selected
  states. Labels, hit zones, positions, hover alpha, keyboard cursor, audio,
  timings, and actions are unchanged.
- The renderer default advances from High `1.5x` to the already-supported Ultra
  `2x` backing density. This changes sampling resolution only; the render-density
  foundation restores logical coordinates before scene and input code runs.

## Resolution contracts

- Main-menu bitmap source: `2150x430` RGBA.
- Runtime display: `260x52` logical pixels.
- Available density at Ultra: greater than `4x` the required physical width.
- Default canvas backing: `2560x1440`; gameplay remains `1280x720` logical.

## Rollback

- `?renderQuality=high` returns to the former `1.5x` backing density.
- `?nativeDensity=0` returns to legacy `1x` density.
- `?renderer=auto` retains the existing renderer-and-density rollback.
- `?mainMenuArt=0` restores the former Phaser Graphics button plates without
  changing any menu behavior.

## Validation

Passed after the change:

- main-menu native-resolution and hash contract;
- render-density foundation smoke, including High, Ultra, and 1x rollbacks;
- boot live-asset health and performance-foundation contracts;
- overground texture-clarity and whole-world V5 visual contracts;
- main-menu return/save teardown contract;
- real hidden-Edge main-menu QA with no quality override: Ultra selected,
  `2560x1440` backing, all three authored texture routes at `260x52`, and zero
