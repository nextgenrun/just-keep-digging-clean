# Floating Damage Visibility Repair

## Problem

The settings and damage callsites were active, but all floating world text used
render depth `55`. The current weather and darkness stack renders at depths
`60`, `900`, and `901`, so damage numbers were composited underneath the
full-screen overlays. Off, Reduced, and Full could change policy correctly
without making the obscured text visible.

## Repair

`HUD_LAYOUT.floatingTextDepth` now occupies the protected world-feedback gap:

- above the weather, material-response, and darkness layers;
- below the lightning-flash layer;
- below the authored HUD and modal UI;
- with enough room for the existing elevated lucky-bonus text tier.

No damage values, mining authority, or setting semantics changed. `FULL` shows
routine damage, `REDUCED` intentionally hides routine damage/resource text, and
`OFF` hides all floating feedback.

## Validation

`testing/2026-08-25-floating-damage-visibility-contract.mjs` exercises the real
settings singleton and `FloatingTextSystem`, proves Full/Reduced/Off switching,
and locks the render-depth ordering against both darkness implementations,
lightning, and HUD layers.

## Rollback

Restore the former `HUD_LAYOUT.floatingTextDepth` and remove the focused depth
ordering contract.
