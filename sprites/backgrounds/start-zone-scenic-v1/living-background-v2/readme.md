# Living surface background V2 experiments

Three silent 1800 x 534 H.264 loops for real `PlayScene` review. Every file is
18 seconds, 24 fps, 432 frames, forward-only, and contains no slate floor,
earth, underground shelf, audio, collision, or gameplay state.

The offline builder divides only the tree/canopy band into four broad feathered
zones. Each zone uses a different monotonic time curve, so its motion returns to
the common first/last anchor without a global synchronized sway. A soft lower
mask keeps buildings and rooted trunks effectively still. Tiny fixed-position
stars pulse on independent 6, 9, or 18 second periods, all of which close on the
same 18 second boundary.

Runtime selectors are `?surfaceMotion=natural`, `depth`, and `stars`. Only the
selected final video is preloaded, so the layered construction still costs one
runtime decoder. The original `town-air` remains the default pending visual
approval. `surface-living-background-v2.manifest.json` records sources, hashes,
settings, dimensions, cadence, loop bounds, structure motion, and canopy-motion
correlation.
