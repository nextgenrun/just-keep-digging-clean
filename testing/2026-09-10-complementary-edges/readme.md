# Complementary terrain boundary verification

The user approved the mockups, then clarified that they are direction for complementary edges only. No replacement core tiles or backgrounds are implemented. The unwired SolidMountainMaterialView and its configuration draft were removed.

Runtime changes: five transparent images loaded by BootScene; bounded edge/corner/shadow pools in ExcavatedEdgeArtView; scene cleanup releases the view instead of incorrectly constructing one with undefined variables. Existing dirt/stone/ore images, background layers, collisions, resource identity, saves and mining mechanics are unchanged. Copper/bronze retain the existing metal edge. Existing ceiling roots remain unchanged. Query complementaryEdges=0 retains the September 9 edge treatment.

index.html uses the actual edge renderer over existing town-earth and semantic-stone assets in a deliberately small, local-only Phaser fixture. Toggle compares the same core terrain with/without edge overlays; Dig next tile exercises topology updates; Reset layout verifies cleanup. This is a renderer fixture, not evidence of a full gameplay run.

Regression: node testing/2026-09-10-complementary-edges-contract.mjs covers boundary-only dimensions, four variants, deterministic placements, capped pools, empty-air cleanup and semantic-layer teardown. The September 9 contract continues to test the original fallback explicitly. Packed alpha is verified for all five images. No movement code changed.

Browser evidence: enabled.png shows 76 rims, 4 corners and 76 shadows; dug.png shows 78 rims, 6 corners and 78 shadows after one tile removal. Reset restores the original visible counts while reusing the 162 allocated images. disabled.png hides overlays over the same core geometry. Browser console had no errors during the fixture check.
