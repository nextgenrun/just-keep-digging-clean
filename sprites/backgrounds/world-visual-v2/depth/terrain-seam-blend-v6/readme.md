# Terrain Seam Blend V6

Ninety additive `1536x1024` RGBA derivatives covering every retained V4 and V5
terrain plate. Only the incoming left/top edges feather; right/bottom coverage
stays present so overlaps crossfade between two painted surfaces instead of
double-fading toward empty space.

Runtime uses full V6 compositing alpha, a `1152x768` stride, and deterministic
card depth order.
`?undergroundSeamBlend=0` restores the untouched V4/V5 files and geometry.
