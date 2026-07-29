# Star Block Destruction V1

Retained ImageGen masters and production fracture artwork for the mined Star
Block release.

The package contains two matching six-colour families in runtime rarity order:
cyan, lavender, gold, orange, turquoise, and violet.

- `star-core-*-v1.png` is the high-resolution faceted celestial source family.
  The active runtime cores are deterministic alpha-safe normalizations in
  `../star-block-crystal-v2/`.
- `star-fracture-*-v1.png` is the asymmetric crystalline source bloom shown
  when the block breaks and remains active in production.

All files are 1254x1254 lossless PNGs generated on uniform black. They remain
the provenance masters for the V2 crystal family, while Phaser uses additive
or screen blending without drawing, tinting, masking, or procedurally replacing
the art. The long-range release ring reuses the matching ImageGen sprites from
`../star-block-pulse-v1/`.

## ImageGen provenance

Built-in ImageGen created the cyan masters from two prompts:

1. A compact, faceted, rounded six-point celestial mineral seed with a
   pearly-white center, cyan aura, pure-black margins, and no ring, long ray,
   cross, detached particle, text, or watermark.
2. An asymmetric cyan crystalline fracture bloom with curved mineral wisps,
   refracted plasma folds, subtle upward bias, pure-black margins, and no
   geometric ring, cross, straight spoke, central star, text, or watermark.

The five remaining rarity files in each family were ImageGen edits that
preserved composition and changed only the energy/mineral colour.

Generated-source call ids:

- Core: `call_qUq5PGLC2dtKDBuNWG7eyVbE`,
  `call_ZapzohDJaVFqDh5rW6ZtVy0G`,
  `call_yOI7E6oaMJ1YnLmnIpN5Ji3G`,
  `call_aYZmlBtLegwbSbl9RXMxQegu`,
  `call_ZLn00sjQvTj0ryMuSAqDlZaX`,
  `call_LqzmZcZNqyNJsfWiEogk7Tpj`.
- Fracture: `call_BOMF3yBqoeHDNCiUWr7LtcFC`,
  `call_vaI4vQ3cMJe5V4g5bGKKiJSp`,
  `call_fkku0xDE43Krc9RJYNYvqgJD`,
  `call_KWSN7jlIm13UhXsxhAkWUVar`,
  `call_rQF5RlyfqNJDm2wIoYzWpqq7`,
  `call_MkdGewiKj1hwq91LihMkNsxb`.

Runtime tuning and asset keys live in
`values/starConstellations.js -> collectedStarReleaseFx`.
