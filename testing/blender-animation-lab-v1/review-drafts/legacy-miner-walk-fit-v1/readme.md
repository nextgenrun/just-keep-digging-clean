# Legacy Miner actual mesh fit review

This isolated review fits the archived Legacy Miner Meshy rig to the current
Survival `Jog_Fwd_Loop` carrier without changing production runtime assets.

The requested `M_LegacyMiner_Material_1.uasset` is a material, not character
geometry. The actual paired skeletal mesh is
`SK_LegacyMiner_Meshy_v2.uasset`. Blender uses the portable source
`legacy-miner-meshy-rigged-v2.glb`, preserving its native 24-bone rig, vertex
weights, material, and texture.

## Review outputs

- `actual-mesh-output/legacy-miner-actual-mesh-fit-contact-sheet.png`
- `actual-mesh-output/legacy-miner-actual-walk-fit-loop.webp`
- `actual-mesh-output/legacy-miner-actual-walk-fit-loop.gif`
- `proof-renders/` for identical-camera current-source and fitted-mesh samples
- `animation-frames/` for all 24 fitted Legacy Miner frames
- `blender-animation-lab.blend` for editable inspection
- `fit-report.json` and `review-manifest.json` for source hashes and validation

`build_review.py` creates the isolated fit. `refresh_current_walk.py` replaces
the shared lab action with the current FBX directly, because the shared lab
master predates the latest carrier hashes. `render_preview.py` renders the full
loop, and `build_actual_mesh_mockup.py` performs deterministic packaging only.

No image-generated character pixels are present. `productionChanged` remains
`false`.
