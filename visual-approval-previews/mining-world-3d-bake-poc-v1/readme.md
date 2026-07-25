# Mining World 3D Bake POC V1

Status: review-only; nothing in this folder is loaded by Phaser.

This proof tests a 3D-to-2D production tactic against the actual mining game:

- front-facing side-view camera, not an isometric RPG camera;
- exactly 94 pixels per gameplay tile;
- current Character V8 miner displayed at 0.8 tile height;
- separate 94px tile candidates and a 1280×720 cave/background bake;
- current V11 runtime capture, active underground depth chunk, and dynamic-soil
  atlas used as separate comparisons.

The practical result is a hybrid 2.5D direction: keep V11 backgrounds as the
style anchor, then use generated 3D assets for tile-edge relief, ore variants,
and sparse landmarks. The first raw full-3D backdrop was weaker than V11, so it
was deliberately rejected rather than presented as an improvement.

The geometry is locally procedural because no Meshy API key or configured model
provider was available during the proof. The Blender camera, lighting, semantic
tile grid, and bake/export contract are intentionally compatible with later
Meshy GLB imports. Replacing the local rock, ore, and crystal constructors with
Meshy assets must not change the camera or 94px scale contract.

Rebuild:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.1\blender.exe' --background --python ai-tools\2026-07-15-render-mining-world-3d-poc.py
python ai-tools\2026-07-15-build-mining-world-3d-poc.py
```

Open `index.html` through the local development server for the interactive
comparison. Review visuals under `final/`; editable source is under `sources/`;
render and package contracts are under `metadata/`.
