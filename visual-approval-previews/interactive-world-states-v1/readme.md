# Interactive World States V1

Review-only high-resolution ImageGen library of tangible underground
interactables.

The exact count is `10 biomes x 10 object families x 10 physical states =
1,000 assets`. Each source master is a strict 5-by-2 state sheet. The builder
extracts the ten states into a transparent 448-by-448 frame atlas.

This directory owns the compressed chroma-key source masters, prompt manifest,
library manifest, biome contact sheets, and the whole-library overview.

## Scope boundary

Included:

- solid chests, gates, transport frames, workstations, machines, beacons,
  lifts, reliquaries, and choice apparatuses;
- coherent dormant, activation, active, resolved, depleted, and damaged
  physical poses;
- biome-specific materials matched to the current underground backgrounds;
- major and hero multi-tile footprints.

Excluded to avoid overlap with the companion 1,000-asset task:

- particles, VFX, mining and ability effects;
- weather, hazards, ambience, and lighting-only companions;
- UI and HUD;
- characters and NPCs;
- generic background overlays, foreground textures, and loose scenery props.

## Promotion status

Nothing here is wired into production. The generated runtime-ready atlases live
under `sprites/environment/interactive-world-states-v1/`, but must stay
review-only until visual approval and a separate placement/runtime pass.

Rebuild with:

```powershell
C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe ai-tools\2026-07-29-build-interactive-world-states-v1.py
```
