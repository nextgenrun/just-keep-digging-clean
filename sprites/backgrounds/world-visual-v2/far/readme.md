# Scenic-v2 Far Backgrounds

`moonlit-mountain-forest-v1.png` remains the original continuous far-stage
base. It is still registered by `values/worldVisualRuntime.js`, repeated by
`WorldVisualSurfaceStage`, and is not replaced by the cohesion library.

`sky-cohesion-v1/` contains twenty additive 1672x941 opaque WebPs. Scenic-v2
streams at most the four neighboring world/altitude selections and crossfades
them as complete, aspect-preserved frames above the original base and below
clouds. The files are never butted into a spatial tile strip, so their authored
edge handoffs cannot create hard folds.

Use `?skyCohesion=0` to remove only the additive sky layer.
