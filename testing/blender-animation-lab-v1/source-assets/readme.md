# Blender Animation Lab Source Assets

This directory contains review-only source material prepared for Blender Animation Lab v1. Nothing here is loaded by the Phaser runtime or promoted as a production character.

## Approved Meshy warrior fit candidate

- External source: `D:\codex\cc-fork\public\models\chars\players\meshy_warrior_demo.glb`
- Lab-owned Blender input: `meshy-warrior-demo-blender.glb`
- Preparation tool: `ai-tools/2026-07-17-prepare-meshy-warrior-lab-source.ps1`
- Conversion: glTF-Transform 4.4.1 `copy`, which decodes `EXT_meshopt_compression` while preserving the skinned mesh, animation, material, embedded WebP texture, and remaining glTF metadata.

Run from the Dig Game repository root:

```powershell
& .\ai-tools\2026-07-17-prepare-meshy-warrior-lab-source.ps1
```

The preparation tool hashes the source before and after conversion, refuses to write over the external source, validates that the output still has a mesh, skin, and material, and fails if Meshopt remains required.

## Policy

- The external source is never edited.
- The prepared copy is for visual fitting, deformation, gear, pickaxe, lighting, and render experiments inside this lab only.
- Keep the Meshy armature and its native vertex weights intact during the first fit tests. Drive it from the UAL source through an explicit retarget layer rather than binding it directly to production physics.
- License and commercial-release clearance are not asserted by this preparation step. That does not block the current playtest lab, but it must be reviewed before any commercial promotion.
- Do not import this GLB from production values, loaders, scenes, or character profiles without a separate explicit approval.
