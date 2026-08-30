# World map presentation

`WorldMapRenderer.js` draws live world survey data inside the image-generated
`WorldMapOverlay` frame. It intentionally reads current dimensions and dug tiles
at render time so map presentation does not depend on a fixed world export.
Discovered Level 1 cells inside X0-131 and 0-2000 m use the same
`levelOneBiomeField.js` resolver as the scenic renderer, including curved
X/depth territory colors and borders; the status panel names the player's
current visual region. Level 2 retains its existing map bands.

Every discovered underground cell also receives a subtle nearest-Star tint and
territory boundary. The current territory draws one direct player-to-Star
navigation link. Intact refuges use their Star identity colour; unidentified
anchors use the approved signal glyph; consumed anchors retain a dark red
severed territory and never silently transfer their land to another Star.

`WorldMapInputController.js` owns wheel, drag, and keyboard navigation.
`WorldMapOverlayView.js` builds the authored frame, status copy, and controls.
`WorldMapTextButton.js` keeps visible text and its larger mouse hit target aligned.
`renderWorldMapDiscoveredTerrain.js` owns biome and Star-territory cell paint;
`drawWorldMapStarNavigation.js` owns the current route line and target ring.
`formatWorldMapStatus.js` owns the compact current-territory route readout.

Do not add gameplay-system imports here. New activities register marker providers
through `scene.worldMapActivityRegistry`.
