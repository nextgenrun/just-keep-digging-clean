import {
  TITAN_DISCOVERY_CONFIG,
  resolveTitanDiscoveriesEnabled,
} from "../../values/titanDiscoveries.js?rev=20260729-native-density-v14";
import {
  TITAN_DISCOVERY_EXPERIENCE,
  resolveTitanEncounterMode,
} from "../../values/titanDiscoveryExperience.js";
import { buildTitanDiscoveryZones } from "./titanDiscoveryZones.js";
import {
  createTitanDiscoveryView,
  syncTitanDiscoveryViews,
} from "./titanDiscoveryView.js?rev=20260729-native-density-v14";
import { buildTitanDiscoverySnapshot } from "./titanDiscoverySnapshot.js";
import { describeTitanDirection } from "./titanDirection.js";
import { TitanChamberStream } from "./TitanChamberStream.js?rev=20260729-native-density-v14";
import { TitanCoverageGlowSystem } from "./TitanCoverageGlowSystem.js";
import { TitanDiscoveryGuidance } from "./TitanDiscoveryGuidance.js";
import { TitanSurfaceGallery } from "./TitanSurfaceGallery.js?rev=20260729-native-density-v14";
import { TitanUnlockController } from "./TitanUnlockController.js";
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
    this.coverGlow = new TitanCoverageGlowSystem(scene, worldModel, config);
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
    this.unlockController = new TitanUnlockController({
      scene,
      worldModel,
      config,
      experienceConfig,
      surfaceGallery: this.surfaceGallery,
      guidance: this.guidance,
      registerTransient: object => this.transients.add(object),
      releaseTransient: object => this.transients.delete(object),
    });
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
    const daisReady = this._textureExists(
      this.config.assets.undergroundDais.key
    );
    this.zoneViews = zones
      .filter(zone => (
        daisReady
        && this._textureExists(zone.definition.surfaceAsset.key)
      ))
      .map(zone => createTitanDiscoveryView(
        this.scene,
        this.worldModel,
        zone,
        this.config,
        this.experienceConfig
      ));
    this.chamberStream.create(this.zoneViews);
    this.coverGlow.create();
    this.surfaceGallery.sync(new Set(), true);
    this.created = this.zoneViews.length > 0;
    this._publishHealth(true);
    return this.created;
  }
  _textureExists(key) {
    return typeof this.scene.textures?.exists !== "function"
      || this.scene.textures.exists(key);
  }
  update(time, _delta, context = {}, lighting = context.lighting) {
    if (!this.created) return;
    this.chamberStream.sync(context.playerTile, lighting);
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
    if (this.unlockController.unlockReady(
      this.zoneViews,
      context.playerTile,
      this.encounterMode,
      retention,
      discovered
    )) {
      this.forceProgressSync = true;
    }
    const safeTime = Number.isFinite(time) ? time : 0;
    this.coverGlow.update(safeTime, context.playerTile, this.zoneViews);
    this.guidance.update(
      safeTime,
      context.playerTile,
      this.zoneViews,
      discovered
    );
    this._updateAmbientMotion(safeTime);
  }
  _syncSurfaceGallery(discovered, instant) {
    this.surfaceGallery.sync(discovered, instant);
  }
  _updateAmbientMotion(time) {
    const underground = this.config.underground;
    for (const view of this.zoneViews) {
      if (view.animating) continue;
      const phase = time / underground.idlePeriodMs
        + view.definition.index * underground.phaseStep;
      const wave = (Math.sin(phase) + 1) / 2;
      if (!view.discovered) {
        const glowFloor = underground.coverageGlowFloor;
        const pulseFactor = glowFloor + (1 - glowFloor) * wave;
        const progressFactor = glowFloor
          + (1 - glowFloor) * view.coverageProgress;
        view.sprite.setX(view.baseX);
        view.glowSprite
          .setX(view.baseX)
          .setAlpha(
            underground.coverageGlowAlpha * pulseFactor * progressFactor
          );
        view.daisGlowSprite.setAlpha(
          underground.daisGlowAlpha * (0.7 + wave * 0.3)
        );
        view.chamberSprite?.setX(view.baseX);
        view.chamberGlowSprite
          ?.setX(view.baseX)
          .setAlpha(
            this.config.chambers.ambientGlowAlpha
            * wave
            * view.coverageProgress
          );
        continue;
      }
      if (view.visualMode === "chamber") {
        view.sprite.setX(view.settledX);
        view.glowSprite.setX(view.settledX).setAlpha(0);
        view.chamberSprite?.setX(view.baseX);
        view.chamberGlowSprite
          ?.setX(view.baseX)
          .setAlpha(this.config.chambers.ambientGlowAlpha * wave);
        view.daisGlowSprite.setAlpha(
          underground.daisGlowAlpha * (0.7 + wave * 0.3)
        );
        continue;
      }
      const x = view.settledX + Math.sin(phase) * underground.idleDriftPixels;
      view.sprite.setX(x);
      view.glowSprite.setX(x);
      view.daisGlowSprite.setAlpha(
        underground.daisGlowAlpha * (0.7 + wave * 0.3)
      );
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
    return buildTitanDiscoverySnapshot(this);
  }
  getArchiveAssetProvider() {
    return this.chamberStream;
  }
  getSurfaceInspectionDistance(playerTile) {
    return this.surfaceGallery.getInspectionDistance(playerTile);
  }
  updateSurfaceInspection(playerTile, keys, options = {}) {
    return this.surfaceGallery.updateInspection(playerTile, keys, options);
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
    this.coverGlow.destroy();
    const objects = [
      ...this.transients,
      ...this.zoneViews.flatMap(view => [
        view.sprite,
        view.glowSprite,
        view.daisSprite,
        view.daisGlowSprite,
      ]),
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
