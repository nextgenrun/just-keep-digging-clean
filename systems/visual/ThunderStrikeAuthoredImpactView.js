/** Owns the atomic authored ring-and-spark presentation for Thunder Strike. */
import {
  HIGH_IMPACT_FX_CONFIG,
  resolveHighImpactFxEnabled,
} from "../../values/highImpactFx.js";

export class ThunderStrikeAuthoredImpactView {
  constructor(scene, {
    config = HIGH_IMPACT_FX_CONFIG,
    search = globalThis.location?.search || "",
    reducedMotion,
  } = {}) {
    this.scene = scene;
    this.config = config;
    this.enabled = resolveHighImpactFxEnabled(config, search);
    this.reducedMotion = reducedMotion
      ?? globalThis.matchMedia?.(config.reducedMotionMediaQuery)?.matches === true;
    this.rolledBack = false;
    this.destroyed = false;
    this.atomicReady = false;
    this.lastError = null;
    this.generation = 0;
    this.statusByKey = new Map();
    this.handles = new Map();
    this.startedKeys = new Set();
    this.rollbackCleanup = new Map();
    this.activeObjects = new Set();
    this.activeTweens = new Set();
    this.activeTimers = new Set();
    this.assetsByRole = new Map(config.assets.map((asset) => [asset.role, asset]));
    this.inspector = Object.freeze({
      snapshot: () => this.snapshot(),
      rollback: () => this.rollback(),
      restore: () => this.restore(),
    });
    this._installInspector();
    if (this.enabled) this._requestAtomicSet();
  }

  play(x, y, stage, depth) {
    if (!this._canPresent()) return false;
    const presentation = this.config.presentation;
    const stageNumber = Number(stage?.number) || presentation.ring.minimumCopies;
    const stageScale = Math.min(
      presentation.stageScale.maximum,
      presentation.stageScale.base
        + (stageNumber - 1) * presentation.stageScale.perStage,
    );
    const ringCopies = this.reducedMotion && presentation.reducedMotion.enabled
      ? presentation.reducedMotion.ringCopies
      : Math.max(
        presentation.ring.minimumCopies,
        Math.min(
          presentation.ring.maximumCopies,
          Number(stage?.visual?.ringCount) || presentation.ring.minimumCopies,
        ),
      );
    const created = [
      this._createImage("flare", x, y, depth, presentation.flare, stageScale),
      ...Array.from({ length: ringCopies }, (_, index) => this._createImage(
        "ring",
        x,
        y,
        depth,
        presentation.ring,
        stageScale,
        index,
      )),
      this._createImage("crackles", x, y, depth, presentation.crackles, stageScale),
    ];
    if (created.some((entry) => !entry)) {
      created.forEach((entry) => this._disposeObject(entry?.image));
      return false;
    }
    created.forEach((entry) => this._presentEntry(entry));
    return true;
  }

  _createImage(role, x, y, depth, spec, stageScale, index = 0) {
    const asset = this.assetsByRole.get(role);
    const image = this.scene?.add?.image?.(x, y, asset?.key);
    if (!image) return null;
    const presentation = this.config.presentation;
    const reduced = presentation.reducedMotion;
    const displayWidth = spec.displayWidthPx + (spec.widthStepPx || 0) * index;
    const displayHeight = spec.displayHeightPx + (spec.heightStepPx || 0) * index;
    const alpha = this.reducedMotion && reduced.enabled
      ? reduced[`${role}Alpha`]
      : spec.alpha;
    const startScale = this.reducedMotion && reduced.enabled
      ? reduced.scale * stageScale
      : spec.startScale * stageScale;
    image.setOrigin?.(presentation.origin);
    image.setDepth?.(depth + presentation.depthOffsets[role]);
    image.setDisplaySize?.(displayWidth, displayHeight);
    const baseScaleX = Number.isFinite(image.scaleX) ? image.scaleX : 1;
    const baseScaleY = Number.isFinite(image.scaleY) ? image.scaleY : 1;
    image.setAlpha?.(alpha);
    image.setScale?.(baseScaleX * startScale, baseScaleY * startScale);
    image.setBlendMode?.(this.config.blendMode);
    this.activeObjects.add(image);
    return { image, role, spec, stageScale, index, baseScaleX, baseScaleY };
  }

