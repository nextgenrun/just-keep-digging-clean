# Survival Global Benchmark V1 — REJECTED / SUPERSEDED

**Hard reject recorded 2026-08-14. Do not use this package as animation or
motion authority.** Its Blender rollback `MINER_run` assumption was rejected,
and several reels did not represent the exact active runtime animation mapping.
Nothing from this directory may be promoted or wired. The replacement review is
`../2026-08-14-survival-current-runtime-vs-full-improvements-v1/`.

Review-only full-inventory mockups using the user-approved visual benchmark.

Historical assumptions (rejected):

- Exactly four `SurvivalCinematic` lights; the overlapping polish rig is off.
- Normal maps are interpreted as Non-Color data.
- AgX with Medium High Contrast.
- Preserve-volume deformation enabled.
- Blender rollback `MINER_run` was incorrectly treated as accepted and is now
  hard-rejected.
- Finger-bone-driven polygons use the existing dark `Gloves1` material in the
  review render, matching the full-glove screenshot benchmark and removing the
  cyan/white exposed-finger read.
- Epic GASP comparison motions are rejected and excluded.

The package covers all twenty current Survival motion roles in four animated
reels. Each action is shown at inspection scale and at a true 123 px mock
runtime scale.

The review exporter caps 4K/8K source textures to 2K in memory because the
mockup render is 512 px. Source images and the Blender master are never saved
or resized. Eight evenly distributed motion samples per action provide the
approval loop; a later production candidate would render every required frame.

`reviewOnly: true`  
`productionChanged: false`  
`runtimeWiring: none`

No render, manifest, or video in this directory is loaded by Phaser.

## Animated Approval Reels

- `01-locomotion-approved-benchmark.mp4` — idle, idle talk, walk, approved
  Blender rollback run, crouch.
- `02-traversal-approved-benchmark.mp4` — airborne, falling, flight, climb,
  landing.
- `03-combat-mining-approved-benchmark.mp4` — jab, cross, uppercut, mining,
  ground strike.
- `04-states-recovery-approved-benchmark.mp4` — wall push, teleport, thunder
  charge, hit reaction, death.

Each H.264 reel is 1920x900, 24 fps, and six seconds long. The automated visual
gate checks all 160 sampled frames for empty renders and camera-edge clipping.
Death and uppercut use one action-wide wider camera because their silhouettes
exceed the standard frame; there is no per-frame scaling.

## What This Package Approves

Nothing. This package is retained only as rejected comparison evidence.

## Further Quality Available Before Wiring

1. Replace or hand-polish motions family by family against the rollback-run
   standard, beginning with walk, mining, flight, and transitions.
2. Clean finger, wrist, elbow, pelvis, thigh, jacket, and backpack weights;
   limit runtime deformation to four strong influences where possible.
3. Add corrective shapes for fist closure, wrist flexion, elbow compression,
   hip/crotch volume, and jacket/backpack collision.
4. Add foot locks, knee tracking, pelvis continuity, root-motion normalization,
   and pose-matched transition entry/exit.
5. Relink and validate the intended eye base-color texture, then tune corneal
   roughness and facial response without changing the approved character ID.
6. Add restrained backpack and jacket secondary motion after the body contacts
   are stable.
7. Render the later production candidate at 1024 px or 2048 px and downsample
   once into the existing 256 px cells with alpha-aware sharpening.
8. Evaluate a modestly larger in-game presentation separately; material detail
   cannot remain fully visible at the current true 101-123 px character size.
