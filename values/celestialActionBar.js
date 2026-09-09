// ==================== CELESTIAL ACTION BAR ====================
// Pure six-slot presentation, ordering, interaction, and copy contract.
import { BAKED_CELESTIAL_ASSETS } from "./bakedCelestialUi.js";

export const CELESTIAL_ACTION_BAR_ENTRY_IDS = Object.freeze({
  QUICK_SLASH: "quickslash",
  THUNDER_STRIKE: "thunderStrike",
  WAYWARD_STAR: "wayward-star",
  HOLLOW_SUN: "hollow-sun",
  STELLAR_RAGE: "comet-engine",
  // Legacy alias retained for persisted action-bar order.
  COMET_ENGINE: "comet-engine",
  CAMPFIRE: "campfire",
});

export const CELESTIAL_ACTION_BAR_DEFAULT_ORDER = Object.freeze([
  CELESTIAL_ACTION_BAR_ENTRY_IDS.QUICK_SLASH,
  CELESTIAL_ACTION_BAR_ENTRY_IDS.THUNDER_STRIKE,
  CELESTIAL_ACTION_BAR_ENTRY_IDS.WAYWARD_STAR,
  CELESTIAL_ACTION_BAR_ENTRY_IDS.HOLLOW_SUN,
  CELESTIAL_ACTION_BAR_ENTRY_IDS.COMET_ENGINE,
  CELESTIAL_ACTION_BAR_ENTRY_IDS.CAMPFIRE,
]);

export const CELESTIAL_ACTION_BAR_ASSET_KEYS = Object.freeze({
  foundation: "celestial-actionbar-foundation-v2",
  quickslash: "celestial-actionbar-quickslash-v1",
  thunderStrike: "celestial-actionbar-thunderstrike-v1",
  waywardStar: BAKED_CELESTIAL_ASSETS["talents-wayward"].key,
  hollowSun: BAKED_CELESTIAL_ASSETS["talents-hollow"].key,
  cometEngine: BAKED_CELESTIAL_ASSETS["talents-lance"].key,
});

export const CELESTIAL_ACTION_BAR_EAGER_ASSETS = Object.freeze([
  Object.freeze({
    type: "image",
    key: CELESTIAL_ACTION_BAR_ASSET_KEYS.foundation,
    path: "sprites/UI/hud-cohesion-v1/celestial-actionbar-v2.png",
  }),
  Object.freeze({
    type: "image",
    key: CELESTIAL_ACTION_BAR_ASSET_KEYS.quickslash,
    path: "sprites/UI/starlight-talent-tree-v4/node-frame-quickslash-v2.png",
  }),
  Object.freeze({
    type: "image",
    key: CELESTIAL_ACTION_BAR_ASSET_KEYS.thunderStrike,
    path: "sprites/UI/starlight-talent-tree-v4/node-frame-thunderstrike-v2.png",
  }),
  Object.freeze({
    type: "image",
    key: CELESTIAL_ACTION_BAR_ASSET_KEYS.waywardStar,
    path: BAKED_CELESTIAL_ASSETS["talents-wayward"].path,
  }),
  Object.freeze({
    type: "image",
    key: CELESTIAL_ACTION_BAR_ASSET_KEYS.hollowSun,
    path: BAKED_CELESTIAL_ASSETS["talents-hollow"].path,
  }),
  Object.freeze({
    type: "image",
    key: CELESTIAL_ACTION_BAR_ASSET_KEYS.cometEngine,
    path: BAKED_CELESTIAL_ASSETS["talents-lance"].path,
  }),
]);

const entries = Object.freeze([
  Object.freeze({
    id: CELESTIAL_ACTION_BAR_ENTRY_IDS.QUICK_SLASH,
    label: "QUICK SLASH",
    shortLabel: "SLASH",
    assetRole: "quickslash",
    accent: 0xf1ba52,
    unlockCondition: "Buy Quick Slash from Bobo.",
    description: "Fast directional mining strike powered by Gem Power.",
  }),
  Object.freeze({
    id: CELESTIAL_ACTION_BAR_ENTRY_IDS.THUNDER_STRIKE,
    label: "THUNDER STRIKE",
    shortLabel: "THUNDER",
    assetRole: "thunderStrike",
    accent: 0x65d8f2,
    unlockCondition: "Buy Thunder Strike from Bobo.",
    description: "Start a timed chain of lightning strikes.",
  }),
  Object.freeze({
    id: CELESTIAL_ACTION_BAR_ENTRY_IDS.WAYWARD_STAR,
    label: "WAYWARD STAR",
    shortLabel: "WAYWARD",
    assetRole: "waywardStar",
    accent: 0x65e8ff,
    unlockCondition: "Attune Wayward Star at the Star Pillar.",
    description: "Release a swarm of stars that ricochet on their own.",
  }),
  Object.freeze({
    id: CELESTIAL_ACTION_BAR_ENTRY_IDS.HOLLOW_SUN,
    label: "HOLLOW SUN",
    shortLabel: "HOLLOW",
    assetRole: "hollowSun",
    accent: 0xa96dff,
    unlockCondition: "Attune Hollow Sun at the Star Pillar.",
    description: "Create three black holes that pulse, follow you, and move toward each punch.",
  }),
  Object.freeze({
    id: CELESTIAL_ACTION_BAR_ENTRY_IDS.COMET_ENGINE,
    label: "STELLAR LANCE",
    shortLabel: "LANCE",
    assetRole: "cometEngine",
    accent: 0xa855f7,
    unlockCondition: "Attune Stellar Lance at the Star Pillar.",
    description: "For 15 seconds, every punch fires a five-tile cinder wave. Leftover damage carries through broken blocks.",
  }),
  Object.freeze({
    id: CELESTIAL_ACTION_BAR_ENTRY_IDS.CAMPFIRE,
    label: "CAMPFIRE",
    shortLabel: "EMBER",
    assetRole: "campfire",
    accent: 0xff8f45,
    unlockCondition: "Available from the beginning of every save.",
    description: "Consume an Ember Charge to invoke your selected Campfire blessing.",
  }),
]);

