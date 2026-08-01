const QUERY_ENABLE_VALUES = Object.freeze(["1", "on", "true"]);
const QUERY_DISABLE_VALUES = Object.freeze(["0", "off", "false"]);

export const RUNTIME_ASSET_LOAD_PRIORITIES = Object.freeze({
  audioMusic: 121,
  materialField: 120,
  skyCohesion: 119,
  depthBackdrop: 118,
  terrainVariation: 117,
  groundStructure: 116,
  undergroundDetail: 115,
  backdropEnhancer: 114,
  featureCampfire: 105,
  titanChamber: 100,
  worldFacade: 98,
  featureStarBlockFx: 92,
  audioVoice: 85,
  featureStarlight: 82,
  featureTitanArchive: 78,
  featureWorldMap: 76,
  heavenblocks: 30,
  audioPrefetch: 20,
  default: 50,
});

export const RUNTIME_ASSET_LOAD_OWNERS = Object.freeze({
  audioMusic: "audio-music",
  featureCampfire: "feature-campfire",
  materialField: "material-field",
  worldFacade: "world-facade",
  titanChamber: "titan-chamber",
  featureStarBlockFx: "feature-star-block-fx",
  depthBackdrop: "depth-backdrop",
  audioVoice: "audio-voice",
  featureStarlight: "feature-starlight",
  terrainVariation: "terrain-variation",
  featureTitanArchive: "feature-titan-archive",
  featureWorldMap: "feature-world-map",
  groundStructure: "ground-structure",
  skyCohesion: "sky-cohesion",
  undergroundDetail: "underground-detail",
  backdropEnhancer: "backdrop-enhancer",
  heavenblocks: "heavenblocks",
  default: "runtime",
});

export const RUNTIME_FEATURE_ASSET_GROUP_IDS = Object.freeze({
  starBlockFx: "star-block-fx",
  starlight: "starlight",
  titanArchive: "titan-archive",
  worldMap: "world-map",
  campfirePrefix: "campfire-tier:",
});

export const RUNTIME_FEATURE_ASSET_CONSUMERS = Object.freeze({
  starBlockProximity: "star-block-proximity",
  starReleasePrefix: "star-release-",
  pauseStarlight: "pause-starlight",
  pauseTitanArchive: "pause-titan-archive",
  pillarStarlight: "pillar-starlight",
  worldMap: "world-map-overlay",
});

