# Expanded Cave Level Visual Overhaul

> Superseded on 2026-07-30 by `2026-07-30-meshy-cave-terrain-correction.md`.
> The hidden `CAVE_WALL` floor and ImageGen runtime described below are history,
> not the current cave implementation.
**Date:** 2026-07-29

## Outcome

Entered caves now default to a 60x20-tile side-view level instead of the former
18x10 fixed screen. The player enters at the far-left mouth and the normal
camera follows them through three large connected visual chambers to a
signature reward at the deep-right destination.

The existing overworld repair remains authoritative: 51 safe Level One mouths
can launch the scene, while ten invalid mouths remain rejected.

## Production Art

The runtime uses three native 2172x724 ImageGen panoramas:

- Echo Gallery, Prism Nursery, and Storm Scar use the violet crystal cathedral.
- Rootbound Hollow uses the ancient root-and-fossil cavern.
- Gilded Burrow and Ember Fault use the obsidian ember vault.

Assets live in `sprites/backgrounds/caves/expanded-v1/`. They contain no UI,
characters, square tiles, or baked mineable rewards. Phaser displays the
selected image as one continuous 3:1 world-space level.

## Gameplay Foundation

- A continuous four-cell-thick `CAVE_WALL` floor keeps the main route safe
  without adding jump-only gaps.
- Structural collision tiles are invisible in the expanded presentation; the
  authored painting is the visible floor and cave shell.
- Mineable resource and signature tiles stay live above the panorama and use
  the normal DigSystem, damage, reward, Flight, Quick Slash, Thunder Strike,
  player animation, and GP paths.
- Elevated reward clusters make Flight useful without making it mandatory for
  reaching the exit or deep destination.
- The approved cave-mouth cutout remains the return point at the far left.
- The GP readout is camera-fixed; identity copy and exit prompts remain Phaser
  text over authored world art.

## Persistence

Coordinate-key cave persistence remains authoritative. When an old compact
cave reward or signature coordinate was already collected, the equivalent
expanded-layout node is also removed. This prevents one-time cave rewards from
returning solely because their authored level position moved.

## Ownership

- `values/caveLevelConfig.js` owns expanded dimensions, camera values, reward
  coordinates, visual-family mapping, asset paths, and rollback parsing.
- `world/model/CaveWorldModel.js` owns solid floor generation and legacy
  collected-coordinate aliases.
- `systems/visual/CaveLevelPresentationSystem.js` owns panorama composition,
  structural tile masking, identity copy, the approved mouth, and fixed GP
  presentation.
- `ui/scenes/CaveScene.js` remains the lifecycle orchestrator.

## Rollback

`?caveLevel=legacy` restores the former 18x10 fixed cave scene and its original
single-screen backgrounds. `?caveEntrances=0` independently disables the
production entrance repair.

## Validation

The following contracts pass:

- `testing/2026-07-29-expanded-cave-level-contract.mjs`
- `testing/2026-07-28-cave-entrance-repair-contract.mjs`
- `testing/2026-07-16-integrated-cave-restoration-contract.mjs`
- `testing/2026-07-13-cave-gameplay-parity-smoke.mjs`

The expanded contract verifies the continuous no-jump route, real mineable
nodes, signature placement, legacy save aliases, six identity routes, three
native 3:1 production images, camera follow, rollback, and absence of HTML or
primitive cave placeholders.
