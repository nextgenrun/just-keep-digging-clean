# Underground Seam Blend V6

Production QA package for complementary incoming-edge derivatives.

The builder derives 90 terrain cards from the retained V4/V5 lossless masters
and 50 ground-structure cards from the retained V3 alpha masters. It preserves
right/bottom coverage and feathers only the incoming left/top edges. Nothing in
V3, V4, or V5 is replaced.

The JSON manifest pins source/runtime hashes and geometry. The two proof sheets
compose four cards per biome at the real `1152x768` stride so dark overlap
valleys, hard rows, and rectangular folds can be reviewed directly.

`reviewOnly: false`; `productionChanged: true`. Phaser loads only the derivative
WebPs; the proof sheets and manifest remain QA evidence.
