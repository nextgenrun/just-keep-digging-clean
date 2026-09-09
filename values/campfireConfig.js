// Campfire upgrade tiers, consumable charges, and temporary blessing values.
export const CAMPFIRE_TIERS = Object.freeze([
  Object.freeze({ level: 1, label: "Tier I", cost: 0, durationMs: 60000, miningSpeedBonus: 0.05, xpBonus: 0.10, desc: "Basic warmth (60s)" }),
  Object.freeze({ level: 2, label: "Tier II", cost: 250, durationMs: 75000, miningSpeedBonus: 0.08, xpBonus: 0.15, desc: "Cozy fire (75s)" }),
  Object.freeze({ level: 3, label: "Tier III", cost: 750, durationMs: 90000, miningSpeedBonus: 0.10, xpBonus: 0.20, desc: "Warm glow (90s)" }),
  Object.freeze({ level: 4, label: "Tier IV", cost: 2500, durationMs: 120000, miningSpeedBonus: 0.12, xpBonus: 0.25, desc: "Steady flame (120s)" }),
  Object.freeze({ level: 5, label: "Tier V", cost: 8000, durationMs: 150000, miningSpeedBonus: 0.15, xpBonus: 0.30, desc: "Bright blaze (150s)" }),
  Object.freeze({ level: 6, label: "Tier VI", cost: 25000, durationMs: 180000, miningSpeedBonus: 0.18, xpBonus: 0.40, desc: "Roaring fire (180s)" }),
  Object.freeze({ level: 7, label: "Tier VII", cost: 75000, durationMs: 210000, miningSpeedBonus: 0.20, xpBonus: 0.50, desc: "Intense heat (210s)" }),
  Object.freeze({ level: 8, label: "Tier VIII", cost: 200000, durationMs: 240000, miningSpeedBonus: 0.25, xpBonus: 0.60, desc: "Inferno (240s)" }),
  Object.freeze({ level: 9, label: "Tier IX", cost: 500000, durationMs: 270000, miningSpeedBonus: 0.30, xpBonus: 0.75, desc: "Volcanic (270s)" }),
  Object.freeze({ level: 10, label: "Tier X", cost: 1250000, durationMs: 360000, miningSpeedBonus: 0.35, xpBonus: 0.90, desc: "Eternal flame (360s)" }),
]);

export const CAMPFIRE_BLESSINGS = Object.freeze([
  Object.freeze({
    type: "warmth",
    name: "Warmth",
    color: "#FF6633",
    desc: "+Mining Speed",
    icon: "torch",
    stat: "miningSpeedBonus",
    statLabel: "MINING SPEED",
  }),
  Object.freeze({
    type: "inspiration",
    name: "Inspiration",
    color: "#66AAFF",
    desc: "+XP Gain",
    icon: "stats",
    stat: "xpBonus",
    statLabel: "XP GAIN",
  }),
]);

const CAMPFIRE_REFILL_BASE_CHARGES = 1;
const CAMPFIRE_REFILL_MAXIMUM_CHARGES = 2;

