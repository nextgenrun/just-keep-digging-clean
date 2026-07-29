# Titan Chambers v3

Production seamless-edge runtime cards for the 25 visual-only Cave Titans.

- Each 1536x848 transparent WebP preserves the exact approved v2 ImageGen
  painting and adds only a deterministic, irregular alpha feather.
- Transparent corners and low-opacity outer bands dissolve into the neighboring
  streamed biome card; the focal center remains fully opaque.
- Runtime applies the same live depth grade and lightning response used by the
  surrounding `world-visual-v2` depth backdrop.
- Cards remain low-alpha scenery behind authoritative terrain, the sharp 768px
  Titan stance, and its compact dais. They never define terrain, collision,
  rewards, saves, or the authoritative covering-tile mask.
- Only the closest two world cards may be resident. One discovered archive
  selection may pin its matching card.
- `?titanChamberBlend=0` selects the retained opaque v2 cards.
  `?titanChambers=0` disables high-resolution chamber streaming completely.

The unchanged source masters and original prompt manifest remain under
`../titan-chambers-v2/`. `2026-07-28-imagegen-provenance-v3.md` records the
non-destructive derivation boundary. Encoded hashes, alpha metrics, and source
routes are recorded in
`2026-07-28-titan-chambers-production-manifest-v3.json`.

Rebuild with:

`ai-tools/2026-07-28-build-titan-chambers-v3.py`
