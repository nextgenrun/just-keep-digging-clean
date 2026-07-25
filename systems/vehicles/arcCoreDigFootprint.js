import { ARC_CORE_CONFIG } from "../../values/arcCoreConfig.js";

const CARDINAL_DIRECTIONS = Object.freeze({
  LEFT: Object.freeze({ depthX: -1, depthY: 0, widthX: 0, widthY: -1 }),
  RIGHT: Object.freeze({ depthX: 1, depthY: 0, widthX: 0, widthY: 1 }),
  UP: Object.freeze({ depthX: 0, depthY: -1, widthX: 1, widthY: 0 }),
  DOWN: Object.freeze({ depthX: 0, depthY: 1, widthX: 1, widthY: 0 }),
});

/**
 * Resolves the Arc Core's approved footprint: exactly two tiles deep and two
 * tiles wide, for four total target cells per dig input.
 */
export function resolveArcCoreDigFootprint(primaryTarget, aimDirection, digConfig = ARC_CORE_CONFIG.dig) {
  if (!primaryTarget) return [];
  const direction = CARDINAL_DIRECTIONS[aimDirection] || CARDINAL_DIRECTIONS.RIGHT;
  const targets = [];

  for (let depthIndex = 0; depthIndex < digConfig.depthTiles; depthIndex += 1) {
    for (let widthIndex = 0; widthIndex < digConfig.widthTiles; widthIndex += 1) {
      targets.push({
        tx: primaryTarget.tx + direction.depthX * depthIndex + direction.widthX * widthIndex,
        ty: primaryTarget.ty + direction.depthY * depthIndex + direction.widthY * widthIndex,
        depthIndex,
        widthIndex,
      });
    }
  }

  return targets;
}
