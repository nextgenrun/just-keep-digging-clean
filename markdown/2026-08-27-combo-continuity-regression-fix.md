# Combo Continuity Regression Fix

## Cause

The 65% Star Block spawn-rate reduction was accidentally copied into mining
damage. Soft-tile damage fell from 16 to 6 and hard-resource damage from 8 to
3, while combo decay correctly stayed at six seconds. At the production 200 ms
base cadence, a minimum-HP Copper tile therefore needed about 9.4 seconds to
break, so the combo expired between destroyed tiles. Because the HUD appears
at five combo, this looked like a randomly dead system depending on material.

## Fix

- Restore the approved 16/8 soft/hard base mining damage in
  `values/miningConfig.js`.
- Keep combo duration and decay behavior unchanged.
- Pass both arguments to `ComboSystem.addCombo()` from the direct destroyed-tile
  reward path so the game clock cannot be mistaken for the reward amount.
- Add `testing/2026-08-27-combo-continuity-contract.mjs` to guard early-route
  break times and direct-reward timestamp integrity.

## Validation

- Focused combo, retention, progression, ability, and talent contracts pass.
- Cache-busted save-safe browser play reached visible `COMBO 7`, then cleared
  normally after the unchanged six-second window.
- Browser console reported no errors during the repaired mining chain.

## Rollback

Remove the new contract and documentation, restore the prior `addCombo` call,
and reapply the former mining-damage values only if intentionally accepting
that Copper and later hard materials cannot sustain the current combo window.
