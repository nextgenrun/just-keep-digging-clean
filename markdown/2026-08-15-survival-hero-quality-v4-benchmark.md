# Survival hero-quality V4 benchmark

## Outcome

The V3.2 normal-map and secondary-motion pass produced only a small runtime-size
gain because the source mesh already contains 83,188 vertices and 119,304
polygons. V4 instead fixes a material-authoring fault: packed ORM textures were
feeding whole RGB colour into both roughness and metallic inputs.

The isolated V4 renderer reconstructs the authored channel contract, restores
full-resolution textures, retains the accepted lighting and body animation, and
builds synchronized current/123/155 px approval proofs for walk, run,
punch-jab/side mining, mining-up, ground strike/mining-down and prone flight.

## Authority boundary

- Current runtime walk sheet remains the before authority.
- `SRC_walk` remains the exact motion authority.
- No body bone, skin weight, root, camera, facing or timing edit is allowed.
- Secondary shapes are created only in Blender process memory and are never
  saved into the source `.blend`.
- No runtime asset is written by the V4 renderer or packer.

## Why this reads as a larger improvement

Correct green-channel roughness and blue-channel metallic separation restores
the intended difference between leather, fabric, denim and hardware. Restrained
red-channel AO adds local seam/fold definition before the single downsample,
without the rejected V3 global contrast grade. The larger 155 px lane shows the
remaining information ceiling imposed by a 123 px presentation.

## Approval sequence

1. Review punch-jab first because it exposes hands, elbows and jacket compression.
2. Review ground strike for torso/hip compression and run for cadence readability.
3. Confirm flight retains its exact prone-v3 facing and loop authority.
4. Wire nothing until all family comparisons are explicitly approved; all six
   currently pass drift, silhouette, bounds, green-finger and runtime-hash gates.
