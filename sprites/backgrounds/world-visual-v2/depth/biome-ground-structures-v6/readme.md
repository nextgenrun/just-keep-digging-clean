# Biome Ground Structures V6

Fifty additive `1536x1024` RGBA derivatives of the approved V3 ground-structure
alpha masters. V6 replaces the V4 all-edge card fade with a complementary
incoming left/top feather while preserving each structure's organic alpha.
Full V6 compositing alpha prevents a second translucent density band in the
overlap; V4 rollback retains its original alpha.

The layer remains terrain-masked, decorative, non-colliding, and below gameplay
semantics. `?undergroundSeamBlend=0` restores V4 placement and
`?groundStructureBlend=0` restores V3.
