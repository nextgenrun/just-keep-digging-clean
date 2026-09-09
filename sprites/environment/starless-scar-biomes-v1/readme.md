# Starless Scar Biome Library V1

This built-in ImageGen library gives consumed-Star territory the same retained
20-family material vocabulary used by normal Level One ground. Each palette
contains four runtime roles:

- opaque seamless 512 x 512 walkable ground;
- transparent 512 x 512 dead-Star center;
- transparent 512 x 512 spreading/outer frontier;
- transparent 2 x 2 atlas with four 256 x 256 overlay-prop frames.

The five parent materials are Rootways, Cobalt, Amber, Silver, and Magma. Their
four retained family IDs are the stable palette IDs, so the 50 fine Level One
profiles resolve through their existing `retainedPartitionId`. Deeper regions
reuse deliberately matched subsets. The consumed Star still owns exact
identity-color rim/core accents, prop frame/transform seed, territory,
resource depletion, Stress, and persistence.

`runtime/` is demand-streamed and never added to the four fallback assets in
`STAR_SANCTUARY_CONFIG.scar.visual.assets`. Ground and props are clipped to
solid WorldModel cells; ambient darkness and the spreading territory mask can
also cover mined air. This library is visual-only and cannot change collision,
tile HP, drops, Star rewards, saves, or territory ownership.

## Provenance and rebuild

- `source/` retains the 20 original 1254 x 1254 ImageGen boards and is routed
  through the repository's path-scoped Git LFS rules.
- `source-spec-v1.json` records the palette/material/prop directions.
- `imagegen-prompts-v1.md` records the exact prompts and built-in mode.
- `manifest-v1.json` records source/runtime hashes, formats, sizes, alpha
  handling, counts, and runtime paths.
- `starless-scar-biome-library-contact-v1.jpg` reviews all 20 layered kits.

Eighteen sources retain native RGBA. The two early RGB checker-matte samples
use a bounded near-white global key because checker cells also occur inside
their silhouettes. Their source alpha remains hard; premultiplied resizing
adds clean antialiasing without pulling the matte back into the fringe. Run:

```powershell
& 'C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' 'ai-tools\2026-08-31-build-starless-scar-biome-library-v1.py'
```

The builder crops packaging gutters, makes only the opaque ground tile
seam-safe, normalizes authored decal silhouettes, packs four props per palette,
and regenerates the manifest/contact sheet.
