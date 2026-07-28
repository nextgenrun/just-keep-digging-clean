# Titan Discoveries v1

Visual-only Titan art used in three places:

- distant cave-backdrop discoveries revealed through dug terrain;
- the real-art 5x5 ESC archive;
- a non-interactive 25-position surface walk with dormant and filled plinths.

The 25 runtime PNGs are derived from the dated chroma-key atlas in `sources/`
by `ai-tools/2026-07-26-build-titan-sprites.py`. The same tool normalizes
`sources/2026-07-26-titan-walk-plinth-alpha-v1.png` into the transparent
512x320 `titan-walk-plinth-v1.png`; its chroma source is retained beside the
alpha master for provenance. These assets never define collision, rewards,
stats, or tile state.

The current creature masters are 256x256 compact silhouettes. They are
production assets for archive-grid thumbnails, surface miniatures, and
`?titanChambers=0` underground rollback. The separate promoted 15-22-block
full-chamber art lives in `../titan-chambers-v2/`; these compact sources remain
untouched so Boot and rollback stay lightweight.
