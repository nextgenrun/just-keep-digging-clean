/**
 * CaveScene — fixed cave destination backed by the normal tile/player/mining stack.
 */
import { CAVE_SCENE_CONFIG } from "../../values/caveSceneConfig.js";
import {
  CAVE_LEVEL_CONFIG,
  getCaveLevelVisualPack,
  resolveExpandedCaveLevelEnabled,
} from "../../values/caveLevelConfig.js";
import { getCaveArchetype } from "../../values/caveArchetypes.js";
import { GAMEFEEL_CONFIG } from "../../values/gamefeel.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { WORLD_GEN_CONFIG } from "../../values/worldGen.js";
import { CaveWorldModel, makeCaveTileSaveKey } from "../../world/model/CaveWorldModel.js";
import { WorldRenderer } from "../../world/rendering/WorldRenderer.js";
import { CaveGameplayController } from "../../world/playScene/CaveGameplayController.js?rev=20260821-moving-complex-dig-v1";
import { USER_SETTINGS } from "../../systems/UserSettings.js";
import { SCENE_BASE_PHASES } from "../../values/sceneRuntime.js";
import { CameraShakeSystem } from "../../systems/visual/CameraShakeSystem.js";
import { ScreenFlashSystem } from "../../systems/visual/ScreenFlashSystem.js";
import { CaveLevelPresentationSystem } from "../../systems/visual/CaveLevelPresentationSystem.js?rev=20260729-native-density-v14";
import { UINotificationSystem } from "../UINotificationSystem.js";

function hashSeed(text, seed = 0) {
  let value = 2166136261 ^ seed;
  for (const character of String(text)) value = Math.imul(value ^ character.charCodeAt(0), 16777619);
  return value >>> 0;
}

function getRewardPool(depthTiles, archetypeId) {
  const pools = CAVE_SCENE_CONFIG.rewards.depthPools;
  const pool = [...pools].reverse().find(entry => depthTiles >= entry.minDepthTiles) || pools[0];
  const interior = CAVE_SCENE_CONFIG.interiors[archetypeId];
  const allowed = new Set(pool.resources);
  const bias = (interior?.resourceBias || []).filter(resourceKey => allowed.has(resourceKey));
  const weightedBias = Array.from(
    { length: CAVE_SCENE_CONFIG.rewards.archetypeBiasCopies },
    () => bias,
  ).flat();
  return Object.freeze({
    ...pool,
    resources: Object.freeze([...pool.resources, ...weightedBias]),
  });
}

export class CaveScene extends Phaser.Scene {
  constructor() {
    super(CAVE_SCENE_CONFIG.sceneKey);
    this.entryData = null;
    this.originScene = null;
    this.backgroundPreset = null;
    this.visualPack = null;
    this.archetype = null;
    this.expandedLevelEnabled = false;
    this.presentation = null;
    this.gameplay = null;
    this.player = null;
    this.uiNotifications = null;
    this.isLeaving = false;
    this._syncedToOrigin = false;
  }

  init(data = {}) {
    this.entryData = data;
    this.originScene = this.scene.get(CAVE_SCENE_CONFIG.originSceneKey);
    this.backgroundPreset = CAVE_SCENE_CONFIG.presets[data.backgroundPresetKey]
      || CAVE_SCENE_CONFIG.presets[CAVE_SCENE_CONFIG.selection.normalPresetKeys[0]];
    this.archetype = getCaveArchetype(data.archetypeId);
    this.expandedLevelEnabled = resolveExpandedCaveLevelEnabled();
    this.visualPack = getCaveLevelVisualPack(this.archetype.id);
    this.isLeaving = false;
    this._syncedToOrigin = false;
  }

  preload() {
    const background = this.expandedLevelEnabled ? this.visualPack : this.backgroundPreset;
    if (background.assetPath && !this.textures.exists(background.textureKey)) {
      this.load.image(background.textureKey, background.assetPath);
    }

  }

