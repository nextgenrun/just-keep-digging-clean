import { RESOURCE_KEYS, createZeroResourceTotals } from "./resourceTypes.js";

export const SLEEPING_JACKPOT_PRELOAD_ASSETS = Object.freeze([
  Object.freeze({
    key: "ui-sleeping-jackpot-panel-v1",
    path: "sprites/UI/random-events-v1/sleeping-jackpot-panel-v1.png",
  }),
]);

export const SLEEPING_JACKPOT_CONFIG = Object.freeze({
  version: 1,
  queryParam: "sleepingJackpot",
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
    panelKey: SLEEPING_JACKPOT_PRELOAD_ASSETS[0].key,
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
  }),
});

export function resolveSleepingJackpotEnabled(search = globalThis.location?.search || "") {
  const value = new URLSearchParams(String(search || ""))
    .get(SLEEPING_JACKPOT_CONFIG.queryParam)?.trim().toLowerCase();
  return !["0", "false", "off", "disabled"].includes(value);
}

export function createEmptySleepingJackpotResources() {
  return createZeroResourceTotals();
}

