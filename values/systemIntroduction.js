// Staged disclosure for systems that are useful later but noisy at spawn.
// The first-five tutorial remains the authority for the opening actions;
// this profile controls what becomes visible and interactive afterwards.

export const SYSTEM_INTRODUCTION_CONFIG = Object.freeze({
  enabled: true,
  rollback: Object.freeze({
    queryParam: "systemPacing",
    disabledValues: Object.freeze(["0", "off", "false", "legacy"]),
  }),
  shopPresentation: Object.freeze({
    alwaysVisibleMerchantIds: Object.freeze([
      "boboMerchant",
      "playerUpgrades",
      "gemPowerMerchant",
      "gearMerchant",
      "moneyMonster",
    ]),
    keepLockedUpgradesVisible: true,
    guidedLockShort: "FINISH TUTORIAL STEP",
    guidedLockDetail: "Finish the current shop tutorial step first.",
  }),
  thresholds: Object.freeze({
    gearDepth: 40,
    portalDepth: 80,
    talentLevel: 3,
    constellationDepth: 100,
    caveDepth: 140,
    hazardDepth: 220,
    relicDepth: 250,
    titanDepth: 350,
    abilityDepth: 500,
    lateDepth: 1000,
  }),
  promiseRotationMs: 18000,
  promiseUpgradePriority: Object.freeze([
    "bronzePickaxe", "ironPickaxe", "steelPickaxe", "mithrilPickaxe",
    "adamantPickaxe", "runePickaxe", "dragonPickaxe",
    "gemPowerTank", "gemPowerEfficiency", "torchDrainEfficiency", "torchRange",
    "strength", "quickReflexes", "agility",
    "gemPowerRegeneration", "gemFlySpeed", "marketInsight",
  ]),
  hardcoreSurvivalUpgradePriority: Object.freeze([
    "torchDrainEfficiency", "torchRange", "boboCaveEyes",
    "gemPowerTank", "gemPowerEfficiency", "gemPowerRegeneration",
  ]),
  featureUnlocks: Object.freeze({
    core: "always",
    flight: "flightReady",
    gemPower: "flightReady",
    gemPowerMerchant: "firstReturn",
    gearMerchant: "gearRun",
    campfire: "hearthKnown",
    clock: "hearthKnown",
    weather: "always",
    journey: "firstReturn",
    // The map is passive information, so hiding it behind the first-return
    // milestone only makes the authored HUD button look broken to new players.
    map: "always",
    milestones: "always",
    comboHud: "firstReturn",
    specialTiles: "portalRun",
    constellations: "talentRun",
    inventoryStarAtlas: "constellationRun",
    caves: "caveRun",
    hazards: "hazardRun",
    relics: "relicRun",
    heavenblocks: "relicRun",
    titans: "titanRun",
    abilities: "firstReturn",
    boboMerchant: "flightReady",
    randomEvents: "abilityRun",
    arcCore: "lateRun",
    magmaMoneyMonster: "lateRun",
  }),
  merchantUnlocks: Object.freeze({
    boboMerchant: "boboMerchant",
    playerUpgrades: "core",
    gemPowerMerchant: "gemPowerMerchant",
    gearMerchant: "gearMerchant",
    moneyMonster: "core",
    magmaMoneyMonster: "magmaMoneyMonster",
  }),
  upgradeUnlocks: Object.freeze({
    minersGrip: "core",
    gemPowerUnlock: "flightReady",
    agility: "core",
    strength: "core",
    quickReflexes: "firstReturn",
    heavyPunch: "relicRun",
    seismicSuppression: "hazardRun",
    bronzePickaxe: "core",
    ironPickaxe: "firstReturn",
    steelPickaxe: "portalRun",
    mithrilPickaxe: "caveRun",
    adamantPickaxe: "relicRun",
    runePickaxe: "titanRun",
    dragonPickaxe: "titanRun",
    gemPowerTank: "gemPowerMerchant",
    gemPowerEfficiency: "gemPowerMerchant",
    gemPowerRegeneration: "caveRun",
    gemFlySpeed: "caveRun",
    sellAllButton: "firstReturn",
    startResourcePrices: "core",
    nextResourcePrices: "firstReturn",
    deepResourcePrices: "lateRun",
    marketInsight: "caveRun",
    quickslashAbility: "relicRun",
    thunderStrikeAbility: "relicRun",
    torchDrainEfficiency: "flightReady",
    torchRange: "flightReady",
    boboCaveEyes: "flightReady",
    worldTwoTunnelAccess: "lateRun",
    upOrDown: "lateRun",
  }),
  unlockCopy: Object.freeze({
    core: Object.freeze({
      short: "AVAILABLE NOW",
      detail: "Ready from the start.",
    }),
    flightReady: Object.freeze({
      short: "UNLOCK FLIGHT",
      detail: "Complete the opening path and unlock Flight.",
    }),
    firstReturn: Object.freeze({
      short: "RETURN ONCE",
      detail: "Return to town after your first mining trip.",
    }),
    gemPowerMerchant: Object.freeze({
      short: "RETURN ONCE",
      detail: "Return to town after your first mining trip.",
    }),
    gearMerchant: Object.freeze({
      short: "REACH 40m",
      detail: "Reach 40m on any mining trip.",
    }),
    portalRun: Object.freeze({
      short: "REACH 80m",
      detail: "Reach 80m or discover a portal or chest.",
    }),
    talentRun: Object.freeze({
      short: "REACH LEVEL 3",
      detail: "Reach Level 3, then spend your first Talent Point at the Star Pillar.",
    }),
    constellationRun: Object.freeze({
      short: "REACH 100m",
      detail: "Reach 100m or bring a Star home.",
    }),
    caveRun: Object.freeze({
      short: "REACH 140m",
      detail: "Reach a best depth of 140m.",
    }),
    hazardRun: Object.freeze({
      short: "REACH 220m",
      detail: "Reach 220m or survive an earthquake.",
    }),
    relicRun: Object.freeze({
      short: "REACH 250m",
      detail: "Reach 250m or discover an Ancient Relic.",
    }),
    titanRun: Object.freeze({
      short: "REACH 350m",
      detail: "Reach 350m or discover a Titan.",
    }),
    abilityRun: Object.freeze({
      short: "REACH 500m",
      detail: "Reach 500m to meet new encounters.",
    }),
    boboMerchant: Object.freeze({
      short: "UNLOCK FLIGHT",
      detail: "Unlock Flight to start preparing for the darkness.",
    }),
    lateRun: Object.freeze({
      short: "REACH 1000m",
      detail: "Reach 1000m to unlock the deepest upgrades.",
    }),
    magmaMoneyMonster: Object.freeze({
      short: "REACH 1000m",
      detail: "Reach 1000m to use the Level Two forge.",
    }),
  }),
  promiseOrder: Object.freeze([
    Object.freeze({
      feature: "firstReturn",
      promise: "NEXT: BRING ORE BACK TO TOWN",
      detail: "REACH 10m  •  RETURN TO TOWN  •  SELL WHAT YOU MINED",
    }),
    Object.freeze({
      feature: "gemPowerMerchant",
      promise: "NEXT: VISIT THE GEM POWER WORKSHOP",
      detail: "IMPROVE YOUR GP  •  FLIGHT IS YOUR SAFEST WAY BACK",
    }),
    Object.freeze({
      feature: "gearMerchant",
      promise: "NEXT RUN: REACH 40m",
      detail: "REACH 40m TO UNLOCK THE GEAR FORGE",
    }),
    Object.freeze({
      feature: "specialTiles",
      promise: "DISCOVER: FIND A PORTAL OR CHEST",
      detail: "REACH 80m  •  LOOK FOR A SPECIAL TILE  •  PRESS {interact}",
    }),
    Object.freeze({
      feature: "constellations",
      promise: "NEW TALENTS: REACH LEVEL 3",
      detail: "TALENT POINTS UNLOCK NODES  •  STAR POINTS UPGRADE THEIR RANKS",
    }),
    Object.freeze({
      feature: "caves",
      promise: "NEXT FRONTIER: REACH 140m",
      detail: "REACH 140m TO UNCOVER CAVE ENTRANCES",
    }),
    Object.freeze({
      feature: "hazards",
      promise: "PREPARE: REACH 220m",
      detail: "WATCH THE GROUND FOR WARNING MARKERS",
    }),
    Object.freeze({
      feature: "relics",
      promise: "DISCOVER: SEARCH THE LOWER EARTH",
      detail: "RELICS AND THEIR USES OPEN AFTER 250m",
    }),
    Object.freeze({
      feature: "titans",
      promise: "DISCOVER: FOLLOW THE TITAN CLUES",
      detail: "THE ARCHIVE OPENS AFTER 350m",
    }),
    Object.freeze({
      feature: "randomEvents",
      promise: "EXPLORE: REACH 500m",
      detail: "NEW ENCOUNTERS OPEN BELOW 500m",
    }),
  ]),
});

export function resolveSystemIntroductionEnabled(
  config = SYSTEM_INTRODUCTION_CONFIG,
  search = globalThis.location?.search || "",
) {
  if (config.enabled !== true) return false;
  const value = new URLSearchParams(search)
    .get(config.rollback.queryParam)
    ?.trim()
    .toLowerCase();
  return !value || !config.rollback.disabledValues.includes(value);
}
