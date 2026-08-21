import {
  DEFAULT_GAMEPLAY_CAPABILITIES,
  GAMEPLAY_FEATURE_IDS,
} from "../../values/gameplayCapabilities.js";
import {
  RUNTIME_ASSET_LOADING,
  RUNTIME_ASSET_PACK_IDS,
  RUNTIME_ASSET_RESIDENCY_CLASSES,
} from "../../values/runtimeAssetLoading.js";

const OWNER_CAPABILITIES = Object.freeze({
  [RUNTIME_ASSET_LOADING.owners.levelTwo]: GAMEPLAY_FEATURE_IDS.LEVEL_TWO,
  [RUNTIME_ASSET_LOADING.owners.arcCore]: GAMEPLAY_FEATURE_IDS.ARC_CORES,
  [RUNTIME_ASSET_LOADING.owners.heavenblocks]: GAMEPLAY_FEATURE_IDS.HEAVENBLOCKS,
  [RUNTIME_ASSET_LOADING.owners.screenCapture]: GAMEPLAY_FEATURE_IDS.SCREEN_CAPTURE,
});

function inferPolicy(key, config) {
  const value = String(key || "").toLowerCase();
  if (/heavenblock|sky-altar/.test(value)) {
    return [config.owners.heavenblocks, GAMEPLAY_FEATURE_IDS.HEAVENBLOCKS, RUNTIME_ASSET_PACK_IDS.heavenblocks];
  }
  if (/arc-core|arccore|omega-core/.test(value)) {
    return [config.owners.arcCore, GAMEPLAY_FEATURE_IDS.ARC_CORES, RUNTIME_ASSET_PACK_IDS.arcCore];
  }
  if (/screen-record|screenrecord/.test(value)) {
    return [config.owners.screenCapture, GAMEPLAY_FEATURE_IDS.SCREEN_CAPTURE, RUNTIME_ASSET_PACK_IDS.screenCapture];
  }
  // Archive portraits are synchronous ESC-menu UI, even when a Titan name also
  // contains a gated world token such as "obsidian". Keep this specific policy
  // ahead of the broad Level Two matcher so presentation art never inherits a
  // gameplay capability by accident.
  if (/^titan-discovery-(?!chamber)/.test(value)) {
    return [config.owners.featureTitanArchive, null, "titan-archive"];
  }
  if (/level-?2|leveltwo|second-world|surface-hero|lava-dirt|obsidian|ember-ore|magma-crystal/.test(value)) {
    return [config.owners.levelTwo, GAMEPLAY_FEATURE_IDS.LEVEL_TWO, RUNTIME_ASSET_PACK_IDS.levelTwo];
  }
  if (/star-identity|star-block-(steady|pulse)|sky-star-(release|fracture)/.test(value)) {
    return [config.owners.starRarity, null, RUNTIME_ASSET_PACK_IDS.starRarity];
  }
  if (/celestial|wayward-star|hollow-sun|comet-engine/.test(value)) {
    return [config.owners.celestialThreshold, null, RUNTIME_ASSET_PACK_IDS.celestialThreshold];
  }
  if (/^(ual-|robot-|living-drill|char-v)/.test(value)) {
    return [config.owners.playerMode, null, RUNTIME_ASSET_PACK_IDS.playerModePrefix];
  }
  return [config.owners.bootCore, null, RUNTIME_ASSET_PACK_IDS.bootCore];
}

function normalizeDimensions(dimensions) {
  return Object.freeze({
    width: Math.max(0, Math.floor(Number(dimensions?.width) || 0)),
    height: Math.max(0, Math.floor(Number(dimensions?.height) || 0)),
  });
}

function getTextureDimensions(texture) {
  const source = texture?.source?.[0];
  const image = source?.image || texture?.getSourceImage?.() || null;
  return normalizeDimensions({
    width: source?.width || image?.width || image?.naturalWidth,
    height: source?.height || image?.height || image?.naturalHeight,
  });
}

function normalizeConsumers(value) {
  const entries = Array.isArray(value) ? value : value ? [value] : [];
  return Object.freeze([...new Set(entries.filter(entry => typeof entry === "string" && entry))]);
}

export class RuntimeAssetCatalog {
  constructor(
    capabilities = DEFAULT_GAMEPLAY_CAPABILITIES,
    config = RUNTIME_ASSET_LOADING,
  ) {
    this.capabilities = capabilities;
    this.config = config;
    this.descriptors = new Map();
    this.queueAttempts = 0;
    this.blockedQueueAttempts = 0;
    this.blockedOwners = new Set();
    this.blockedKeys = new Set();
  }

