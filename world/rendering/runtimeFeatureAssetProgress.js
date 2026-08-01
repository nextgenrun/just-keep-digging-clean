// Derives exact feature-group loading progress and telemetry from texture residency.
import { getRuntimeFeatureAssetGroup } from "./runtimeFeatureAssetGroups.js";

function emptyProgress(groupId) {
  return {
    groupId,
    status: "unavailable",
    ready: false,
    totalAssets: 0,
    loadedAssets: 0,
    pendingAssets: 0,
    progress: 0,
    error: null,
  };
}

function textureExists(manager, asset) {
  return Boolean(manager.scene.textures?.exists?.(asset.key));
}

export function getRuntimeFeatureGroupProgress(manager, groupId) {
  const definition = getRuntimeFeatureAssetGroup(groupId, manager.config);
  if (!definition?.assets.length) return emptyProgress(groupId);
  const record = manager.records.get(groupId);
  const totalAssets = definition.assets.length;
  const loadedAssets = definition.assets.reduce(
    (total, asset) => total + (textureExists(manager, asset) ? 1 : 0),
    0,
  );
  const ready = loadedAssets === totalAssets;
  const status = ready
    ? "ready"
    : record?.status === "ready"
      ? "missing"
      : record?.status || "idle";
  return {
    groupId,
    status,
    ready,
    totalAssets,
    loadedAssets,
    pendingAssets: Math.max(0, totalAssets - loadedAssets),
    progress: loadedAssets / totalAssets,
    error: record?.error?.message || null,
  };
}

export function getRuntimeFeatureManagerSnapshot(manager) {
  const groups = [...manager.records.values()].map(record => {
    const group = getRuntimeFeatureGroupProgress(
      manager,
      record.definition.id,
    );
    return {
      id: record.definition.id,
      status: group.status,
      consumers: record.consumers.size,
      pendingAssets: group.pendingAssets,
      loadedAssets: group.loadedAssets,
      totalAssets: group.totalAssets,
      progress: group.progress,
      managedTextures: record.loadedKeys.size,
      lastUsedAtMs: record.lastUsedAtMs,
    };
  });
  return {
    enabled: manager.enabled,
    groups,
    readyGroups: groups.filter(group => group.status === "ready").length,
    loadingGroups: groups.filter(group => group.status === "loading").length,
    pendingAssets: groups.reduce(
      (total, group) => total + group.pendingAssets,
      0,
    ),
    evictions: manager.evictions,
    failedGroups: manager.failedGroups,
    cancelledGroups: manager.cancelledGroups,
  };
}
