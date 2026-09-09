export const WURM_SIZES = Object.freeze([
  Object.freeze({ id: "tiny", label: "Hatchling", carveLanes: Object.freeze([0]), scale: 0.55 }),
  Object.freeze({ id: "small", label: "Small", carveLanes: Object.freeze([0]), scale: 0.75 }),
  Object.freeze({ id: "medium", label: "Mature", carveLanes: Object.freeze([-1, 0, 1]), scale: 1 }),
  Object.freeze({ id: "large", label: "Large", carveLanes: Object.freeze([-1, 0, 1]), scale: 1.3 }),
  Object.freeze({ id: "giant", label: "Giant", carveLanes: Object.freeze([-1, 0, 1]), scale: 1.6 }),
]);
export const WURM_DIFFICULTIES = Object.freeze([
  Object.freeze({ id: "drifter", label: "Drifter", depth: 120, size: "tiny", travel: 1.8, warning: 1.25, damage: 0.35, passes: 2, brood: 0 }),
  Object.freeze({ id: "raider", label: "Raider", depth: 280, size: "small", travel: 1.25, warning: 1.15, damage: 0.55, passes: 3, brood: 0 }),
  Object.freeze({ id: "hunter", label: "Hunter", depth: 550, size: "medium", travel: 0.9, warning: 1, damage: 0.75, passes: 3, brood: 0 }),
  Object.freeze({ id: "ancient", label: "Ancient", depth: 900, size: "giant", travel: 1.6, warning: 1.25, damage: 0.95, passes: 5, brood: 0 }),
  Object.freeze({ id: "broodmother", label: "Broodmother", depth: 1300, size: "large", travel: 1.35, warning: 1.3, damage: 0.7, passes: 4, brood: 2 }),
]);
export const WURM_POLISH = Object.freeze({
  arcSamples: 96,
  assetRetryMs: 500,
  segmentSpacingTiles: 0.57,
  neckSpacingTiles: 0.91,
  tailSpacingTiles: 0.55,
  minimumWarningMs: 1800,
  minimumTravelMs: 1150,
  broodPass: 2,
  broodStaggerMs: 950,
  broodOffsetTiles: 3,
  maximumOffspring: 2,
  offspringDifficulty: "drifter",
  offspringSizes: Object.freeze(["tiny", "small"]),
  completedPhase: "cooldown",
});