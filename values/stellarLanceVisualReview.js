import { STELLAR_LANCE_PRESENTATION as P } from "./stellarLancePresentation.js";
// Save-free presentation gallery using the same contact atlas and art as gameplay.
const flame = (id) => ({ key: "review-cinder-" + id,
  path: "/sprites/celestial-engines/cinder-lance-v1/" + id + ".png", frame: P.frame });
export const LANCE_VISUAL_REVIEW = Object.freeze({
  sceneKey: "LanceVisualReview", width: 1280, height: 920,
  rowHeight: 230, floorY: 188, playerX: 194, mirrorX: 960,
  rangeTiles: 5, hitDistances: [0, 2, 4, 5], speedPxPerSecond: P.speedPxPerSecond,
  cycleMs: 3200, freezeAtMs: 1250, maxDeltaMs: 50, impactMs: 130,
  detailScale: 3, detailX: 1094, detailY: 126, detailWidth: 306,
  playerDisplaySize: 109, playerOriginY: 0.890625,
  originalWidth: 210, originalHeight: 118,
  colors: { background: 0x080c11, floor: 0x171b20, line: 0x31363f,
    text: "#f3eee6", muted: "#acabb5", accent: "#d4b680" },
  attacks: {
    punch: { asset: "jab", contactFrame: 7, frameCount: 32, frameRate: 30 },
    kick: { asset: "kick", contactFrame: 9, frameCount: 32, frameRate: 30 },
  },
  assets: {
    violet: flame("violet"), azure: flame("azure"), ember: flame("ember"), prismatic: flame("prismatic"),
    background: { key: "review-cave", path: "/sprites/backgrounds/world-visual-v2/depth/biome-variation-v2/weathered-roots-quiet-loam-pocket-v2.webp" },
    stone: { key: "review-stone", path: "/sprites/tiles/resource-tiles-imagegen-v3/stone.webp" },
    idle: { key: "review-player", path: "/sprites/character/survival-character-unified-v1/runtime/2026-08-25-survival-blender-v2-idle-sheet.webp", frameWidth: 256, frameHeight: 256 },
    jab: { key: "survival-ual-player-v1-punch-jab-sheet", path: "/sprites/character/survival-character-unified-v1/runtime/2026-08-25-survival-ual-player-v1-punch-jab-sheet.webp", frameWidth: 256, frameHeight: 256 },
    kick: { key: "survival-mixamo-v3-complex-dig-roundhouse-sheet", path: "/sprites/character/survival-character-unified-v1/runtime/2026-08-25-survival-mixamo-v3-complex-dig-roundhouse-sheet.webp", frameWidth: 256, frameHeight: 256 },
  },
  variants: [
    { id: "violet", number: "03", name: "CINDER / VIOLET", source: "SELECTED DIRECTION",
      description: "The selected white-hot core with a short violet flame.", color: 0xe093ff },
    { id: "azure", number: "03A", name: "CINDER / AZURE", source: "COLOUR VARIATION",
      description: "Ice-blue fire wrapped around the same compact core.", color: 0x92d9ff },
    { id: "ember", number: "03B", name: "CINDER / EMBER", source: "COLOUR VARIATION",
      description: "White-hot gold, amber and a deep red flame edge.", color: 0xffb575 },
    { id: "prismatic", number: "RARE", name: "CINDER / PRISMATIC", source: "4% CHANCE PER SHOT IN GAME",
      description: "Interwoven violet, cyan, magenta and gold. A rare shot.", color: 0xf6e3ff },
  ].map(v => ({ ...v, asset: v.id, frame: P.frame.name, width: P.displayWidthPx,
    height: P.displayHeightPx, originX: P.originX, originY: P.originY })),
});
