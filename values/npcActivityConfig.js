const freezeMerchant = merchant => Object.freeze({
  ...merchant,
  durationsMs: Object.freeze(merchant.durationsMs),
});

const MERCHANTS = Object.freeze({
  playerUpgrades: freezeMerchant({
    assetSlug: "player-upgrades",
    groundOffsetPx: 8,
    quietCycleMs: 5200,
    breathPhase: 0.08,
    roamTiles: 0.28,
    durationsMs: { work: 2500, rare: 2300, player: 2200 },
  }),
  gearMerchant: freezeMerchant({
    assetSlug: "gear-merchant",
    groundOffsetPx: 9,
    quietCycleMs: 6100,
    breathPhase: 0.29,
    roamTiles: 0.3,
    durationsMs: { work: 2900, rare: 2400, player: 2400 },
  }),
  boboMerchant: freezeMerchant({
    assetSlug: "bobo-merchant",
    groundOffsetPx: 9,
    quietCycleMs: 4700,
    breathPhase: 0.52,
    roamTiles: 0.3,
    durationsMs: { work: 2700, rare: 2100, player: 2200 },
  }),
  moneyMonster: freezeMerchant({
    assetSlug: "money-monster",
    groundOffsetPx: 12,
    quietCycleMs: 5600,
    breathPhase: 0.71,
    roamTiles: 0.3,
    durationsMs: { work: 2700, rare: 2500, player: 2300 },
  }),
  gemPowerMerchant: freezeMerchant({
    assetSlug: "gem-power-merchant",
    groundOffsetPx: 11,
    quietCycleMs: 6300,
    breathPhase: 0.87,
    roamTiles: 0.34,
    durationsMs: { work: 3100, rare: 2500, player: 2500 },
  }),
  magmaMoneyMonster: freezeMerchant({
    assetSlug: "magma-money-monster",
    groundOffsetPx: 8,
    quietCycleMs: 6800,
    breathPhase: 0.41,
    roamTiles: 0.18,
    durationsMs: { work: 3000, rare: 2500, player: 2400 },
  }),
});

export const NPC_ACTIVITY_CONFIG = Object.freeze({
  enabled: true,
  walkingEnabled: true,
  assetBasePath: "sprites/npc/npc-v8-activities/singles",
  assetVersion: "approved-v1-20260726",
  activityIds: Object.freeze(["quiet", "work", "rare", "player"]),
  queries: Object.freeze({
    activities: "npcActivities",
    walking: "npcWalking",
    enableValues: Object.freeze(["1", "on", "true"]),
    disableValues: Object.freeze(["0", "off", "false"]),
  }),
  render: Object.freeze({
    displayScale: 1.55,
    depth: 15,
    activityDepthOffset: 0.01,
    defaultGroundOffsetPx: 10,
    promptGapPx: 20,
    crossfadeMs: 220,
    visibleAlphaThreshold: 0.005,
  }),
  schedule: Object.freeze({
    maxSimultaneousActivities: 2,
    initialBaseDelayMs: 900,
    initialStaggerMs: 720,
    eventGapMinMs: 4200,
    eventGapMaxMs: 8800,
    playerReactionRangeTiles: 4,
    interactionSettleRangeTiles: 3,
    playerReactionCooldownMs: 12000,
    weights: Object.freeze({ work: 0.56, rare: 0.14, walk: 0.3 }),
  }),
  walk: Object.freeze({
    speedTilesPerSecond: 0.34,
    pauseMinMs: 720,
    pauseMaxMs: 1320,
    bobPx: 2.1,
    stepHz: 3.25,
    leanDegrees: 1.6,
    squash: 0.018,
  }),
  motion: Object.freeze({
    quiet: Object.freeze({
      bobPx: 0.55,
      swayDegrees: 0.24,
      scaleX: -0.0025,
      scaleY: 0.006,
    }),
    work: Object.freeze({
      cycleMs: 1580,
      bobPx: 0.8,
      swayDegrees: 0.65,
      scaleX: 0.003,
      scaleY: 0.007,
    }),
    rare: Object.freeze({
      cycleMs: 640,
      bobPx: 1.8,
      swayDegrees: 1.7,
      scaleX: 0.009,
      scaleY: -0.012,
    }),
    player: Object.freeze({
      cycleMs: 1080,
      bobPx: 1.05,
      swayDegrees: 0.9,
      scaleX: 0.004,
      scaleY: 0.008,
    }),
  }),
  performance: Object.freeze({
    maxDeltaMs: 50,
    healthPublishIntervalMs: 1000,
  }),
  health: Object.freeze({
    globalKey: "__jkdNpcActivity",
    expectedActorCount: 6,
    readyStage: "npc-activity-ready",
    missingAssetCode: "npc-activity-asset-missing",
    missingAssetSeverity: "warning",
  }),
  merchants: MERCHANTS,
});

function resolveFlag(defaultValue, queryParam, search, config) {
  const value = new URLSearchParams(search).get(queryParam)?.trim().toLowerCase();
  if (value && config.queries.disableValues.includes(value)) return false;
  if (value && config.queries.enableValues.includes(value)) return true;
  return defaultValue;
}

export function resolveNpcActivitiesEnabled(
  config = NPC_ACTIVITY_CONFIG,
  search = globalThis.location?.search || "",
) {
  return resolveFlag(config.enabled, config.queries.activities, search, config);
}

export function resolveNpcWalkingEnabled(
  config = NPC_ACTIVITY_CONFIG,
  search = globalThis.location?.search || "",
) {
  return resolveNpcActivitiesEnabled(config, search)
    && resolveFlag(config.walkingEnabled, config.queries.walking, search, config);
}

export function getNpcActivityPreloadAssets(
  activityKeys,
  config = NPC_ACTIVITY_CONFIG,
) {
  const assets = [];
  for (const [merchantId, merchant] of Object.entries(config.merchants)) {
    for (const activityId of config.activityIds) {
      const key = activityKeys?.[merchantId]?.[activityId];
      if (!key) continue;
      assets.push(Object.freeze({
        key,
        path: `${config.assetBasePath}/${merchant.assetSlug}-${activityId}.webp`
          + `?v=${config.assetVersion}`,
      }));
    }
  }
  return Object.freeze(assets);
}
