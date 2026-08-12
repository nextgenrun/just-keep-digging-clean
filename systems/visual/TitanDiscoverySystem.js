import {
  TITAN_DISCOVERY_CONFIG,
  resolveTitanDiscoveriesEnabled,
} from "../../values/titanDiscoveries.js?rev=20260729-native-density-v14";
import { resolveTitanRuntimeConfig } from "../../values/titanRuntimeCapabilities.js";
import {
  TITAN_DISCOVERY_EXPERIENCE,
  resolveTitanEncounterMode,
} from "../../values/titanDiscoveryExperience.js";
import { buildTitanDiscoveryZones } from "./titanDiscoveryZones.js";
import {
  createTitanDiscoveryView,
  syncTitanDiscoveryEnvironment,
  syncTitanDiscoveryViews,
} from "./titanDiscoveryView.js?rev=20260729-native-density-v14";
import { buildTitanDiscoverySnapshot } from "./titanDiscoverySnapshot.js";
import { describeTitanDirection } from "./titanDirection.js";
import { TitanChamberStream } from "./TitanChamberStream.js?rev=20260729-native-density-v14";
import { TitanCoverageGlowSystem } from "./TitanCoverageGlowSystem.js";
import { TitanDiscoveryGuidance } from "./TitanDiscoveryGuidance.js";
import { TitanEnvironmentEnvelopeStream } from "./TitanEnvironmentEnvelopeStream.js";
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
    this.config = resolveTitanRuntimeConfig(config, scene.gameplayCapabilities);
    this.experienceConfig = experienceConfig;
    this.encounterMode = resolveTitanEncounterMode(experienceConfig);
    this.zoneViews = [];
    this.surfaceGallery = new TitanSurfaceGallery(scene, worldModel, this.config);
    this.guidance = new TitanDiscoveryGuidance(scene, experienceConfig);
    this.coverGlow = new TitanCoverageGlowSystem(scene, worldModel, this.config);
    const handleStreamChange = () => {
      this.forceProgressSync = true;
      if (this.created) this._publishHealth(true);
    };
    this.chamberStream = new TitanChamberStream(
      scene,
      worldModel,
      this.config,
      handleStreamChange
    );
    this.environmentStream = new TitanEnvironmentEnvelopeStream(
      scene,
      worldModel,
      this.config,
      handleStreamChange
    );
    this.groundingReady = false;
    this.groundingMissingAssets = [];
    this.transients = new Set();
    this.unlockController = new TitanUnlockController({
      scene,
      worldModel,
      config: this.config,
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
    const groundingAssets = [
      this.config.assets.undergroundDais,
      this.config.assets.groundContact,
      this.config.assets.unlockResonance,
    ];
    this.groundingMissingAssets = groundingAssets
      .filter(asset => !this._textureExists(asset.key))
      .map(asset => asset.key);
    this.groundingReady = this.groundingMissingAssets.length === 0;
    this.zoneViews = zones
      .filter(zone => (
        this.groundingReady
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
    this.environmentStream.create(this.zoneViews);
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
    for (const view of this.zoneViews) {
      syncTitanDiscoveryEnvironment(view, lighting, this.config);
    }
    this.environmentStream.sync(context.playerTile, lighting);
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
      const phase = time / underground.idlePeriodMs * Math.PI * 2
        + view.definition.index * underground.phaseStep;
      const wave = Math.sin(phase);
      const pulse = (wave + 1) / 2;
      const scaleX = view.baseScale
        * (1 - wave * underground.idleWidthScale);
      const scaleY = view.baseScale
        * (1 + wave * underground.idleBreathScale);
      view.sprite
        .setPosition(view.baseX, view.baseY)
        .setScale(scaleX, scaleY);
      view.glowSprite
        .setPosition(view.baseX, view.baseY)
        .setScale(scaleX, scaleY);
      view.chamberSprite?.setPosition(view.baseX, view.chamberCenterY);
      view.chamberGlowSprite?.setPosition(
        view.baseX,
        view.chamberCenterY
      );
      view.daisGlowSprite.setAlpha(
        underground.daisGlowAlpha * (0.72 + pulse * 0.28)
      );
      view.contactGlowSprite.setAlpha(
        underground.contactGlowAlpha * (0.68 + pulse * 0.32)
      );
      if (!view.discovered) {
        const glowFloor = underground.coverageGlowFloor;
        const pulseFactor = glowFloor + (1 - glowFloor) * pulse;
        const progressFactor = glowFloor
          + (1 - glowFloor) * view.coverageProgress;
        view.glowSprite.setAlpha(
          underground.coverageGlowAlpha * pulseFactor * progressFactor
        );
        view.chamberGlowSprite?.setAlpha(
          this.config.chambers.ambientGlowAlpha
          * pulse
          * view.coverageProgress
        );
        continue;
      }
      view.glowSprite.setAlpha(0);
      view.chamberGlowSprite?.setAlpha(
        this.config.chambers.ambientGlowAlpha * pulse
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
    this.environmentStream.destroy();
    this.coverGlow.destroy();
    const objects = [
      ...this.transients,
      ...this.zoneViews.flatMap(view => [
        view.sprite,
        view.glowSprite,
        view.daisSprite,
        view.daisGlowSprite,
        view.contactSprite,
        view.contactGlowSprite,
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
