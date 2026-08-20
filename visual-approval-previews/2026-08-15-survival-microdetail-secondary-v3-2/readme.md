# Survival microdetail + secondary motion V3.2

Review-only representative walk comparison. Nothing in the runtime or source Blender file is changed.

## Direction

- Preserve the approved V2.1 tonal balance and exact body action.
- Restore original-resolution source maps and use data maps as Non-Color.
- Add restrained material-specific normal response instead of global contrast.
- Add sub-pixel secondary deformation only to lower hair, jacket hem and backpack settling.
- Do not add global subdivision. The source is already 83,188 vertices / 119,304 polygons; hair alone is 36,812 polygons.

## Review artifact

- `v2-1-vs-v3-2-microdetail-secondary.gif`
- 24 frames at 16 fps.
- Includes enlarged animation, exact 123 px runtime display and an upper-body detail crop.

## Gate result

- Body bones, weights, camera, root action and anchors: unchanged.
- Source `.blend`: unchanged.
- Subdivision: not added.
- Minimum alpha IoU against V2.1: 0.958.
- Maximum centroid delta: 0.662 px at 256 px packing.

This is a benchmark, not approval to apply the secondary deformation to all motion families.
