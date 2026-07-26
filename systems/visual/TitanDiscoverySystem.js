import {
  TITAN_DISCOVERY_CONFIG,
  resolveTitanDiscoveriesEnabled,
} from "../../values/titanDiscoveries.js";
import { playTitanUnlockFx } from "./titanDiscoveryFx.js";
import { buildTitanDiscoveryZones } from "./titanDiscoveryZones.js";
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
    this.surfaceViews = new Map();
    this.transients = new Set();
    this.lastDugCount = -1;
    this.lastDiscoverySignature = "";
    this.forceProgressSync = true;
    this.galleryInitialized = false;
    this.created = false;
  }
  create() {
    if (!resolveTitanDiscoveriesEnabled(this.config)) return false;
    const zones = buildTitanDiscoveryZones(this.worldModel, this.config);
    this.zoneViews = zones
      .filter(zone => this._textureExists(zone.definition.asset.key))
      .map(zone => this._createBackdropView(zone));
    this.created = this.zoneViews.length > 0;
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
      this._createSurfaceEcho(view.definition, false);
      this.scene.queueDugTilesSave?.();
      this.forceProgressSync = true;
    }
  }
  _syncSurfaceGallery(discovered, instant) {
    for (const definition of this.config.definitions) {
      if (discovered.has(definition.id)) this._createSurfaceEcho(definition, instant);
    }
  }
  _createSurfaceEcho(definition, instant) {
    if (
      this.surfaceViews.has(definition.id)
      || !this._textureExists(definition.asset.key)
    ) {
      return;
    }
    const gallery = this.config.surfaceGallery;
    const tileSize = this.worldModel.tileSize;
    const x = (
      gallery.startTileX
      + (definition.index - 1) * gallery.spacingTiles
    ) * tileSize;
    const y = (this.worldModel.topAirRows + gallery.baselineOffsetTiles) * tileSize;
    const rune = this.scene.add.ellipse(
      x,
      y,
      gallery.runeWidthTiles * tileSize,
      gallery.runeHeightTiles * tileSize,
      definition.glowTint,
      gallery.runeAlpha
    );
    rune.setDepth(gallery.runeDepth).setBlendMode("ADD");
    const sprite = this.scene.add.image(x, y, definition.asset.key);
    const baseScale = fitScale(
      sprite,
      gallery.maxWidthTiles * tileSize,
      gallery.maxHeightTiles * tileSize
    );
    sprite
      .setOrigin(0.5, 1)
      .setDepth(gallery.spriteDepth)
      .setBlendMode("ADD")
      .setAlpha(instant ? gallery.baseAlpha : 0)
      .setScale(instant ? baseScale : baseScale * gallery.arrivalStartScale);
    if (!instant) {
      this.scene.tweens.add({
        targets: sprite,
        alpha: gallery.baseAlpha,
        scaleX: baseScale,
        scaleY: baseScale,
        duration: gallery.arrivalMs,
        ease: "Back.Out",
      });
    }
    this.surfaceViews.set(definition.id, {
      definition,
      sprite,
      rune,
      baseY: y,
      baseScale,
    });
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
    const gallery = this.config.surfaceGallery;
    for (const view of this.surfaceViews.values()) {
      const phase = time / gallery.bobPeriodMs
        + view.definition.index * gallery.phaseStep;
      const wave = (Math.sin(phase) + 1) / 2;
      view.sprite
        .setY(view.baseY - Math.sin(phase) * gallery.bobPixels)
        .setAlpha(gallery.baseAlpha + wave * gallery.pulseAlpha);
      view.rune.setAlpha(gallery.runeAlpha + wave * gallery.runeAlpha);
    }
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
  getSnapshot() {
    return {
      total: this.config.definitions.length,
      discovered: this.surfaceViews.size,
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
      ...[...this.surfaceViews.values()].flatMap(view => [view.sprite, view.rune]),
    ];
    objects.forEach(object => {
      this.scene.tweens?.killTweensOf?.(object);
      object?.destroy?.();
    });
    this.transients.clear();
    this.surfaceViews.clear();
    this.zoneViews = [];
    this.created = false;
  }
}
