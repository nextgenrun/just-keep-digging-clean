import {
  TITAN_DISCOVERY_CONFIG,
  resolveTitanDiscoveriesEnabled,
} from "../../values/titanDiscoveries.js";
import {
  TITAN_DISCOVERY_EXPERIENCE,
  resolveTitanEncounterMode,
} from "../../values/titanDiscoveryExperience.js";
import { playTitanUnlockFx } from "./titanDiscoveryFx.js";
import { buildTitanDiscoveryZones } from "./titanDiscoveryZones.js";
import {
  isTitanEncounterReady,
} from "./titanDiscoveryEncounter.js";
import {
  createTitanDiscoveryView,
  syncTitanDiscoveryViews,
} from "./titanDiscoveryView.js";
import { describeTitanDirection } from "./titanDirection.js";
import { TitanChamberStream } from "./TitanChamberStream.js";
import { TitanDiscoveryGuidance } from "./TitanDiscoveryGuidance.js";
import { TitanSurfaceGallery } from "./TitanSurfaceGallery.js";
import { publishTitanDiscoveryHealth } from "./titanDiscoveryHealth.js";

export class TitanDiscoverySystem {
  constructor(
    scene,
    worldModel,
    config = TITAN_DISCOVERY_CONFIG,
    experienceConfig = TITAN_DISCOVERY_EXPERIENCE
  ) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.config = config;
    this.experienceConfig = experienceConfig;
    this.encounterMode = resolveTitanEncounterMode(experienceConfig);
    this.zoneViews = [];
    this.surfaceGallery = new TitanSurfaceGallery(scene, worldModel, config);
    this.guidance = new TitanDiscoveryGuidance(scene, experienceConfig);
    this.chamberStream = new TitanChamberStream(
      scene,
      worldModel,
      config,
      () => {
        this.forceProgressSync = true;
        if (this.created) this._publishHealth(true);
      }
    );
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
      .map(zone => createTitanDiscoveryView(
        this.scene,
        this.worldModel,
        zone,
        this.config,
        this.experienceConfig
      ));
    this.chamberStream.create(this.zoneViews);
    this.surfaceGallery.sync(new Set(), true);
    this.created = this.zoneViews.length > 0;
    this._publishHealth(true);
    return this.created;
  }
  _textureExists(key) {
    return typeof this.scene.textures?.exists !== "function"
      || this.scene.textures.exists(key);
  }
  update(time, _delta, context = {}) {
    if (!this.created) return;
    this.chamberStream.sync(context.playerTile);
    const retention = this.scene.retentionProgressSystem;
    const discoveredIds = retention?.getDiscoveredTitans?.() || [];
    const discoverySignature = [...discoveredIds].sort().join("|");
    const dugCount = Number.isInteger(this.worldModel.dugTiles?.size)
      ? this.worldModel.dugTiles.size
      : 0;
    const needsSync = this.forceProgressSync
      || dugCount !== this.lastDugCount
      || discoverySignature !== this.lastDiscoverySignature;

    const discovered = new Set(discoveredIds);
    if (needsSync) {
      syncTitanDiscoveryViews(
        this.worldModel,
        this.zoneViews,
        discovered,
        this.encounterMode,
        this.config
      );
      this._syncSurfaceGallery(discovered, !this.galleryInitialized);
      this.galleryInitialized = true;
      this.lastDugCount = dugCount;
      this.lastDiscoverySignature = discoverySignature;
      this.forceProgressSync = false;
      this._publishHealth(true);
    }
    this.guidance.update(
      Number.isFinite(time) ? time : 0,
      context.playerTile,
      this.zoneViews,
      discovered
    );
    this._tryUnlockReady(context.playerTile, retention);
    this._updateAmbientMotion(Number.isFinite(time) ? time : 0);
  }
  _tryUnlockReady(playerTile, retention) {
    if (!retention?.discoverTitan) return;
    for (const view of this.zoneViews) {
      if (
        !view.ready
        || !isTitanEncounterReady(
          view,
          playerTile,
          this.encounterMode,
          this.experienceConfig
        )
      ) {
        continue;
      }
      if (!retention.discoverTitan(view.definition.id)) continue;
      view.ready = false;
      view.discovered = true;
      this.scene.titanClueSystem?.completeClue?.(view.definition.id);
      playTitanUnlockFx(
        this.scene,
        view,
        view.definition,
        this.config,
        object => this.transients.add(object),
        object => this.transients.delete(object)
      );
      this.surfaceGallery.unlock(view.definition);
      this.guidance.announceDiscovery(view.definition);
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
      if (view.visualMode === "chamber") {
        const wave = (Math.sin(phase) + 1) / 2;
        view.sprite.setX(view.settledX);
        view.glowSprite
          .setX(view.settledX)
          .setAlpha(
            this.config.chambers.ambientGlowAlpha
            * wave
            * (view.discovered ? 1 : view.progress)
          );
        continue;
      }
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
    return publishTitanDiscoveryHealth(this, enabled);
  }
  getSnapshot() {
    const surface = this.surfaceGallery.getSnapshot();
    const chambers = this.chamberStream.getSnapshot();
    return {
      total: this.config.definitions.length,
      discovered: surface.discovered,
      encounterMode: this.encounterMode,
      guidance: this.guidance.getSnapshot(),
      surface,
      chambers,
      zones: this.zoneViews.map(view => ({
        id: view.definition.id,
        left: view.zone.left,
        top: view.zone.top,
        width: view.zone.rightExclusive - view.zone.left,
        height: view.zone.bottomExclusive - view.zone.top,
        tracked: view.zone.cells.length,
        remaining: view.remaining,
        revealed: view.revealed,
        requiredReveal: view.requiredReveal,
        progress: view.progress,
        ready: view.ready,
        discovered: view.discovered,
        visualMode: view.visualMode,
      })),
    };
  }
  getArchiveAssetProvider() {
    return this.chamberStream;
  }
  getClueDirection(titanId, playerTile) {
    const view = this.zoneViews.find(
      candidate => candidate.definition.id === titanId
    );
    if (!view) return null;
    const description = describeTitanDirection(
      playerTile,
      view.zone,
      this.experienceConfig.guidance.clueCopy,
      this.experienceConfig
    );
    return description
      ? {
        titanId,
        ...description,
      }
      : null;
  }
  getClueDirectionProvider() {
    return {
      getDirection: (titanId, playerTile) => (
        this.getClueDirection(titanId, playerTile)
      ),
    };
  }
  destroy() {
    this.chamberStream.destroy();
    const objects = [
      ...this.transients,
      ...this.zoneViews.flatMap(view => [view.sprite, view.glowSprite]),
    ];
    objects.forEach(object => {
      this.scene.tweens?.killTweensOf?.(object);
      object?.destroy?.();
    });
    this.transients.clear();
    this.guidance.destroy();
    this.surfaceGallery.destroy();
    this.zoneViews = [];
    this.created = false;
    globalThis[this.config.health.globalKey] = {
      status: "destroyed",
      enabled: false,
    };
  }
}
