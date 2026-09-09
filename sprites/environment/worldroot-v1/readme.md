# Worldroot runtime art v1

The living and consumed PNGs share one 1536 x 1024 transparent canvas so the
runtime can blend scars onto the exact same branches. The broad lower-left
hearth aligns with the existing Campfire; the asymmetrical road of roots grows
rightward toward the giant blue Crown Star.

`source/` preserves the ImageGen-authored inputs. Rebuild the two runtime PNGs
with `tools/buildWorldrootRuntimeAssets.mjs`. The script intersects the
consumed-state alpha with the living art's pale checker cutout, preserving one
shared silhouette while removing the generated backdrop. It never redraws or
procedurally invents the tree.

Runtime ownership is in `values/worldroot.js` and
`systems/visual/WorldrootWorldVisual.js`. The latter also creates a feathered
runtime canopy veil so the high Crown terrace stays inside the town atmosphere
without adding another bitmap asset.
