# Gold Depth and Critical Damage Fix

## Outcome

- Level One Gold cannot generate before 700 m in ordinary terrain, authored
  material remaps, or integrated cave seams, in modern or legacy depth-economy mode.
- A mining critical hit creates one critical floating number instead of stacking a routine damage number underneath it.
- The single-style damage router is shared by the main world, Arc Core mining, and compact caves.

## Cause

The shallow 120-299 m terrain band still contained a small Gold threshold, and
the separate 400-799 m cave-seam pool could also select Gold. The main mining
loop emitted retention critical feedback before independently emitting routine
damage feedback for the same hit.

## Validation

Run:

```powershell
node testing/2026-07-30-depth-resource-economy-contract.mjs
node testing/2026-08-25-floating-damage-visibility-contract.mjs
```
