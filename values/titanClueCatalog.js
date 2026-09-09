const DISABLED_QUERY_VALUES = Object.freeze([
  "0",
  "false",
  "off",
  "disabled",
]);

const PRICE_ROUNDING_BANDS = Object.freeze([
  Object.freeze({ maximumExclusive: 1_000, stepMoney: 25 }),
  Object.freeze({ maximumExclusive: 10_000, stepMoney: 100 }),
  Object.freeze({ maximumExclusive: 100_000, stepMoney: 500 }),
  Object.freeze({ maximumExclusive: 1_000_000_000, stepMoney: 1_000 }),
]);

export const TITAN_CLUE_CATALOG_CONFIG = Object.freeze({
  enabledByDefault: true,
  queryParam: "titanClues",
  disabledValues: DISABLED_QUERY_VALUES,
  persistence: Object.freeze({
    journalKeyPrefix: "titan-locator-clue:",
    journalIndexDigits: 2,
  }),
  pricing: Object.freeze({
    baseCostMoney: 50,
    depthSquaredMoneyPerTile: 0.0025,
    purchasedClueEscalation: 0.08,
    minimumCostMoney: 25,
    maximumCostMoney: 1_000_000,
    roundingBands: PRICE_ROUNDING_BANDS,
  }),
  layout: Object.freeze({
    sideInsetPx: 24,
    bottomInsetPx: 24,
    buttonHeightPx: 38,
    buttonFontSize: "11px",
    lockedLoreOffsetY: 76,
  }),
  results: Object.freeze({
    disabled: "disabled",
    unknownTitan: "unknown_titan",
    alreadyDiscovered: "already_discovered",
    unavailable: "unavailable",
    notEnoughMoney: "not_enough_money",
    purchased: "purchased",
    locatorEnabled: "locator_enabled",
    locatorDisabled: "locator_disabled",
  }),
  copy: Object.freeze({
    buyButton: "BUY LOCATION CLUE",
    enableButton: "ENABLE ARROW",
    disableButton: "DISABLE ARROW",
    walletUnit: "M",
    costPrefix: "COST",
    activePrefix: "ACTIVE",
    needPrefix: "NEED",
    unavailableDirection: "RETURN TO THE MINE TO SHOW DIRECTION",
    lockedLore:
      "Clear at least half the rubble covering the creature. Buy a clue for exact directions.",
    journalEntryPrefix: "Titan Locator Clue",
  }),
});

function finiteNonNegative(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
}

export function resolveTitanCluesEnabled(
  config = TITAN_CLUE_CATALOG_CONFIG,
  search = globalThis.location?.search || ""
) {
  const value = new URLSearchParams(search)
    .get(config.queryParam)
    ?.trim()
    .toLowerCase();
  if (value && config.disabledValues.includes(value)) return false;
  return config.enabledByDefault;
}

export function calculateTitanClueCost(
  definition,
  purchasedClueCount = 0,
  config = TITAN_CLUE_CATALOG_CONFIG
) {
  const pricing = config.pricing;
  const depth = finiteNonNegative(definition?.preferredDepthTiles);
  const purchaseCount = Math.floor(finiteNonNegative(purchasedClueCount));
  const depthCost = pricing.baseCostMoney
    + depth * depth * pricing.depthSquaredMoneyPerTile;
  const rawCost = depthCost
    * (1 + purchaseCount * pricing.purchasedClueEscalation);
  const band = pricing.roundingBands.find(
    entry => rawCost < entry.maximumExclusive
  ) || pricing.roundingBands[pricing.roundingBands.length - 1];
  const rounded = Math.round(rawCost / band.stepMoney) * band.stepMoney;
  return Math.min(
    pricing.maximumCostMoney,
    Math.max(pricing.minimumCostMoney, rounded)
  );
}

export function getTitanClueJournalKey(
  definition,
  config = TITAN_CLUE_CATALOG_CONFIG
) {
  const index = Math.floor(finiteNonNegative(definition?.index));
  if (index <= 0) return "";
  return config.persistence.journalKeyPrefix
    + String(index).padStart(config.persistence.journalIndexDigits, "0");
}

export function getTitanClueJournalIndex(
  key,
  config = TITAN_CLUE_CATALOG_CONFIG
) {
  if (
    typeof key !== "string"
    || !key.startsWith(config.persistence.journalKeyPrefix)
  ) {
    return 0;
  }
  const value = Number.parseInt(
    key.slice(config.persistence.journalKeyPrefix.length),
    10
  );
  return Number.isInteger(value) && value > 0 ? value : 0;
}
