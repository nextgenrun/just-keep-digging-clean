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
    guidedLockShort: "GUIDED STEP",
    guidedLockDetail: "Complete the current guided shop step first.",
  }),
  thresholds: Object.freeze({
    gearDepth: 40,
    portalDepth: 80,
    constellationDepth: 100,
    caveDepth: 140,
    hazardDepth: 220,
    relicDepth: 250,
    titanDepth: 350,
    abilityDepth: 500,
    lateDepth: 1000,
  }),
  featureUnlocks: Object.freeze({
    core: "always",
    flight: "flightReady",
    gemPower: "flightReady",
    gemPowerMerchant: "firstReturn",
    gearMerchant: "gearRun",
    campfire: "firstReturn",
    clock: "firstReturn",
    weather: "always",
    journey: "firstReturn",
    map: "firstReturn",
    milestones: "firstReturn",
    comboHud: "firstReturn",
    specialTiles: "portalRun",
    constellations: "constellationRun",
    inventoryStarAtlas: "constellationRun",
    caves: "caveRun",
    hazards: "hazardRun",
    relics: "relicRun",
    heavenblocks: "relicRun",
    titans: "titanRun",
    abilities: "abilityRun",
    boboMerchant: "abilityRun",
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
    agility: "firstReturn",
    strength: "gearMerchant",
    quickReflexes: "portalRun",
    critChance: "constellationRun",
    luckyCollector: "constellationRun",
    heavyPunch: "abilityRun",
    seismicSuppression: "hazardRun",
    bronzePickaxe: "gearMerchant",
    ironPickaxe: "gearMerchant",
    steelPickaxe: "relicRun",
    mithrilPickaxe: "relicRun",
    adamantPickaxe: "titanRun",
    runePickaxe: "titanRun",
    dragonPickaxe: "titanRun",
    gemPowerTank: "gemPowerMerchant",
    gemPowerEfficiency: "gemPowerMerchant",
    gemPowerRegeneration: "abilityRun",
    gemFlySpeed: "abilityRun",
    sellAllButton: "firstReturn",
    startResourcePrices: "gearMerchant",
    nextResourcePrices: "portalRun",
    deepResourcePrices: "lateRun",
    marketInsight: "abilityRun",
    luckySales: "abilityRun",
    quickslashAbility: "abilityRun",
    thunderStrikeAbility: "abilityRun",
    torchDrainEfficiency: "caveRun",
    torchRange: "caveRun",
    boboCaveEyes: "caveRun",
    worldTwoTunnelAccess: "lateRun",
    upOrDown: "lateRun",
  }),
  unlockCopy: Object.freeze({
    core: Object.freeze({
      short: "AVAILABLE NOW",
      detail: "Available from the start.",
    }),
    flightReady: Object.freeze({
      short: "UNLOCK FLIGHT",
      detail: "Complete the opening path and unlock Flight.",
    }),
    firstReturn: Object.freeze({
      short: "RETURN ONCE",
      detail: "Complete one mining expedition and return to town.",
    }),
    gemPowerMerchant: Object.freeze({
      short: "RETURN ONCE",
      detail: "Complete one mining expedition and return to town.",
    }),
    gearMerchant: Object.freeze({
      short: "REACH 40m",
      detail: "Complete one expedition and reach a best depth of 40m.",
    }),
    portalRun: Object.freeze({
      short: "REACH 80m",
      detail: "Reach 80m or discover a portal or chest.",
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
      detail: "Reach 500m before purchasing advanced abilities.",
    }),
    boboMerchant: Object.freeze({
      short: "REACH 500m",
      detail: "Reach 500m before purchasing Bobo's advanced upgrades.",
    }),
    lateRun: Object.freeze({
      short: "REACH 1000m",
      detail: "Reach 1000m before purchasing endgame upgrades.",
    }),
    magmaMoneyMonster: Object.freeze({
      short: "REACH 1000m",
      detail: "Reach 1000m before using the Level Two forge.",
    }),
  }),
  promiseOrder: Object.freeze([
    Object.freeze({
      feature: "firstReturn",
      promise: "NEXT: RETURN WITH CARGO",
      detail: "REACH 10m  •  COME BACK UP  •  SELL WHAT YOU CARRIED",
    }),
    Object.freeze({
      feature: "gemPowerMerchant",
      promise: "NEW PATH: LEARN GEM POWER",
      detail: "VISIT THE GEM MERCHANT  •  FLIGHT IS YOUR SAFETY TOOL",
    }),
    Object.freeze({
      feature: "gearMerchant",
      promise: "NEXT RUN: REACH 40m",
      detail: "ONE SYSTEM AT A TIME  •  GEAR OPENS AFTER THIS DEPTH",
    }),
    Object.freeze({
      feature: "specialTiles",
      promise: "DISCOVER: FIND A PORTAL OR CHEST",
      detail: "REACH 80m  •  LOOK FOR A SPECIAL TILE  •  PRESS {interact}",
    }),
    Object.freeze({
      feature: "constellations",
      promise: "DISCOVER: BRING A STAR HOME",
      detail: "REACH 100m  •  THE STAR PILLAR WILL EXPLAIN THE NEXT PATH",
    }),
    Object.freeze({
      feature: "caves",
      promise: "NEXT FRONTIER: REACH 140m",
      detail: "CAVES APPEAR AFTER THE CORE LOOP IS FAMILIAR",
    }),
    Object.freeze({
      feature: "hazards",
      promise: "PREPARE: REACH 220m",
      detail: "HAZARDS WILL WARN YOU BEFORE THEY BECOME ACTIVE",
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
      feature: "abilities",
      promise: "MASTER: REACH 500m",
      detail: "ADVANCED ABILITIES APPEAR AFTER THE SURVIVAL LOOP IS CLEAR",
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