  register(asset, metadata = {}) {
    if (!asset?.key) return null;
    const previous = this.descriptors.get(asset.key);
    const inferred = inferPolicy(asset.key, this.config);
    const owner = metadata.owner || previous?.owner || inferred[0];
    const capability = Object.prototype.hasOwnProperty.call(metadata, "capability")
      ? metadata.capability
      : previous?.capability ?? OWNER_CAPABILITIES[owner] ?? inferred[1];
    const descriptor = Object.freeze({
      key: asset.key,
      path: asset.path || previous?.path || null,
      type: asset.type || previous?.type || this.config.types.image,
      owner,
      capability,
      dimensions: normalizeDimensions(metadata.dimensions || previous?.dimensions),
      priority: Number.isFinite(metadata.priority)
        ? metadata.priority
        : previous?.priority ?? this.config.priorities.default,
      residencyClass: metadata.residencyClass || previous?.residencyClass
        || RUNTIME_ASSET_RESIDENCY_CLASSES.boot,
      packId: metadata.packId || previous?.packId || inferred[2],
      consumers: normalizeConsumers(metadata.consumers || previous?.consumers),
      managed: metadata.managed ?? previous?.managed ?? false,
    });
    this.descriptors.set(descriptor.key, descriptor);
    return descriptor;
  }

  registerMany(assets, metadata = {}) {
    return (Array.isArray(assets) ? assets : [])
      .map(asset => this.register(asset, metadata))
      .filter(Boolean);
  }

  registerQueuedAsset(asset, metadata = {}) {
    this.queueAttempts += 1;
    const descriptor = this.register(asset, metadata);
    if (!descriptor || this.isAllowed(descriptor)) return descriptor;
    this.blockedQueueAttempts += 1;
    this.blockedOwners.add(descriptor.owner);
    this.blockedKeys.add(descriptor.key);
    return null;
  }

  isAllowed(assetOrDescriptor) {
    const descriptor = typeof assetOrDescriptor === "string"
      ? this.descriptors.get(assetOrDescriptor)
      : assetOrDescriptor?.owner ? assetOrDescriptor : this.register(assetOrDescriptor);
    return Boolean(
      descriptor
      && (!descriptor.capability || this.capabilities?.isEnabled?.(descriptor.capability) === true),
    );
  }

  get(key) {
    return this.descriptors.get(key) || null;
  }

  updateDimensions(key, dimensions) {
    const current = this.descriptors.get(key);
    if (!current) return null;
    return this.register(current, { ...current, dimensions });
  }

  adoptTextureManager(textureManager) {
    const keys = textureManager?.getTextureKeys?.();
    if (!Array.isArray(keys)) return 0;
    let adopted = 0;
    for (const key of keys) {
      const texture = textureManager.get?.(key);
      const current = this.descriptors.get(key);
      this.register(current || { key }, {
        ...current,
        dimensions: getTextureDimensions(texture),
      });
      adopted += 1;
    }
    return adopted;
  }

  adoptIntoTracker(tracker, textureManager) {
    this.adoptTextureManager(textureManager);
    let adopted = 0;
    for (const descriptor of this.descriptors.values()) {
      if (!textureManager?.exists?.(descriptor.key)) continue;
      tracker.register(descriptor.key, descriptor);
      adopted += 1;
    }
    return adopted;
  }

  getSnapshot(textureManager = null) {
    const residentKeys = textureManager?.getTextureKeys?.() || [];
    const untrackedKeys = Array.isArray(residentKeys)
      ? residentKeys.filter(key => !this.descriptors.has(key))
      : [];
    const gatedResidentOwners = new Set();
    const gatedResidentKeys = [];
    for (const key of residentKeys) {
      const descriptor = this.descriptors.get(key);
      if (descriptor && !this.isAllowed(descriptor)) {
        gatedResidentOwners.add(descriptor.owner);
        gatedResidentKeys.push(key);
      }
    }
    return Object.freeze({
      profileId: this.capabilities?.profileId || "unknown",
      descriptors: this.descriptors.size,
      queueAttempts: this.queueAttempts,
      blockedQueueAttempts: this.blockedQueueAttempts,
      blockedOwners: Object.freeze([...this.blockedOwners].sort()),
      blockedKeys: Object.freeze([...this.blockedKeys].sort()),
      gatedResidentOwners: Object.freeze([...gatedResidentOwners].sort()),
      gatedResidentKeys: Object.freeze(gatedResidentKeys.sort()),
      untrackedTextures: untrackedKeys.length,
    });
  }
}
