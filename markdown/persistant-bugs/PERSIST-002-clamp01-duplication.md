# PERSIST-002: `clamp01` has duplicate implementations with different contracts

Severity: `P2 risk / P3 current`
Status: confirmed active contract inconsistency
Area: numeric helpers and rendering

## Evidence

- `values/mathUtils.js:5` exports the canonical-looking raw implementation: `Math.max(0, Math.min(1, value))`.
- `world/rendering/worldScenicFacadeHelpers.js:20` exports another local `clamp01` with the same raw behavior.
- Additional rendering and lighting files define local variants that coerce invalid values with `Number(value) || 0`.
- The raw and coercing variants disagree for `undefined`, `NaN`, and other non-finite values. The raw version can propagate `NaN` into Phaser-facing calculations; the coercing versions turn some invalid values into zero.

## Impact

The same helper name does not guarantee the same behavior. A future caller can move between rendering subsystems and silently change invalid-input handling. This is a confirmed duplication and API inconsistency; a player-visible failure requires an invalid value to reach one of the raw variants, which was not observed during the short browser load smoke.

## Permanent solution setup

- Keep one shared implementation in `values/mathUtils.js`.
- Define explicit APIs such as `clamp01` for validated finite inputs and `clamp01Finite` or `coerceClamp01` for deliberate fallback behavior.
- Replace local copies with imports and document the non-finite contract.
- Add a static rule that rejects new local `clamp01` declarations outside the canonical module.
- Add contract cases for `undefined`, `null`, `NaN`, positive and negative infinity, values below zero, values above one, and numeric strings.