export const CELESTIAL_ACTION_BAR_CONFIG = Object.freeze({
  saveVersion: 2,
  slotCount: 6,
  entries,
  layout: Object.freeze({
    referenceWidthPx: 1280,
    referenceHeightPx: 720,
    minimumScale: 0.62,
    maximumScale: 1,
    preferredRailScaleMultiplier: 0.52,
    neighborGapPx: 10,
    foundationWidthPx: 420,
    foundationHeightPx: 131.25,
    slotCenterRatios: Object.freeze([0.158, 0.335, 0.5, 0.665, 0.842]),
    slotSizePx: 70,
    detachedSlotGapPx: 8,
    detachedSlotFrameSizePx: 76,
    slotOffsetYPx: 4,
    iconSizePx: 38,
    bakedIconSizePx: 52,
    campfireIconWidthPx: 48,
    campfireIconHeightPx: 28,
    keyOffsetXPx: 0,
    keyOffsetYPx: 49,
    quantityOffsetXPx: 22,
    quantityOffsetYPx: -23,
    viewportMarginPx: 12,
    metricOffsetXPx: 113,
    metricOffsetYPx: -48,
    tooltipWidthPx: 440,
    tooltipHeightPx: 132,
    tooltipGapPx: 10,
    tooltipTitleOffsetYPx: -27,
    tooltipBodyOffsetYPx: 19,
    tooltipBodyWidthPx: 384,
    tooltipMinimumScreenScale: 0.78,
  }),
  presentation: Object.freeze({
    depth: 1960,
    tooltipDepth: 1980,
    dragDepth: 1990,
    readyAlpha: 1,
    unavailableAlpha: 0.64,
    unavailableTint: 0x8aa0b4,
    foundationAlpha: 1,
    tooltipAlpha: 0.98,
    dragScale: 1.08,
    activeScale: 1.04,
    activationPulseScale: 1.12,
    activationPulseMs: 150,
    keyFontSizePx: 18,
    quantityFontSizePx: 18,
    quantityTextColor: "#FFD39B",
    lockFontSizePx: 8,
    metricFontSizePx: 18,
    metricShadowThicknessPx: 2,
    tooltipTitleFontSizePx: 18,
    tooltipBodyFontSizePx: 14,
    textColor: "#F4E8C8",
    secondaryTextColor: "#D7DFE6",
    gpMetricColor: "#72DBFF",
    damageMetricColor: "#F3C66B",
    lockedTextColor: "#A5AFB8",
    shadowColor: "#02060A",
    shadowThicknessPx: 2,
  }),
  interaction: Object.freeze({
    dropRadiusPx: 38,
    pointerActivationSource: "pointer",
    keyboardActivationSource: "keyboard",
    dragSaveReason: "slot-swap",
  }),
  copy: Object.freeze({
    lockedPrefix: "Unlock: ",
    unavailable: "Not ready yet.",
    readyHint: "Click to use • Drag to reorder",
    persistenceError: "Your action-bar order could not be saved.",
  }),
});

const entryById = Object.freeze(
  entries.reduce((result, entry) => {
    result[entry.id] = entry;
    return result;
  }, {}),
);

export function getCelestialActionBarEntry(entryId) {
  return entryById[entryId] || null;
}

export function sanitizeCelestialActionBarOrder(source) {
  const requested = Array.isArray(source) ? source : [];
  const seen = new Set();
  const order = [];
  for (const entryId of requested) {
    if (!entryById[entryId] || seen.has(entryId)) continue;
    seen.add(entryId);
    order.push(entryId);
  }
  for (const entryId of CELESTIAL_ACTION_BAR_DEFAULT_ORDER) {
    if (seen.has(entryId)) continue;
    seen.add(entryId);
    order.push(entryId);
  }
  return order.slice(0, CELESTIAL_ACTION_BAR_CONFIG.slotCount);
}

export function isCelestialActionBarOrderValid(source) {
  if (!Array.isArray(source) || source.length !== CELESTIAL_ACTION_BAR_CONFIG.slotCount) {
    return false;
  }
  return sanitizeCelestialActionBarOrder(source)
    .every((entryId, index) => entryId === source[index]);
}
