import {
  WORLD_BACKGROUND_MASTER_TEST,
  resolveWorldBackgroundMasterEnabled,
} from "../../values/worldBackgroundMasterTest.js";
import { V11_POLISHED_SURFACE_RUNTIME_MANIFEST } from "../../values/v11PolishedSurfaceRuntimeManifest.js";
import { V11_DEPTH_BACKGROUND_RUNTIME_MANIFEST } from "../../values/v11DepthBackgroundRuntimeManifest.js";
import { WORLD_SCENIC_FACADE } from "../../values/worldScenicFacade.js";
import {
  performanceNow,
  recordPerformanceSpan,
} from "../../systems/health/performanceTelemetryBridge.js";
import { buildWorldDepthContinuationEntries } from "./WorldDepthContinuationBuilder.js";
import { WorldBackgroundTextureStream } from "./WorldBackgroundTextureStream.js";
import { WorldBackgroundVisibilityIndex } from "./WorldBackgroundVisibilityIndex.js";

export class WorldBackgroundMasterSystem {
  constructor(
    scene,
    config = WORLD_BACKGROUND_MASTER_TEST,
    manifest = V11_POLISHED_SURFACE_RUNTIME_MANIFEST,
    depthManifest = V11_DEPTH_BACKGROUND_RUNTIME_MANIFEST
  ) {
    this.scene = scene;
    this.config = config;
    this.manifest = manifest;
    const continuation = buildWorldDepthContinuationEntries(
      depthManifest,
      config.depthContinuation,
      WORLD_SCENIC_FACADE
    );
    const entries = [...(manifest.objects || []), ...(depthManifest.objects || []), ...continuation];
    this.objects = entries.map((entry, index) => ({
      entry,
      index,
      runtimeId: entry.id || `v11-background-${index}`,
    }));
    this.activeObjects = [];
    this.enabled = false;
    this.depthEnabled = false;
    this.universeSkyEnabled = false;
    this.runtimeCropFill = null;
    this.visibility = new WorldBackgroundVisibilityIndex(scene, config, manifest);
    this.streamSchedulerEnabled = this.resolveStreamSchedulerEnabled();
    this.performanceState = {
      updates: 0,
      skippedUpdates: 0,
      candidateChecks: 0,
      queuedTextures: 0,
      lastCandidateCount: 0,
      lastNeededCount: 0,
      lastDurationMs: 0,
      maxDurationMs: 0,
    };
    this.textureStream = new WorldBackgroundTextureStream(
      scene,
      config,
      this.visibility,
      {
        getActiveObjects: () => this.activeObjects,
        isDestroyed: () => this._destroyed,
        onBatchComplete: () => this.update({ force: true }),
        onTexturesQueued: count => {
          this.performanceState.queuedTextures += count;
        },
      },
    );
    this._destroyed = false;
  }
  create() {
    this.enabled = this.resolveEnabled();
    this.depthEnabled = this.resolveDepthEnabled();
    this.universeSkyEnabled = this.resolveUniverseSkyEnabled();
    this.activeObjects = this.objects.filter(({ entry }) =>
      entry.active !== false
      && (entry.scope !== "underground-depth" || this.depthEnabled)
      && (!this.universeSkyEnabled || !entry.name?.startsWith(this.config.replacedSkyObjectPrefix)));
    this.visibility.rebuild(this.activeObjects);
    if (!this.enabled || this.activeObjects.length === 0) {
      const reason = this.activeObjects.length === 0 ? "manifest has no active objects" : "rollback selected";
      console.info(`[WorldBackgroundMasterSystem] Disabled (${reason}); use ?worldMaster=1 to enable`);
      return false;
    }

    const cropBounds = this.getRuntimeCropBounds();
    const fill = this.config.runtimeCropFill;
    if (cropBounds && fill?.enabled) {
      this.runtimeCropFill = this.scene.add.rectangle(
        cropBounds.left, cropBounds.top,
        cropBounds.right - cropBounds.left, cropBounds.bottom - cropBounds.top,
        fill.color, fill.alpha
      ).setOrigin(0, 0).setDepth(fill.depth);
    }
    this._destroyed = false;
    this.scene.load.on("loaderror", this.handleLoadError, this);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.update();
    console.info(
      `[WorldBackgroundMasterSystem] Streaming ${this.activeObjects.length} polished v11 objects; `
      + `depth ${this.depthEnabled ? "enabled" : "disabled"}; `
      + `universe sky ${this.universeSkyEnabled ? "enabled" : "legacy"}; `
      + `stream scheduler ${this.streamSchedulerEnabled ? "enabled" : "legacy"}; `
      + "use ?worldMaster=0, ?worldDepthMaster=0, ?universeSky=0, "
      + "or ?worldStreamScheduler=0 to roll back"
    );
    return true;
  }
  resolveEnabled() {
    return resolveWorldBackgroundMasterEnabled(this.config);
  }
  resolveDepthEnabled() {
    const search = globalThis.location?.search || "";
    const value = new URLSearchParams(search).get(this.config.depthQueryParam)?.toLowerCase();
    if (value && this.config.queryDisableValues.includes(value)) return false;
    if (value && this.config.queryEnableValues.includes(value)) return true;
    return this.config.depthEnabled;
  }
  resolveUniverseSkyEnabled() {
    const search = globalThis.location?.search || "";
    const value = new URLSearchParams(search).get(this.config.universeSkyQueryParam)?.toLowerCase();
    if (value && this.config.queryDisableValues.includes(value)) return false;
    if (value && this.config.queryEnableValues.includes(value)) return true;
    return this.config.universeSkyEnabled;
  }

