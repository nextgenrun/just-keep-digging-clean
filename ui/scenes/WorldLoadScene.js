import { TOWN_REST } from '../../values/townRest.js';
import { createMenuLoadingScreen } from "../components/LoadingScreenView.js";
import { queueSessionAwakeningAssets } from "../components/SessionAwakeningView.js";
import { withAwakeningPlayerAssets } from "../../values/sessionAwakening.js";
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
import { DugTilesSaveStore } from "../../world/model/DugTilesSaveStore.js";
import { releaseSaveMenuArt } from "../components/SaveMenuPresentationView.js";
import { WORLD_LOAD_COPY } from "../../values/playerFacingCopy.js";

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
    releaseSaveMenuArt(this);

    const saveSlot = Number(data.saveSlot) || 1;
    const worldIdentity = data.worldIdentity || `save-slot-${saveSlot}`;
    const queryCharacterId = resolvePlayerCharacterIdFromSearch(globalThis.window?.location?.search || "");
    const playerCharacterId = normalizePlayerCharacterId(queryCharacterId ?? data.playerCharacterId);
    const playerAssetProfile = withAwakeningPlayerAssets(getPlayerAssetProfile(playerCharacterId));
    const isNewSave = data.isNewSave === true;
    const primarySave = isNewSave
      ? null
      : new DugTilesSaveStore({ slotId: saveSlot }).loadForDisplay();
    const playerAssetOptions = {
      upgradeLevels: primarySave?.upgrades?.upgradeLevels || {},
    };
    const hardcoreModeData = sanitizeHardcoreModeData(
      primarySave?.hardcoreModeData ?? data.hardcoreModeData,
    );
    const tutorialChoice = data.tutorialChoice;

    this._startedPlayScene = false;
    this.loadingUi = createMenuLoadingScreen(this, {
      subtitle: WORLD_LOAD_COPY.slotSubtitle.replace("{slot}", saveSlot),
      label: WORLD_LOAD_COPY.loadingSlot.replace("{slot}", saveSlot),
      detail: WORLD_LOAD_COPY.preparingWorld,
      preferLogo: true,
      progress: 0.08,
    });

    // ── Preload selected character spritesheets when needed ──────────────
    // Character sheets are loaded NOW (not in PlayScene) because Phaser's loader
    // pipeline needs to complete before textures can be referenced by animations.
    let characterLoadNeeded = false;
    if (playerAssetProfile.isUalNative) {
      characterLoadNeeded = queuePlayerProfileSheets(
        this,
        playerAssetProfile,
        playerAssetOptions,
      );
    } else if (playerCharacterId === PLAYER_CHARACTER_IDS.robot) {
      characterLoadNeeded = queueRobotSheets(this, playerAssetOptions);
    } else if (playerCharacterId === PLAYER_CHARACTER_IDS.drillHead) {
      characterLoadNeeded = queueLivingDrillSheets(this);
    }

    const featureLoad = queueWorldLoadFeatureAssets(this, {
      saveSlot,
      campfireData: primarySave?.campfireData,
      hardcoreModeData,
    });
    const restAssets = TOWN_REST.enabled ? TOWN_REST.assets.filter(asset => !this.textures.exists(asset.key)) : [];
    for (const asset of restAssets) this.load.image(asset.key, asset.path);
    const awakeningLoadNeeded = queueSessionAwakeningAssets(this);
    const loadNeeded = characterLoadNeeded || featureLoad.queued || restAssets.length > 0 || awakeningLoadNeeded;

    if (loadNeeded) {
      this.loadingUi?.setLabel(WORLD_LOAD_COPY.loadingAssets);
      this.loadingUi?.setDetail(
        characterLoadNeeded ? WORLD_LOAD_COPY.preparingCharacter : WORLD_LOAD_COPY.preparingNearbyWorld,
      );
      this.loadingUi?.setProgress(0.3);
      const loadComplete = awaitLoadComplete(this, { forceNextLoad: true });
      this.load.start();
      await loadComplete;
      this.registry?.get?.("runtimeAssetCatalog")?.adoptTextureManager?.(this.textures);
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
          this.loadingUi?.setLabel(WORLD_LOAD_COPY.enteringMine);
          this.loadingUi?.setDetail(WORLD_LOAD_COPY.almostReady);
        } else if (value > 0.42) {
          this.loadingUi?.setLabel(WORLD_LOAD_COPY.buildingWorld);
          this.loadingUi?.setDetail(WORLD_LOAD_COPY.restoringSave);
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
    this.loadingUi?.setLabel(WORLD_LOAD_COPY.enteringMine);

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
    this.add.text(W / 2, H / 2 - 72, WORLD_LOAD_COPY.failureTitle, {
      fontFamily: "Consolas, monospace", fontSize: "22px", color: "#ff4444",
    }).setOrigin(0.5);
    this.add.text(W / 2, H / 2 - 30, WORLD_LOAD_COPY.failureBody, {
      fontFamily: "Consolas, monospace", fontSize: "14px", color: "#dddddd",
    }).setOrigin(0.5);
    this.add.text(W / 2, H / 2 + 2, `${WORLD_LOAD_COPY.failureDetailPrefix}: ${err?.message || err}`, {
      fontFamily: "Consolas, monospace", fontSize: "14px", color: "#aaaaaa",
      wordWrap: { width: W - 80 },
    }).setOrigin(0.5);
    const retryBtn = this.add.text(W / 2, H / 2 + 60, WORLD_LOAD_COPY.retry, {
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