  create() {
    const grid = this.expandedLevelEnabled ? CAVE_LEVEL_CONFIG.grid : CAVE_SCENE_CONFIG.grid;
    const tileSize = this.originScene.config.tileSize;
    const depthTiles = Math.max(0, this.entryData?.depthTiles || 0);
    const caveId = this.entryData?.caveId || "unknown-cave";
    const collected = this.originScene.caveSceneCollectedNodes || new Set();
    this.originScene.caveSceneCollectedNodes = collected;
    const pool = getRewardPool(depthTiles, this.archetype.id);
    const interior = CAVE_SCENE_CONFIG.interiors[this.archetype.id]
      || CAVE_SCENE_CONFIG.interiors["echo-gallery"];

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
        secondWorldEconomy: (
          Number.isFinite(this.entryData?.originTile?.tx)
          && this.entryData.originTile.tx >= this.originScene.config.levelTwoLeftTile
        ),
        floorRow: grid.floorRow,
        floorThicknessTiles: grid.floorThicknessTiles,
        boundaryThicknessTiles: grid.boundaryThicknessTiles,
        mineableOnly: this.expandedLevelEnabled && grid.mineableOnly,
        safeFloorTileXs: grid.safeFloorTileXs || CAVE_SCENE_CONFIG.grid.safeFloorTileXs,
        floorResourceKeys: grid.floorResourceKeys || CAVE_SCENE_CONFIG.grid.floorResourceKeys,
        floorMaterialRunTiles: grid.floorMaterialRunTiles || 1,
        resourcePool: pool.resources,
        nodeLayout: this.expandedLevelEnabled
          ? CAVE_LEVEL_CONFIG.rewards.nodeLayout
          : CAVE_SCENE_CONFIG.rewards.nodeLayout,
        signatureNode: grid.signatureNode,
        legacyNodeLayout: CAVE_SCENE_CONFIG.rewards.nodeLayout,
        legacySignatureNode: CAVE_SCENE_CONFIG.grid.signatureNode,
        signatureTileTypeKey: interior.signatureTileTypeKey,
        collectedTileKeys: Object.freeze([...collected]),
      }),
    });
    this.caveRewardMultiplier = Math.max(1, Math.round(
      CAVE_SCENE_CONFIG.rewards.baseYield
      * WORLD_GEN_CONFIG.caves.interiorResourceMultiplier
      * (this.backgroundPreset.rewardMultiplier || 1)
    ));

    this.worldModel = new CaveWorldModel(this.config);
    this.worldRenderer = new WorldRenderer(this, this.worldModel, this.config);
    if (!this.textures.exists(ASSET_KEYS.runtime.tilesheet)) {
      this.worldRenderer.createTilesheetTexture();
    }
    this.worldRenderer.createLayer();
    this.worldRenderer.paintInitialWorld();
    this.worldRenderer.layer.setCollisionByExclusion([-1, 0], true);
    this.presentation = new CaveLevelPresentationSystem(this, {
      config: this.config,
      expanded: this.expandedLevelEnabled,
      visualPack: this.visualPack,
      backgroundPreset: this.backgroundPreset,
      entryData: this.entryData,
      archetype: this.archetype,
      worldModel: this.worldModel,
      worldRenderer: this.worldRenderer,
    });
    this.presentation.create();
    this.screenFlashSystem = new ScreenFlashSystem(this, GAMEFEEL_CONFIG.flash);
    this.shakeSystem = new CameraShakeSystem(this, undefined, {
      getDisplaySettings: () => USER_SETTINGS.getDisplay(),
    });
    this._createPlayer();
    this.uiNotifications = new UINotificationSystem(this);
    this.hudSystem = { flashStatus: (message, color, duration) => this.flashStatus(message, color, duration) };

    this.gameplay = new CaveGameplayController(this, this.worldModel, this.worldRenderer);
    this.gameplay.create();
    this._configureCamera();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this._handleShutdown());
    this.cameras.main.fadeIn(CAVE_SCENE_CONFIG.fadeMs, 0, 0, 0);
  }

  update(time, delta) {
    if (this.isLeaving || !this.gameplay) return;
    if (this.uiNotifications?.handleInput?.()) {
      this._updateGpText();
      return;
    }
    this.gameplay.update(time, delta);
    this.shakeSystem?.update(time, delta);
    this._updateGpText();
    this._tryExit();
  }

  markCaveTileDug(tx, ty) {
    const caveId = this.entryData?.caveId || "unknown-cave";
    this.originScene.caveSceneCollectedNodes.add(makeCaveTileSaveKey(caveId, tx, ty));
    this.originScene.queueDugTilesSave?.();
  }

  flashStatus(message, color = CAVE_SCENE_CONFIG.feedback.statusColor, duration = CAVE_SCENE_CONFIG.feedback.statusDurationMs) {
    this.uiNotifications?.show?.(message, {
      color,
      durationMs: duration,
    });
  }

  _createPlayer() {
    const grid = this.expandedLevelEnabled ? CAVE_LEVEL_CONFIG.grid : CAVE_SCENE_CONFIG.grid;
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

  _configureCamera() {
    const camera = this.cameras.main;
    camera.setBounds(0, 0, this.config.worldWidthPx, this.config.worldDepthPx);
    if (!this.expandedLevelEnabled) {
      camera.setZoom(CAVE_SCENE_CONFIG.grid.cameraZoom);
      camera.centerOn(this.config.worldWidthPx / 2, this.config.worldDepthPx / 2);
      return;
    }
    const cameraConfig = CAVE_LEVEL_CONFIG.camera;
    camera.setZoom(cameraConfig.zoom);
    camera.startFollow(
      this.player,
      cameraConfig.roundPixels,
      cameraConfig.lerpX,
      cameraConfig.lerpY,
      cameraConfig.followOffsetXTiles * this.config.tileSize,
      cameraConfig.followOffsetYTiles * this.config.tileSize,
    );
  }

  _updateGpText() {
    const controller = this.gameplay.playerController;
    this.presentation?.setGp(controller.getGemPowerRaw(), controller.getGemPowerMax());
  }

  _tryExit() {
    const playerTile = this.gameplay.playerController.getPlayerTile();
    const exit = CAVE_SCENE_CONFIG.exit;
    const inRange = Math.abs(playerTile.tx - exit.tileX) <= exit.rangeTiles;
    this.presentation?.setExitPrompt(`[${USER_SETTINGS.getKeyLabel("interact")}] Exit cave`, inRange);
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
    this.originScene.sceneModeController?.clearSuspensions?.();
    this.originScene.setSceneBasePhase?.(SCENE_BASE_PHASES.ACTIVE, { owner: "cave-exit" });
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
    this.uiNotifications?.destroy();
    this.uiNotifications = null;
    this.presentation?.destroy();
    this.presentation = null;
    this.shakeSystem?.stop();
    this.shakeSystem = null;
    this.screenFlashSystem?.destroy();
    this.screenFlashSystem = null;
    this.gameplay?.destroy();
  }
}
