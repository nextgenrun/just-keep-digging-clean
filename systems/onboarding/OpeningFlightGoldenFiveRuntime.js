import {
  OPENING_FLIGHT_GOLDEN_FIVE_CONFIG,
  OPENING_FLIGHT_STAGES,
  sanitizeOpeningFlightArtifactData,
} from "../../values/openingFlightArtifact.js";
import {
  openOpeningFlightGoldenFiveEscape,
  prepareOpeningFlightGoldenFiveDescent,
  prepareOpeningFlightGoldenFiveRewardLedge,
} from "./OpeningFlightStarterSeam.js";
import { OpeningFlightGoldenFiveDescentController } from "./OpeningFlightGoldenFiveDescentController.js";
import { OpeningFlightGoldenFiveFlightController } from "./OpeningFlightGoldenFiveFlightController.js";
import { OpeningFlightGoldenFiveRewardController } from "./OpeningFlightGoldenFiveRewardController.js";
import { OpeningFlightGoldenFiveView } from "./OpeningFlightGoldenFiveView.js";
import {
  countBrokenOpeningFlightPathTiles,
  getOpeningFlightArtifactBottomWorld,
  getOpeningFlightCacheBottomWorld,
  getOpeningFlightEntranceBottomWorld,
  getOpeningFlightPlayerWorld,
  getOpeningFlightRingWorlds,
} from "./openingFlightGoldenFiveGeometry.js";
import {
  getOpeningFlightKeyLabels,
  interpolateOpeningFlightCopy,
} from "./openingFlightGoldenFiveCopy.js";

export class OpeningFlightGoldenFiveRuntime {
  constructor(
    scene,
    artifactConfig,
    config = OPENING_FLIGHT_GOLDEN_FIVE_CONFIG,
  ) {
    this.scene = scene;
    this.artifactConfig = artifactConfig;
    this.config = config;
    this.view = new OpeningFlightGoldenFiveView(scene, config);
    this.state = sanitizeOpeningFlightArtifactData(null);
    this.created = false;
    this.saveDataLoaded = false;
    this.legacyCompleted = false;
    this.reward = new OpeningFlightGoldenFiveRewardController(this);
    this.flight = new OpeningFlightGoldenFiveFlightController(this);
    this.descent = new OpeningFlightGoldenFiveDescentController(this);
  }

  create() {
    if (this.created || !this.config.enabled) return;
    this.created = true;
    this._adoptLegacyUnlockIfNeeded();
    this._bindFreeFlightProvider();
    this.scene.earthquakeSystem?.setPaused(this.isOpeningGraceActive());
    this._prepareEnvironment();
    this.reward.recoverInterruptedReward();
    this._syncView();
  }

  update(deltaMs) {
    if (!this.created || this.legacyCompleted) return;
    const playerWorld = getOpeningFlightPlayerWorld(this.scene);
    const playerTile = this.scene.playerController?.getPlayerTile?.();
    if (!playerWorld || !playerTile) return;

    if (!this.state.artifactCollected) {
      this.descent.update(deltaMs, playerWorld);
      return;
    }
    if (!this.state.surfaceReturnCelebrated) {
      this.flight.updateProtectedEscape(playerWorld, playerTile);
      return;
    }
    this.flight.updateFreeFlight(deltaMs, playerWorld);
  }

  isFreeFlightActive() {
    if (!this.state.artifactCollected) return false;
    if (
      this.state.cacheCollected
      || this.state.onboardingComplete
    ) {
      return false;
    }
    if (!this.state.surfaceReturnCelebrated) return true;
    if (this.state.trialComplete) return false;
    return this.state.trialRemainingMs > 0;
  }

  isOpeningGraceActive() {
    return !this.legacyCompleted && !this.state.surfaceReturnCelebrated;
  }

  isArtifactCollected() {
    return this.state.artifactCollected === true;
  }

  getSaveData() {
    return {
      version: this.config.saveVersion,
      stage: this.state.stage,
      artifactCollected: this.state.artifactCollected,
      firstDigCelebrated: this.state.firstDigCelebrated,
      ringsPassed: this.state.ringsPassed,
      trialStarted: this.state.trialStarted,
      trialRemainingMs: Math.ceil(this.state.trialRemainingMs),
      trialComplete: this.state.trialComplete,
      surfaceReturnCelebrated: this.state.surfaceReturnCelebrated,
      cacheCollected: this.state.cacheCollected,
      rewardGranted: this.state.rewardGranted,
      onboardingComplete: this.state.onboardingComplete,
    };
  }

