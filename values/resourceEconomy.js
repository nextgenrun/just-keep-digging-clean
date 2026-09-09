// Depth resource economy rollout. Every modern rule is disabled together by
// `?depthEconomy=legacy`, leaving saves and earned inventory untouched.

const point = (minDepth, multiplier) => Object.freeze({ minDepth, multiplier });

export const RESOURCE_ECONOMY_CONFIG = Object.freeze({
  schemaVersion: 1,
  enabled: true,
  rollback: Object.freeze({
    queryParam: "depthEconomy",
    disabledValues: Object.freeze(["0", "off", "false", "legacy"]),
  }),
  yieldCurves: Object.freeze({
    levelOne: Object.freeze([
      point(0, 1),
      point(300, 1.6),
      point(600, 2.6),
      point(1000, 4.5),
      point(1500, 8),
    ]),
    levelTwo: Object.freeze([
      point(0, 5),
      point(500, 6),
      point(1000, 9),
      point(2000, 15),
      point(3000, 24),
      point(4000, 38),
      point(5000, 60),
    ]),
  }),
  yield: Object.freeze({
    deterministicRoundSalt: 0x2d7f31,
    maxDepthMultiplier: 60,
    maxFinalTileYield: 50000,
  }),
  milestones: Object.freeze({
    maxMiningSpeedPct: 32,
    maxResourceYieldPct: 50,
  }),
  prices: Object.freeze({
    precisionDigits: 2,
  }),
  health: Object.freeze({
    expectedLevelOnePointCount: 5,
    expectedLevelTwoPointCount: 7,
    expectedMaximumMultiplier: 60,
  }),
});

export function resolveDepthEconomyEnabled(
  config = RESOURCE_ECONOMY_CONFIG,
  search = globalThis.location?.search || "",
) {
  if (config.enabled !== true) return false;
  const value = new URLSearchParams(search)
    .get(config.rollback.queryParam)
    ?.trim()
    .toLowerCase();
  return !value || !config.rollback.disabledValues.includes(value);
}

function interpolateCurve(depthTiles, points) {
  const depth = Math.max(0, Number(depthTiles) || 0);
  if (!Array.isArray(points) || points.length === 0) return 1;
  if (depth <= points[0].minDepth) return points[0].multiplier;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (depth > current.minDepth) continue;
    const span = Math.max(1, current.minDepth - previous.minDepth);
    const progress = (depth - previous.minDepth) / span;
    return previous.multiplier
      + (current.multiplier - previous.multiplier) * progress;
  }
  return points[points.length - 1].multiplier;
}

export function getDepthEconomyYieldMultiplier(
  depthTiles,
  secondWorld = false,
  config = RESOURCE_ECONOMY_CONFIG,
) {
  const points = secondWorld
    ? config.yieldCurves.levelTwo
    : config.yieldCurves.levelOne;
  const multiplier = interpolateCurve(depthTiles, points);
  return Math.min(
    config.yield.maxDepthMultiplier,
    Math.max(1, multiplier),
  );
}

function isStrictlyValidCurve(points) {
  if (!Array.isArray(points) || points.length < 2) return false;
  return points.every((entry, index) => (
    Number.isFinite(entry.minDepth)
    && Number.isFinite(entry.multiplier)
    && entry.minDepth >= 0
    && entry.multiplier >= 1
    && (
      index === 0
      || (
        entry.minDepth > points[index - 1].minDepth
        && entry.multiplier >= points[index - 1].multiplier
      )
    )
  ));
}

export function getResourceEconomyConfigHealth(
  config = RESOURCE_ECONOMY_CONFIG,
) {
  const levelOne = config?.yieldCurves?.levelOne || [];
  const levelTwo = config?.yieldCurves?.levelTwo || [];
  const maximum = Math.max(
    ...levelOne.map(entry => entry.multiplier),
    ...levelTwo.map(entry => entry.multiplier),
  );
  const ready = isStrictlyValidCurve(levelOne)
    && isStrictlyValidCurve(levelTwo)
    && levelOne.length === config.health.expectedLevelOnePointCount
    && levelTwo.length === config.health.expectedLevelTwoPointCount
    && maximum === config.health.expectedMaximumMultiplier
    && Number.isFinite(config.yield.maxFinalTileYield)
    && config.yield.maxFinalTileYield > maximum;
  return Object.freeze({
    ready,
    levelOnePointCount: levelOne.length,
    levelTwoPointCount: levelTwo.length,
    maximumMultiplier: maximum,
    maxFinalTileYield: config?.yield?.maxFinalTileYield || 0,
  });
}
