# Titan Discoveries v1

Visual-only compact Titan art used for the archive plus one shared surface base:

- the real-art 5x5 ESC archive;
- the transparent plinth beneath dormant and filled surface-gallery slots.

The 25 runtime PNGs are derived from the dated chroma-key atlas in `sources/`
by `ai-tools/2026-07-26-build-titan-sprites.py`. The same tool normalizes
`sources/2026-07-26-titan-walk-plinth-alpha-v1.png` into the transparent
512x320 `titan-walk-plinth-v1.png`; its chroma source is retained beside the
alpha master for provenance. These assets never define collision, rewards,
stats, or tile state.

The current creature masters are 256x256 compact silhouettes retained as
production archive-grid thumbnails. They are no longer stretched across the
underground chambers and no longer define the underground tile masks. Sharp
768px underground/surface stances live in `../titan-surface-stances-v1/`; their
underground dais, resonance overlay, and hash-pinned masks live in
`../titan-underground-v2/`. The promoted 15-22-block contextual chamber art
lives in `../titan-chambers-v2/` and `../titan-chambers-v3/`. These compact
sources remain untouched.
