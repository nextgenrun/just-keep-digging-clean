import {
  MONEY_MONSTER_RESOURCE_KEYS,
  RESOURCE_KEYS,
  createZeroResourceTotals,
} from "./resourceTypes.js";
import {
  GAMEPLAY_FEATURE_IDS,
  isGameplayFeatureEnabled,
} from "./gameplayDevFlags.js";

export const RANDOM_EVENT_TYPES = Object.freeze({
  CRYSTAL_CHOIR: "crystalChoir",
  BLACKOUT_BLOOM: "blackoutBloom",
  MONEY_MONSTER_RUSH: "moneyMonsterRush",
});

export const RANDOM_EVENT_TYPE_ORDER = Object.freeze([
  RANDOM_EVENT_TYPES.CRYSTAL_CHOIR,
  RANDOM_EVENT_TYPES.BLACKOUT_BLOOM,
  RANDOM_EVENT_TYPES.MONEY_MONSTER_RUSH,
]);

export const RANDOM_EVENT_PRELOAD_ASSETS = Object.freeze([
  Object.freeze({ key: "ui-sleeping-jackpot-panel-v1", path: "sprites/UI/random-events-v1/sleeping-jackpot-panel-v1.png" }),
  Object.freeze({ key: "environment-random-event-sigils-v1", path: "sprites/environment/random-events-v1/random-event-sigils-v1.png" }),
]);

export const RANDOM_WORLD_EVENT_CONFIG = Object.freeze({
  version: 2,
  query: Object.freeze({
    master: "randomEvents",
    crystalChoir: "crystalChoir",
    blackoutBloom: "blackoutBloom",
    moneyMonsterRush: "moneyMonsterRush",
    debug: "randomEventDebug",
    force: "randomEvent",
  }),
  scheduler: Object.freeze({
    initialCooldownMs: 35000,
    minCooldownMs: 165000,
    maxCooldownMs: 300000,
    retryCooldownMs: 18000,
    recentTypeLimit: 2,
    recentResourceLimit: 6,
    maxPersistedDurationMs: 600000,
  }),
  eligibility: Object.freeze({
    viewportMarginTiles: 2,
    fallbackRadiusXTiles: 13,
    fallbackRadiusYTiles: 8,
    maxReachableCells: 520,
    minAnchorDistanceTiles: 3,
    interactDistanceTiles: 1,
  }),
  crystalChoir: Object.freeze({
    durationMs: 75000,
    anchorCount: 5,
    shallowSequenceLength: 3,
    middleSequenceLength: 4,
    deepSequenceLength: 5,
    middleDepth: 500,
    deepDepth: 1000,
    rewardMoneyBase: 900,
    rewardMoneyPerDepth: 4,
    cueSpacingMs: 230,
    cueRates: Object.freeze([0.82, 0.94, 1.06, 1.18, 1.3]),
  }),
  blackoutBloom: Object.freeze({
    durationMs: 26000,
    anchorCount: 3,
    contractionMs: 1000,
    restoreMs: 5000,
    minimumAmbientScale: 0.12,
    rewardResourceAmount: 4,
  }),
  moneyMonsterRush: Object.freeze({
    durationMs: 90000,
    merchantId: "moneyMonster",
    multiplier: 2,
    targetResourceKeys: MONEY_MONSTER_RESOURCE_KEYS,
  }),
  sleepingJackpot: Object.freeze({
    rareChestDivisor: 7,
    rareChestSalt: 947,
    outcomeSalt: 739391,
    immediateOddsBps: 5000,
    maturityOddsBps: 5000,
    wagerWalletFraction: 0.2,
    minWallet: 100,
    minWager: 25,
    maxWager: 5000000000,
    immediateNetGainMultiplier: 3,
    resourceMultiplier: 9,
    maxSafeResourceStack: Math.floor(Number.MAX_SAFE_INTEGER / 9),
    phrases: Object.freeze({ immediate: "GAMBLE", maturity: "RISKALL" }),
  }),
  rewards: Object.freeze({ resourceKeys: RESOURCE_KEYS }),
  visuals: Object.freeze({
    panelKey: RANDOM_EVENT_PRELOAD_ASSETS[0].key,
    sigilKey: RANDOM_EVENT_PRELOAD_ASSETS[1].key,
    ribbonKey: "ui-hud-approved-notification",
    renderDepth: 901,
    promptDepth: 1320,
    ribbonDepth: 2400,
    nodeDisplaySize: 88,
    ribbonWidth: 620,
    ribbonHeight: 82,
    ribbonTop: 18,
    ribbonSafeGap: 16,
    crops: Object.freeze({
      choir: Object.freeze({ x: 890, y: 0, width: 620, height: 470 }),
      blackout: Object.freeze({ x: 180, y: 470, width: 620, height: 471 }),
      rush: Object.freeze({ x: 890, y: 470, width: 620, height: 471 }),
    }),
    modal: Object.freeze({
      depth: 5200,
      panelWidth: 1120,
      panelHeight: 630,
      maxViewportWidthRatio: 0.94,
      maxViewportHeightRatio: 0.92,
      titleY: -250,
      subtitleY: -214,
      cardCenterX: 276,
      cardY: -38,
      cardWidth: 430,
      cardHeight: 315,
      inputY: 246,
      footerY: 292,
    }),
  }),
  copy: Object.freeze({
    sleepingPrompt: "SLEEPING JACKPOT  •  CHOOSE ITS FATE",
    sleepingTitle: "SLEEPING JACKPOT",
    sleepingSubtitle: "GAMBLE NOW — OR RISK EVERYTHING AT MATURITY",
    sealedPrompt: depth => `SLEEPING  •  MATURES AT ${depth}M`,
    awakePrompt: "AWAKENED JACKPOT  •  REVEAL FATE",
    choirRibbon: "CRYSTAL CHOIR  •  REPEAT THE SONG",
    choirPrompt: "STRIKE THE SINGING CRYSTAL",
    blackoutRibbon: "BLACKOUT BLOOM  •  HARVEST 3",
    blackoutPrompt: "HARVEST BLACKOUT BLOOM",
    rushStart: (name, seconds) => `MONEY MONSTER RUSH ORDER  •  ${name.toUpperCase()} PAYS 2× FOR ${seconds}S`,
    rushEnd: bonus => `RUSH CLOSED  •  +${Math.floor(bonus).toLocaleString()}M BONUS EARNED`,
  }),
});

function enabledParam(params, key) {
  const value = params.get(key);
  return value !== "0" && value !== "false" && value !== "off";
}

export function resolveRandomEventFlags(search = globalThis.location?.search || "") {
  const params = new URLSearchParams(String(search || ""));
  const query = RANDOM_WORLD_EVENT_CONFIG.query;
  const master = enabledParam(params, query.master);
  const requestedType = params.get(query.force);
  const devCheatsEnabled = isGameplayFeatureEnabled(GAMEPLAY_FEATURE_IDS.DEV_CHEATS);
  return Object.freeze({
    master,
    crystalChoir: master && enabledParam(params, query.crystalChoir),
    blackoutBloom: master && enabledParam(params, query.blackoutBloom),
    moneyMonsterRush: master && enabledParam(params, query.moneyMonsterRush),
    debug: devCheatsEnabled
      && (params.get(query.debug) === "1" || params.get("jkd_e2e") === "1"),
    forcedType: devCheatsEnabled && RANDOM_EVENT_TYPE_ORDER.includes(requestedType)
      ? requestedType
      : null,
  });
}

export function createEmptyRandomEventResources() {
  return createZeroResourceTotals();
}
