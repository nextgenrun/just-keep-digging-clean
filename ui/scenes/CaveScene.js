/**
 * CaveScene — fixed cave destination backed by the normal tile/player/mining stack.
 */
import { CAVE_SCENE_CONFIG } from "../../values/caveSceneConfig.js";
import { WORLD_GEN_CONFIG } from "../../values/worldGen.js";
import { CaveWorldModel, makeCaveTileSaveKey } from "../../world/model/CaveWorldModel.js";
import { WorldRenderer } from "../../world/rendering/WorldRenderer.js";
import { CaveGameplayController } from "../../world/playScene/CaveGameplayController.js";
import { USER_SETTINGS } from "../../systems/UserSettings.js";

function hashSeed(text, seed = 0) {
  let value = 2166136261 ^ seed;
  for (const character of String(text)) value = Math.imul(value ^ character.charCodeAt(0), 16777619);
  return value >>> 0;
}

function getRewardPool(depthTiles) {
  const pools = CAVE_SCENE_CONFIG.rewards.depthPools;
  return [...pools].reverse().find(pool => depthTiles >= pool.minDepthTiles) || pools[0];
}

export class CaveScene extends Phaser.Scene {
  constructor() {
    super(CAVE_SCENE_CONFIG.sceneKey);
    this.entryData = null;
    this.originScene = null;
    this.backgroundPreset = null;
    this.gameplay = null;
    this.player = null;
    this.exitLabel = null;
    this.statusText = null;
    this.gpText = null;
    this.isLeaving = false;
    this._syncedToOrigin = false;
    this._statusRevision = 0;
  }

  init(data = {}) {
    this.entryData = data;
    this.originScene = this.scene.get(CAVE_SCENE_CONFIG.originSceneKey);
    this.backgroundPreset = CAVE_SCENE_CONFIG.presets[data.backgroundPresetKey]
      || CAVE_SCENE_CONFIG.presets[CAVE_SCENE_CONFIG.selection.normalPresetKeys[0]];
    this.isLeaving = false;
    this._syncedToOrigin = false;
  }

  preload() {
    const background = this.backgroundPreset;
    if (background.assetPath && !this.textures.exists(background.textureKey)) {
      this.load.image(background.textureKey, background.assetPath);
    }
  }

