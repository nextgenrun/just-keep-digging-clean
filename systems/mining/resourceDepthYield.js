import { hash01 } from "../../values/deterministicMath.js";
import {
  RESOURCE_ECONOMY_CONFIG,
  getDepthEconomyYieldMultiplier,
} from "../../values/resourceEconomy.js";
import { WORLD_DEPTH_CONFIG } from "../../values/worldDepthConfig.js";

export function isSecondWorldResourceEconomy(config, tileX) {
  if (typeof config?.caveRuntime?.secondWorldEconomy === "boolean") {
    return config.caveRuntime.secondWorldEconomy;
  }
  const boundary = Number.isInteger(config?.levelTwoLeftTile)
    ? config.levelTwoLeftTile
    : WORLD_DEPTH_CONFIG.levelTwoLeftTile;
  return Number.isFinite(tileX) && tileX >= boundary;
}

export function resolveDepthAdjustedResourceYield({
  nativeYield = 1,
  depthTiles = 0,
  secondWorld = false,
  tileX = 0,
  tileY = 0,
  seed = 0,
  enabled = true,
  config = RESOURCE_ECONOMY_CONFIG,
} = {}) {
  const base = Math.max(0, Math.floor(Number(nativeYield) || 0));
  if (!enabled || base <= 0) return base;

  const multiplier = getDepthEconomyYieldMultiplier(
    depthTiles,
    secondWorld,
    config,
  );
  const raw = Math.min(config.yield.maxFinalTileYield, base * multiplier);
  const whole = Math.floor(raw);
  const fraction = raw - whole;
  const rounded = whole + (
    fraction > 0
    && hash01(tileX, tileY, seed, config.yield.deterministicRoundSalt) < fraction
      ? 1
      : 0
  );
  return Math.min(config.yield.maxFinalTileYield, rounded);
}

export function capFinalResourceYield(
  value,
  enabled = true,
  config = RESOURCE_ECONOMY_CONFIG,
) {
  const amount = Math.max(0, Math.floor(Number(value) || 0));
  return enabled
    ? Math.min(config.yield.maxFinalTileYield, amount)
    : amount;
}
