# Arc Core ImageGen Animation V1

**Updated:** 2026-07-26

Review-only ImageGen artwork and engine-ready pose sheets for the Small Arc and
Omega Arc animation sandbox.

## Status

- `reviewOnly: true`
- `productionChanged: false`
- Production Arc Core textures are not replaced.
- Approval is required before any generated frame is promoted outside the
  sandbox.

## Direction

- Small Arc: compact three-fin gyroscope miner with a directional needle
  aperture, quick idle counter-precession, and a four-pose snap dig.
- Omega Arc: four-bastion cathedral array with slow tidal suspension and a
  heavy four-pose lattice deployment.
- Enter and exit: generated sprites are combined with an in-engine luminous
  cloud transition. The cloud itself stays procedural so it can scale, animate,
  and reverse cleanly.

## Files

- `2026-07-26-small-arc-imagegen-pose-sheet-v1.png`: untouched ImageGen board.
- `2026-07-26-omega-arc-imagegen-pose-sheet-v1.png`: untouched ImageGen board.
- `2026-07-26-small-arc-runtime-sheet-v1.png`: alpha-keyed 8-frame runtime
  sheet, 512 px per frame.
- `2026-07-26-omega-arc-runtime-sheet-v1.png`: alpha-keyed 8-frame runtime
  sheet, 512 px per frame.
- `2026-07-26-arc-cloud-transition-contact-sheet-v1.png`: captured in-engine
  enter and exit review board.
- `2026-07-26-imagegen-prompt-manifest.md`: generation intent and source roles.

## Engine Review

Run the existing tank test and select either Arc mode:

```text
http://127.0.0.1:8081/testing/animation-sandbox/tanktest-v1/index.html
```

Use `F` to dig and `B` to enter or exit through the Arc cloud.
