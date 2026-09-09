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
anchors use the dedicated Star-refuge glyph; consumed anchors retain a dark red
severed territory and never silently transfer their land to another Star.
The side panel pairs a biome-coloured crest with a separate Star crest, and a
discovered refuge names the biome that anchors it without revealing an unknown
Star's identity early. Named biome labels lift their source map colour for
readability instead of collapsing every region to the same beige label.
Marker labels flip above icons at the lower map edge, stay inside the viewport,
and reserve enough space that nearby biome names do not print through them.

`WorldMapInputController.js` owns wheel, drag, and keyboard navigation.
`WorldMapOverlayView.js` builds the authored frame, status copy, and controls.
`WorldMapTextButton.js` keeps visible text and its larger mouse hit target aligned.
`renderWorldMapDiscoveredTerrain.js` owns the distant biome and Star-territory
overview. At close zoom, `WorldMapTerrainTextureView.js` renders the existing
gameplay display list through a map-space camera. It therefore mirrors the
current composed terrain, exact resource frames, damage, actors, effects, and
lighting tint instead of rebuilding retired tile art. Undiscovered cells are
erased from that live render, dug air stays open, and the flat survey-cell
outlines yield to the mirrored world;
`drawWorldMapStarNavigation.js` owns the current route line and target ring.
`formatWorldMapStatus.js` owns the compact current-territory route readout.
`world-map-symbol-atlas-v2.png` adds the authored Star frame while keeping every
v1 frame index stable; `world-map-star-symbol-v1-source.png` preserves its
ImageGen source.

Do not add gameplay-system imports here. New activities register marker providers
through `scene.worldMapActivityRegistry`.
