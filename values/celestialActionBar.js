// ==================== CELESTIAL ACTION BAR ====================
// Pure five-slot presentation, ordering, interaction, and copy contract.

export const CELESTIAL_ACTION_BAR_ENTRY_IDS = Object.freeze({
  QUICK_SLASH: "quickslash",
  THUNDER_STRIKE: "thunderStrike",
  WAYWARD_STAR: "wayward-star",
  HOLLOW_SUN: "hollow-sun",
  COMET_ENGINE: "comet-engine",
});

export const CELESTIAL_ACTION_BAR_DEFAULT_ORDER = Object.freeze([
  CELESTIAL_ACTION_BAR_ENTRY_IDS.QUICK_SLASH,
  CELESTIAL_ACTION_BAR_ENTRY_IDS.THUNDER_STRIKE,
  CELESTIAL_ACTION_BAR_ENTRY_IDS.WAYWARD_STAR,
  CELESTIAL_ACTION_BAR_ENTRY_IDS.HOLLOW_SUN,
  CELESTIAL_ACTION_BAR_ENTRY_IDS.COMET_ENGINE,
]);

export const CELESTIAL_ACTION_BAR_ASSET_KEYS = Object.freeze({
  foundation: "celestial-actionbar-foundation-v2",
  quickslash: "celestial-actionbar-quickslash-v1",
  thunderStrike: "celestial-actionbar-thunderstrike-v1",
  lock: "celestial-actionbar-lock-v1",
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
    key: CELESTIAL_ACTION_BAR_ASSET_KEYS.lock,
    path: "sprites/UI/starlight-talent-tree-v4/bobo-lock-seal-v2.png",
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
    description: "Begin the exact-timing thunder chain.",
  }),
  Object.freeze({
    id: CELESTIAL_ACTION_BAR_ENTRY_IDS.WAYWARD_STAR,
    label: "WAYWARD STAR",
    shortLabel: "WAYWARD",
    assetRole: "waywardStar",
    accent: 0x65e8ff,
    unlockCondition: "Attune Wayward Star at the Star Pillar.",
    description: "Release and redirect the ricocheting Celestial Engine.",
  }),
  Object.freeze({
    id: CELESTIAL_ACTION_BAR_ENTRY_IDS.HOLLOW_SUN,
    label: "HOLLOW SUN",
    shortLabel: "HOLLOW",
    assetRole: "hollowSun",
    accent: 0xa96dff,
    unlockCondition: "Attune Hollow Sun at the Star Pillar.",
    description: "Place a gravity Engine that collapses into an implosion.",
  }),
  Object.freeze({
    id: CELESTIAL_ACTION_BAR_ENTRY_IDS.COMET_ENGINE,
    label: "COMET ENGINE",
    shortLabel: "COMET",
    assetRole: "cometEngine",
    accent: 0xffc85c,
    unlockCondition: "Attune Comet Engine at the Star Pillar.",
    description: "Launch the short, protected-tile-safe tunnel Engine.",
  }),
]);

export const CELESTIAL_ACTION_BAR_CONFIG = Object.freeze({
  saveVersion: 1,
  slotCount: 5,
  entries,
  layout: Object.freeze({
    referenceWidthPx: 1280,
    referenceHeightPx: 720,
    minimumScale: 0.62,
    maximumScale: 1,
    foundationWidthPx: 420,
    foundationHeightPx: 131.25,
    slotCenterRatios: Object.freeze([0.158, 0.335, 0.5, 0.665, 0.842]),
    slotSizePx: 62,
    slotOffsetYPx: 4,
    iconSizePx: 38,
    lockIconWidthPx: 32,
    lockIconHeightPx: 45,
    keyOffsetXPx: 0,
    keyOffsetYPx: 49,
    xpGapPx: 5,
    viewportMarginPx: 12,
    metricOffsetXPx: 113,
    metricOffsetYPx: -48,
    tooltipWidthPx: 356,
    tooltipHeightPx: 82,
    tooltipGapPx: 8,
    tooltipTitleOffsetYPx: -18,
    tooltipBodyOffsetYPx: 11,
    tooltipBodyWidthPx: 308,
  }),
  presentation: Object.freeze({
    depth: 1960,
    tooltipDepth: 1980,
    dragDepth: 1990,
    readyAlpha: 1,
    unavailableAlpha: 0.64,
    lockedAlpha: 0.34,
    lockedTint: 0x66717d,
    unavailableTint: 0x8aa0b4,
    foundationAlpha: 1,
    tooltipAlpha: 0.98,
    dragScale: 1.08,
    activeScale: 1.04,
    activationPulseScale: 1.12,
    activationPulseMs: 150,
    keyFontSizePx: 12,
    lockFontSizePx: 8,
    metricFontSizePx: 10,
    metricShadowThicknessPx: 2,
    tooltipTitleFontSizePx: 13,
    tooltipBodyFontSizePx: 10,
    textColor: "#F4E8C8",
    secondaryTextColor: "#AFC4D2",
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
    lockedLabel: "LOCKED",
    lockedPrefix: "Unlock: ",
    unavailable: "Currently unavailable.",
    readyHint: "Click to activate. Drag to reorder.",
    persistenceError: "Actionbar order could not be saved.",
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
