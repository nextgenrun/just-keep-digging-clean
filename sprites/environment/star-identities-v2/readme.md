# Star Identities V2

Production crystal/phenomenon library for 250 named Star identities. Reward
rarity remains a separate system; these assets own crisp Star art, colour, and
flavour in the world, release animation, discovery popup, and I-key Star Atlas.

The matched illumination layer now lives in the separate
`../star-identity-lights-v1/` package; runtime never enlarges these core frames
as a substitute light.

## Runtime package

- Six transparent PNG atlases: Common 60, Uncommon 50, Rare 50, Epic 40,
  Mythic 30, and Astral 20.
- Every atlas uses 256 px square frames in ten columns.
- The six decoded atlases total 65,536,000 bytes (62.5 MiB), below the 64 MiB
  package cap.
- Frames 0-49 preserve the original V1 identities and global indices. The 200
  V2 identities append at indices 50-249.
- `star-identities-v2.manifest.json` records every source/output SHA-256,
  layout, frame range, alpha coverage, and decoded byte count.

Runtime never tints these sprites. The authored primary colour and phenomenon
are baked into each frame; Phaser only applies SCREEN/ADD composition and
bounded per-identity motion.

## Build

Run:

```powershell
& <bundled-python> tools/2026-07-30-build-star-identity-assets-v2.py
```

The builder reuses the immutable V1 source sheets for the first 50 frames,
consumes the 14 V2 ImageGen expansion sheets under `source/`, converts connected
black-backed light into straight alpha, and assembles the six runtime atlases.
It does not synthesize placeholder art.

The authored metadata and source-page order live in
`values/starIdentityExpansionV2.js`; the runtime contract lives in
`values/starIdentityLibrary.js`.

## Rollback

The complete V1 package remains under `../star-identities-v1/`. A narrow
rollback restores the V1 atlas definitions and base 50-entry list in
`values/starIdentityLibrary.js`; no V1 art was overwritten.
