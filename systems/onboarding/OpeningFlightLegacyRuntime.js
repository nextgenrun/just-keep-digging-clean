import { sanitizeOpeningFlightArtifactData } from "../../values/openingFlightArtifact.js";
import { USER_SETTINGS } from "../UserSettings.js";
import { OpeningFlightArtifactView } from "./OpeningFlightArtifactView.js";
import { prepareOpeningFlightStarterSeam } from "./OpeningFlightStarterSeam.js";

export class OpeningFlightLegacyRuntime {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config;
    this.state = sanitizeOpeningFlightArtifactData(null);
    this.view = new OpeningFlightArtifactView(scene, config);
    this.created = false;
    this.saveDataLoaded = false;
    this.legacyCompleted = false;
    this.approachHintShown = false;
    this.trialStartToastShown = false;
  }

  create() {
    if (this.created || !this.config.enabled) return;
    this.created = true;
    this._adoptLegacyUnlockIfNeeded();
    this._bindFreeFlightProvider();
    this.scene.earthquakeSystem?.setPaused(this.isOpeningGraceActive());
    if (!this.legacyCompleted) {
      prepareOpeningFlightStarterSeam(this.scene, this.config);
    }
    this._syncView();
  }

  update(deltaMs) {
    if (!this.created || !this.config.enabled) return;
    const playerWorld = this._getPlayerWorld();
    const playerTile = this.scene.playerController?.getPlayerTile?.();
    if (!playerWorld || !playerTile) return;

    if (!this.state.artifactCollected) {
      const atSurface = playerTile.ty <= this._getSurfaceRow() - 1;
      const waypoint = atSurface
        ? this._getEntranceWorld()
        : this._getArtifactWorld();
      this.view.setMiningObjective(!atSurface);
      this.view.updateGuidance(playerWorld, waypoint);
      this._showApproachHint(playerTile);
      this._tryCollect(playerWorld);
      return;
    }

    if (this.state.trialRemainingMs <= 0) return;
    const flying = this.scene.playerController?.abilities?.isFlying?.() === true;
    if (flying) {
      if (!this.state.trialStarted) {
        this.state.trialStarted = true;
        this.scene.queueDugTilesSave?.();
      }
      if (!this.trialStartToastShown) {
        this.trialStartToastShown = true;
        this.scene.uiNotifications?.success(this.config.copy.trialStarted);
      }
      this.state.trialRemainingMs = Math.max(
        0,
        this.state.trialRemainingMs - Math.max(0, deltaMs),
      );
    }
    this.view.updateTrial(
      this.state.trialRemainingMs,
      this.state.trialStarted,
      this._getFlyKeyLabel(),
    );
    this._celebrateSurfaceReturn(playerTile);
    if (this.state.trialRemainingMs <= 0) this._completeTrial();
  }

  isFreeFlightActive() {
    return this.state.artifactCollected && this.state.trialRemainingMs > 0;
  }

  isOpeningGraceActive() {
    return !this.legacyCompleted
      && !this.state.surfaceReturnCelebrated
      && !this.state.trialComplete;
  }

  isArtifactCollected() {
    return this.state.artifactCollected === true;
  }

  getSaveData() {
    return {
      version: this.config.saveVersion,
      artifactCollected: this.state.artifactCollected,
      trialStarted: this.state.trialStarted,
      trialRemainingMs: Math.ceil(this.state.trialRemainingMs),
      trialComplete: this.state.trialComplete,
      surfaceReturnCelebrated: this.state.surfaceReturnCelebrated,
    };
  }

  loadSaveData(data) {
    this.saveDataLoaded = Boolean(data && typeof data === "object");
    this.legacyCompleted = false;
    this.state = sanitizeOpeningFlightArtifactData(data);
    if (this.state.artifactCollected) {
      this.scene.upgradeSystem?.grantUpgrade?.(this.config.upgradeId);
    } else {
      this._adoptLegacyUnlockIfNeeded();
    }
    if (!this.created) return;
    this.scene.earthquakeSystem?.setPaused(this.isOpeningGraceActive());
    if (!this.legacyCompleted) {
      prepareOpeningFlightStarterSeam(this.scene, this.config);
    }
    this._syncView();
  }

  _adoptLegacyUnlockIfNeeded() {
    if (this.saveDataLoaded || this.state.artifactCollected) return;
    if (this.scene.upgradeSystem?.isGemPowerUnlocked?.() !== true) return;
    this.legacyCompleted = true;
    this.state = {
      ...this.state,
      artifactCollected: true,
      trialComplete: true,
      trialRemainingMs: 0,
    };
  }

  _bindFreeFlightProvider() {
    this.scene.playerController?.abilities?.setFreeFlightProvider?.(
      () => this.isFreeFlightActive(),
    );
  }

  _syncView() {
    if (this.state.artifactCollected) {
      if (this.state.trialRemainingMs > 0) {
        this.view.transitionToTrial(this._getFlyKeyLabel());
        this.view.updateTrial(
          this.state.trialRemainingMs,
          this.state.trialStarted,
          this._getFlyKeyLabel(),
        );
      } else {
        this.view.hideGuidance();
        this.view.hideTrial();
      }
      return;
    }
    this.view.createGuidance(
      this._getArtifactWorld(),
      this._getEntranceArrowWorld(),
    );
  }

  _showApproachHint(playerTile) {
    if (
      this.approachHintShown
      || playerTile.ty > this._getSurfaceRow() - 1
      || Math.abs(playerTile.tx - this._getTileX())
        > this.config.approachRadiusTiles
    ) {
      return;
    }
    this.approachHintShown = true;
    this.scene.uiNotifications?.warning(this.config.copy.approachHint);
  }

  _tryCollect(playerWorld) {
    const artifactWorld = this._getArtifactWorld();
    const pickupRadiusPx = this.config.pickupRadiusTiles
      * this.scene.config.tileSize;
    const exposed = !this.scene.worldModel?.isSolid?.(
      this._getTileX(),
      this._getArtifactTileY(),
    );
    if (!exposed || Math.hypot(
      playerWorld.x - artifactWorld.x,
      playerWorld.y - artifactWorld.y,
    ) > pickupRadiusPx) {
      return;
    }
    this._collect(artifactWorld);
  }

  _collect(artifactWorld) {
    if (this.state.artifactCollected) return;
    this.state = {
      ...this.state,
      artifactCollected: true,
      trialStarted: false,
      trialRemainingMs: this.config.trialDurationMs,
      trialComplete: false,
    };
    this.scene.upgradeSystem?.grantUpgrade?.(this.config.upgradeId);
    this.scene.playerController?.abilities?.fillGemPower?.();
    this.scene.armHardcoreAfterFlightUnlock?.("opening-flight-legacy");
    this.view.showCollectionBurst(artifactWorld);
    this.view.transitionToTrial(this._getFlyKeyLabel());
    this.scene.soundSystem?.playUiConfirm?.();
    this.scene.uiNotifications?.success(this.config.copy.pickupToast);
    this.scene.queueDugTilesSave?.();
  }

  _celebrateSurfaceReturn(playerTile) {
    if (
      this.state.surfaceReturnCelebrated
      || !this.state.trialStarted
      || playerTile.ty > this._getSurfaceRow() - 1
    ) {
      return;
    }
    this.state.surfaceReturnCelebrated = true;
    this.scene.earthquakeSystem?.setPaused(false);
    this.scene.uiNotifications?.success(this.config.copy.returnSuccess);
    this.scene.queueDugTilesSave?.();
  }

  _completeTrial() {
    if (this.state.trialComplete) return;
    this.state.trialRemainingMs = 0;
    this.state.trialComplete = true;
    this.scene.earthquakeSystem?.setPaused(false);
    this.view.hideTrial();
    this.scene.uiNotifications?.warning(this.config.copy.trialComplete);
    this.scene.time?.delayedCall?.(
      this.config.gpExplainerDelayMs,
      () => this.scene.uiNotifications?.info(this.config.copy.gpExplainer),
    );
    this.scene.queueDugTilesSave?.();
  }

  _getTileX() {
    return this.scene.config.spawnTileX
      + this.config.starterSeam.tileXOffsetFromLegacySpawn;
  }

  _getSurfaceRow() {
    return this.scene.config.topAirRows
      + this.config.starterSeam.surfaceRowOffset;
  }

  _getArtifactTileY() {
    return this._getSurfaceRow() + this.config.starterSeam.artifactDepthTiles;
  }

  _getArtifactWorld() {
    return this.scene.worldModel.tileToWorld(
      this._getTileX(),
      this._getArtifactTileY(),
    );
  }

  _getEntranceWorld() {
    return this.scene.worldModel.tileToWorld(
      this._getTileX(),
      this._getSurfaceRow() - 1,
    );
  }

  _getEntranceArrowWorld() {
    const world = this._getEntranceWorld();
    return {
      x: world.x,
      y: world.y - this.config.worldView.arrowTopOffsetTiles
        * this.scene.config.tileSize,
    };
  }

  _getPlayerWorld() {
    const body = this.scene.playerController?.physicsBody;
    if (body) {
      return { x: body.x + body.w / 2, y: body.y + body.h / 2 };
    }
    return this.scene.playerController?.getPlayerPosition?.() || null;
  }

  _getFlyKeyLabel() {
    return USER_SETTINGS.getKeyLabel(this.config.flyActionId);
  }

  destroy() {
    this.scene.playerController?.abilities?.setFreeFlightProvider?.(null);
    this.view?.destroy();
    this.view = null;
    this.scene = null;
    this.created = false;
  }
}
