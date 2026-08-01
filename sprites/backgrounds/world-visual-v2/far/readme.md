# Scenic-v2 Far Backgrounds

`moonlit-mountain-forest-v1.png` is the original continuous tree, mountain,
and moonlit-haze surface plate. `WorldVisualSurfaceStage` repeats it at depth
`-10` across the surface and the fixed Sky Island band. It is the stable baked
background the Titan promenade inherits; sky streaming never replaces or hides
it with an opaque matte.

`sky-foundation-v2/sky-atmosphere-foundation-v2.webp` is a retained,
horizontally exact atmosphere at depth `-10.2`, behind the forest plate. A
solid cobalt field at `-10.21` exists immediately while that one texture loads,
so clear color and black frames cannot appear during streaming.

`sky-cohesion-v1/` contains twenty approved 1672x941 paintings. Their clean
1254x705 safe frames are ordered through fourteen explicit west-to-east story
slots and four authored altitude bands. Every feature feathers on all four
edges into the retained foundation. Measured direct, haze, and foundation
transition classifications live in `values/worldVisualSkyTransitionOrder.js`;
incompatible cards recede to the common atmosphere instead of being butted
edge-to-edge. Lower features use restrained alpha so the older tree-bearing
surface plate remains readable.

Use `?skyComposition=grid` for the previous dense normalized-ADD comparison,
or `?skyCohesion=0` to remove the feature/foundation layer completely.