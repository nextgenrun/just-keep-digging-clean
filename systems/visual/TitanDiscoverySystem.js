import {
  TITAN_DISCOVERY_CONFIG,
  resolveTitanDiscoveriesEnabled,
} from "../../values/titanDiscoveries.js";
import { playTitanUnlockFx } from "./titanDiscoveryFx.js";
import { buildTitanDiscoveryZones } from "./titanDiscoveryZones.js";
import { TitanSurfaceGallery } from "./TitanSurfaceGallery.js";
function fitScale(image, maximumWidth, maximumHeight) {
  return Math.min(
    maximumWidth / Math.max(1, image.width || image.displayWidth || 1),
    maximumHeight / Math.max(1, image.height || image.displayHeight || 1)
  );
}
function isNearZone(playerTile, zone, rangeTiles) {
  if (!playerTile) return false;
  return Math.abs(playerTile.tx - zone.centerXTile) <= rangeTiles
    && Math.abs(playerTile.ty - zone.centerYTile) <= rangeTiles;
}

export class TitanDiscoverySystem {
  constructor(scene, worldModel, config = TITAN_DISCOVERY_CONFIG) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.config = config;
    this.zoneViews = [];
    this.surfaceGallery = new TitanSurfaceGallery(scene, worldModel, config);
    this.transients = new Set();
    this.lastDugCount = -1;
    this.lastDiscoverySignature = "";
    this.forceProgressSync = true;
    this.galleryInitialized = false;
    this.healthReadyReported = false;
    this.healthFailureReported = false;
    this.created = false;
  }
  create() {
    if (!resolveTitanDiscoveriesEnabled(this.config)) {
      this._publishHealth(false);
      return false;
    }
    const zones = buildTitanDiscoveryZones(this.worldModel, this.config);
    this.zoneViews = zones
      .filter(zone => this._textureExists(zone.definition.asset.key))
      .map(zone => this._createBackdropView(zone));
    this.surfaceGallery.sync(new Set(), true);
    this.created = this.zoneViews.length > 0;
    this._publishHealth(true);
    return this.created;
  }
  _textureExists(key) {
    return typeof this.scene.textures?.exists !== "function"
      || this.scene.textures.exists(key);
  }
  _createBackdropView(zone) {
    const definition = zone.definition;
    const tileSize = this.worldModel.tileSize;
    const baseX = zone.centerXTile * tileSize;
    const baseY = zone.centerYTile * tileSize;
    const widthPx = (zone.rightExclusive - zone.left) * tileSize;
    const heightPx = (zone.bottomExclusive - zone.top) * tileSize;
    const sprite = this.scene.add.image(baseX, baseY, definition.asset.key);
    const glowSprite = this.scene.add.image(baseX, baseY, definition.asset.key);
    const baseScale = fitScale(
      sprite,
      widthPx * this.config.backdrop.fitFraction,
      heightPx * this.config.backdrop.fitFraction
    );
    sprite
      .setDepth(this.config.backdrop.spriteDepth)
      .setScale(baseScale)
      .setAlpha(this.config.backdrop.hiddenAlpha);
    glowSprite
      .setDepth(this.config.backdrop.glowDepth)
      .setScale(baseScale)
      .setTint(definition.glowTint)
      .setBlendMode("ADD")
      .setAlpha(0);
    return {
      zone,
      definition,
      sprite,
      glowSprite,
      baseX,
      baseY,
      settledX: baseX,
      baseScale,
      tileSize,
      leftPx: zone.left * tileSize,
      topPx: zone.top * tileSize,
      widthPx,
      heightPx,
      remaining: zone.cells.length,
      progress: 0,
      ready: false,
      discovered: false,
      animating: false,
    };
  }
  update(time, _delta, context = {}) {
    if (!this.created) return;
    const retention = this.scene.retentionProgressSystem;
    const discoveredIds = retention?.getDiscoveredTitans?.() || [];
    const discoverySignature = [...discoveredIds].sort().join("|");
    const dugCount = Number.isInteger(this.worldModel.dugTiles?.size)
      ? this.worldModel.dugTiles.size
      : 0;
    const needsSync = this.forceProgressSync
      || dugCount !== this.lastDugCount
      || discoverySignature !== this.lastDiscoverySignature;

    if (needsSync) {
      const discovered = new Set(discoveredIds);
      this._syncZoneProgress(discovered);
      this._syncSurfaceGallery(discovered, !this.galleryInitialized);
      this.galleryInitialized = true;
      this.lastDugCount = dugCount;
      this.lastDiscoverySignature = discoverySignature;
      this.forceProgressSync = false;
      this._publishHealth(true);
    }
    this._tryUnlockReady(context.playerTile, retention);
    this._updateAmbientMotion(Number.isFinite(time) ? time : 0);
  }
  _syncZoneProgress(discovered) {
    for (const view of this.zoneViews) {
      view.remaining = view.zone.cells.reduce(
        (total, cell) => total + (this.worldModel.isSolid(cell.tx, cell.ty) ? 1 : 0),
        0
      );
      view.progress = 1 - view.remaining / Math.max(1, view.zone.cells.length);
      view.ready = view.remaining === 0 && !discovered.has(view.definition.id);
      view.discovered = discovered.has(view.definition.id);

      if (view.animating) continue;
      if (view.discovered) {
        view.settledX = view.baseX + view.definition.travelDirection
          * view.definition.travelTiles
          * view.tileSize;
        view.sprite
          .setX(view.settledX)
          .setAlpha(this.config.backdrop.discoveredAlpha);
        view.glowSprite.setX(view.settledX).setAlpha(0);
      } else {
        view.settledX = view.baseX;
        view.sprite
          .setX(view.baseX)
          .setAlpha(
            this.config.backdrop.hiddenAlpha
            + this.config.backdrop.progressAlpha * view.progress
          );
        view.glowSprite.setX(view.baseX).setAlpha(0);
      }
    }
  }
  _tryUnlockReady(playerTile, retention) {
    if (!retention?.discoverTitan) return;
    for (const view of this.zoneViews) {
      if (
        !view.ready
        || view.discovered
        || !isNearZone(playerTile, view.zone, this.config.zoneSearch.triggerRangeTiles)
      ) {
        continue;
      }
      if (!retention.discoverTitan(view.definition.id)) continue;
      view.ready = false;
      view.discovered = true;
      playTitanUnlockFx(
        this.scene,
        view,
        view.definition,
        this.config,
        object => this.transients.add(object),
        object => this.transients.delete(object)
      );
      this.surfaceGallery.unlock(view.definition);
      this.scene.queueDugTilesSave?.();
      this.forceProgressSync = true;
    }
  }
  _syncSurfaceGallery(discovered, instant) {
    this.surfaceGallery.sync(discovered, instant);
  }
  _updateAmbientMotion(time) {
    const backdrop = this.config.backdrop;
    for (const view of this.zoneViews) {
      if (view.animating) continue;
      const phase = time / backdrop.idlePeriodMs
        + view.definition.index * backdrop.phaseStep;
      const x = view.settledX + Math.sin(phase) * backdrop.idleDriftPixels;
      view.sprite.setX(x);
      view.glowSprite.setX(x);
    }
    this.surfaceGallery.update(time);
  }
  invalidateTile(tx, ty) {
    if (this.zoneViews.some(view => (
      tx >= view.zone.left
      && tx < view.zone.rightExclusive
      && ty >= view.zone.top
      && ty < view.zone.bottomExclusive
    ))) {
      this.forceProgressSync = true;
    }
  }
  refresh() {
    this.forceProgressSync = true;
  }
  _publishHealth(enabled) {
    const snapshot = this.getSnapshot();
    const complete = snapshot.zones.length === snapshot.total
      && snapshot.surface.ready;
    const status = !enabled ? "disabled" : complete ? "healthy" : "degraded";
    const health = { status, enabled, ...snapshot };
    globalThis[this.config.health.globalKey] = health;
    if (status === "healthy" && !this.healthReadyReported) {
      this.healthReadyReported = true;
      globalThis.__jkdHealth?.markLifecycle?.(
        this.config.health.readyStage,
        {
          zones: snapshot.zones.length,
          surfaceSlots: snapshot.surface.slots,
        }
      );
    } else if (status === "degraded" && !this.healthFailureReported) {
      this.healthFailureReported = true;
      const missing = snapshot.surface.missingAssets;
      const code = missing.length
        ? this.config.health.missingAssetCode
        : this.config.health.incompleteRuntimeCode;
      globalThis.__jkdHealth?.captureSystemFinding?.({
        key: code,
        code,
        severity: this.config.health.severity,
        message: missing.length
          ? `Titan discovery assets missing: ${missing.join(", ")}`
          : `Titan discovery runtime incomplete: ${snapshot.zones.length}/${snapshot.total} zones`,
        context: health,
      });
    }
    return health;
  }
  getSnapshot() {
    const surface = this.surfaceGallery.getSnapshot();
    return {
      total: this.config.definitions.length,
      discovered: surface.discovered,
      surface,
      zones: this.zoneViews.map(view => ({
        id: view.definition.id,
        left: view.zone.left,
        top: view.zone.top,
        width: view.zone.rightExclusive - view.zone.left,
        height: view.zone.bottomExclusive - view.zone.top,
        tracked: view.zone.cells.length,
        remaining: view.remaining,
        progress: view.progress,
        ready: view.ready,
        discovered: view.discovered,
      })),
    };
  }
  destroy() {
    const objects = [
      ...this.transients,
      ...this.zoneViews.flatMap(view => [view.sprite, view.glowSprite]),
    ];
    objects.forEach(object => {
      this.scene.tweens?.killTweensOf?.(object);
      object?.destroy?.();
    });
    this.transients.clear();
    this.surfaceGallery.destroy();
    this.zoneViews = [];
    this.created = false;
    globalThis[this.config.health.globalKey] = {
      status: "destroyed",
      enabled: false,
    };
  }
}
