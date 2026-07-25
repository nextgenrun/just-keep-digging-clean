# Authored World Living Motion

The approved town presentation is the visual baseline for the active v11 world. The runtime now reuses the approved atmosphere atlas across both authored underground regions instead of adding screen-fixed overlays or touching gameplay tiles.

## Active coverage

- Cool Level 1 field: `x0..131 / ty65..2064`
- Warm Level 2 field: `x113..279 / ty65..2064`
- The deliberate `x113..131` overlap blends the authored visual transition;
  gameplay/material ownership remains authoritative at `x132`.
- The background master and depth master must both be enabled.
- Every sprite uses scroll factor `1`, so ambience remains fixed to the world when the player and camera move.

## Living layers

- Level 1 uses cool mist and restrained crystal aura pools.
- Level 2 uses warm smoke and steam/glow pools.
- Motion is deterministic and sine-based over 7–18 second cycles, avoiding visible tween restarts when an anchor enters or leaves the camera.
- Only 35 sprites are allocated. Camera culling assigns nearby deterministic anchors to those pools; no per-anchor sprite allocation occurs.

## Weather and performance

Wind, gusts, rain, fog, the day/night amount, and the underground storm signal are read from the authoritative weather and clock snapshots. Surface weather influence fades over the first 96 depth tiles; only six percent of wind sway remains deeper down, preventing cave ambience from behaving like open-air clouds.

At less than 48 FPS, update cadence and visible pool caps are reduced. Below 36 FPS, the layer hides until performance recovers.

## Rollback

- `?worldLiving=0` disables only the pooled authored-world living pass.
- `?level1Living=0` remains a compatibility alias.
- `?worldMotion=0` disables all optional background motion and overrides the narrower enable flags.
- `?worldDepthMaster=0` or `?worldMaster=0` also prevents this pass from rendering.

These layers do not read, replace, damage, or mutate `WorldModel` tiles, collision, resources, or digging state.
