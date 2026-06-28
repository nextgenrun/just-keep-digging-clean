// ==================== CONSTELLATION BUFFS CONFIG ====================
// Maps each resource constellation to an ability buff.
// 'quickslash' = Q key ability, 'thunderstrike' = C key (thunder strike) ability

export const CONSTELLATION_BUFFS = {
  dirt: {
    ability: 'quickslash',
    name: 'Swift Shovel',
    description: 'Quickslash deals +5 flat damage',
    apply: (stats) => { stats.quickslashFlatDamage += 5; },
  },
  stone: {
    ability: 'thunderstrike',
    name: 'Mountain Shock',
    description: 'Thunderstrike +2 tile range',
    apply: (stats) => { stats.thunderstrikeRange += 2; },
  },
  copper: {
    ability: 'quickslash',
    name: 'Anvil Efficiency',
    description: 'Quickslash costs 2 less GP',
    apply: (stats) => { stats.quickslashCostReduction += 2; },
  },
  darkDirtNormal: {
    ability: 'thunderstrike',
    name: 'Cave Echo',
    description: 'Thunderstrike deals +25% damage',
    apply: (stats) => { stats.thunderstrikeDamageMult += 0.25; },
  },
  steel: {
    ability: 'quickslash',
    name: 'Blade Rush',
    description: 'Quickslash +300 burst speed',
    apply: (stats) => { stats.quickslashBurstSpeed += 300; },
  },
  iron: {
    ability: 'thunderstrike',
    name: 'Hammer Force',
    description: 'Thunderstrike -20% falloff',
    apply: (stats) => { stats.thunderstrikeFalloffReduction += 0.20; },
  },
  bronze: {
    ability: 'quickslash',
    name: 'Shielded Slash',
    description: 'Quickslash no GP cost while above 50% GP',
    apply: (stats) => { stats.quickslashFreeAbovePct = 0.5; },
  },
  darkDirtStrong: {
    ability: 'thunderstrike',
    name: 'Fortress Smash',
    description: 'Thunderstrike destroys 1 extra bedrock tile',
    apply: (stats) => { stats.thunderstrikeBedrockBreach += 1; },
  },
  silver: {
    ability: 'quickslash',
    name: 'Crescent Flash',
    description: 'Quickslash +20% mining speed while active',
    apply: (stats) => { stats.quickslashSpeedBonus += 0.20; },
  },
  gold: {
    ability: 'thunderstrike',
    name: 'Crown Overload',
    description: 'Thunderstrike costs 30 less GP',
    apply: (stats) => { stats.thunderstrikeCostReduction += 30; },
  },
};

/**
 * Get the default (unbuffed) ability stat block.
 * @returns {Object}
 */
export function getDefaultAbilityStats() {
  return {
    // Quickslash
    quickslashFlatDamage: 0,
    quickslashCostReduction: 0,
    quickslashBurstSpeed: 0,
    quickslashFreeAbovePct: 0,
    quickslashSpeedBonus: 0,
    // Thunderstrike
    thunderstrikeRange: 0,
    thunderstrikeDamageMult: 0,
    thunderstrikeFalloffReduction: 0,
    thunderstrikeBedrockBreach: 0,
    thunderstrikeCostReduction: 0,
  };
}

/**
 * Compute the effective ability stats given a set of unlocked constellation resource types.
 * @param {string[]} unlockedConstellations - Array of resource type strings (e.g. ['dirt','copper'])
 * @returns {Object} Ability stat overrides
 */
export function computeAbilityStats(unlockedConstellations) {
  const stats = getDefaultAbilityStats();
  if (!unlockedConstellations || unlockedConstellations.length === 0) {
    return stats;
  }
  for (const resourceType of unlockedConstellations) {
    const buff = CONSTELLATION_BUFFS[resourceType];
    if (buff) {
      buff.apply(stats);
    }
  }
  return stats;
}