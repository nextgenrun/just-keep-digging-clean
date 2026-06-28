/**
 * PlayScene - Main game scene
 * Delegates setup to PlaySceneSetup and PlaySceneGameplay modules
 */
import { setupScene } from "./playScene/PlaySceneSetup.js";
import { setupUIMethods } from "./playScene/PlaySceneUI.js";
import { setupGameplayMethods } from "./playScene/PlaySceneGameplay.js";
import { updateScene, updateCameraSystems } from "./playScene/PlaySceneUpdate.js";
import { GAME_CONFIG } from "../values/gameConfig.js";
import { PLAYER_STATS_CONFIG } from "../values/playerStats.js";
import { PLAYER_ABILITIES_CONFIG } from "../values/playerAbilities.js";
import { UI_CONFIG } from "../values/uiConfig.js";
import { MINING_CONFIG } from "../values/miningConfig.js";
import { WEATHER_CONFIG } from "../values/weatherConfig.js";

export class PlayScene extends Phaser.Scene {
  constructor() {
    super("PlayScene");
    this.config = Object.freeze({
      ...GAME_CONFIG,
      ...PLAYER_STATS_CONFIG,
      ...PLAYER_ABILITIES_CONFIG,
      ...UI_CONFIG,
      ...MINING_CONFIG,
      weather: WEATHER_CONFIG,
    });
    this.gameState = "title";
    this.isDigAnimating = false;
    this.dugTileSaveStore = null;
    this.tileHitOriginStrength = 0;
    this.crouching = false;
    this.climbing = false;
    this.paused = false;
    this.isInDialogue = false;
    this.isInShop = false;
    this.hudReady = false;
    this._lastCutscene = null;
  }

  async create(data = {}) {
    await setupScene.call(this, data);
  }

  update(time, delta) {
    updateScene.call(this, time, delta);
  }
}

// Prototype methods — must be after class declaration (ES module hoisting rules)
setupUIMethods(PlayScene.prototype);
setupGameplayMethods(PlayScene.prototype);