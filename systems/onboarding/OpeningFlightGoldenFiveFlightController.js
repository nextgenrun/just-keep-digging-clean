import { OPENING_FLIGHT_STAGES } from "../../values/openingFlightArtifact.js";
import {
  openOpeningFlightGoldenFiveEscape,
  prepareOpeningFlightGoldenFiveRewardLedge,
} from "./OpeningFlightStarterSeam.js";
import {
  getOpeningFlightAnchors,
  getOpeningFlightArtifactBottomWorld,
  getOpeningFlightCacheBottomWorld,
  getOpeningFlightCacheCenterWorld,
  getOpeningFlightRingWorlds,
  getOpeningFlightTileSize,
} from "./openingFlightGoldenFiveGeometry.js";
import {
  getOpeningFlightKeyLabels,
  interpolateOpeningFlightCopy,
} from "./openingFlightGoldenFiveCopy.js";

export class OpeningFlightGoldenFiveFlightController {
  constructor(runtime) {
    this.runtime = runtime;
    this.trialStartToastShown = false;
    this.revealTimer = null;
    this.controlsWereEnabled = false;
  }

  collectArtifact() {
    const runtime = this.runtime;
    const { scene, config, artifactConfig, view } = runtime;
    if (runtime.state.artifactCollected) return;
    runtime.state = {
      ...runtime.state,
      stage: OPENING_FLIGHT_STAGES.REVEAL,
      artifactCollected: true,
      ringsPassed: 0,
      trialStarted: false,
      trialRemainingMs: config.freeFlightBankMs,
      trialComplete: false,
      surfaceReturnCelebrated: false,
    };
    scene.upgradeSystem?.grantUpgrade?.(artifactConfig.upgradeId);
    scene.playerController?.abilities?.fillGemPower?.();
    scene.armHardcoreAfterFlightUnlock?.("opening-flight-golden-five");
    openOpeningFlightGoldenFiveEscape(scene, config);
    prepareOpeningFlightGoldenFiveRewardLedge(scene, config);
    view.revealArtifact(getOpeningFlightArtifactBottomWorld(scene, config));
    view.showEscapeRings(getOpeningFlightRingWorlds(scene, config), 0);
    view.showHud({
      phase: config.copy.phaseArtifact,
      title: config.copy.unlockTitle,
      body: interpolateOpeningFlightCopy(
        config.copy.unlockBody,
        getOpeningFlightKeyLabels(),
      ),
      progress: 1,
      accent: "gold",
    });
    scene.soundSystem?.playUiConfirm?.();
    scene.uiNotifications?.success?.(
      config.copy.unlockToast,
      { durationMs: config.feedback.unlockToastDurationMs },
    );
    this._lockControlsForReveal();
    scene.queueDugTilesSave?.();
  }

  _lockControlsForReveal() {
    const { scene, config } = this.runtime;
    const input = scene.playerController?.input;
    this.controlsWereEnabled = input?.controlsEnabled !== false;
    if (this.controlsWereEnabled) input?.setControlsEnabled?.(false);
    const finishReveal = () => {
      if (!this.runtime?.scene) return;
      if (this.controlsWereEnabled) {
        scene.playerController?.input?.setControlsEnabled?.(true);
      }
      this.controlsWereEnabled = false;
      this.runtime.state.stage = OPENING_FLIGHT_STAGES.ESCAPE;
      this.runtime.view.settleArtifact();
      this._showEscapeHud();
      scene.queueDugTilesSave?.();
    };
    this.revealTimer = scene.time?.delayedCall?.(
      config.revealControlLockMs,
      finishReveal,
    ) || null;
    if (!this.revealTimer) finishReveal();
  }

  updateProtectedEscape(playerWorld, playerTile) {
    const { scene, config, state, view } = this.runtime;
    const rings = getOpeningFlightRingWorlds(scene, config);
    const nextRing = Math.min(state.ringsPassed, rings.length - 1);
    if (
      state.ringsPassed < rings.length
      && Math.hypot(
        playerWorld.x - rings[nextRing].x,
        playerWorld.y - rings[nextRing].y,
      ) <= config.escape.ringRadiusTiles * getOpeningFlightTileSize(scene)
    ) {
      view.passRing(nextRing);
      state.ringsPassed = nextRing + 1;
      scene.soundSystem?.playUiConfirm?.();
      scene.floatingTextSystem?.showFloatingText?.(
        rings[nextRing].x,
        rings[nextRing].y,
        `${state.ringsPassed} / ${rings.length}`,
        config.feedback.cyan,
        config.feedback.ringDurationMs,
        config.feedback.ringFontSize,
      );
      scene.queueDugTilesSave?.();
    }
    this._showEscapeHud(rings.length);

    if (
      playerTile.ty
      <= getOpeningFlightAnchors(scene, config).surfaceRow - 1
    ) {
      for (let index = state.ringsPassed; index < rings.length; index += 1) {
        view.passRing(index);
      }
      this.celebrateSurfaceReturn();
    }
  }

