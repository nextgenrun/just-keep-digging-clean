# Meshy Background Render Mockup V2

Status: **rejected review-only mockup**. Nothing here is loaded by Phaser.

This direction was rejected because a single generated cave prop/model is not
a valid proof for adding depth to the game's existing high-detail backgrounds.
Keep this folder only as failure evidence; do not promote it into Phaser.

This replaces the rejected procedural-overlay experiment with one actual Meshy
6 Text-to-3D cave environment. The GLB is imported into Blender and rendered
directly as a 1280x720 orthographic side-view background. There are no tile
candidates and no runtime wiring.

Provenance:

- rejected high-density preview task: `019f6545-cfc9-7b15-a96d-b4b062b7b717`
- successful remeshed preview task: `019f6556-8220-727d-969e-c2c52f220f91`
- successful PBR refine task: `019f6559-8aca-7a4a-8dae-64be8338da3a`
- Meshy credits consumed: 50 total; two failed refine attempts were refunded
- generation credential: never stored in this folder or repository
- current comparison source: active V11 Level 1 depth chunk

Rebuild the Blender view:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.1\blender.exe' --background --python ai-tools/2026-07-15-render-meshy-background-mockup.py
python ai-tools/2026-07-15-build-meshy-background-comparison.py
```

The renderer prefers `meshy-cave-refined.glb`; when refinement is unavailable,
it can render `meshy-cave-preview.glb` with a neutral slate fallback material.
