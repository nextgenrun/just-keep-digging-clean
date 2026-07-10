# v7 renderer overhaul approval harness

Renders the real `WorldModel` and `WorldRenderer` with v7 tile overrides, the legacy miner only, and fixed camera fixtures.

- `?fixture=deep&mode=current` is the current renderer baseline.
- `?fixture=deep&mode=combined` is the renderer-first target.
- No game scene, TMX, or active asset is modified.
- A cave-wall alias is loaded for the currently missing `tile-geode-interior` atlas dependency and is reported in the capture state.
- Run animation is intentionally absent.
