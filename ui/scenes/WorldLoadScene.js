import { createMenuLoadingScreen } from "../components/LoadingScreenView.js";
import {
  PLAYER_CHARACTER_IDS,
  normalizePlayerCharacterId,
  resolvePlayerCharacterIdFromSearch,
} from "../../values/playerCharacters.js?rev=20260718";
import { getPlayerAssetProfile } from "../../values/playerAssetProfiles.js";
import {
  awaitLoadComplete,
  queueLivingDrillSheets,
  queuePlayerProfileSheets,
  queueRobotSheets,
} from "../../player/PlayerAssetLoader.js";
import { sanitizeHardcoreModeData } from "../../values/hardcoreMode.js";
import { queueWorldLoadFeatureAssets } from "./WorldLoadAssetPreloader.js";

/**
 * Load robot spritesheets into Phaser's texture manager so they exist
 * before PlayScene creates robot animations. This must happen in a scene
 * with a loading screen because spritesheet loading is async.
 */
export class WorldLoadScene extends Phaser.Scene {
  constructor() {
    super("WorldLoadScene");
    this.loadingUi = null;
    this._startedPlayScene = false;
  }

  async create(data = {}) {
    this.ensureMenuAudioScene();

    const saveSlot = Number(data.saveSlot) || 1;
    const worldIdentity = data.worldIdentity || `save-slot-${saveSlot}`;
    const queryCharacterId = resolvePlayerCharacterIdFromSearch(globalThis.window?.location?.search || "");
    const playerCharacterId = normalizePlayerCharacterId(queryCharacterId ?? data.playerCharacterId);
    const playerAssetProfile = getPlayerAssetProfile(playerCharacterId);
    const hardcoreModeData = sanitizeHardcoreModeData(data.hardcoreModeData);
    const isNewSave = data.isNewSave === true;
    const tutorialChoice = data.tutorialChoice;

    this._startedPlayScene = false;
    this.loadingUi = createMenuLoadingScreen(this, {
      subtitle: `SAVE SLOT ${saveSlot}`,
      label: `Loading save slot ${saveSlot}...`,
      detail: "Preparing world...",
      preferLogo: true,
      progress: 0.08,
      backgroundAlpha: 0.24,
      overlayAlpha: 0.34,
    });

    // ── Preload selected character spritesheets when needed ──────────────
    // Character sheets are loaded NOW (not in PlayScene) because Phaser's loader
    // pipeline needs to complete before textures can be referenced by animations.
    let characterLoadNeeded = false;
    if (playerAssetProfile.isUalNative) {
      characterLoadNeeded = queuePlayerProfileSheets(this, playerAssetProfile);
    } else if (playerCharacterId === PLAYER_CHARACTER_IDS.robot) {
      characterLoadNeeded = queueRobotSheets(this);
    } else if (playerCharacterId === PLAYER_CHARACTER_IDS.drillHead) {
      characterLoadNeeded = queueLivingDrillSheets(this);
    }

    const featureLoad = queueWorldLoadFeatureAssets(this, { saveSlot });
    const loadNeeded = characterLoadNeeded || featureLoad.queued;

    if (loadNeeded) {
      this.loadingUi?.setLabel("Loading game assets...");
      this.loadingUi?.setDetail(
        characterLoadNeeded ? "Preparing character and nearby assets..." : "Preparing nearby world assets...",
      );
      this.loadingUi?.setProgress(0.3);
      const loadComplete = awaitLoadComplete(this, { forceNextLoad: true });
      this.load.start();
      await loadComplete;
      this.loadingUi?.setProgress(0.7);
    }

    // Animate the loading bar and transition to PlayScene
    this.tweens.addCounter({
      from: loadNeeded ? 0.70 : 0.08,
      to: 1,
      duration: 780,
      ease: "Sine.easeInOut",
      onUpdate: (tween) => {
        const value = tween.getValue();
        this.loadingUi?.setProgress(value);

        if (value > 0.78) {
          this.loadingUi?.setLabel("Entering the mine...");
          this.loadingUi?.setDetail("Almost ready...");
        } else if (value > 0.42) {
          this.loadingUi?.setLabel("Building world...");
          this.loadingUi?.setDetail("Restoring save state...");
        }
      },
      onComplete: () => {
        this._startPlayScene(
          saveSlot,
          worldIdentity,
          playerCharacterId,
          hardcoreModeData,
          isNewSave,
          tutorialChoice,
        );
      },
    });
  }

  ensureMenuAudioScene() {
    if (!this.scene.isActive("MenuAudioScene")) {
      this.scene.launch("MenuAudioScene");
    }
    this.scene.get("MenuAudioScene")?.attachTo?.(this);
  }

  _startPlayScene(
    saveSlot,
    worldIdentity,
    playerCharacterId,
    hardcoreModeData,
    isNewSave,
    tutorialChoice,
  ) {
    if (this._startedPlayScene) return;
    this._startedPlayScene = true;
    this.loadingUi?.setProgress(1);
    this.loadingUi?.setLabel("Entering the mine...");

    // Clean up immediately so UX doesn't hang if scene switch fails
    this.loadingUi?.fadeOut(200);

    this.time.delayedCall(200, () => {
      try {
        this.scene.get("MenuAudioScene")?.stopForGameStart?.();
        this.scene.start("PlayScene", {
          saveSlot,
          worldIdentity,
          autoStart: true,
          playerCharacterId,
          hardcoreModeData: sanitizeHardcoreModeData(hardcoreModeData),
          isNewSave: isNewSave === true,
          tutorialChoice,
        });
      } catch (err) {
        console.error('[WorldLoadScene] Failed to start PlayScene:', err);
        // Last-resort fallback: show a static error screen with a retry button
        this._showFatalError(err, saveSlot, worldIdentity, playerCharacterId, {
          hardcoreModeData,
          isNewSave,
          tutorialChoice,
        });
      }
    });
  }

  /** Last-resort fallback when PlayScene fails to start */
  _showFatalError(err, saveSlot, worldIdentity, playerCharacterId, launchData = {}) {
    if (this.loadingUi) {
      this.loadingUi.destroy();
      this.loadingUi = null;
    }
    const W = this.scale.width, H = this.scale.height;
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000);
    this.add.text(W / 2, H / 2 - 60, "⚠ Could not start game", {
      fontFamily: "Consolas, monospace", fontSize: "22px", color: "#ff4444",
    }).setOrigin(0.5);
    this.add.text(W / 2, H / 2 - 20, `Error: ${err?.message || err}`, {
      fontFamily: "Consolas, monospace", fontSize: "14px", color: "#aaaaaa",
      wordWrap: { width: W - 80 },
    }).setOrigin(0.5);
    const retryBtn = this.add.text(W / 2, H / 2 + 60, "[ Retry ]", {
      fontFamily: "Consolas, monospace", fontSize: "18px", color: "#88ccff",
      backgroundColor: "#1a2a3a",
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    retryBtn.on("pointerdown", () => {
      this.scene.start("WorldLoadScene", {
        saveSlot,
        worldIdentity,
        playerCharacterId,
        ...launchData,
      });
    });
  }
}
