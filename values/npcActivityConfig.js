const freezeMerchant = merchant => Object.freeze({
  ...merchant,
  durationsMs: Object.freeze(merchant.durationsMs),
});

const sharedDurations = Object.freeze({
  work: 6200,
  rare: 5200,
  player: 5600,
  inspect: 6000,
  habit: 6400,
  signature: 6800,
  showcase: 6500,
});

const QUIET_FRAME_IDS = Object.freeze([
  "quiet0",
  "quiet1",
  "quiet2",
  "quiet3",
]);

const ACTIVITY_POSE_IDS = Object.freeze([
  "work",
  "rare",
  "player",
  "inspect",
  "habit",
  "signature",
  "showcase",
]);

const MERCHANTS = Object.freeze({
  playerUpgrades: freezeMerchant({
    assetSlug: "player-upgrades",
    groundOffsetPx: 8,
    durationsMs: {
      ...sharedDurations,
      work: 6000,
      rare: 5000,
      player: 5400,
      inspect: 5700,
      signature: 6500,
      showcase: 6100,
    },
  }),
  gearMerchant: freezeMerchant({
    assetSlug: "gear-merchant",
    groundOffsetPx: 9,
    durationsMs: {
      ...sharedDurations,
      work: 6600,
      rare: 5400,
      player: 5800,
      inspect: 6200,
      habit: 6500,
      showcase: 6700,
    },
  }),
  boboMerchant: freezeMerchant({
    assetSlug: "bobo-merchant",
    groundOffsetPx: 9,
    durationsMs: {
      ...sharedDurations,
      work: 6000,
      rare: 5200,
      player: 5400,
      inspect: 5600,
      habit: 6100,
      signature: 6300,
      showcase: 5800,
    },
  }),
  moneyMonster: freezeMerchant({
    assetSlug: "money-monster",
    groundOffsetPx: 12,
    durationsMs: {
      ...sharedDurations,
      work: 6300,
      rare: 5600,
      player: 5400,
      habit: 6100,
      signature: 6500,
      showcase: 6200,
    },
  }),
  gemPowerMerchant: freezeMerchant({
    assetSlug: "gem-power-merchant",
    groundOffsetPx: 11,
    durationsMs: {
      ...sharedDurations,
      work: 7000,
      rare: 5800,
      player: 5900,
      inspect: 6400,
      habit: 6800,
      signature: 6900,
      showcase: 6700,
    },
  }),
  magmaMoneyMonster: freezeMerchant({
    assetSlug: "magma-money-monster",
    groundOffsetPx: 8,
    durationsMs: {
      ...sharedDurations,
      work: 6800,
      rare: 5700,
      player: 5800,
      inspect: 6300,
      habit: 6700,
      signature: 7000,
      showcase: 6600,
    },
  }),
});

export const NPC_ACTIVITY_CONFIG = Object.freeze({
  enabled: true,
  assetBasePath: "sprites/npc/npc-v11-piskel-motion-idles/singles",
  assetVersion: "piskel-rooted-motion-v1-20260726",
  activityIds: Object.freeze([
    "quiet",
    ...ACTIVITY_POSE_IDS,
  ]),
  poseAssetIds: Object.freeze([
    ...QUIET_FRAME_IDS,
    ...ACTIVITY_POSE_IDS,
  ]),
  quietFrameIds: QUIET_FRAME_IDS,
  ambientActivityIds: Object.freeze(
    ACTIVITY_POSE_IDS.filter(activityId => activityId !== "player"),
  ),
  queries: Object.freeze({
    activities: "npcActivities",
    enableValues: Object.freeze(["1", "on", "true"]),
    disableValues: Object.freeze(["0", "off", "false"]),
  }),
  render: Object.freeze({
    displayScale: 1.55,
    depth: 15,
    activityDepthOffset: 0.01,
    defaultGroundOffsetPx: 10,
    promptGapPx: 20,
    crossfadeInMs: 1150,
    crossfadeOutMs: 1350,
    visibleAlphaThreshold: 0.005,
  }),
  quietLoop: Object.freeze({
    sequence: Object.freeze([
      "quiet0",
      "quiet1",
      "quiet2",
      "quiet3",
      "quiet2",
      "quiet1",
    ]),
    frameDurationsMs: Object.freeze([
      2200,
      900,
      900,
      1100,
      900,
      900,
    ]),
    transitionMs: 520,
    initialHoldMinMs: 900,
    initialHoldMaxMs: 2400,
    loopGapMinMs: 1600,
    loopGapMaxMs: 3600,
    maxFramesPerUpdate: 8,
  }),
  schedule: Object.freeze({
    maxSimultaneousActivities: 1,
    initialBaseDelayMs: 4800,
    initialStaggerMs: 1600,
    eventGapMinMs: 18000,
    eventGapMaxMs: 32000,
    townQuietGapMinMs: 5000,
    townQuietGapMaxMs: 9000,
    playerReactionRangeTiles: 4,
    playerReactionCooldownMs: 18000,
    weights: Object.freeze({
      work: 0.24,
      rare: 0.04,
      inspect: 0.22,
      habit: 0.2,
      signature: 0.17,
      showcase: 0.13,
    }),
  }),
  performance: Object.freeze({
    maxDeltaMs: 50,
    healthPublishIntervalMs: 1000,
  }),
  health: Object.freeze({
    globalKey: "__jkdNpcActivity",
    expectedActorCount: 6,
    anchorTolerancePx: 0.001,
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

export function getNpcActivityPreloadAssets(
  activityKeys,
  config = NPC_ACTIVITY_CONFIG,
) {
  const assets = [];
  for (const [merchantId, merchant] of Object.entries(config.merchants)) {
    for (const poseId of config.poseAssetIds) {
      const key = activityKeys?.[merchantId]?.[poseId];
      if (!key) continue;
      assets.push(Object.freeze({
        key,
        path: `${config.assetBasePath}/${merchant.assetSlug}-${poseId}.webp`
          + `?v=${config.assetVersion}`,
      }));
    }
  }
  return Object.freeze(assets);
}
