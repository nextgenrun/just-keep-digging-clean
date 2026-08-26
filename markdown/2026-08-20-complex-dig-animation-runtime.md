# Complex Dig Animation Runtime

## Approved presentation

The default Survival character now uses these approved Mixamo-to-Survival V4
motions for exact horizontal mining:

1. Cross Punch
2. Jab Punch
3. MMA Roundhouse
4. Native Jab-Elbow
5. Low MMA Kick
6. High MMA Kick
7. Spinning Back Kick
8. Elbow-Uppercut
9. Single Elbow
10. Hook Punch

Exact UP mining uses Uppercut. Diagonal UP, diagonal DOWN, and exact DOWN keep
their existing animation routing.

All eleven sheets use the production Survival rig and V4 material treatment,
full gloves, measured per-sheet origins, and one 103 px display size. Their
1024 px source frames were downsampled once into 256 px runtime cells. The
runtime manifest links each production sheet back to its approved
zero-green-pixel sandbox candidate.

The V2 polish package applies one highlight-preserving gamma curve to all
eleven sheets before round-tripping every full sheet through an editable
`.piskel` document. It matches the existing idle/walk median luminance within
0.001 and visible height within 0.55 game pixels, without per-frame resizing or
a second downsample. Runtime origins for Low Kick and Single Elbow were
rebalanced from measured entry/exit baselines. Across the complete family the
largest action handoff residual is 0.503 game pixels; internal authored lift
and rotation remain untouched.

## Gameplay authority

The existing target tile, 31x75 collider, reach, first-contact cooldown,
Quickslash GP rules, Heavy Punch trigger, and action cadence remain
authoritative. Single-hit clips still fire once. Native Jab-Elbow now fires at
source frames 9 and 20; Elbow-Uppercut fires at source frames 11 and 22. Later
contacts damage the same committed tile without paying GP again, bypassing the
same action's cooldown, or duplicating Heavy Punch. If the first contact has
already destroyed the tile, later contacts safely resolve as no-target.

The timeline tracks first-contact and all-contacts-complete separately. Held
input cannot cut a combo off after its first strike; recovery becomes
replaceable only after the final authored impact and normal cooldown gate.
Skipped frames, animation completion, and a stalled-animation watchdog flush
every still-pending contact exactly once.

Both `PlaySceneGameplay` and `CaveActionAnimationRuntime` select the same
complex families and pass them through the existing cooldown-to-animation
time-scale resolver. Switching direction, pausing past the combo window, or
switching between complex and legacy families restarts the chain at stage one.

## Moving SIDE polish

When the player has real resolved velocity toward a horizontal target, all ten
complex SIDE stages now use the approved phase-locked Jog legs beneath a
run-compatible upper-body strike. Eight entry phases cover the complete Jog
cycle and every frame advances the lower-body phase by at most one. Completion
returns to the exact next Jog frame, preventing a frame-zero restart or a random
foot pop. Zero velocity—including collision against the target face—keeps the
stationary complex clip, preventing run-in-place skating.

Single strikes retain 22 frames and one contact. Jab-Elbow and Elbow-Uppercut
use uncompressed 44-frame moving sequences with contacts at sequence frames 6
and 28. The generated 528-frame atlas has zero source-pixel foot-baseline drift,
removes 514 suspicious green pixels with none remaining, and round-trips
pixel-exactly through its editable `.piskel` source and lossless runtime WebP.
The existing 21 px authoritative body stand-off is shared by both facings and
is re-applied every active frame so animation presentation cannot move the
collider or mine through the target face.

## Rollback

- Start with `?complexDig=0` to use the prior SIDE and UP visuals.
- Press Ctrl+Alt+9 during play to switch for the next action.
- Use `__DIG_GAME_COMPLEX_DIG_ANIMATIONS__.setEnabled(false)` from diagnostics.

The current action is never interrupted; the toggle applies safely to the next
action. Legacy animation assets and selectors remain intact.

## Validation

Run:

```powershell
& 'C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' testing/2026-08-20-complex-dig-animation-runtime-contract.mjs
& 'C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' testing/2026-08-21-moving-complex-dig-production-contract.mjs
```

The contract pins sequence order, all 13 authored contacts, source/runtime
hashes, green-pixel gate, pixel-exact Piskel round trips, 103 px family scale,
idle/walk luminance and visible-height continuity, 0.51 px handoff gate,
unchanged cadence constants, both runtime paths, and all three rollback
controls.

The moving-family contract additionally pins all 80 phase aliases, both dual
contacts, zero remaining green spill, zero foot-baseline drift, one-frame
maximum Jog phase advance, real-motion eligibility, exact chained phase
recovery, legacy rollback, and 120-frame anchor stress tests in both facings.
