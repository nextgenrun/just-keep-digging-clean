// ==================== CONSTELLATION BUFFS CONFIG ====================
// One auditable authority for shared rewards, Bobo gates, and stat modifiers.

export const CONSTELLATION_MATCHING_STAR_YIELD_BONUS = 1;

export const CONSTELLATION_ABILITY_PREREQUISITES = Object.freeze({
  quickslash: Object.freeze({
    abilityName: "Quick Slash",
    upgradeId: "quickslashAbility",
    unlockMethod: "isQuickslashUnlocked",
    merchantName: "Bobo",
  }),
  thunderstrike: Object.freeze({
    abilityName: "Thunder Strike",
    upgradeId: "thunderStrikeAbility",
    unlockMethod: "isThunderStrikeUnlocked",
    merchantName: "Bobo",
  }),
});

function defineBuff(ability, name, description, stat, operation, value) {
  const modifier = Object.freeze({ stat, operation, value });
  return Object.freeze({
    ability,
    name,
    description,
    modifier,
    apply(stats) {
      if (operation === "set") stats[stat] = value;
      else stats[stat] += value;
    },
  });
}

export const CONSTELLATION_BUFFS = Object.freeze({
  dirt: defineBuff(
    "quickslash",
    "Swift Shovel",
    "Every Quick Slash hit deals 20% more tile damage.",
    "quickslashDamageMult",
    "add",
    0.20,
  ),
  stone: defineBuff(
    "thunderstrike",
    "Mountain Shock",
    "Thunder Strike reaches 2 additional rows.",
    "thunderstrikeRange",
    "add",
    2,
  ),
  copper: defineBuff(
    "quickslash",
    "Anvil Efficiency",
    "Quick Slash costs 9 GP instead of 12 GP.",
    "quickslashCostReduction",
    "add",
    3,
  ),
  darkDirtNormal: defineBuff(
    "thunderstrike",
    "Cave Echo",
    "Every Thunder Strike slam deals 15% more tile damage.",
    "thunderstrikeDamageMult",
    "add",
    0.15,
  ),
  steel: defineBuff(
    "quickslash",
    "Blade Rush",
    "Quick Slash gains +160 burst movement speed.",
    "quickslashBurstSpeed",
    "add",
    160,
  ),
  iron: defineBuff(
    "thunderstrike",
    "Hammer Force",
    "Removes Thunder Strike's 8% damage loss per deeper row.",
    "thunderstrikeFalloffReduction",
    "add",
    0.08,
  ),
  bronze: defineBuff(
    "quickslash",
    "Shielded Slash",
    "Quick Slash costs 50% less while current GP is 75% or higher.",
    "quickslashDiscountAbovePct",
    "set",
    0.75,
  ),
  darkDirtStrong: defineBuff(
    "thunderstrike",
    "Citadel Storm",
    "Thunder Strike damage +10%.",
    "thunderstrikeDamageMult",
    "add",
    0.10,
  ),
  silver: defineBuff(
    "quickslash",
    "Crescent Flash",
    "Quick Slash cadence improves by 20% (2.5x to 3.0x) and its floor drops to 150 ms.",
    "quickslashSpeedBonus",
    "add",
    0.20,
  ),
  gold: defineBuff(
    "thunderstrike",
    "Crown Overload",
    "Opening cast costs 200 GP instead of 250; chained slams stay free.",
    "thunderstrikeCostReduction",
    "add",
    50,
  ),
});

/**
 * Get the default (unbuffed) ability stat block.
 * @returns {Object}
 */
export function getDefaultAbilityStats() {
  return {
    // Quickslash
    quickslashDamageMult: 0,
    quickslashCostReduction: 0,
    quickslashBurstSpeed: 0,
    quickslashDiscountAbovePct: 0,
    quickslashSpeedBonus: 0,
    // Thunderstrike
    thunderstrikeRange: 0,
    thunderstrikeDamageMult: 0,
    thunderstrikeFalloffReduction: 0,
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