export const CAMPFIRE_CONSUMABLE_CONFIG = Object.freeze({
  version: 2,
  startingCharges: CAMPFIRE_REFILL_BASE_CHARGES,
  maximumCharges: 999,
  chargesPerEmberOre: 1,
  defaultBlessingType: CAMPFIRE_BLESSINGS[0].type,
  refill: Object.freeze({
    baseCharges: CAMPFIRE_REFILL_BASE_CHARGES,
    emberDiscoveryIncrease: 1,
    maximumCharges: CAMPFIRE_REFILL_MAXIMUM_CHARGES,
    townRowRadiusTiles: 2,
    sources: Object.freeze({
      interaction: "campfire-interaction",
      townReturn: "town-return",
    }),
  }),
  saveReasons: Object.freeze({
    collected: "campfire-ember-collected",
    consumed: "campfire-charge-consumed",
    refilled: "campfire-charge-refilled",
  }),
  copy: Object.freeze({
    chargeLabel: "EMBER CHARGES",
    empty: "No Ember Charges left.",
    findHint: "Mine Ember Ore or sleep in the town bed to refill your Ember pouch.",
    oreHint: "Mine Ember Ore underground to add a charge. Look for rare glowing seams in deep cave walls.",
    firstDiscovery: "EMBER ORE POWERS THE CAMPFIRE",
    collected: "EMBER CHARGE ADDED",
    refilled: "EMBER CHARGES RESTORED",
    refillUpgraded: "CAMPFIRE REFILL INCREASED",
    refillLead: "Sleeping in the town bed restores at least",
    refillUpgradeLead: "Find Ember Ore underground in rare cave-wall seams to upgrade this refill to",
    refillComplete: "You found the Campfire refill upgrade.",
    consumeDetail: "Uses one Ember Charge. The blessing starts now and stays on the HUD until it ends.",
  }),
  feedback: Object.freeze({
    collectedColor: "#FF9A52",
    refilledColor: "#FFD39B",
    upgradedColor: "#FFB05E",
    activatedColor: "#FFD39B",
    durationMs: 1700,
  }),
});

export function describeCampfireRefill(refillCapacity) {
  const refill = CAMPFIRE_CONSUMABLE_CONFIG.refill;
  const capacity = Math.max(
    refill.baseCharges,
    Math.min(refill.maximumCharges, Math.floor(Number(refillCapacity) || 0)),
  );
  const useLabel = capacity === 1 ? "use" : "uses";
  const base = `${CAMPFIRE_CONSUMABLE_CONFIG.copy.refillLead} ${capacity} ${useLabel}.`;
  if (capacity >= refill.maximumCharges) {
    return `${base} ${CAMPFIRE_CONSUMABLE_CONFIG.copy.refillComplete}`;
  }
  return `${base} ${CAMPFIRE_CONSUMABLE_CONFIG.copy.refillUpgradeLead} `
    + `${refill.maximumCharges} uses.`;
}

export function getCampfireBlessingPresentation(type, level = 1) {
  const blessing = CAMPFIRE_BLESSINGS.find(entry => entry.type === type)
    || CAMPFIRE_BLESSINGS[0];
  const tierIndex = Math.max(0, Math.min(
    CAMPFIRE_TIERS.length - 1,
    Math.floor(Number(level) || 1) - 1,
  ));
  const tier = CAMPFIRE_TIERS[tierIndex];
  const bonusPercent = Math.round((Number(tier[blessing.stat]) || 0) * 100);
  return Object.freeze({
    ...blessing,
    bonusPercent,
    effectText: `+${bonusPercent}% ${blessing.statLabel.toLowerCase()}`,
  });
}

const CAMPFIRE_BLESSING_TYPES = new Set(
  CAMPFIRE_BLESSINGS.map(blessing => blessing.type),
);

export function sanitizeCampfireData(value) {
  const level = Number.isFinite(value?.level) ? Math.floor(value.level) : 1;
  const charges = Number.isFinite(value?.charges)
    ? Math.floor(value.charges)
    : CAMPFIRE_CONSUMABLE_CONFIG.startingCharges;
  const refill = CAMPFIRE_CONSUMABLE_CONFIG.refill;
  const inferredRefillCapacity = charges > refill.baseCharges
    ? refill.maximumCharges
    : refill.baseCharges;
  const refillCapacity = Number.isFinite(value?.refillCapacity)
    ? Math.floor(value.refillCapacity)
    : inferredRefillCapacity;
  const selectedBuffType = CAMPFIRE_BLESSING_TYPES.has(value?.selectedBuffType)
    ? value.selectedBuffType
    : CAMPFIRE_CONSUMABLE_CONFIG.defaultBlessingType;
  return {
    version: CAMPFIRE_CONSUMABLE_CONFIG.version,
    level: Math.max(1, Math.min(CAMPFIRE_TIERS.length, level)),
    charges: Math.max(0, Math.min(CAMPFIRE_CONSUMABLE_CONFIG.maximumCharges, charges)),
    refillCapacity: Math.max(
      refill.baseCharges,
      Math.min(refill.maximumCharges, refillCapacity),
    ),
    selectedBuffType,
    ...(value?.hasRested === true ? { hasRested: true } : {}),
    ...(CAMPFIRE_BLESSING_TYPES.has(value?.activeBuff?.type) && Number.isFinite(value?.activeBuff?.remainingMs)
      && value.activeBuff.remainingMs > 0 ? { activeBuff: { type: value.activeBuff.type,
        remainingMs: Math.min(CAMPFIRE_TIERS[Math.max(0, Math.min(CAMPFIRE_TIERS.length - 1, level - 1))].durationMs,
          value.activeBuff.remainingMs) } } : {}),
  };
}

