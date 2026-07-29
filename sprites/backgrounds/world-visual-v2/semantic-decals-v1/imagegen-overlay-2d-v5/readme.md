# Approved 2D resource overlays V5

This folder preserves the six newly approved flat ImageGen resource sources and
their locally extracted alpha sheets.

- Camera contract: strict orthographic, front-facing 2D.
- New resources: Copper, Iron, Silver, Gold, Ember Ore, and Obsidian.
- Retained resources: Bronze, Steel, Magma Crystal, and Stone.
- Runtime output: `../resource-overlays-imagegen-2d-v5.png`.
- Level One output:
  `../../../../world-scenic-regions-v1/level1-ground-recognition-atlas-v6.png`.

No source contains a baked ground square. Gameplay tile identity, HP, digging,
rewards, collision, and saves remain owned by `WorldModel`.

Rebuild with:

```powershell
python ai-tools/2026-07-28-build-approved-2d-resource-overlays-v5.py
```
