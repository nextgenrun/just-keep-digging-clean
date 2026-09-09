const asset = id => Object.freeze({ key: `approved-polish-${id}`,
  path: `sprites/UI/approved-polish-2026-09-09/${id}.png` });
export const APPROVED_POLISH_ART = Object.freeze(Object.fromEntries([
  "soil-edge", "stone-edge", "metal-edge", "cave-roots", "soil-chip", "stone-chip",
  "metal-chip", "crystal-chip", "quickslash-fx", "flight-fx", "owned-seal", "max-seal",
].map(id => [id, asset(id)])));
export const EXCAVATED_EDGE_ART = Object.freeze({
  maxEdges: 180, maxRoots: 6, depth: 2.46, rootDepth: 4.8,
  thicknessTiles: 0.11, lengthTiles: 1.02, alpha: 0.9,
  rootSizeTiles: 0.65, rootAlpha: 0.72, rootSpacing: 19,
  surfaceClearanceTiles: 2,
  faces: Object.freeze([
    { dx: 0, dy: -1, x: 0.5, y: 0, angle: 0 },
    { dx: 1, dy: 0, x: 1, y: 0.5, angle: 90 },
    { dx: 0, dy: 1, x: 0.5, y: 1, angle: 180 },
    { dx: -1, dy: 0, x: 0, y: 0.5, angle: 270 },
  ]),
  soil: Object.freeze(["dirt", "darkDirtNormal", "darkDirtStrong", "lavaDirt"]),
  copper: Object.freeze(["copper", "bronze"]),
});
export const APPROVED_DEBRIS_BY_FAMILY = Object.freeze({
  dirt: "soil-chip", damp: "soil-chip", hard: "stone-chip", obsidian: "stone-chip",
  copper: "metal-chip", bronze: "metal-chip", crystal: "crystal-chip", magma: "crystal-chip",
});
export const APPROVED_ABILITY_FX = Object.freeze({
  slashSizeTiles: 0.72, slashDurationMs: 220, slashAlpha: 0.7,
  slashEndScale: 1.18, slashDepthOffset: 0.8, maxSlashes: 4,
  flightWispWidthPx: 20, flightWispHeightPx: 11, flightMaxLive: 40,
  flightActivationScale: 1.8, flightBrakeScale: 1.4,
});
export const UPGRADE_STATE_SEAL = Object.freeze({ sizePx: 20, xOffset: 54, yOffset: 39 });