  _presentEntry(entry) {
    const reduced = this.config.presentation.reducedMotion;
    if (this.reducedMotion && reduced.enabled) {
      this._scheduleDispose(entry.image, reduced.lifetimeMs);
      return;
    }
    const delay = entry.role === "ring"
      ? entry.index * entry.spec.staggerMs
      : undefined;
    this._tween(entry.image, {
      scaleX: entry.baseScaleX * entry.spec.endScale * entry.stageScale,
      scaleY: entry.baseScaleY * entry.spec.endScale * entry.stageScale,
      alpha: 0,
      delay,
      duration: entry.spec.durationMs,
      ease: entry.spec.ease,
    });
  }

  _tween(target, tweenValues) {
    if (!this.scene?.tweens?.add) {
      this._scheduleDispose(target, tweenValues.duration);
      return;
    }
    let tween = null;
    tween = this.scene.tweens.add({
      targets: target,
      ...tweenValues,
      onComplete: () => {
        this.activeTweens.delete(tween);
        this._disposeObject(target);
      },
    });
    if (tween) this.activeTweens.add(tween);
  }

  _scheduleDispose(target, delayMs) {
    let timer = null;
    const dispose = () => {
      this.activeTimers.delete(timer);
      this._disposeObject(target);
    };
    timer = this.scene?.time?.delayedCall?.(delayMs, dispose) || null;
    if (timer) this.activeTimers.add(timer);
    else dispose();
  }

  _canPresent() {
    if (!this.enabled || this.rolledBack || this.destroyed || !this.atomicReady) return false;
    const complete = this.config.assets.every(
      (asset) => this.scene?.textures?.exists?.(asset.key) === true,
    );
    if (!complete) {
      this.atomicReady = false;
      this.lastError = "atomic-texture-set-missing";
    }
    return complete;
  }

  _requestAtomicSet() {
    const coordinator = this.scene?.runtimeAssetLoadCoordinator;
    if (this.destroyed || this.rolledBack || coordinator?.enabled !== true) return false;
    this._cancelRequests();
    this.generation += 1;
    const generation = this.generation;
    this.atomicReady = false;
    this.lastError = null;
    this.statusByKey.clear();
    this.startedKeys.clear();
    for (const asset of this.config.assets) {
      this.statusByKey.set(asset.key, "queued");
      const handle = coordinator.request(asset, {
        owner: this.config.owner,
        priority: this.config.priority,
        onStart: () => this._onStart(asset, generation),
        onReady: () => this._onReady(asset, generation),
        onError: (_failedAsset, error) => this._onError(asset, error, generation),
      });
      const status = this.statusByKey.get(asset.key);
      if (handle && status !== "ready" && status !== "failed") {
        this.handles.set(asset.key, handle);
      } else if (!handle && status !== "ready") {
        this._onError(asset, new Error("runtime-asset-request-rejected"), generation);
        break;
      }
    }
    return true;
  }

  _onStart(asset, generation) {
    if (!this._accept(generation)) return;
    this.startedKeys.add(asset.key);
    this.statusByKey.set(asset.key, "loading");
  }

  _onReady(asset, generation) {
    if (!this._accept(generation)) return;
    this.startedKeys.delete(asset.key);
    this.statusByKey.set(asset.key, "ready");
    this.handles.delete(asset.key);
    this.atomicReady = this.config.assets.every(
      (entry) => this.statusByKey.get(entry.key) === "ready"
        && this.scene?.textures?.exists?.(entry.key) === true,
    );
  }

  _onError(asset, error, generation) {
    if (!this._accept(generation)) return;
    this.startedKeys.delete(asset.key);
    this.statusByKey.set(asset.key, "failed");
    this.lastError = error?.message || String(error || "asset-load-failed");
    this.atomicReady = false;
    this._cancelRequests();
    this._removeOwnedTextures();
  }

