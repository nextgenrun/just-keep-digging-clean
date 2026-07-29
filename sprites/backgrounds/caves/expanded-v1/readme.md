# Expanded Cave Level Art V1

Production ImageGen panoramas for the expanded CaveScene runtime.

- `2026-07-29-echo-prism-cave-level-v1.png` serves Echo Gallery, Prism Nursery, and Storm Scar.
- `2026-07-29-rootbound-cave-level-v1.png` serves Rootbound Hollow.
- `2026-07-29-ember-gilded-cave-level-v1.png` serves Gilded Burrow and Ember Fault.

All three sources are 2172x724 native 3:1 side-view panoramas. The runtime fits
each image to the matching 60x20-tile world without changing its aspect ratio.
The painted floor is presentation; invisible `CAVE_WALL` cells remain the
authoritative collision surface. Mineable and signature tiles remain live
renderer objects above the authored art.

Do not tile, crop, or repurpose these images as a one-screen compact cave.
