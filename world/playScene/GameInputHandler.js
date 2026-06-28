/**
 * Game Input Handler
 * Centralizes all input action triggers and game-state-specific input logic
 */
import { GAME_CONFIG } from "../../values/gameConfig.js";
import { USER_SETTINGS } from "../../systems/UserSettings.js";

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

    if (justDown(keys.muteMusic)) {
      const musicOn = !this.scene.soundSystem.musicEnabled;
      USER_SETTINGS.updateAudio({ musicEnabled: musicOn });
      USER_SETTINGS.applyAudioTo(this.scene.soundSystem);
      this.scene.uiMuteToggle?.syncMusicState(musicOn);
      this.scene.uiMuteToggle?.showToast(
        musicOn ? "Music: ON" : "Music: OFF",
        musicOn ? "#f2f5f8" : "#ff6b6b"
      );
      return true;
    }

    if (justDown(keys.muteSfx)) {
      const sfxOn = !this.scene.soundSystem.sfxEnabled;
      USER_SETTINGS.updateAudio({ sfxEnabled: sfxOn });
      USER_SETTINGS.applyAudioTo(this.scene.soundSystem);
      this.scene.uiMuteToggle?.syncSfxState(sfxOn);
      this.scene.uiMuteToggle?.showToast(
        sfxOn ? "SFX: ON" : "SFX: OFF",
        sfxOn ? "#f2f5f8" : "#ff6b6b"
      );
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
      this.scene.gameState = "playing";
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
    if (justDown(keys.escape) || justDown(keys.hardEscape)) {
      if (!this.scene.closeTopOverlay?.("escape")) {
        this.scene.resumeGame();
      }
      return true;
    }
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

    const keys = this.inputHandler.getKeys();
    if (justDown(keys.escape) || justDown(keys.hardEscape)) {
      if (this.scene.closeTopOverlay?.("escape")) {
        return true;
      }
      this.scene.showPauseMenu();
      return true;
    }
    if (this.scene.playerController.consumeResetInput()) {
      console.log('[INPUT] R pressed - restart run (playing state)');
      this.scene.restartRun();
      return true;
    }
    return false;
  }
}
