# Milestone Pillar ImageGen Prompt Manifest

Generation mode: built-in ImageGen.

Shared art contract:

- One horizontal sheet with exactly five clearly separated progression stages.
- Hand-painted premium 2.5D fantasy game prop, readable at small Phaser scale.
- Same object identity from stage to stage; height, material richness, light,
  and ornament increase with digging depth.
- Orthographic/front three-quarter presentation, isolated on flat `#00ff00`.
- No UI, characters, scenery, cast shadow, labels, letters, numbers, watermark,
  or cropped stage.

## Option A — Carved Slate Depth Chronicle

Prompt subject: a rugged village milestone cairn made from stacked mountain
slate and dark oak, progressing from a waist-high trail marker through engraved
stone bands, a brass depth dial, blue mineral seams, and finally a tall
weathered obelisk crowned by a restrained star-shaped crystal. Materials stay
grounded, tactile, and miner-built; silhouettes remain broad and readable.

Built-in source:
`call_VUs0E0Mxz0MYEaC0ghOfN6ek.png`

## Option B — Living Crystal Strata

Prompt subject: a stone depth marker gradually overtaken by geological life,
starting as a simple black-rock shard, then adding luminous cyan crystal seams,
layered geode shelves, hanging mineral clusters, and finally an elegant tall
crystal crown. The glow intensifies by stage without becoming neon noise.

Built-in source:
`call_XIzwzRtqFkdnX5xobiy91k92.png`

## Option C — Dwarven Depth Engine

Prompt subject: a compact dwarven mining instrument that grows into a monumental
depth engine, progressing through iron braces, gears, pressure gauges, pipes,
molten-orange furnace windows, rotating brass rings, and a final reinforced
mechanical crown. Chunky forms, soot, and worn metal keep it functional.

Built-in source:
`call_vm5RGM2Ph0YvtVP2QSChAh4q.png`

## Option D — Ancient Root Rune Cairn

Prompt subject: an old boundary stone embraced by roots, progressing from a
small mossy rune rock through twisting timber roots, amber lantern seeds,
carved stone faces, spreading branch antlers, and finally a tall sacred cairn
with a warm star-like heart. Natural asymmetry grows while the base stays solid.

Built-in source:
`call_CG6MmjI0JIq88Bvwg1NKKbQN.png`

## Option E — Starforge Abyss Obelisk

Prompt subject: a black basalt village obelisk with restrained celestial
technology, progressing from a plain chipped marker through silver bands,
violet starfire cracks, orbital rings, floating fragments, and finally a tall
abyssal crown with a contained white-violet star. The silhouette remains
medieval-fantasy rather than science-fiction.

Built-in source:
`call_0H8d6mCjUWN3jPEVFN2xp9Tr.png`

## Derivative pipeline

The five sources were copied as `*-chroma.png`. Transparent sheets were made
with the ImageGen skill helper:

```powershell
python remove_chroma_key.py INPUT OUTPUT --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill
```

`ai-tools/2026-07-26-build-milestone-pillar-review-assets.py` detects the five
alpha-separated objects in each sheet and writes the 25 `option-?-stage-?.png`
assets plus `stage-manifest.json`. The generated pixel heights are preserved so
the review scene can use one physical pixels-per-meter scale and show real
growth. All assets in this folder remain review-only until one option is
approved.