  _accept(generation) {
    return !this.destroyed && !this.rolledBack && generation === this.generation;
  }

  rollback() {
    if (this.destroyed || this.rolledBack) return false;
    this.rolledBack = true;
    this.atomicReady = false;
    this.generation += 1;
    this._armLateLoadCleanup();
    this._cancelRequests();
    this._destroyPresentation();
    this._removeOwnedTextures();
    return true;
  }

  restore() {
    if (this.destroyed || !this.enabled) return false;
    this._disarmLateLoadCleanup();
    this.rolledBack = false;
    return this._requestAtomicSet();
  }

  _cancelRequests() {
    this.handles.forEach((handle) => handle?.cancel?.());
    this.handles.clear();
  }

  _armLateLoadCleanup() {
    for (const asset of this.config.assets) {
      if (!this.startedKeys.has(asset.key) || this.rollbackCleanup.has(asset.key)) continue;
      const eventName = `filecomplete-image-${asset.key}`;
      const loader = this.scene?.load;
      const textures = this.scene?.textures;
      const coordinator = this.scene?.runtimeAssetLoadCoordinator;
      const cleanup = () => {
        loader?.off?.(eventName, cleanup);
        this.rollbackCleanup.delete(asset.key);
        if (textures?.exists?.(asset.key)) textures.remove?.(asset.key);
        coordinator?.releaseDecodedSource?.(asset.key);
      };
      this.rollbackCleanup.set(asset.key, { eventName, cleanup });
      loader?.once?.(eventName, cleanup);
    }
  }

  _disarmLateLoadCleanup() {
    this.rollbackCleanup.forEach(({ eventName, cleanup }) => {
      this.scene?.load?.off?.(eventName, cleanup);
    });
    this.rollbackCleanup.clear();
  }

  _destroyPresentation() {
    this.activeTweens.forEach((tween) => {
      tween?.stop?.();
      tween?.remove?.();
    });
    this.activeTimers.forEach((timer) => timer?.remove?.());
    this.activeObjects.forEach((object) => object?.destroy?.());
    this.activeTweens.clear();
    this.activeTimers.clear();
    this.activeObjects.clear();
  }

  _removeOwnedTextures() {
    this.config.assets.forEach((asset) => this._removeTexture(asset.key));
  }

  _removeTexture(key) {
    if (this.scene?.textures?.exists?.(key)) this.scene.textures.remove?.(key);
    this.scene?.runtimeAssetLoadCoordinator?.releaseDecodedSource?.(key);
  }

  _disposeObject(object) {
    if (!object) return;
    this.activeObjects.delete(object);
    object.destroy?.();
  }

  snapshot() {
    const coordinator = this.scene?.runtimeAssetLoadCoordinator;
    let state = "loading";
    if (this.destroyed) state = "destroyed";
    else if (!this.enabled) state = "disabled";
    else if (this.rolledBack) state = "rolled-back";
    else if (coordinator?.enabled !== true) state = "coordinator-disabled";
    else if (this.lastError) state = "failed";
    else if (this.atomicReady) state = "ready";
    return {
      schemaVersion: this.config.schemaVersion,
      enabled: this.enabled,
      state,
      atomicReady: this.atomicReady,
      reducedMotion: this.reducedMotion,
      activeObjects: this.activeObjects.size,
      activeTweens: this.activeTweens.size,
      lastError: this.lastError,
      assets: this.config.assets.map((asset) => ({
        key: asset.key,
        status: this.statusByKey.get(asset.key) || "idle",
      })),
    };
  }

  _installInspector() {
    if (globalThis.window) {
      globalThis.window[this.config.debugGlobalKey] = this.inspector;
    }
  }

  destroy() {
    if (this.destroyed) return;
    this.rollback();
    this.destroyed = true;
    if (globalThis.window?.[this.config.debugGlobalKey] === this.inspector) {
      delete globalThis.window[this.config.debugGlobalKey];
    }
    this.scene = null;
  }
}