  loadSaveData(data) {
    this.saveDataLoaded = Boolean(data && typeof data === "object");
    this.legacyCompleted = false;
    this.state = sanitizeOpeningFlightArtifactData(data);
    if (this.state.artifactCollected) {
      this.scene.upgradeSystem?.grantUpgrade?.(this.artifactConfig.upgradeId);
    } else {
      this._adoptLegacyUnlockIfNeeded();
    }
    if (!this.created) return;
    this.scene.earthquakeSystem?.setPaused(this.isOpeningGraceActive());
    this._prepareEnvironment();
    this.reward.recoverInterruptedReward();
    this._syncView();
  }

  _prepareEnvironment() {
    if (this.legacyCompleted) return;
    if (!this.state.onboardingComplete) {
      const weather = this.config.openingWeather;
      this.scene.weatherSystem?.forceWeather?.(
        weather.kind,
        weather.intensity,
        weather.durationMs,
      );
    }
    if (this.state.artifactCollected) {
      if (!this.state.onboardingComplete) {
        this.scene.playerController?.abilities?.fillGemPower?.();
      }
      openOpeningFlightGoldenFiveEscape(this.scene, this.config);
      prepareOpeningFlightGoldenFiveRewardLedge(this.scene, this.config);
      return;
    }
    prepareOpeningFlightGoldenFiveDescent(this.scene, this.config);
  }

  _syncView() {
    this.view.destroy();
    this.view = new OpeningFlightGoldenFiveView(this.scene, this.config);
    if (this.legacyCompleted || this.state.onboardingComplete) return;

    this.view.createBuriedGuidance(
      getOpeningFlightArtifactBottomWorld(this.scene, this.config),
      getOpeningFlightEntranceBottomWorld(this.scene, this.config),
    );
    if (!this.state.artifactCollected) {
      this.view.showHud({
        phase: this.config.copy.phaseDig,
        title: this.config.copy.arrivalTitle,
        body: interpolateOpeningFlightCopy(
          this.config.copy.arrivalBody,
          getOpeningFlightKeyLabels(),
        ),
        progress: countBrokenOpeningFlightPathTiles(this.scene, this.config)
          / this.config.layout.path.length,
        accent: "cyan",
      });
      return;
    }

    this.view.revealArtifact(
      getOpeningFlightArtifactBottomWorld(this.scene, this.config),
      { instant: true },
    );
    this.view.settleArtifact({ instant: true });
    if (!this.state.surfaceReturnCelebrated) {
      this.view.showEscapeRings(
        getOpeningFlightRingWorlds(this.scene, this.config),
        this.state.ringsPassed,
      );
      this.view.showHud({
        phase: this.config.copy.phaseEscape,
        title: this.config.copy.escapeTitle,
        body: interpolateOpeningFlightCopy(
          this.config.copy.escapeBody,
          getOpeningFlightKeyLabels(),
        ),
        progress: this.state.ringsPassed / this.config.escape.rings.length,
        accent: "violet",
      });
      return;
    }

    if (!this.state.cacheCollected) {
      this.view.showCache(
        getOpeningFlightCacheBottomWorld(this.scene, this.config),
      );
      this.view.showHud({
        phase: this.config.copy.phaseFlight,
        title: this.config.copy.freeTitle,
        body: interpolateOpeningFlightCopy(
          this.config.copy.freeReadyBody,
          getOpeningFlightKeyLabels(),
        ),
        progress: this.state.trialRemainingMs / this.config.freeFlightBankMs,
        accent: "gold",
      });
    }
  }

  _adoptLegacyUnlockIfNeeded() {
    if (this.saveDataLoaded || this.state.artifactCollected) return;
    if (this.scene.upgradeSystem?.isGemPowerUnlocked?.() !== true) return;
    this.legacyCompleted = true;
    this.state = {
      ...this.state,
      stage: OPENING_FLIGHT_STAGES.COMPLETE,
      artifactCollected: true,
      trialComplete: true,
      trialRemainingMs: 0,
      surfaceReturnCelebrated: true,
      onboardingComplete: true,
    };
  }

  _bindFreeFlightProvider() {
    this.scene.playerController?.abilities?.setFreeFlightProvider?.(
      () => this.isFreeFlightActive(),
    );
  }

  _celebrateSurfaceReturn() {
    this.flight.celebrateSurfaceReturn();
  }

  _updateFreeFlight(deltaMs, playerWorld) {
    this.flight.updateFreeFlight(deltaMs, playerWorld);
  }

  _grantCacheReward() {
    this.reward.grantCacheReward();
  }

  destroy() {
    this.descent?.destroy();
    this.flight?.destroy();
    this.reward?.destroy();
    this.scene.playerController?.abilities?.setFreeFlightProvider?.(null);
    this.view?.destroy();
    this.descent = null;
    this.flight = null;
    this.reward = null;
    this.view = null;
    this.scene = null;
    this.created = false;
  }
}
