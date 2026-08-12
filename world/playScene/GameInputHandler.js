/**
 * Game Input Handler
 * Centralizes all input action triggers and game-state-specific input logic
 */
import { GAME_CONFIG } from "../../values/gameConfig.js";
import { USER_SETTINGS } from "../../systems/UserSettings.js";
import { hasEscapeClosableUi } from "./hasEscapeClosableUi.js";
import {
  GAMEPLAY_FEATURE_IDS,
  isGameplayFeatureEnabled,
} from "../../values/gameplayDevFlags.js";

function justDown(key) {
  return key && Phaser.Input.Keyboard.JustDown(key);
}

function consumeFullscreenToggleHandledByDom() {
  if (typeof window === 'undefined') return false;
  const handledAt = Number(window.__fullscreenToggleHandledAt || 0);
  if (!handledAt || Date.now() - handledAt > 250) return false;
  window.__fullscreenToggleHandledAt = 0;
  return true;
}

export class GameInputHandler {
  constructor(scene, inputHandler, playerInput) {
    this.scene = scene;
    this.inputHandler = inputHandler;
    this.playerInput = playerInput;
    this._hardEscapeHandledOnDown = false;
    this._hardEscapeKey = inputHandler.getKeys().hardEscape;
    this._onHardEscapeDown = () => this._handleHardEscapeDown();
    this._onSceneShutdown = () => this.destroy();
    this._hardEscapeKey?.on?.("down", this._onHardEscapeDown);
    scene.events?.once?.(Phaser.Scenes.Events.SHUTDOWN, this._onSceneShutdown);
  }

  _handleHardEscapeDown() {
    this._hardEscapeHandledOnDown = false;

    // Escape cancels key capture without also closing the Settings / Pause UI.
    if (this.scene._settingsKeyCaptureActive) {
      this._hardEscapeHandledOnDown = true;
      return;
    }

    if (!hasEscapeClosableUi(this.scene)) return;

    // Key.on("down") runs before Phaser's key-specific and generic listeners.
    // Close the top UI here, then remember that this physical press is spent so
    // the frame-level JustDown cannot reopen Pause after another listener runs.
    this._hardEscapeHandledOnDown = true;
    this.scene.closeTopOverlay?.("escape");
  }

  handleEscapeInput() {
    if (this.scene._settingsKeyCaptureActive) return false;

    const keys = this.inputHandler.getKeys();
    const hardEscapePressed = justDown(keys.hardEscape);
    const pausePressed = keys.escape === keys.hardEscape
      ? hardEscapePressed
      : justDown(keys.escape) || hardEscapePressed;
    if (!pausePressed) return false;

    if (this._hardEscapeHandledOnDown) {
      this._hardEscapeHandledOnDown = false;
      return true;
    }

    if (hasEscapeClosableUi(this.scene)) {
      this.scene.closeTopOverlay?.("escape");
      return true;
    }

    if (this.scene.gameState !== "playing") return false;
    if (this.scene.thunderStrikeActionRuntime?.cancel?.(this.scene.time?.now)) {
      return true;
    }

    this.scene.showPauseMenu?.();

    return true;
  }

  destroy() {
    this._hardEscapeKey?.off?.("down", this._onHardEscapeDown);
    this.scene?.events?.off?.(
      Phaser.Scenes.Events.SHUTDOWN,
      this._onSceneShutdown,
    );
    this._hardEscapeKey = null;
    this._onHardEscapeDown = null;
    this._onSceneShutdown = null;
  }

  handleGlobalInput() {
    const keys = this.inputHandler.getKeys();

    if (this.scene._settingsKeyCaptureActive) return false;

    if (GAME_CONFIG.debugMode && keys.shift.isDown && justDown(keys.restart)) {
      console.log('[INPUT] Shift+R pressed - hard reset game');
      this.scene.hardResetGame();
      return true;
    }

    if (GAME_CONFIG.debugMode && justDown(keys.devCheat)) {
      console.log('[DEVCHEAT] V key pressed! Game state:', this.scene.gameState);
      this.scene.activateDevCheat();
      return true;
    }

    if (justDown(keys.fullscreen)) {
      if (consumeFullscreenToggleHandledByDom()) return true;
      if (typeof window !== 'undefined' && window.__toggleGameFullscreen) {
        window.__toggleGameFullscreen().catch(error => console.warn('[Fullscreen] Toggle failed:', error));
      }
      return true;
    }

    if (
      isGameplayFeatureEnabled(GAMEPLAY_FEATURE_IDS.SCREEN_CAPTURE)
      && GAME_CONFIG.debugMode
      && justDown(keys.screenRecord)
    ) {
      this.scene.screenRecordSystem?.toggle();
      return true;
    }

    if (justDown(keys.map)) {
      this.scene.toggleWorldMap?.();
      return true;
    }

    if (justDown(keys.muteMusic)) {
      const musicOn = !this.scene.soundSystem.musicEnabled;
      USER_SETTINGS.updateAudio({ musicEnabled: musicOn });
      USER_SETTINGS.applyAudioTo(this.scene.soundSystem);
      this.scene.uiMuteToggle?.syncMusicState(musicOn);
      return true;
    }

    if (justDown(keys.muteSfx)) {
      const sfxOn = !this.scene.soundSystem.sfxEnabled;
      USER_SETTINGS.updateAudio({ sfxEnabled: sfxOn });
      USER_SETTINGS.applyAudioTo(this.scene.soundSystem);
      this.scene.uiMuteToggle?.syncSfxState(sfxOn);
      return true;
    }

    return false;
  }

  handleTitleStateInput() {
    const keys = this.inputHandler.getKeys();
    if (justDown(keys.enter) || this.playerInput.hasMovementInput()) {
      this.scene.startRun();
      return true;
    }
    return false;
  }

  handleDialogStateInput() {
    const keys = this.inputHandler.getKeys();
    if (justDown(keys.enter) ||
        justDown(keys.interact) ||
        this.playerInput.hasMovementInput()) {
      this.scene.hideOverlay();
      this.scene.closeGameDialog?.();
      return true;
    }
    return false;
  }

  handleDeadStateInput() {
    const keys = this.inputHandler.getKeys();
    if ((GAME_CONFIG.debugMode && justDown(keys.restart)) ||
        justDown(keys.enter)) {
      console.log('[INPUT] R or ENTER pressed - restart run');
      this.scene.restartRun();
      return true;
    }
    return false;
  }

  handlePausedStateInput() {
    if (this.scene._settingsKeyCaptureActive) return false;

    const keys = this.inputHandler.getKeys();
    if (justDown(keys.interact)) {
      this.scene.unstuckPlayer();
      return true;
    }
    if (justDown(keys.mainMenuKey)) {
      this.scene.returnToMainMenu();
      return true;
    }
    return false;
  }

  handlePlayingStateInput() {
    if (this.scene._settingsKeyCaptureActive) return false;

    this.scene.worldMapDiscoverySystem?.updatePlayerDiscovery?.();
    const keys = this.inputHandler.getKeys();
    if (this.scene.playerController.consumeResetInput()) {
      console.log('[INPUT] R pressed - restart run (playing state)');
      this.scene.restartRun();
      return true;
    }
    return false;
  }
}
