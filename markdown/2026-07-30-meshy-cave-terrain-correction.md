# Meshy Cave Terrain Correction

> Superseded visually on 2026-07-31 by
> `2026-07-31-cave-interior-visual-correction.md`. The zero-`CAVE_WALL` terrain
> remains current; the Meshy interior/background promotion described below was
> removed after live review.
**Date:** 2026-07-30

## Outcome

The expanded 60x20 `CaveScene` now uses the real refined Meshy cave render and
transparent Meshy shell sprite. The three ImageGen panorama families are no
longer routed by the cave runtime.

The hidden `CAVE_WALL` backdrop floor and boundary were removed completely from
the expanded scene. Every in-bounds solid cell is now a normal diggable
resource or reward tile with real HP. World out-of-bounds collision keeps the
player inside without adding visible or hidden unbreakable cave blocks.

## Gameplay

- Four complete dirt/stone floor rows make the walking route stable at entry.
- All expanded reward nodes and the signature block sit in the mineable floor;
  none float in empty air.
- The player still spawns at tile `2,15`, the camera follows, and the approved
  mouth at the left remains the return point.
- The default expanded model contains exactly zero `CAVE_WALL` cells.
- Legacy `?caveLevel=legacy` behavior remains available for comparison.

## Art

Runtime assets:

- `sprites/backgrounds/caves/meshy-v1/meshy-cave-background-1280x720.png`
- `sprites/backgrounds/caves/meshy-v1/meshy-cave-refined.png`

The background is composed in world space at native density with feathered
cards. Three transparent Meshy shell sprites establish large authored cavern
structures behind the actual tile terrain. They are visual-only and never own
collision.

## Validation

- Expanded cave contract passes with zero `CAVE_WALL` cells, all 60 top-floor
  cells mineable, exact Meshy assets, persistence migration, camera follow, and
  Phaser-only presentation.
- Cave gameplay parity, integrated restoration, and multi-entrance repair pass.
- Live no-save Phaser launch entered `CaveScene` at tile `2,15`, loaded both
  Meshy textures, rendered three Meshy shell sprites plus 36 native backdrop
  cards, followed the player, and reported zero browser errors.
- The current world exposes 51 interactive cave entrances; ten unsafe mouths
  remain correctly rejected.