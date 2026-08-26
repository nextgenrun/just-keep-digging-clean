import { RESOURCE_ECONOMY_CONFIG } from "../../values/resourceEconomy.js";

export function resolveDepthMilestoneEconomyBonuses(
  bonuses,
  enabled = true,
  config = RESOURCE_ECONOMY_CONFIG,
) {
  if (!enabled) {
    return Object.freeze({
      miningSpeedPct: 0,
      miningSpeedReduction: 0,
      critChancePct: 0,
      critChance: 0,
      resourceYieldPct: 0,
      resourceYieldMultiplier: 1,
    });
  }
  const miningSpeedPct = Math.min(
    config.milestones.maxMiningSpeedPct,
    Math.max(0, Number(bonuses?.miningSpeedPct) || 0),
  );
  const critChancePct = Math.min(
    config.milestones.maxCritChancePct,
    Math.max(0, Number(bonuses?.critChancePct) || 0),
  );
  const resourceYieldPct = Math.min(
    config.milestones.maxResourceYieldPct,
    Math.max(0, Number(bonuses?.resourceYieldPct) || 0),
  );
  return Object.freeze({
    miningSpeedPct,
    miningSpeedReduction: miningSpeedPct / 100,
    critChancePct,
    critChance: critChancePct / 100,
    resourceYieldPct,
    resourceYieldMultiplier: 1 + resourceYieldPct / 100,
  });
}