export const CAMPFIRE_CONFIG = Object.freeze({
  // Four tiles beyond the last merchant, inside the grounded Worldroot hearth
  // and before the Titan promenade begins.
  surfaceTileX: 21,
  inputActions: Object.freeze({
    interact: "interact",
    previousBlessing: "aimUp",
    nextBlessing: "aimDown",
  }),
  spriteBasePath: "sprites/npc/campfire/worldroot-v2/runtime",
  persistence: Object.freeze({
    slotKeyPrefix: "jkd-campfire-level-slot-",
    legacyKey: "jkd-campfire-level",
  }),
  runtimeResidency: Object.freeze({
    consumerId: "campfire-current",
  }),
  spriteKeys: Object.freeze([
    "campfire-worldroot-v2-tier-01", "campfire-worldroot-v2-tier-02",
    "campfire-worldroot-v2-tier-03", "campfire-worldroot-v2-tier-04",
    "campfire-worldroot-v2-tier-05", "campfire-worldroot-v2-tier-06",
    "campfire-worldroot-v2-tier-07", "campfire-worldroot-v2-tier-08",
    "campfire-worldroot-v2-tier-09", "campfire-worldroot-v2-tier-10",
  ]),
  groundOverlapPx: 1,
  heightByLevelTiles: Object.freeze([
    0.45, 0.57, 0.70, 0.84, 0.99,
    1.15, 1.31, 1.47, 1.64, 1.82,
  ]),
  expirationFeedback: Object.freeze({
    warningMs: 10000,
    warningText: "Campfire blessing fades in 10 seconds",
    warningDurationMs: 1800,
    expiredText: "Campfire blessing faded",
    expiredDurationMs: 1800,
  }),
});

export function getCampfireTierAsset(level, config = CAMPFIRE_CONFIG) {
  const normalized = sanitizeCampfireData({ level });
  const index = normalized.level - 1;
  const tier = String(normalized.level).padStart(2, "0");
  return Object.freeze({
    key: config.spriteKeys[index],
    path: `${config.spriteBasePath}/campfire-tier-${tier}.png`,
  });
}

export function getCampfireWorldLoadAssets(level, config = CAMPFIRE_CONFIG) {
  const current = getCampfireTierAsset(level, config);
  const next = getCampfireTierAsset(Math.min(CAMPFIRE_TIERS.length, level + 1), config);
  return current.key === next.key ? [current] : [current, next];
}

export function getCampfireStorageKey(saveSlot, config = CAMPFIRE_CONFIG) {
  const slot = Number.isInteger(Number(saveSlot)) && Number(saveSlot) > 0
    ? Math.floor(Number(saveSlot))
    : 1;
  return `${config.persistence.slotKeyPrefix}${slot}`;
}

export function readStoredCampfireLevel(
  saveSlot,
  storage = globalThis.localStorage,
  config = CAMPFIRE_CONFIG,
) {
  if (!storage?.getItem) return 1;
  const slot = Math.max(1, Math.floor(Number(saveSlot) || 1));
  const storageKey = getCampfireStorageKey(slot, config);
  try {
    let saved = storage.getItem(storageKey);
    if (!saved && slot === 1) {
      saved = storage.getItem(config.persistence.legacyKey);
    }
    return sanitizeCampfireData({ level: Number.parseInt(saved, 10) }).level;
  } catch {
    return 1;
  }
}