  _showEscapeHud(ringCount = this.runtime.config.escape.rings.length) {
    const { config, state, view } = this.runtime;
    view.showHud({
      phase: config.copy.phaseEscape,
      title: config.copy.escapeTitle,
      body: interpolateOpeningFlightCopy(
        config.copy.escapeBody,
        getOpeningFlightKeyLabels(),
      ),
      progress: state.ringsPassed / Math.max(1, ringCount),
      accent: "violet",
    });
  }

  celebrateSurfaceReturn() {
    const { scene, config, state, view } = this.runtime;
    if (state.surfaceReturnCelebrated) return;
    state.surfaceReturnCelebrated = true;
    state.stage = OPENING_FLIGHT_STAGES.FREE_FLIGHT;
    state.ringsPassed = config.escape.rings.length;
    state.trialStarted = false;
    state.trialRemainingMs = config.freeFlightBankMs;
    state.trialComplete = false;
    scene.earthquakeSystem?.setPaused(false);
    scene.playerController?.abilities?.fillGemPower?.();
    view.showCache(getOpeningFlightCacheBottomWorld(scene, config));
    this._showFreeFlightHud();
    scene.soundSystem?.playUiConfirm?.();
    scene.uiNotifications?.success?.(
      config.copy.surfaceSuccess,
      { durationMs: config.feedback.surfaceToastDurationMs },
    );
    scene.queueDugTilesSave?.();
  }

  updateFreeFlight(deltaMs, playerWorld) {
    const { scene, config, state, view, reward } = this.runtime;
    if (state.cacheCollected) {
      if (!state.rewardGranted) reward.grantCacheReward();
      return;
    }

    view.showCache(getOpeningFlightCacheBottomWorld(scene, config));
    const cacheWorld = getOpeningFlightCacheCenterWorld(scene, config);
    if (
      Math.hypot(
        playerWorld.x - cacheWorld.x,
        playerWorld.y - cacheWorld.y,
      ) <= config.cache.pickupRadiusTiles * getOpeningFlightTileSize(scene)
    ) {
      state.cacheCollected = true;
      reward.grantCacheReward();
      return;
    }

    const flying = scene.playerController?.abilities?.isFlying?.() === true;
    if (flying && state.trialRemainingMs > 0) {
      if (!state.trialStarted) {
        state.trialStarted = true;
        scene.queueDugTilesSave?.();
      }
      if (!this.trialStartToastShown) {
        this.trialStartToastShown = true;
        scene.uiNotifications?.success?.(config.copy.freeStarted);
      }
      state.trialRemainingMs = Math.max(
        0,
        state.trialRemainingMs - Math.max(0, Number(deltaMs) || 0),
      );
      if (state.trialRemainingMs <= 0) this.completeTrial();
    }
    this._showFreeFlightHud();
  }

  _showFreeFlightHud() {
    const { config, state, view } = this.runtime;
    const keys = getOpeningFlightKeyLabels();
    const seconds = (state.trialRemainingMs / 1000).toFixed(1);
    const body = state.trialRemainingMs > 0
      ? `${interpolateOpeningFlightCopy(
        state.trialStarted
          ? config.copy.freeActiveBody
          : config.copy.freeReadyBody,
        { ...keys, seconds },
      )}  •  ${config.copy.cacheDirectionSuffix}`
      : interpolateOpeningFlightCopy(config.copy.freeEndedBody, {
        ...keys,
        cacheDirectionSuffix: config.copy.cacheDirectionSuffix,
      });
    view.showHud({
      phase: config.copy.phaseFlight,
      title: state.trialRemainingMs > 0
        ? config.copy.freeTitle
        : config.copy.cacheTitle,
      body,
      progress: state.trialRemainingMs / config.freeFlightBankMs,
      accent: state.trialRemainingMs > 0 ? "gold" : "cyan",
    });
  }

  completeTrial() {
    const { scene, config, state } = this.runtime;
    if (state.trialComplete) return;
    state.trialRemainingMs = 0;
    state.trialComplete = true;
    scene.earthquakeSystem?.setPaused(false);
    scene.uiNotifications?.info?.(config.copy.freeComplete);
    scene.queueDugTilesSave?.();
  }

  destroy() {
    const scene = this.runtime?.scene;
    if (this.controlsWereEnabled) {
      scene?.playerController?.input?.setControlsEnabled?.(true);
    }
    this.revealTimer?.remove?.(false);
    this.revealTimer = null;
    this.runtime = null;
  }
}
