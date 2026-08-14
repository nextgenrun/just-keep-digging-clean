import { USER_SETTINGS } from "../UserSettings.js";
import {
  RETENTION_CONFIG,
  TOWN_TUTORIAL_CHOICES,
  TOWN_TUTORIAL_STAGES,
} from "../../values/retentionConfig.js";
import {
  getTownTutorialDigSite,
  prepareTownTutorialDigSite,
} from "./TownSquareTutorialDigSite.js";
import { FirstFiveMinutesTutorialBridge } from "./FirstFiveMinutesTutorialBridge.js";
import { TownSquareTutorialView } from "./TownSquareTutorialView.js";
import { V11_SKY_ISLAND_LAYOUT } from "../../values/v11SkyIslandLayout.js";
import { TutorialMovementDistanceTracker } from
  "./TutorialMovementDistanceTracker.js";

function interpolateText(value, replacements = {}) {
  const labels = {
    left: USER_SETTINGS.getKeyLabel("moveLeft"),
    right: USER_SETTINGS.getKeyLabel("moveRight"),
    down: USER_SETTINGS.getKeyLabel("aimDown"),
    mine: USER_SETTINGS.getKeyLabel("dig"),
    interact: USER_SETTINGS.getKeyLabel("interact"),
    fly: USER_SETTINGS.getKeyLabel("fly"),
    ...replacements,
  };
  return String(value).replace(
    /\{(\w+)\}/g,
    (_, token) => labels[token] ?? token,
  );
}

function interpolateCopy(copy, replacements = {}) {
  return Object.fromEntries(
    Object.entries(copy).map(([key, value]) => [
      key,
      interpolateText(value, replacements),
    ]),
  );
}

