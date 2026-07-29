import {
  TITAN_DISCOVERY_CONFIG,
  resolveTitanChamberAsset,
  resolveTitanChamberBlendEnabled,
  resolveTitanChambersEnabled,
} from "../../values/titanDiscoveries.js";
import {
  WORLD_VISUAL_DEPTH_BACKDROPS,
  resolveWorldVisualDepthBackdropTint,
} from "../../values/worldVisualDepthBackdrops.js";
import {
  distanceToTitanZone,
  fitTitanChamberScale,
} from "./titanChamberGeometry.js";
import { TitanChamberTextureReleases } from "./TitanChamberTextureReleases.js";

export class TitanChamberStream {
  constructor(
    scene,
    worldModel,
    config = TITAN_DISCOVERY_CONFIG,
    onChanged = null,
    search = globalThis.location?.search || ""
  ) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.config = config;
    this.onChanged = onChanged;
    this.search = search;
    this.enabled = resolveTitanChambersEnabled(config, search);
    this.blendEnabled = resolveTitanChamberBlendEnabled(config, search);
    this.lastLighting = null;
    this.records = new Map();
    this.pending = new Map();
    this.failedAssets = new Set();
    this.loadedByStream = new Set();
    this.destroyed = false;
    this.textureReleases = new TitanChamberTextureReleases(scene, {
      canRelease: record => this._canReleaseTexture(record),
      release: record => this._releaseTexture(record),
      onChanged: () => this._notifyChanged(),
    });
    this._handleLoadError = this._handleLoadError.bind(this);
    this.scene.load?.on?.("loaderror", this._handleLoadError);
  }

  create(zoneViews) {
    for (const view of zoneViews) {
      this.records.set(view.definition.id, {
        view,
        definition: view.definition,
        asset: resolveTitanChamberAsset(view.definition, this.config, this.search),
        playerDesired: false,
        pinCount: 0,
        readyCallbacks: new Set(),
        errorCallbacks: new Set(),
        card: null,
        glow: null,
      });
      view.visualMode = "stance";
    }
    return this.enabled;
  }

  sync(playerTile, lighting = null) {
    if (!this.enabled || this.destroyed) return false;
    if (lighting) this.lastLighting = lighting;
    const stream = this.config.chambers;
    const candidates = [...this.records.values()]
      .map(record => ({
        record,
        distance: distanceToTitanZone(playerTile, record.view.zone),
      }))
      .filter(candidate => (
        candidate.distance <= stream.preloadRangeTiles
        || (
          candidate.record.playerDesired
          && candidate.distance <= stream.releaseRangeTiles
        )
      ))
      .sort((a, b) => (
        a.distance - b.distance
        || a.record.definition.index - b.record.definition.index
      ))
      .slice(0, stream.maxResidentCards);
    const desiredIds = new Set(
      candidates.map(candidate => candidate.record.definition.id)
    );

    for (const record of this.records.values()) {
      const desired = desiredIds.has(record.definition.id);
      record.playerDesired = desired;
      if (desired) {
        this._ensure(record);
        if (this._textureExists(record.asset.key)) {
          this._attach(record);
        }
        this._applyTint(record);
      } else {
        this._detach(record);
        this._releaseIfUnused(record);
      }
    }
    return desiredIds.size > 0;
  }

  pinArchive(definition, { onReady = null, onError = null } = {}) {
    const record = this.records.get(definition?.id);
    if (!this.enabled || !record || this.destroyed) return () => {};
    record.pinCount += 1;
    this.textureReleases.cancel(record);
    const key = record.asset.key;
    if (this._textureExists(key)) {
      onReady?.(record.asset);
    } else {
      if (onReady) record.readyCallbacks.add(onReady);
      if (onError) record.errorCallbacks.add(onError);
      this._ensure(record);
    }
    this._notifyChanged();

    let released = false;
    return () => {
      if (released) return;
      released = true;
      record.readyCallbacks.delete(onReady);
      record.errorCallbacks.delete(onError);
      record.pinCount = Math.max(0, record.pinCount - 1);
      this._releaseIfUnused(record);
      this._notifyChanged();
    };
  }

  _ensure(record) {
    this.textureReleases.cancel(record);
    const asset = record.asset;
    if (this._textureExists(asset.key)) {
      this._flushReady(record);
      return true;
    }
    if (
      this.pending.has(asset.key)
      || this.failedAssets.has(asset.key)
      || !this.scene.load?.image
    ) {
      return false;
    }
    const eventName = `filecomplete-image-${asset.key}`;
    const complete = () => this._finish(record, eventName);
    this.pending.set(asset.key, { record, eventName, complete });
    this.scene.load.once(eventName, complete);
    this.scene.load.image(asset.key, asset.path);
    if (!this.scene.load.isLoading?.()) this.scene.load.start?.();
    this._notifyChanged();
    return false;
  }

  _finish(record, eventName) {
    const asset = record.asset;
    const pending = this.pending.get(asset.key);
    if (pending) this.scene.load?.off?.(eventName, pending.complete);
    this.pending.delete(asset.key);
    if (!this._textureExists(asset.key)) {
      this._fail(record);
      return;
    }
    this.loadedByStream.add(asset.key);
    if (record.playerDesired) this._attach(record);
    this._flushReady(record);
    this._releaseIfUnused(record);
    this._notifyChanged();
  }

  _handleLoadError(file) {
    const pending = this.pending.get(file?.key);
    if (!pending) return;
    this.scene.load?.off?.(pending.eventName, pending.complete);
    this.pending.delete(file.key);
    this._fail(pending.record);
  }

  _fail(record) {
    const key = record.asset.key;
    this.failedAssets.add(key);
    for (const callback of record.errorCallbacks) {
      callback(record.asset);
    }
    record.readyCallbacks.clear();
    record.errorCallbacks.clear();
    this._notifyChanged();
  }

  _flushReady(record) {
    for (const callback of record.readyCallbacks) {
      callback(record.asset);
    }
    record.readyCallbacks.clear();
    record.errorCallbacks.clear();
  }

  _attach(record) {
    if (record.card || record.view.animating) return false;
    const { view, definition } = record;
    const asset = record.asset;
    if (!this._textureExists(asset.key)) return false;
    this.textureReleases.cancel(record);
    const card = this.scene.add.image(view.settledX, view.baseY, asset.key);
    const glow = this.scene.add.image(view.settledX, view.baseY, asset.key);
    const baseScale = fitTitanChamberScale(
      card,
      view.widthPx * this.config.backdrop.fitFraction,
      view.heightPx * this.config.backdrop.fitFraction
    );
    card
      .setDepth(this.config.chambers.cardDepth)
      .setScale(baseScale)
      .setAlpha(0);
    glow
      .setDepth(this.config.chambers.cardGlowDepth)
      .setScale(baseScale)
      .setTint(definition.glowTint)
      .setBlendMode("ADD")
      .setAlpha(0);
    card.name = `titan-chamber-${definition.id}`;
    glow.name = `titan-chamber-glow-${definition.id}`;
    record.card = card;
    record.glow = glow;
    view.chamberSprite = card;
    view.chamberGlowSprite = glow;
    view.visualMode = "chamber";
    this._applyTint(record);
    this._notifyChanged();
    return true;
  }

  _applyTint(record) {
    if (!record.card) return false;
    record.card.setTint?.(resolveWorldVisualDepthBackdropTint(
      record.view.zone.centerYTile,
      this.lastLighting,
      WORLD_VISUAL_DEPTH_BACKDROPS
    ));
    return true;
  }

  _detach(record, force = false) {
    if (!record.card || (record.view.animating && !force)) return false;
    const { view, card, glow } = record;
    this.scene.tweens?.killTweensOf?.([card, glow]);
    view.chamberSprite = null;
    view.chamberGlowSprite = null;
    view.visualMode = "stance";
    card.destroy?.();
    glow.destroy?.();
    record.card = null;
    record.glow = null;
    this._notifyChanged();
    return true;
  }

  _releaseIfUnused(record) {
    if (record.playerDesired || record.pinCount > 0) {
      this.textureReleases.cancel(record);
      return false;
    }
    this._detach(record);
    const key = record.asset.key;
    if (
      record.card
      || record.glow
      || this.pending.has(key)
      || !this.loadedByStream.has(key)
      || !this._textureExists(key)
    ) {
      return false;
    }
    return this.textureReleases.schedule(record);
  }

  _canReleaseTexture(record) {
    const key = record.asset.key;
    return !this.destroyed
      && !record.playerDesired
      && record.pinCount === 0
      && !record.card
      && !record.glow
      && !this.pending.has(key)
      && this.loadedByStream.has(key);
  }

  _releaseTexture(record) {
    const key = record.asset.key;
    if (this._textureExists(key)) this.scene.textures.remove?.(key);
    this.loadedByStream.delete(key);
  }

  _textureExists(key) {
    return Boolean(key && this.scene.textures?.exists?.(key));
  }

  _notifyChanged() {
    this.onChanged?.();
  }

  getSnapshot() {
    const records = [...this.records.values()];
    return {
      enabled: this.enabled,
      ready: !this.enabled || this.failedAssets.size === 0,
      registered: records.length,
      resident: records.filter(record => record.card).length,
      pending: this.pending.size,
      releasePending: this.textureReleases.size,
      pinned: records.filter(record => record.pinCount > 0).length,
      loaded: this.loadedByStream.size,
      blendEnabled: this.blendEnabled,
      assetVersion: this.blendEnabled
        ? this.config.chambers.blendAssetVersion
        : this.config.chambers.rollbackAssetVersion,
      failedAssets: [...this.failedAssets],
    };
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.load?.off?.("loaderror", this._handleLoadError);
    for (const pending of this.pending.values()) {
      this.scene.load?.off?.(pending.eventName, pending.complete);
    }
    this.pending.clear();
    this.textureReleases.destroy();
    for (const record of this.records.values()) {
      record.playerDesired = false;
      record.pinCount = 0;
      this._detach(record, true);
      const key = record.asset.key;
      if (this.loadedByStream.has(key)) this.scene.textures.remove?.(key);
    }
    this.loadedByStream.clear();
    this.failedAssets.clear();
    this.records.clear();
  }
}
