# Level 1 Deep Biome Boundary Sources

The PNGs in this folder retain the unmodified built-in ImageGen outputs
and their background-only ImageGen corrections for the deep Level 1 transition
overlays added on 2026-08-28. ImageGen supplied the geology and connected
silhouettes but flattened its first transparency preview into a pale
checkerboard. A second built-in edit replaced only that checkerboard with flat
`#00ff00`. The reproducible
`ai-tools/2026-08-28-build-level-one-deep-biome-boundaries-v1.py` promotion pass
keys that single background color, decontaminates the soft edge pixels, and
writes the alpha WebPs used by the game.

The source/result pairs are Amber to Silver, Silver to Magma, and Amber to
Magma. `2026-08-29-cobalt-to-silver-imagegen.png` is the later native-alpha
source needed by the expanded organic field and requires no chroma correction.
Its exact production prompt is retained in
`2026-08-29-cobalt-to-silver-prompt-v1.md`.
They are presentation-only and never define terrain or collision.
