# PERSIST-007: Rendering helper implementations are copied across modules

Severity: `P3`
Status: confirmed active duplication and drift risk
Area: rendering utilities and procedural visuals

## Evidence

The active source tree contains multiple local implementations of the same helper responsibilities:

- `clamp` appears in twelve modules, including `systems/environment/graveborerWurmPath.js:1`, `systems/environment/GraveborerWurmSystem.js:17`, `systems/visual/EarthquakeHazardOverlay.js:5`, `systems/visual/PlayerKinematicMotionSystem.js:3`, and `world/rendering/scenic-world/WorldVisualDepthCameraMotion.js:4`.
- `hashUnit` is byte-for-byte repeated in `WorldVisualFeedbackLayer.js:20`, `WorldVisualGameplayEffectLayer.js:15`, and `WorldVisualSemanticAssetLayer.js:16`. A second config-driven copy is repeated between `drawLegacyWorldVisualDamage.js:1` and `WorldVisualDamagePainter.js:4`.
- `mixColor` is repeated in the scenic gameplay, feedback, depth, lighting, bedrock, and world-renderer files. The variants use different clamping behavior, including raw input, `Number(value) || 0`, and `Phaser.Math.Clamp`.
- `sourceSize` is repeated in five scenic-world views, with small return-shape variations.
- `fitScale` is identical in `systems/visual/TitanDiscoverySystem.js:8` and `systems/visual/TitanSurfaceGallery.js:1`.
- `isNearEntrance` is identical in `world/model/CaveHazardPlanner.js:5` and `world/model/CaveResourceSeamPlanner.js:12`.
- `tileKey` is duplicated in `systems/environment/EarthquakeSystem.js:36` and `systems/visual/EarthquakeHazardOverlay.js:6`.
- `smoothstep` and `smoothstep01` appear in several modules with mixed raw and clamped-input contracts.

## Impact

These copies are not harmless templates: several variants differ on `NaN`, strings, and missing input, while deterministic visual helpers can drift between layers and break visual alignment. A fix to one subsystem does not update the others. `PERSIST-002` records the most visible named duplicate, `clamp01`.

## Permanent solution setup

- Create shared pure helpers for clamp, interpolation, smoothstep, deterministic hash, color mixing, tile keys, and scale calculations.
- Give coercing and strict variants distinct names and document their invalid-input contracts.
- Keep context-specific wrappers thin, with no copied arithmetic bodies.
- Add a duplicate-body or helper-name lint gate for the active source tree.
- Add deterministic contract cases proving that the same coordinates and salts produce the same values across all visual layers.

