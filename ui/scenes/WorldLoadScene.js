import { createMenuLoadingScreen } from "../components/LoadingScreenView.js";
import { normalizePlayerCharacterId } from "../../values/playerCharacters.js";
import { PLAYER_ASSET_PROFILES } from "../../values/playerAssetProfiles.js";

/**
 * Load robot spritesheets into Phaser's texture manager so they exist
 * before PlayScene creates robot animations. This must happen in a scene
 * with a loading screen because spritesheet loading is async.
 */
function _queueRobotSheets(scene) {
  const robot = PLAYER_ASSET_PROFILES.robot;
  const robotBase = robot.basePath;
  const robotVersion = robot.version;
  const loadSheet = (sheetKey, fileName, frames) => {
    if (!sheetKey || !frames?.length) return;
    if (scene.textures.exists(sheetKey)) return;
    scene.load.spritesheet(sheetKey, `${robotBase}/${fileName}?v=${robotVersion}`, {
      frameWidth: 341, frameHeight: 341, endFrame: frames.length - 1,
    });
  };
  loadSheet(robot.idleSheet, "idle-sheet.webp", robot.idleFrames);
  loadSheet(robot.walkStartSheet, "walk-start-sheet.webp", robot.walkStartFrames);
  loadSheet(robot.walkLoopSheet, "walk-loop-sheet.webp", robot.walkLoopFrames);
  loadSheet(robot.walkRunSheet, "walk-run-sheet.webp", robot.walkRunFrames);
  loadSheet(robot.walkStopSheet, "walk-stop-sheet.webp", robot.walkStopFrames);
  loadSheet(robot.jumpSheet, "jump-sheet.webp", robot.jumpFrames);
  loadSheet(robot.fallingSheet, "falling-sheet.webp", robot.fallingFrames);
  loadSheet(robot.duckSheet, "duck-sheet.webp", robot.duckFrames);
  loadSheet(robot.digDownSheet, "dig-down-sheet.webp", robot.digDownFrames);
  loadSheet(robot.digSidewaysSheet, "dig-sideways-sheet.webp", robot.digSidewaysFrames);
  loadSheet(robot.digUpSheet, "dig-up-sheet.webp", robot.digUpFrames);
  loadSheet(robot.digUpSidewaysSheet, "dig-up-sideways-sheet.webp", robot.digUpSidewaysFrames);
  loadSheet(robot.digUpLookSheet, "dig-up-look-sheet.webp", robot.digUpLookFrames);
  loadSheet(robot.wallPushSheet, "wall-push-sheet.webp", robot.wallPushFrames);
  loadSheet(robot.combatIdleRecoverSheet, "combat-idle-recover-sheet.webp", robot.combatIdleRecoverFrames);
  loadSheet(robot.climbSheet, "climb-sheet.webp", robot.climbFrames);
  loadSheet(robot.flySheet, "fly-sheet.webp", robot.flyFrames);
  loadSheet(robot.quickslashSheet, "quickslash-sheet.webp", robot.quickslashFrames);
  loadSheet(robot.thunderStrikeChargeSheet, "thunder-charge-sheet.webp", robot.thunderStrikeChargeFrames);
  loadSheet(robot.thunderStrikeStrikeSheet, "thunder-strike-sheet.webp", robot.thunderStrikeStrikeFrames);
  loadSheet(robot.attackDownSheet, "attack-down-sheet.webp", robot.attackDownFrames);
  loadSheet(robot.earthquakeReactSheet, "earthquake-react-sheet.webp", robot.earthquakeReactFrames);
}

/**
 * Returns a Promise that resolves when Phaser's loader finishes all queued items.
 */
function _awaitLoadComplete(scene) {
  if (!scene.load.isLoading()) return Promise.resolve();
  return new Promise((resolve) => {
    scene.load.once('complete', resolve);
  });
}

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
    const playerCharacterId = normalizePlayerCharacterId(data.playerCharacterId);

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

    // ── Preload robot spritesheets if robot character is selected ────────
    // Robot sheets are loaded NOW (not in PlayScene) because Phaser's loader
    // pipeline needs to complete before textures can be referenced by animations.
    let robotLoadNeeded = false;
    if (playerCharacterId !== 'legacy') {
      _queueRobotSheets(this);
      robotLoadNeeded = this.load.isLoading();
    }

    if (robotLoadNeeded) {
      this.loadingUi?.setLabel("Loading robot sprites...");
      this.loadingUi?.setDetail("Preparing character assets...");
      this.loadingUi?.setProgress(0.3);
      this.load.start();
      await _awaitLoadComplete(this);
      this.loadingUi?.setProgress(0.7);
    }

    // Animate the loading bar and transition to PlayScene
    this.tweens.addCounter({
      from: robotLoadNeeded ? 0.70 : 0.08,
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
        this._startPlayScene(saveSlot, worldIdentity, playerCharacterId);
      },
    });
  }

  ensureMenuAudioScene() {
    if (!this.scene.isActive("MenuAudioScene")) {
      this.scene.launch("MenuAudioScene");
    }
    this.scene.get("MenuAudioScene")?.attachTo?.(this);
  }

  _startPlayScene(saveSlot, worldIdentity, playerCharacterId) {
    if (this._startedPlayScene) return;
    this._startedPlayScene = true;
    this.loadingUi?.setProgress(1);
    this.loadingUi?.setLabel("Entering the mine...");

    // Clean up immediately so UX doesn't hang if scene switch fails
    this.loadingUi?.fadeOut(200);

    this.time.delayedCall(200, () => {
      try {
        this.scene.get("MenuAudioScene")?.stopForGameStart?.();
        this.scene.start("PlayScene", { saveSlot, worldIdentity, autoStart: true, playerCharacterId });
      } catch (err) {
        console.error('[WorldLoadScene] Failed to start PlayScene:', err);
        // Last-resort fallback: show a static error screen with a retry button
        this._showFatalError(err, saveSlot, worldIdentity, playerCharacterId);
      }
    });
  }

  /** Last-resort fallback when PlayScene fails to start */
  _showFatalError(err, saveSlot, worldIdentity, playerCharacterId) {
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
      this.scene.start("MainMenuScene");
    });
  }
}