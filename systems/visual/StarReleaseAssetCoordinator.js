import { SkyStarReleaseView } from "./SkyStarReleaseView.js";
import {
  RUNTIME_FEATURE_ASSET_CONSUMERS,
  getStarRarityFeatureAssetGroupId,
  getStarReleaseFeatureAssetGroupId,
} from "../../values/runtimeAssetLoading.js";
import { STAR_CONSTELLATION_CONFIG } from "../../values/starConstellations.js";

function releaseLease(lease) {
  if (!lease || lease.released) return;
  lease.released = true;
  for (const groupId of lease.groupIds) {
    lease.manager.releaseGroup(groupId, lease.consumer);
  }
}

function createPickupDescriptor(entry, detail, position) {
  if (!detail?.progress) return null;
  return Object.freeze({
    textureKey: entry.textureKey,
    textureFrame: entry.textureFrame || null,
    lightTextureKey: entry.lightTextureKey || null,
    lightTextureFrame: entry.lightTextureFrame || null,
    displaySize: entry.displaySize,
    rarity: entry.rarity,
    identityIndex: entry.identityIndex,
    identityId: entry.identityId,
    resourceType: entry.resourceType,
    progress: Object.freeze({ ...detail.progress }),
    worldX: position.worldX,
    worldY: position.worldY,
  });
}

function present(system, detail, lease = null) {
  const entry = system._createSkyStarEntry(
    detail.startWorldX,
    detail.startWorldY,
    detail.rarity,
    detail.resourceType,
    detail.progress?.identityIndex,
  );
  if (!entry) {
    releaseLease(lease);
    return null;
  }

  const star = entry.graphic;
  const releaseView = new SkyStarReleaseView(system.scene);
  const discard = () => {
    const index = system.activeFloatingTexts.indexOf(star);
    if (index !== -1) system.activeFloatingTexts.splice(index, 1);
    system._activeSkyStarReleaseViews.delete(releaseView);
    releaseLease(lease);
  };

  const maximum = STAR_CONSTELLATION_CONFIG.collectedStarReleaseFx.maxActiveReleases;
  while (system._activeSkyStarReleaseViews.size >= maximum) {
    system._activeSkyStarReleaseViews.values().next().value?.destroy();
  }
  system._activeSkyStarReleaseViews.add(releaseView);
  const started = releaseView.play({
    entry,
    startWorldX: detail.startWorldX,
    startWorldY: detail.startWorldY,
    onComplete: discard,
    onVisible: detail.progress
      ? (position) => {
        const pickup = createPickupDescriptor(entry, detail, position);
        if (pickup) system._emitCollectedSkyStarPickup?.(pickup);
      }
      : null,
  });
  if (!started) {
    releaseView.destroy();
    if (star.active) star.destroy();
    discard();
    return null;
  }
  return releaseView;
}

export function showCollectedSkyStarReleaseWithAssets(system, detail) {
  const manager = system.scene?.runtimeFeatureAssetManager;
  if (!manager?.enabled) return present(system, detail);

  const groupIds = [
    getStarRarityFeatureAssetGroupId(detail.rarity),
    getStarReleaseFeatureAssetGroupId(detail.rarity),
  ];
  const consumer = `${RUNTIME_FEATURE_ASSET_CONSUMERS.starReleasePrefix}`
    + `${system._runtimeFeatureRequestSequence += 1}`;
  const lease = { manager, groupIds, consumer, released: false };
  const requests = groupIds.map(groupId => manager.ensureGroup(groupId, { consumer }));

  if (groupIds.every(groupId => manager.isReady(groupId))) {
    return present(system, detail, lease);
  }
  Promise.all(requests).then(results => {
    if (results.every(result => result.ready) && !system._destroyed && system.scene) {
      present(system, detail, lease);
    } else {
      releaseLease(lease);
    }
  });
  return null;
}
