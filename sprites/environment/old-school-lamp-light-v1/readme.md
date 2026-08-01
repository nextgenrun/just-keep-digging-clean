# Old-school lamp light V1

Review-only carried-light alternative for direct comparison with Fire Light V3.

Seven independent 4x4 ImageGen atlases provide 112 authored components:

- a complete brass-and-blackened-iron miner safety lamp;
- a shielded amber volume;
- short reflector and glass-caustic rays;
- a broad glass-rib penumbra;
- floor and near-wall bounce;
- a compact glass-filtered hot core;
- sparse dust and soot atmosphere.

All atlases use sixteen exact 313x313 cells and fixed Piskel anchors. The lamp
is intentionally steadier, tighter, more directional, and more floor-weighted
than the exposed carried torch.

This family is not the production default. Use
`?carriedLightStyle=lamp-review` to load it in the real game. Removing that
query restores Fire Light V3 without changing saves or gameplay visibility.

`source-masters/` retains the exact built-in ImageGen outputs and prompt
provenance. `piskel/polished-work/` contains the editable fixed-anchor
authorities. `manifest.json` records every hash and geometry limit.
