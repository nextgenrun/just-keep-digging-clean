# Aligned ground damage V5 sources

These two RGBA source sheets were created with OpenAI built-in image generation
against the authored weathered-roots, blue-caverns, blackglass-abyss, and
core-magma foreground atlases.

- `2026-08-26-ground-damage-ground-aligned-alpha-v5.png` contains twelve
  centered earthy/mineral crack decals. The original generation used a visible
  checkerboard; a built-in edit removed only that checkerboard and produced
  genuine alpha while preserving the linework and placement.
- `2026-08-26-ground-damage-crystal-aligned-alpha-v5.png` contains twelve
  centered crystalline, obsidian, and magma crack decals on genuine alpha.

The final generation prompts requested crack-only orthographic decals, fixed
centered anchors, transparent gutters, charcoal fissure cores, narrow mineral
lips, and no filled tiles, badges, holes, rubble piles, or opaque backing.

Rebuild the runtime atlases with:

```powershell
python ai-tools/2026-08-26-build-aligned-ground-damage-v5.py
```

The builder splits each 4 x 3 sheet into twelve motifs, normalizes every motif
into a fixed 188 x 188 frame, and derives the cumulative fracture and exact
material-response atlases deterministically. `../manifest.json` records the
complete prompt text, reference paths, and SHA-256 hashes.
