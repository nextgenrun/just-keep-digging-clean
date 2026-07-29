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
    footBottomYAtReferencePx: 485,
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
    footBottomYAtReferencePx: 478.5,
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
    footBottomYAtReferencePx: 481,
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
    footBottomYAtReferencePx: 465.5,
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
    footBottomYAtReferencePx: 471,
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
    footBottomYAtReferencePx: 458.514,
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
  assetBasePath: "sprites/npc/npc-v13-piskel-polished-activities/singles",
  assetVersion: "piskel-polished-activities-v2-20260728",
  baselineAssets: Object.freeze({
    staticBasePath: "sprites/npc/npc-v13-polished-baselines/static",
    videoBasePath: "sprites/npc/npc-v13-polished-baselines/video",
    assetVersion: "silhouette-chroma-polish-v1-20260728",
  }),
  activityIds: ACTIVITY_POSE_IDS,
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
    referenceCanvasSizePx: 512,
    groundContactSinkPx: 1.5,
    defaultGroundOffsetPx: 10,
    promptGapPx: 20,
    crossfadeInMs: 1400,
    crossfadeOutMs: 1650,
    visibleAlphaThreshold: 0.005,
  }),
  schedule: Object.freeze({
    maxSimultaneousActivities: 1,
    initialBaseDelayMs: 7000,
    initialStaggerMs: 2200,
    eventGapMinMs: 22000,
    eventGapMaxMs: 38000,
    townQuietGapMinMs: 7000,
    townQuietGapMaxMs: 12000,
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
    groundContactTolerancePx: 0.05,
    readyStage: "npc-activity-ready",
    missingAssetCode: "npc-activity-asset-missing",
    missingAssetSeverity: "warning",
  }),
  merchants: MERCHANTS,
});

export function resolveNpcGroundContact(
  merchantId,
  displaySizePx,
  config = NPC_ACTIVITY_CONFIG,
) {
  const merchant = config.merchants[merchantId];
  const referenceCanvasSizePx = config.render.referenceCanvasSizePx;
  const footBottomYAtReferencePx = merchant?.footBottomYAtReferencePx;
  const contactSinkPx = merchant?.groundContactSinkPx
    ?? config.render.groundContactSinkPx;
  const calibrated = Number.isFinite(displaySizePx)
    && displaySizePx > 0
    && Number.isFinite(referenceCanvasSizePx)
    && referenceCanvasSizePx > 0
    && Number.isFinite(footBottomYAtReferencePx)
    && footBottomYAtReferencePx >= 0
    && footBottomYAtReferencePx <= referenceCanvasSizePx
    && Number.isFinite(contactSinkPx);
  if (!calibrated) {
    const anchorOffsetPx = config.render.defaultGroundOffsetPx;
    return Object.freeze({
      calibrated: false,
      anchorOffsetPx,
      bottomPaddingPx: Math.max(0, anchorOffsetPx - (contactSinkPx || 0)),
      contactSinkPx: Number.isFinite(contactSinkPx) ? contactSinkPx : 0,
    });
  }
  const bottomPaddingPx = displaySizePx
    * (referenceCanvasSizePx - footBottomYAtReferencePx)
    / referenceCanvasSizePx;
  return Object.freeze({
    calibrated: true,
    anchorOffsetPx: bottomPaddingPx + contactSinkPx,
    bottomPaddingPx,
    contactSinkPx,
  });
}

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
    for (const poseId of config.activityIds) {
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
