# World Scenic Regions V1

Generated bitmap plates staged for the benchmark-driven world visual port.

- `town-ground-solid-facade-v1.png` is the generated source and `town-ground-solid-facade-v1.webp` is its optimized runtime copy: a continuous 13 by 8 tile earth cross-section. Runtime crops it per cell so digging can remove only the affected part while hiding the square base tile art.
- `level1-ground-facade-01-v2.webp` through `09-v2.webp` form the active continuous 280 by 10 cell skin at native 94px runtime cells. The first town span is sampled from the exact approved scenic mockup before blending into deeper earth; all nine textures stay below 4096px and runtime keeps at most current plus two neighboring chunks resident.
- `level1-ground-town-transition-preview-v2.webp`, `level1-ground-facade-overview-v2.webp`, and `level1-ground-facade-manifest-v2.json` are the active QA/provenance outputs.
- `level1-ground-recognition-atlas-v7.png` is the active 78-frame RGBA marker
  atlas. Frames 0–59 are six true-2D transparent ImageGen ground-embedded
  variants for each resource; frames 60–77 preserve the latest approved
  Teleport Up, five distinct GP
  tiers, reward blocks, geodes, chest, Ancient Relic, and glow crystal.
- Earlier recognition atlases remain historical comparison and rollback
  evidence only.
- `surface-approach-01-v1.png` and `surface-approach-02-v1.png` are staged surface-continuation plates. They are intentionally not promoted until the town ground facade, damage cracks, and resource-recognition treatment are approved in live gameplay.
- `2026-07-26-universal-ground-damage-10-state-reference-v6.png` is the ImageGen review reference for one intact state plus nine cumulative, no-hole damage states across soil, cool rock, hot rock, and blackglass. It is design evidence only; production draws material-neutral layers through `WorldVisualDamagePainter`.

The art never owns collision, HP, drops, resource identity, or persistence. Those remain in `WorldModel`.
Rebuild the deterministic assets with `ai-tools/2026-07-15-build-level1-ground-facade.py`.
Rebuild the active 2D resource and v7 recognition atlases with
`ai-tools/2026-07-28-build-wide-embedded-resource-overlays-v6.py`.