export class TownSquareTutorialSystem {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.retention = scene.retentionProgressSystem;
    this.view = new TownSquareTutorialView(scene);
    this.firstFive = new FirstFiveMinutesTutorialBridge(
      scene,
      this.retention,
      this.view,
      interpolateCopy,
      options,
    );
    this.lastStage = null;
    this.movementDistance = new TutorialMovementDistanceTracker();
    this._flightSaveElapsedMs = 0;
  }

  create() {
    this.scene.playerController?.abilities?.setFreeFlightProvider?.(
      () => this.isFreeFlightActive(),
    );
    this._syncStage(true);
    this.firstFive.create();
  }

  update(deltaMs) {
    const state = this.retention?.getTutorialState?.();
    if (!state) return;

    if (state.stage === TOWN_TUTORIAL_STAGES.MOVE) {
      const bodyX = this.scene.playerController?.physicsBody?.x;
      if (Number.isFinite(bodyX)) {
        const distanceTiles = this.movementDistance.update(bodyX)
          / this.scene.config.tileSize;
        if (this.retention.recordTutorialMovement(distanceTiles)) {
          this.scene.queueDugTilesSave?.();
        }
      }
    }
    if (
      state.stage === TOWN_TUTORIAL_STAGES.FLIGHT
      && this.scene.playerController?.abilities?.isFlying?.() === true
      && this.retention.recordTutorialFlight()
    ) {
      this.scene.queueDugTilesSave?.();
    }
    if (state.stage === TOWN_TUTORIAL_STAGES.RESUME) {
      this._pointAtResumeRoute();
    }
    if (state.stage === TOWN_TUTORIAL_STAGES.PORTAL) {
      this.scene.firstSessionPortalSystem?.ensure?.();
    }

    this._syncStage(false);
    this._updateFreeFlight(deltaMs);
    this.firstFive.update();
  }

  isShowingGuide() {
    return this.retention?.isTutorialActive?.() === true
      || this.firstFive.hasPersistentGuide();
  }

  isFreeFlightActive() {
    return this.retention?.isTutorialFreeFlightActive?.() === true;
  }

  isFirstFiveEnabled() {
    return this.firstFive.isEnabled();
  }

  getNextPromiseOverride() {
    return this.firstFive.getNextPromiseOverride();
  }

  getFocusedUpgradeId(merchantId) {
    return this.firstFive.getFocusedUpgradeId(merchantId);
  }

  isUpgradeAvailable(upgradeId) {
    return this.firstFive.isUpgradeAvailable(upgradeId);
  }

  getPreferredMerchantMode(merchantId) {
    return this.firstFive.getPreferredMerchantMode(merchantId);
  }

  getUpgradePreview(upgradeId) {
    return this.firstFive.getUpgradePreview(upgradeId);
  }

  isDescentBlocked() {
    return this.firstFive.isDescentBlocked();
  }

  getRequiredDigSite() {
    return getTownTutorialDigSite(this.scene);
  }

  handleDescentBlocked() {
    this.firstFive.handleDescentBlocked();
  }

  enforceSurfaceSafety() {
    return this.firstFive.enforceSurfaceSafety();
  }

  getHealthSnapshot() {
    return this.firstFive.getHealthSnapshot();
  }

  resize() {
    this.view?.resize();
  }

  _syncStage(initial) {
    const state = this.retention?.getTutorialState?.();
    const stage = state?.stage;
    if (!stage || stage === this.lastStage) return;
    this.lastStage = stage;
    this._enterStage(stage);
  }

  _enterStage(stage) {
    const firstFiveHandled = this.firstFive.onStageEntered(stage);

    if (stage === TOWN_TUTORIAL_STAGES.MOVE) {
      this.movementDistance.reset(
        this.scene.playerController?.physicsBody?.x ?? null,
      );
      if (!firstFiveHandled) this.view.clearMarker();
      return;
    }
    if (stage === TOWN_TUTORIAL_STAGES.DIG) {
      const site = prepareTownTutorialDigSite(this.scene)
        || getTownTutorialDigSite(this.scene);
      const tileSize = this.scene.config.tileSize;
      this.view.pointAt(
        (site.tx + 0.5) * tileSize,
        site.ty * tileSize + RETENTION_CONFIG.tutorial.ui.digMarkerOffsetYPx,
      );
      return;
    }
    if (stage === TOWN_TUTORIAL_STAGES.FLIGHT) {
      this.view.clearMarker();
      this._grantFlightTraining();
      return;
    }
    if (stage === TOWN_TUTORIAL_STAGES.PORTAL) {
      this.scene.firstSessionPortalSystem?.ensure?.();
      const site = this.scene.firstSessionPortalSystem?.getPortalTile?.();
      if (site) this._pointAtSite(site);
      else this.view.clearMarker();
      return;
    }
    if (stage === TOWN_TUTORIAL_STAGES.SELL) {
      this._pointAtMerchant(RETENTION_CONFIG.tutorial.merchants.sell);
      return;
    }
    if (stage === TOWN_TUTORIAL_STAGES.UPGRADE) {
      this._pointAtMerchant(RETENTION_CONFIG.tutorial.merchants.upgrade);
      return;
    }
    if (stage === TOWN_TUTORIAL_STAGES.RESUME) {
      this._pointAtSurfacePortal();
      return;
    }
    if (
      stage === TOWN_TUTORIAL_STAGES.COMPLETE
      || stage === TOWN_TUTORIAL_STAGES.SKIPPED
    ) {
      this.view.clearMarker();
      this._grantFlightTraining();
      this._ensureLegacyFlight(stage);
    }
  }

  _grantFlightTraining() {
    const state = this.retention.getTutorialState();
    if (
      state.choice === TOWN_TUTORIAL_CHOICES.LEGACY
      || state.stage === TOWN_TUTORIAL_STAGES.UNSELECTED
    ) {
      return;
    }
    const newlyGranted = this.retention.claimTutorialFlightTraining();
    const reward = newlyGranted
      || RETENTION_CONFIG.tutorial.flightTraining;
    this.scene.upgradeSystem?.grantUpgrade?.(reward.flightUpgradeId);
    this.scene.armHardcoreAfterFlightUnlock?.("town-tutorial-flight-training");
    this.scene.playerController?.abilities?.fillGemPower?.();
    this.scene.queueDugTilesSave?.();
  }

  _ensureLegacyFlight(stage) {
    const state = this.retention.getTutorialState();
    if (
      state.choice !== TOWN_TUTORIAL_CHOICES.LEGACY
      || stage === TOWN_TUTORIAL_STAGES.UNSELECTED
      || this.scene.upgradeSystem?.isGemPowerUnlocked?.() === true
    ) {
      return;
    }
    const upgradeId = RETENTION_CONFIG.tutorial.flightTraining.flightUpgradeId;
    this.scene.upgradeSystem?.grantUpgrade?.(upgradeId);
    this.scene.armHardcoreAfterFlightUnlock?.("legacy-tutorial-migration");
    this.scene.playerController?.abilities?.fillGemPower?.();
    this.scene.queueDugTilesSave?.();
  }

  _pointAtSite(site) {
    const tileSize = this.scene.config.tileSize;
    this.view.pointAt(
      (site.tx + 0.5) * tileSize,
      site.ty * tileSize + RETENTION_CONFIG.tutorial.ui.digMarkerOffsetYPx,
    );
  }

  _pointAtSurfacePortal() {
    const portal = V11_SKY_ISLAND_LAYOUT.levels[0]?.groundPortal;
    const tiles = portal?.interactionTiles || [];
    if (tiles.length === 0) {
      this.view.clearMarker();
      return;
    }
    const tileSize = this.scene.config.tileSize;
    const tx = tiles.reduce((sum, tile) => sum + tile.tx, 0) / tiles.length;
    const ty = tiles.reduce((sum, tile) => sum + tile.ty, 0) / tiles.length;
    this.view.pointAt(
      (tx + 0.5) * tileSize,
      (ty + 0.25) * tileSize,
    );
  }

  _pointAtResumeRoute() {
    const playerTile = this.scene.playerController?.getPlayerTile?.();
    const portal = this.scene.specialTileSystem?.getActivatedPortals?.()[0];
    const isOnSkyRoute = playerTile
      && playerTile.ty < this.scene.config.topAirRows - 4;
    if (isOnSkyRoute && portal?.pairData) {
      this._pointAtSite({
        tx: portal.pairData.skyTx,
        ty: portal.pairData.skyTy,
      });
      return;
    }
    this._pointAtSurfacePortal();
  }

  _pointAtMerchant(merchantId) {
    const sprite = this.scene.npcManager?.getNPCSprite?.(merchantId);
    if (!sprite) {
      this.view.clearMarker();
      return;
    }
    this.view.pointAt(
      sprite.x,
      sprite.y - Math.max(
        RETENTION_CONFIG.tutorial.ui.merchantMinimumHeightPx,
        sprite.displayHeight || 0,
      ) - RETENTION_CONFIG.tutorial.ui.merchantMarkerGapPx,
    );
  }

  _updateFreeFlight(deltaMs) {
    if (
      !this.isFreeFlightActive()
      || this.scene.playerController?.abilities?.isFlying?.() !== true
    ) {
      this._flightSaveElapsedMs = 0;
      return;
    }
    const consumed = this.retention.consumeTutorialFreeFlight(deltaMs);
    if (consumed <= 0) return;
    this._flightSaveElapsedMs += consumed;
    if (
      this._flightSaveElapsedMs
        >= RETENTION_CONFIG.tutorial.ui.freeFlightSaveIntervalMs
      || !this.isFreeFlightActive()
    ) {
      this._flightSaveElapsedMs = 0;
      this.scene.queueDugTilesSave?.();
    }
  }

  destroy() {
    this.firstFive?.destroy();
    this.firstFive = null;
    this.scene?.playerController?.abilities?.setFreeFlightProvider?.(null);
    this.view?.destroy();
    this.view = null;
    this.retention = null;
    this.scene = null;
  }
}
