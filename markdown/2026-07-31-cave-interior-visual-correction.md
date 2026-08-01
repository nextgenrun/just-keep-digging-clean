# Cave Interior Visual Correction

**Date:** 2026-07-31

## Problem

The 1280x720 rejected Meshy review render was repeated and mirrored across the
60x20 cave as 36 backdrop cards. A 512px transparent Meshy preview was also
enlarged into three 8.4-tile arches. In play this produced obvious orange
repetition, black seams, duplicate entrances, and one enormous white arch.

## Correction

- The small approved cave entrance at the far left remains unchanged.
- The Meshy review background and transparent preview are no longer loaded by
  `CaveScene`.
- Each cave now displays one continuous 3:1 authored panorama across the whole
  60x20 world. Nothing is tiled, mirrored, or repeated.
- The three existing interior families again differentiate the six cave
  archetypes.
- The mineable-only world model remains authoritative with zero in-bounds
  `CAVE_WALL` tiles.
- Dirt and stone now form five-tile material runs instead of alternating every
  cell, eliminating the checkerboard ground pattern.

## Live validation

A save-safe 1280x720 Phaser launch confirmed one continuous 5640x1880 interior,
one unchanged 202x193 left entrance, zero giant Meshy shell actors, no Meshy
interior textures loaded, ten natural material transitions across the lower
floor row, zero `CAVE_WALL` cells, and zero browser errors.

Screenshot: `C:/tmp/cave-visual-correction-2026-07-31.png`.