  create() {
    const grid = CAVE_SCENE_CONFIG.grid;
    const tileSize = this.originScene.config.tileSize;
    const depthTiles = Math.max(0, this.entryData?.depthTiles || 0);
    const caveId = this.entryData?.caveId || "unknown-cave";
    const collected = this.originScene.caveSceneCollectedNodes || new Set();
    this.originScene.caveSceneCollectedNodes = collected;
    const pool = getRewardPool(depthTiles);

    this.config = Object.freeze({
      ...this.originScene.config,
      seed: hashSeed(caveId, this.originScene.config.seed),
      worldWidthTiles: grid.widthTiles,
      worldDepthTiles: grid.heightTiles,
      worldWidthPx: grid.widthTiles * tileSize,
      worldDepthPx: grid.heightTiles * tileSize,
      topAirRows: -depthTiles,
      playerSpawnTileX: grid.spawnTileX,
      playerSpawnTileY: grid.spawnTileY,
      deathTileY: grid.heightTiles - 1,
      caveRuntime: Object.freeze({
        caveId,
        floorRow: grid.floorRow,
        boundaryThicknessTiles: grid.boundaryThicknessTiles,
        safeFloorTileXs: grid.safeFloorTileXs,
        floorResourceKeys: grid.floorResourceKeys,
        resourcePool: pool.resources,
        nodeLayout: CAVE_SCENE_CONFIG.rewards.nodeLayout,
        collectedTileKeys: Object.freeze([...collected]),
      }),
    });
    this.caveRewardMultiplier = Math.max(1, Math.round(
      CAVE_SCENE_CONFIG.rewards.baseYield
      * WORLD_GEN_CONFIG.caves.interiorResourceMultiplier
      * (this.backgroundPreset.rewardMultiplier || 1)
    ));

    this._createBackground(this.config.worldWidthPx, this.config.worldDepthPx);
    this.worldModel = new CaveWorldModel(this.config);
    this.worldRenderer = new WorldRenderer(this, this.worldModel, this.config);
    this.worldRenderer.createLayer();
    this.worldRenderer.paintInitialWorld();
    this.worldRenderer.layer.setCollisionByExclusion([-1, 0], true);
    this._createPlayer();
    this._createFeedbackAndExit();
    this.hudSystem = { flashStatus: (message, color, duration) => this.flashStatus(message, color, duration) };

    this.gameplay = new CaveGameplayController(this, this.worldModel, this.worldRenderer);
    this.gameplay.create();
    this._configureCamera();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this._handleShutdown());
    this.cameras.main.fadeIn(CAVE_SCENE_CONFIG.fadeMs, 0, 0, 0);
  }

  update(time, delta) {
    if (this.isLeaving || !this.gameplay) return;
    this.gameplay.update(time, delta);
    this._updateGpText();
    this._tryExit();
  }

  markCaveTileDug(tx, ty) {
    const caveId = this.entryData?.caveId || "unknown-cave";
    this.originScene.caveSceneCollectedNodes.add(makeCaveTileSaveKey(caveId, tx, ty));
    this.originScene.queueDugTilesSave?.();
  }

  flashStatus(message, color = CAVE_SCENE_CONFIG.feedback.statusColor, duration = CAVE_SCENE_CONFIG.feedback.statusDurationMs) {
    const revision = ++this._statusRevision;
    this.statusText?.setColor(color).setText(message || "");
    this.time.delayedCall(duration, () => {
      if (revision === this._statusRevision) this.statusText?.setText("");
    });
  }

  _createBackground(width, height) {
    const background = this.backgroundPreset;
    if (this.textures.exists(background.textureKey)) {
      this.add.image(width / 2, height / 2, background.textureKey)
        .setDisplaySize(width, height)
        .setDepth(-10);
      return;
    }
    const fallback = CAVE_SCENE_CONFIG.background;
    this.add.rectangle(width / 2, height / 2, width, height, fallback.fallbackColor).setDepth(-10);
    this.add.circle(width * 0.6, height * 0.5, width * 0.38, fallback.fallbackLightColor, fallback.fallbackLightAlpha).setDepth(-9);
  }

  _createPlayer() {
    const grid = CAVE_SCENE_CONFIG.grid;
    const tileSize = this.config.tileSize;
    this.playerAssetProfile = this.originScene.playerAssetProfile;
    const profile = this.playerAssetProfile;
    const sourcePlayer = this.originScene.player;
    this.player = this.add.sprite(
      grid.spawnTileX * tileSize + tileSize / 2,
      (grid.spawnTileY + 1) * tileSize,
      profile.idleSheet,
      profile.isLivingDrill ? undefined : profile.idleFrames?.[0]
    ).setOrigin(sourcePlayer?.originX ?? 0.5, sourcePlayer?.originY ?? 1).setDepth(CAVE_SCENE_CONFIG.player.spriteDepth);

    if (sourcePlayer?.displayWidth && sourcePlayer?.displayHeight) {
      this.player.setDisplaySize(sourcePlayer.displayWidth, sourcePlayer.displayHeight);
    }
    if (profile.idleAnim && this.anims.exists(profile.idleAnim)) this.player.play(profile.idleAnim, true);
  }

  _createFeedbackAndExit() {
    const tileSize = this.config.tileSize;
    const grid = CAVE_SCENE_CONFIG.grid;
    const exit = CAVE_SCENE_CONFIG.exit;
    const feedback = CAVE_SCENE_CONFIG.feedback;
    const exitX = (exit.tileX + 0.5) * tileSize;
    const exitY = grid.floorRow * tileSize;
    this.add.rectangle(exitX, exitY - tileSize / 2, tileSize * 1.2, tileSize, 0x24354f, 0.52)
      .setStrokeStyle(2, 0x9ec8ff, 0.85)
      .setDepth(2);
    this.exitLabel = this.add.text(exitX, exitY - exit.labelOffsetTiles * tileSize, "", {
      fontFamily: "Consolas, monospace", fontSize: "16px", color: exit.labelColor,
      backgroundColor: "#070814cc", padding: { x: 7, y: 4 },
    }).setOrigin(0.5, 1).setDepth(5).setVisible(false);
    this.statusText = this.add.text(this.config.worldWidthPx / 2, feedback.statusTileY * tileSize, "", {
      fontFamily: "Consolas, monospace", fontSize: "20px", color: feedback.statusColor,
    }).setOrigin(0.5).setDepth(5);
    this.gpText = this.add.text(
      this.config.worldWidthPx - feedback.sideInsetTiles * tileSize,
      feedback.gpTileY * tileSize,
      "",
      { fontFamily: "Consolas, monospace", fontSize: "16px", color: feedback.gpColor }
    ).setOrigin(1, 0.5).setDepth(5);
  }

  _configureCamera() {
    const camera = this.cameras.main;
    camera.setBounds(0, 0, this.config.worldWidthPx, this.config.worldDepthPx);
    camera.setZoom(CAVE_SCENE_CONFIG.grid.cameraZoom);
    camera.centerOn(this.config.worldWidthPx / 2, this.config.worldDepthPx / 2);
  }

  _updateGpText() {
    const controller = this.gameplay.playerController;
    this.gpText.setText(`GP ${controller.getGemPowerRaw()} / ${controller.getGemPowerMax()}`);
  }

  _tryExit() {
    const playerTile = this.gameplay.playerController.getPlayerTile();
    const exit = CAVE_SCENE_CONFIG.exit;
    const inRange = Math.abs(playerTile.tx - exit.tileX) <= exit.rangeTiles;
    this.exitLabel.setText(`[${USER_SETTINGS.getKeyLabel("interact")}] Exit cave`).setVisible(inRange);
    const interact = this.gameplay.inputHandler.getKeys().interact;
    if (inRange && Phaser.Input.Keyboard.JustDown(interact)) this._returnToWorld();
  }

  _syncToOrigin() {
    if (this._syncedToOrigin) return;
    this._syncedToOrigin = true;
    this.gameplay?.syncToOrigin();
    this.originScene.queueDugTilesSave?.();
    this.originScene.playerController?.setControlsEnabled(true);
    if (this.originScene.caveEntryController) this.originScene.caveEntryController.isTransitioning = false;
    this.originScene.gameState = "playing";
  }

  _returnToWorld() {
    this.isLeaving = true;
    this._syncToOrigin();
    this.cameras.main.fadeOut(CAVE_SCENE_CONFIG.fadeMs, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.resume(CAVE_SCENE_CONFIG.originSceneKey);
      this.originScene.cameras.main.fadeIn(CAVE_SCENE_CONFIG.fadeMs, 0, 0, 0);
      this.scene.stop();
    });
  }

  _handleShutdown() {
    this._syncToOrigin();
    this.gameplay?.destroy();
  }
}
