# Current Runtime vs Full-Quality Candidate

Date: 2026-08-14  
Status: approved and promoted locally as quality-v1

The prior rollback-run reel is hard-rejected. The active composite player
profile remains the sole runtime motion authority.

## Review coverage

1. Walk start, walk loop, active UAL Jog/run and stop.
2. Stationary side mining, Blender upward mining and UAL downward ground strike.
3. Exact prone-v3 Superman flight loop.

The left panel reads the currently loaded runtime sheets. The right panel uses
the corresponding source motion and changes only mesh deformation, root/ground
continuity, materials, secondary motion, lighting and render density.

## Implemented in the isolated candidate

- targeted wrist/finger/elbow/pelvis/thigh weight cleanup;
- fist/wrist/elbow/hip/jacket corrective shapes plus corrective smoothing;
- root centering, foot-ground lock and pelvis stabilization;
- repaired eye base-color route and corneal response;
- restrained jacket/backpack secondary shapes;
- 1024 px renders with one direct downsample;
- 123 px current-size and 145 px larger-scale presentation checks.

## Promoted runtime scope

- Replaced 164 active runtime frames across walk (24), UAL Jog (28), side
  mining (15), upward mining (24), downward mining (37), and exact prone-v3
  flight (36).
- Preserved animation keys, frame ranges, FPS, contact markers, transition
  routing, collision, display size, and gameplay authority.
- Kept the centralized 133-frame transition atlas, all moving side-dig phase
  composites, and all diagonal mining sheets byte/pixel unchanged.
- Rejected Blender `MINER_run` remains excluded; run motion is still UAL
  `Jog_Fwd_Loop`.
- Added a cache-busting profile revision and byte-exact rollback package at
  `archive/2026-08-14-survival-quality-runtime-promotion-v1/`.

## Remaining optional work

- Hand-sculpt and pose-drive the procedural corrective shapes.
- Rebuild the right-side two-frame walk start/stop bridges from their exact
  active Piskel poses; the current left bridge remains unchanged.
- Inspect every contact frame and all eight moving side-dig phase variants.
- Browser-test 123 px versus 145 px in the real game camera before choosing a
  display-size change.
- Choose whether the separate 145 px presentation test should replace the
  current 123 px display size; quality-v1 intentionally leaves scale unchanged.
