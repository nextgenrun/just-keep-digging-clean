# Underground Floating Star Directions V2

Five ImageGen directions for replacing the visible six-rarity underground Star
Block art with literal free-floating stars. Choice 1 is approved and promoted;
the other four directions remain review-only.

## Review set

1. `2026-07-28-01-pure-crystal-star-v2.png`
2. `2026-07-28-02-fallen-wish-star-v2.png`
3. `2026-07-28-03-celestial-compass-star-v2.png`
4. `2026-07-28-04-aurora-woven-star-v2.png`
5. `2026-07-28-05-hollow-nova-star-v2.png`

Selected: `2026-07-28-01-pure-crystal-star-v2.png`.

The production package deterministically normalizes the exact six
high-resolution ImageGen cores used as this board's quality anchor. This makes
the live tile and released star a literal one-family match. The approved
refinement keeps the block at 94 px and makes the first fully visible released
core an exact 94 px one-to-one match. Growth waits until lift begins, reaches
about 136 px, levitates for at least 10.8 seconds, and carries six paced echoes.
The current production-scale proof is
`2026-07-29-choice1-production-scale-proof-v4.png`; V3 remains the prior
slightly-smaller-start comparison and V2 remains the original exact-size study.

Every board uses the live rarity order:

1. cyan
2. lavender
3. gold
4. orange
5. turquoise
6. violet

The existing floating
`sprites/environment/star-block-destruction-v1/star-core-cyan-v1.png` is the
quality and presentation reference. V2 deliberately excludes every V1
container idea: no rocks, geodes, slabs, mechanisms, roots, pedestals, or tile
bodies.

## Runtime boundary

- `reviewOnly: mixed`
- `productionChanged: true`
- The five boards and scale proof remain unloaded review/provenance artifacts.
- Runtime loads the derived cores from
  `sprites/environment/star-block-crystal-v2/` and the paired beauty/emissive
  atlases from `sprites/backgrounds/world-visual-v2/semantic-decals-v1/`.
- Steady rarity auras, rare beacon pulses, lighting persistence, rewards,
  saves, and gameplay remain unchanged.

Prompt provenance is recorded in
`2026-07-28-imagegen-prompt-manifest.md`.
