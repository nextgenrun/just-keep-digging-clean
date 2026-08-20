# Survival hero-quality V4 benchmark

Review-only animated comparisons using all six exact restored action families.
No runtime sheet or source Blender file is changed.

## Three-way proof

- Current runtime at 123 px.
- V4 reconstructed materials at the same 123 px.
- The same full V4 master presented at 155 px without clipping inside the old
  256 px cell. A future runtime version would use a larger backing cell.

Open `current-vs-v4-123-vs-v4-155.gif` for synchronized playback, exact-size
samples and fixed upper-body crops.

## Action proofs

- `current-vs-v4-punch-jab.gif` - 15 frames at 30 fps.
- `current-vs-v4-mining-up.gif` - 24 frames at 27 fps.
- `current-vs-v4-ground-strike.gif` - 37 frames at 30 fps.
- `current-vs-v4-run.gif` - 28 frames at 30 fps.
- `current-vs-v4-flight.gif` - 36 frames at 16 fps.
- `current-vs-v4-walk.gif` - 24 frames at 16 fps.
- `current-vs-v4-punch-and-other-actions.gif` - punch-first combined 164-frame reel.

## Material reconstruction

- Restore original-resolution source maps.
- Split authored ORM channels correctly: red AO, green roughness, blue metallic.
- Use material-specific normal, coat, sheen and anisotropic response.
- Retain the approved four-light rig, AgX look, repaired eye and full gloves.
- Add only review-local hair, jacket-hem and backpack secondary shapes.
- Add no subdivision and no global contrast grade.

## Gate result

- Minimum alpha IoU across all families: 0.955.
- Maximum centroid delta across all families: 0.694 packed pixels.
- Maximum bounds delta across all families: 2 packed pixels.
- Saturated green pixels: 0.
- Body bones, weights, root, camera, facing and action timing: unchanged.

The complete family set remains an approval package, not permission to promote.
