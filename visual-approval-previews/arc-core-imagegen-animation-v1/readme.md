# Arc Core ImageGen Animation V1

> Superseded for live review by the drift-locked Layered `.sprite` v2 package
> under `sprites/character/arc-core-review-v2`. These whole-body boards remain
> comparison and rejection evidence only and are no longer loaded by the
> sandbox.

**Updated:** 2026-07-26

Historical review-only ImageGen boards and retired pose sheets for the Small
Arc and Omega Arc animation sandbox.

## Status

- `reviewOnly: true`
- `productionChanged: false`
- Production Arc Core textures are not replaced.
- Pointed Small Arc `v1` is explicitly rejected and no longer loaded.
- The current layered package is `sprites/character/arc-core-review-v2`.
- Approval is required before any generated art is promoted outside the
  sandbox.

## Direction

- Small Arc round `v2` and Omega `v1` are retained as identity references for
  the fixed-body masters in the current package.
- Current motion uses separate gyro/sigil layers rather than four whole-body
  idle and dig poses.
- Current enter/exit uses generated cyan and violet cloud sprites with
  procedural rings, sparks, and filaments.

## Files

- `2026-07-26-small-arc-imagegen-pose-sheet-v1.png`: rejected pointed Small
  Arc board, retained only as review evidence.
- `2026-07-26-small-arc-imagegen-pose-sheet-v2-round.png`: superseded round
  identity-reference board.
- `2026-07-26-omega-arc-imagegen-pose-sheet-v1.png`: superseded Omega
  identity-reference board.
- `2026-07-26-small-arc-runtime-sheet-v1.png`: rejected pointed runtime sheet,
  no longer loaded.
- `2026-07-26-small-arc-runtime-sheet-v2-round.png`: retired 8-frame Small Arc
  sheet, no longer loaded.
- `2026-07-26-omega-arc-runtime-sheet-v1.png`: retired 8-frame Omega sheet, no
  longer loaded.
- `2026-07-26-arc-cloud-transition-contact-sheet-v1.png`: superseded board
  containing the rejected pointed Small Arc.
- `2026-07-26-arc-cloud-transition-contact-sheet-v2-round.png`: superseded
  captured in-engine review board.
- `2026-07-26-imagegen-prompt-manifest.md`: generation intent and source roles.

## Engine Review

Run the existing tank test and select either Arc mode:

```text
http://127.0.0.1:8081/testing/animation-sandbox/tanktest-v1/index.html
```

Use `F` to dig and `B` to enter or exit through the Arc cloud.
