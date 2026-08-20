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
full gloves, measured per-sheet origins, and one 101 px display size. Their
1024 px source frames were downsampled once into 256 px runtime cells. The
runtime manifest verifies each production sheet is byte-identical to the
approved zero-green-pixel sandbox candidate.

## Gameplay authority

This is an animation-presentation replacement. The existing target tile,
31x75 collider, reach, action-start cooldown, damage, Quickslash GP rules, and
contact timeline remain authoritative. A source clip may visibly contain more
than one limb strike, but one mining action fires exactly one tile contact at
the selected readable impact.

Both `PlaySceneGameplay` and `CaveActionAnimationRuntime` select the same
complex families and pass them through the existing cooldown-to-animation
time-scale resolver. Switching direction, pausing past the combo window, or
switching between complex and legacy families restarts the chain at stage one.

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
```

The contract pins sequence order, hashes, green-pixel gate, 101 px scale,
single-contact semantics, unchanged cadence constants, both runtime paths, and
all three rollback controls.