  resolveStreamSchedulerEnabled() {
    const scheduler = this.config.streamScheduler;
    if (!scheduler) return false;
    const search = globalThis.location?.search || "";
    const value = new URLSearchParams(search).get(scheduler.queryParam)?.toLowerCase();
    if (value && this.config.queryDisableValues.includes(value)) return false;
    if (value && this.config.queryEnableValues.includes(value)) return true;
    return scheduler.enabled;
  }

  update(options = {}) {
    if (!this.enabled || this._destroyed) return;
    const force = options === true || options.force === true;
    if (!this.visibility.shouldUpdate(this.activeObjects, this.streamSchedulerEnabled, force)) {
      this.performanceState.skippedUpdates += 1;
      return;
    }
    const startedAtMs = performanceNow();

    const loadBounds = this.getCameraBounds(
      this.config.preloadMarginTilesX,
      this.config.preloadMarginTilesY
    );
    const keepBounds = this.getCameraBounds(
      this.config.unloadMarginTilesX,
      this.config.unloadMarginTilesY
    );
    const candidates = this.getStreamingCandidates(loadBounds);
    const needed = candidates.filter(item => this.intersectsItem(item, loadBounds));

    this.syncLoadedObjects(needed);
    this.queueMissingTextures(needed);
    this.unloadDistantObjects(keepBounds);
    const durationMs = recordPerformanceSpan(
      this.config.streamScheduler.updateMetricName,
      startedAtMs,
      {
        candidates: candidates.length,
        needed: needed.length,
        active: this.activeObjects.length,
      },
    );
    this.performanceState.updates += 1;
    this.performanceState.candidateChecks += candidates.length;
    this.performanceState.lastCandidateCount = candidates.length;
    this.performanceState.lastNeededCount = needed.length;
    this.performanceState.lastDurationMs = durationMs;
    this.performanceState.maxDurationMs = Math.max(
      this.performanceState.maxDurationMs,
      durationMs,
    );
  }

  getCameraBounds(marginTilesX, marginTilesY) {
    return this.visibility.getCameraBounds(
      this.activeObjects,
      marginTilesX,
      marginTilesY,
    );
  }

  getRuntimeCropBounds() {
    this.visibility.ensure(this.activeObjects);
    return this.visibility.runtimeCropBounds;
  }

  getStreamingCandidates(bounds) {
    return this.visibility.getCandidates(
      this.activeObjects,
      bounds,
      this.streamSchedulerEnabled,
    );
  }

  getVisibilityIndex() {
    if (!this.visibility) {
      this.visibility = new WorldBackgroundVisibilityIndex(
        this.scene,
        this.config,
        this.manifest,
      );
    }
    return this.visibility;
  }

  getObjectRect(entry) {
    return this.getVisibilityIndex().getObjectRect(entry);
  }

  getObjectStyle(entry) {
    return this.getVisibilityIndex().getObjectStyle(entry);
  }

  intersects(entry, bounds) {
    return this.getVisibilityIndex().intersectsEntry(entry, bounds);
  }

  intersectsItem(item, bounds) {
    return this.getVisibilityIndex().intersectsItem(item, bounds);
  }

  syncLoadedObjects(items) {
    this.textureStream.syncLoadedObjects(items);
  }

  queueMissingTextures(items) {
    this.textureStream.queueMissingTextures(items, this.streamSchedulerEnabled);
  }

  handleLoadError(file) {
    this.textureStream.handleLoadError(file);
  }

  unloadDistantObjects(bounds) {
    this.textureStream.unloadDistantObjects(
      bounds,
      this.getStreamingCandidates(bounds),
    );
  }

  getPerformanceSnapshot() {
    return {
      schedulerEnabled: this.streamSchedulerEnabled,
      activeObjects: this.activeObjects.length,
      ...this.textureStream.snapshot(),
      ...this.performanceState,
    };
  }

  removeOwnedTexture(textureKey) {
    this.textureStream.removeOwnedTexture(textureKey);
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this.enabled = false;
    this.scene.load.off("loaderror", this.handleLoadError, this);
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.runtimeCropFill?.destroy();
    this.runtimeCropFill = null;
    this.textureStream.destroy();
    this.visibility.clear();
  }
}
