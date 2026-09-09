// Save-free review geometry and controls; never imported by gameplay.
export const FREESOUND_AUDIO_REVIEW = Object.freeze({
  columns: 34, rows: 18, cell: 24, movementTilesPerSecond: 5,
  maxDeltaMs: 100, diagnosticsMs: 150, master: 0.5, depth: 520,
  start: Object.freeze({ x: 6.5, y: 8.5 }),
  left: Object.freeze({ x: 10.5, y: 8.5 }),
  right: Object.freeze({ x: 14.5, y: 8.5 }),
  far: Object.freeze({ x: 0.5, y: 0.5 }),
  second: Object.freeze({ x: 23.5, y: 8.5 }),
  stars: Object.freeze([{ tx: 12, ty: 8 }, { tx: 24, ty: 8 }]),
  wall: Object.freeze({ x: 11, top: 2, bottom: 15 }),
  stepTiles: 0.75, keyTapTiles: 0.25, flightMs: 700, flightVelocity: -160,
  previewFadeMs: 250, refugeTiles: 1.8,
  gameQuery: "audioReview", gamePanelId: "understar-audio-runtime-review",
  materialTypes: Object.freeze({ dirt: 1, stone: 2, metal: 3, crystal: 34 }),
});
