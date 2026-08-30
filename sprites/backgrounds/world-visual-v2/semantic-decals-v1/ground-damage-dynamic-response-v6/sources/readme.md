# Dynamic response V6 sources

`2026-08-26-stone-response-fragments-alpha-v6.png` contains twenty isolated
dark blue-charcoal Stone fragments in a 5 x 4 grid on genuine alpha.

Mode: OpenAI built-in image generation.

Reference: the production Blue Caverns foreground-texture atlas. The generation
prompt requested small top-down slate flakes, stone chips, and angular mineral
splinters matching its dark material language, with subdued cobalt grain and
no white or silver faces. The first result baked a checkerboard; a built-in
background-extraction edit removed only that background and preserved all
twenty fragments and their layout.

Rebuild with:

```powershell
python ai-tools/2026-08-26-build-dynamic-ground-damage-v6.py
```

The builder creates ten cumulative Stone layouts, preserves every non-Stone V5
response frame byte-for-byte at the pixel level, packs the V6 atlas, and writes
the source/output hashes and layout offsets to `../manifest.json`.