export const RUNTIME_ASSET_LOADING = Object.freeze({
  schemaVersion: 3,
  enabled: true,
  queryParam: "runtimeAssetQueue",
  queryEnableValues: QUERY_ENABLE_VALUES,
  queryDisableValues: QUERY_DISABLE_VALUES,
  types: Object.freeze({
    audio: "audio",
    image: "image",
    video: "video",
  }),
  bitmapDecode: Object.freeze({
    enabled: true,
    queryParam: "runtimeAssetBitmap",
    queryEnableValues: QUERY_ENABLE_VALUES,
    queryDisableValues: QUERY_DISABLE_VALUES,
    fetchCache: "force-cache",
    fetchCredentials: "same-origin",
    idleTimeoutMs: 180,
    options: Object.freeze({
      imageOrientation: "none",
      premultiplyAlpha: "premultiply",
      colorSpaceConversion: "default",
    }),
  }),
  scheduling: Object.freeze({
    postRenderEvent: "postrender",
    framesBetweenActivations: 1,
    maxConcurrentLoads: 3,
    recentSampleLimit: 120,
  }),
  featureResidency: Object.freeze({
    enabled: true,
    queryParam: "runtimeFeatureAssets",
    queryEnableValues: QUERY_ENABLE_VALUES,
    queryDisableValues: QUERY_DISABLE_VALUES,
    releaseDelayMs: 5000,
    consumers: RUNTIME_FEATURE_ASSET_CONSUMERS,
    groups: Object.freeze({
      [RUNTIME_FEATURE_ASSET_GROUP_IDS.starBlockFx]: Object.freeze({
        owner: RUNTIME_ASSET_LOAD_OWNERS.featureStarBlockFx,
        priority: RUNTIME_ASSET_LOAD_PRIORITIES.featureStarBlockFx,
        releaseWhenUnused: false,
      }),
      [RUNTIME_FEATURE_ASSET_GROUP_IDS.starlight]: Object.freeze({
        owner: RUNTIME_ASSET_LOAD_OWNERS.featureStarlight,
        priority: RUNTIME_ASSET_LOAD_PRIORITIES.featureStarlight,
        releaseWhenUnused: true,
      }),
      [RUNTIME_FEATURE_ASSET_GROUP_IDS.titanArchive]: Object.freeze({
        owner: RUNTIME_ASSET_LOAD_OWNERS.featureTitanArchive,
        priority: RUNTIME_ASSET_LOAD_PRIORITIES.featureTitanArchive,
        releaseWhenUnused: true,
      }),
      [RUNTIME_FEATURE_ASSET_GROUP_IDS.worldMap]: Object.freeze({
        owner: RUNTIME_ASSET_LOAD_OWNERS.featureWorldMap,
        priority: RUNTIME_ASSET_LOAD_PRIORITIES.featureWorldMap,
        releaseWhenUnused: true,
      }),
      campfire: Object.freeze({
        owner: RUNTIME_ASSET_LOAD_OWNERS.featureCampfire,
        priority: RUNTIME_ASSET_LOAD_PRIORITIES.featureCampfire,
        releaseWhenUnused: true,
      }),
    }),
    starBlockPrefetch: Object.freeze({
      intervalMs: 750,
      radiusTiles: 48,
      consumerId: RUNTIME_FEATURE_ASSET_CONSUMERS.starBlockProximity,
    }),
  }),
  textureMemory: Object.freeze({
    estimatedBytesPerPixel: 4,
    bytesPerMiB: 1048576,
    // The measured tiered Boot baseline is roughly 552 MiB decoded. Leave
    // headroom for core world streaming, then evict closed feature views.
    highWatermarkBytes: 738197504,
    lowWatermarkBytes: 671088640,
    sampleIntervalMs: 1000,
  }),
  phaserLoader: Object.freeze({
    maxParallelDownloads: 4,
    completeEvent: "complete",
    errorEvent: "loaderror",
  }),
  priorities: RUNTIME_ASSET_LOAD_PRIORITIES,
  owners: RUNTIME_ASSET_LOAD_OWNERS,
});

function resolveFlag(feature, search) {
  const value = new URLSearchParams(search)
    .get(feature.queryParam)
    ?.trim()
    .toLowerCase();
  if (value && feature.queryDisableValues.includes(value)) return false;
  if (value && feature.queryEnableValues.includes(value)) return true;
  return feature.enabled;
}

export function resolveRuntimeAssetQueueEnabled(
  config = RUNTIME_ASSET_LOADING,
  search = globalThis.location?.search || ""
) {
  return resolveFlag(config, search);
}

export function resolveRuntimeAssetBitmapDecodeEnabled(
  config = RUNTIME_ASSET_LOADING,
  search = globalThis.location?.search || ""
) {
  return resolveFlag(config.bitmapDecode, search);
}

export function resolveRuntimeFeatureAssetDeferralEnabled(
  config = RUNTIME_ASSET_LOADING,
  search = globalThis.location?.search || ""
) {
  return resolveRuntimeAssetQueueEnabled(config, search)
    && resolveFlag(config.featureResidency, search);
}

export function getCampfireFeatureAssetGroupId(level) {
  const safeLevel = Math.max(1, Math.min(10, Math.floor(Number(level) || 1)));
  return `${RUNTIME_FEATURE_ASSET_GROUP_IDS.campfirePrefix}${safeLevel}`;
}
