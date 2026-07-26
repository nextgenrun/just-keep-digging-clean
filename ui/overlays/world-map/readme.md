# World map presentation

`WorldMapRenderer.js` draws live world survey data inside the image-generated
`WorldMapOverlay` frame. It intentionally reads current dimensions and dug tiles
at render time so map presentation does not depend on a fixed world export.

Do not add gameplay-system imports here. New activities register marker providers
through `scene.worldMapActivityRegistry`.
