import {
  performanceNow,
  recordPerformanceSpan,
} from "../../../systems/health/performanceTelemetryBridge.js";
import {
  WORLD_VISUAL_RUNTIME,
  WORLD_VISUAL_RUNTIME_MODES,
  resolveScenicStableWindowSchedulerEnabled,
} from "../../../values/worldVisualRuntime.js";

export class WorldVisualPerformanceTracker {
  constructor(runtimeConfig = WORLD_VISUAL_RUNTIME, {
    now = performanceNow,
    spanRecorder = recordPerformanceSpan,
  } = {}) {
    const schedulerConfig = runtimeConfig.streaming.stableWindowScheduler;
    this.schedulerEnabled = resolveScenicStableWindowSchedulerEnabled(schedulerConfig);
    this.metricName = schedulerConfig.syncMetricName;
    this.now = now;
    this.spanRecorder = spanRecorder;
    this.windowChecks = 0;
    this.syncs = 0;
    this.skippedSyncs = 0;
    this.forcedSyncs = 0;
    this.tileInvalidations = 0;
    this.lastSyncMs = null;
    this.maxSyncMs = 0;
    this.lastSignature = "";
    this.lastReduced = false;
    this.lastCellCount = 0;
    this.reducedMode = false;
    this.reduceBelowFps = runtimeConfig.streaming.reduceBelowFps;
    this.recoverReducedAboveFps = runtimeConfig.streaming.recoverReducedAboveFps
      ?? this.reduceBelowFps;
  }

  beginSync() {
    return this.now();
  }

  recordSkip(signature, reduced) {
    this.windowChecks += 1;
    this.skippedSyncs += 1;
    this.lastSignature = signature;
    this.lastReduced = reduced;
  }

  recordSync(startedAtMs, { bounds, signature, reduced, force }) {
    const cellCount = Math.max(0, bounds.right - bounds.left)
      * Math.max(0, bounds.bottom - bounds.top);
    const context = { cellCount, force, reduced };
    const durationMs = Math.max(0, this.now() - startedAtMs);
    this.spanRecorder(this.metricName, startedAtMs, context);
    this.windowChecks += 1;
    this.syncs += 1;
    if (force) this.forcedSyncs += 1;
    this.lastSyncMs = durationMs;
    this.maxSyncMs = Math.max(this.maxSyncMs, durationMs);
    this.lastSignature = signature;
    this.lastReduced = reduced;
    this.lastCellCount = cellCount;
  }

  recordTileInvalidation() {
    this.tileInvalidations += 1;
  }

  isReduced(
    scene,
    thresholdFps = this.reduceBelowFps,
    recoverAboveFps = this.recoverReducedAboveFps
  ) {
    const fps = Number(scene.game?.loop?.actualFps) || 60;
    const enterBelow = Number.isFinite(thresholdFps) ? thresholdFps : this.reduceBelowFps;
    const exitAbove = Number.isFinite(recoverAboveFps)
      ? Math.max(enterBelow, recoverAboveFps)
      : enterBelow;
    if (this.reducedMode) {
      if (fps >= exitAbove) this.reducedMode = false;
    } else if (fps < enterBelow) {
      this.reducedMode = true;
    }
    return this.reducedMode;
  }

  snapshotRuntime(runtime) {
    return this.snapshot({
      materialAssets: runtime.materialField?.assetCache?.getPerformanceSnapshot?.() || null,
      backdropAssets: runtime.depthBackdropStage?.assetCache?.getPerformanceSnapshot?.() || null,
      terrainAssets: runtime.terrainVariationLayer?.assetCache?.getPerformanceSnapshot?.() || null,
      groundStructureAssets:
        runtime.groundStructureLayer?.assetCache?.getPerformanceSnapshot?.() || null,
      skyAssets: runtime.skyCohesionLayer?.assetCache?.getPerformanceSnapshot?.() || null,
      demandStreamingEnabled:
        runtime.depthBackdropStage?.demandStreamingEnabled === true
        || runtime.terrainVariationLayer?.demandStreamingEnabled === true
        || runtime.groundStructureLayer?.demandStreamingEnabled === true,
      demandedAssetCounts: {
        backdrop: runtime.depthBackdropStage?.activeAssetKeys?.size || 0,
        terrain: runtime.terrainVariationLayer?.activeAssetKeys?.size || 0,
        groundStructures: runtime.groundStructureLayer?.activeAssetKeys?.size || 0,
      },
    });
  }

  snapshot({
    materialAssets = null,
    backdropAssets = null,
    terrainAssets = null,
    groundStructureAssets = null,
    skyAssets = null,
    demandStreamingEnabled = null,
    demandedAssetCounts = null,
  } = {}) {
    const assetCaches = [
      materialAssets,
      backdropAssets,
      terrainAssets,
      groundStructureAssets,
      skyAssets,
    ].filter(Boolean);
    const demandedAssets = demandedAssetCounts
      ? Object.values(demandedAssetCounts).reduce((total, count) => total + (count || 0), 0)
      : null;
    return {
      mode: WORLD_VISUAL_RUNTIME_MODES.scenic,
      schedulerEnabled: this.schedulerEnabled,
      windowChecks: this.windowChecks,
      syncs: this.syncs,
      skippedSyncs: this.skippedSyncs,
      forcedSyncs: this.forcedSyncs,
      tileInvalidations: this.tileInvalidations,
      lastSyncMs: this.lastSyncMs,
      maxSyncMs: this.maxSyncMs,
      lastSignature: this.lastSignature,
      reduced: this.lastReduced,
      lastCellCount: this.lastCellCount,
      assetsPending: assetCaches.reduce(
        (total, cache) => total + (cache.pendingAssets || 0),
        0
      ),
      assetsResident: assetCaches.reduce(
        (total, cache) => total
          + (cache.loadedAssets || 0)
          + (cache.retainedAssets || 0),
        0
      ),
      assetsCancelled: assetCaches.reduce(
        (total, cache) => total + (cache.cancelledLoads || 0),
        0
      ),
      demandStreamingEnabled,
      demandedAssets,
      demandedAssetCounts,
      materialAssets,
      backdropAssets,
      terrainAssets,
      groundStructureAssets,
      skyAssets,
    };
  }
}
