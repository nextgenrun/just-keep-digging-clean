/**
 * PlayScene Setup Module
 * Handles scene initialization, world setup, and system creation
 */
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { PLAYER_CHARACTER_IDS, normalizePlayerCharacterId } from "../../values/playerCharacters.js";
import { PLAYER_ASSET_PROFILES, getPlayerAssetProfile } from "../../values/playerAssetProfiles.js";
import { GAME_CONFIG } from "../../values/gameConfig.js";
import { HUD_LAYOUT } from "../../values/hudLayout.js";
import { WorldModel } from "../WorldModel.js";
import { WorldRenderer } from "../rendering/WorldRenderer.js";
import { PlayerController } from "../../player/PlayerController.js";
import { TileCollisionSystem } from "../../systems/mining/TileCollisionSystem.js";
import { DigSystem } from "../../systems/mining/DigSystem.js";
import { HUDSystem } from "../../systems/visual/HUDSystem.js";
import { SoundSystem } from "../../sound/SoundSystem.js";
import { FloatingTextSystem } from "../../systems/visual/FloatingTextSystem.js";
import { UpgradeSystem } from "../../systems/progression/UpgradeSystem.js";
import { PlayerLevelSystem } from "../../systems/progression/PlayerLevelSystem.js";
import { DugTilesSaveStore } from "../model/DugTilesSaveStore.js";
import { PlayerInputHandler } from "./PlayerInputHandler.js";
import { GameInputHandler } from "./GameInputHandler.js";
import { OverlayManager } from "./OverlayManager.js";
import { NPCManager } from "./NPCManager.js";
import { BackgroundRenderer } from "./BackgroundRenderer.js";
import { BackgroundObjectPlacer } from "../rendering/BackgroundObjectPlacer.js";
import { TILED_BACKGROUND_OBJECTS } from "../../values/tiledBackgroundObjects.js";
import { UIMuteToggle } from "../../ui/hud/UIMuteToggle.js";
import { UIInventoryPopup } from "../../ui/overlays/UIInventoryPopup.js";
import { ShopOverlay } from "../../ui/overlays/ShopOverlay.js";
import { SpecialTileSystem } from "../../systems/mining/SpecialTileSystem.js";
import { DayNightCycle } from "../../systems/environment/DayNightCycle.js";
import { AtmosphereSystem } from "../../systems/environment/AtmosphereSystem.js";
import { XPProgressBar } from "../../ui/hud/XPProgressBar.js";
import { LevelUpPopup } from "../../ui/overlays/LevelUpPopup.js";
import { HitstopSystem } from "../../systems/combo/HitstopSystem.js";
import { ScreenFlashSystem } from "../../systems/visual/ScreenFlashSystem.js";
import { LootPickupFxSystem } from "../../systems/visual/LootPickupFxSystem.js";
import { WeatherSystem } from "../../systems/environment/WeatherSystem.js";
import { ShaderSystem } from "../../systems/lighting/ShaderSystem.js";
import { PickaxeTrailSystem } from "../../systems/visual/PickaxeTrailSystem.js";
import { ClimbTrailSystem } from "../../systems/visual/ClimbTrailSystem.js";
import { GAMEFEEL_CONFIG } from "../../values/gamefeel.js";
import { ComboSystem } from "../../systems/combo/ComboSystem.js";
import { StarPillarSystem } from "../../systems/visual/StarPillarSystem.js";
import { CaveTemplateVisualSystem } from "../../systems/visual/CaveTemplateVisualSystem.js";
import { CaveInteriorOcclusionSystem } from "../../systems/visual/CaveInteriorOcclusionSystem.js";
import { SpecialBlockEffectsManager } from "../../systems/mining/SpecialBlockEffectsManager.js";
import { MilestoneBoardSystem } from "../../systems/visual/MilestoneBoardSystem.js";
import { COMBO_CONFIG } from "../../values/comboConfig.js";
import BiomeSystem from "../../systems/environment/BiomeSystem.js";
import { CampfireSystem } from "../../systems/environment/CampfireSystem.js";
import { EarthquakeSystem } from "../../systems/environment/EarthquakeSystem.js";
import { DepthGateSystem } from "../../systems/progression/DepthGateSystem.js";
import { SurfaceTunnelDoorSystem } from "../../systems/environment/SurfaceTunnelDoorSystem.js";
import { LightSystem } from "../../systems/lighting/LightSystem.js";
import { CameraShakeSystem } from "../../systems/visual/CameraShakeSystem.js";
import { USER_SETTINGS } from "../../systems/UserSettings.js";
import { UINotificationSystem } from "../../ui/UINotificationSystem.js";
import { installJkdE2EHarness } from "../../testing/JkdE2EHarness.js";

function comboShakeSignatureFor(milestone) {
  if (milestone >= 5000) return "combo.godlike";
  if (milestone >= 1000) return "combo.huge";
  if (milestone >= 500) return "combo.huge";
  if (milestone >= 200) return "combo.large";
  if (milestone >= 100) return "combo.large";
  if (milestone >= 50) return "combo.medium";
  if (milestone >= 25) return "combo.medium";
  return "combo.small";
}

function installDebugUiSmokeHooks(scene) {
  if (!GAME_CONFIG.debugMode || scene._debugUiSmokeKeyHandler) return;
  const closeTransientUi = () => {
    scene.shopOverlay?.hide?.();
    scene.uiInventoryPopup?.close?.();
    scene.levelUpPopup?.hide?.();
    scene.campfireSystem?._closeBuffSelection?.();
    scene.milestoneBoardSystem?._closeBoardView?.();
    if (scene.depthGateSystem?.isOpen?.()) scene.depthGateSystem._decline?.();
    scene.hidePauseMenu?.();
  };
  scene._debugUiSmokeKeyHandler = event => {
    if (!event.ctrlKey || !event.altKey) return;
    const code = event.code || "";
    if (!code.startsWith("Digit")) return;
    event.preventDefault?.();
    event.stopPropagation?.();
    const digit = Number(code.slice(5));
    if (!Number.isFinite(digit)) return;
    switch (digit) {
      case 0: closeTransientUi(); break;
      case 1: scene.shopOverlay?.show?.("playerUpgrades"); break;
      case 2: scene.shopOverlay?.show?.("moneyMonster"); if (scene.shopOverlay?.moneyMonsterMode === "buy") { scene.shopOverlay.toggleMoneyMonsterMode?.(); } break;
      case 3: scene.uiInventoryPopup?.open?.(); break;
      case 4: scene.levelUpPopup?.show?.(2, true, ["miningPower", "resourceLuck"]); break;
      case 5: scene.campfireSystem?._openBuffSelection?.(); break;
      case 6: scene.milestoneBoardSystem?._openBoardView?.(); break;
      case 7: scene.depthGateSystem?._open?.({ threshold: 100, title: "DEPTH WARNING: 100M", message: "Smoke test depth confirmation." }); break;
      default: break;
    }
  };
  scene.input.keyboard.on("keydown", scene._debugUiSmokeKeyHandler);
}

/**
 * Entry point for PlayScene setup. Handles fatal errors with a visible error overlay.
 * Async so robot spritesheets can be loaded on-demand before animation creation.
 */
export async function setupScene(data = {}) {
  try {
    await _setupSceneSafe.call(this, data);
  } catch (err) {
    console.error('[PlayScene] Fatal error during setupScene:', err);
    // Show error on screen for diagnosis
    try {
      // Create visible error overlay
      this.add.rectangle(this.cameras.main.width / 2, this.cameras.main.height / 2,
        this.cameras.main.width, this.cameras.main.height, 0x000000, 0.95).setDepth(10000);
      this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2 - 40,
        '⚠ GAME CRASH', {
          fontFamily: 'Consolas, monospace', fontSize: '24px', color: '#ff4444'
        }).setOrigin(0.5).setDepth(10001);
      this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2 + 10,
        err?.message || String(err), {
          fontFamily: 'Consolas, monospace', fontSize: '14px', color: '#ff8888',
          wordWrap: { width: this.cameras.main.width - 80 }
        }).setOrigin(0.5).setDepth(10001);
      this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2 + 80,
        'Error logged to console. Click to return to menu.', {
          fontFamily: 'Consolas, monospace', fontSize: '12px', color: '#aaaaaa'
        }).setOrigin(0.5).setDepth(10001).setInteractive().on('pointerdown', () => {
          this.scene.start('MainMenuScene');
        });
    } catch (_) { /* ignore visual error */ }
    // Attempt to restore menu audio and return gracefully
    try {
      this.scene.launch('MenuAudioScene');
      this.scene.get('MenuAudioScene')?.attachTo?.(this);
    } catch (_) { /* ignore */ }
  }
}

// ── Robot on-demand loading helper (hoisted for forward-reference safety) ──
function _loadRobotSheets(scene) {
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
  loadSheet(robot.airborneSheet, "jump-sheet.webp", robot.airborneFrames);
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
  if (scene.load.isLoading()) scene.load.start();
}

function _loadLivingDrillSheets(scene) {
  const drill = PLAYER_ASSET_PROFILES.drillHead;
  const base = drill.basePath;
  const version = drill.version;
  const hasExpectedFrames = (sheetKey, frames) => {
    if (!scene.textures.exists(sheetKey)) return false;
    return frames.every(frame => scene.textures.getFrame(sheetKey, String(frame)));
  };
  const loadSheet = (sheetKey, fileName, frames) => {
    if (!sheetKey || !frames?.length) return false;
    if (hasExpectedFrames(sheetKey, frames)) return false;
    if (scene.textures.exists(sheetKey)) scene.textures.remove(sheetKey);
    scene.load.spritesheet(sheetKey, `${base}/${fileName}?v=${version}`, {
      frameWidth: drill.frameWidth || 94,
      frameHeight: drill.frameHeight || 94,
      endFrame: frames.length - 1,
    });
    return true;
  };
  return [
    loadSheet(drill.idleSheet, "living-drill-idle-sheet.png", drill.idleFrames),
    loadSheet(drill.digSheet, "living-drill-dig-sheet.png", drill.digFrames),
    loadSheet(drill.flySheet, "living-drill-fly-sheet.png", drill.flyFrames),
  ].some(Boolean);
}

/**
 * Wait for Phaser's loader to finish loading all queued assets.
 * Returns a Promise that resolves when loading completes or fails.
 */
function _awaitLoadComplete(scene, forceNextLoad = false) {
  return new Promise((resolve) => {
    if (!forceNextLoad && !scene.load.isLoading()) {
      resolve();
      return;
    }
    scene.load.once('complete', resolve);
    scene.load.once('loaderror', (file) => {
      console.warn('[PlaySceneSetup] Character sheet load error:', file?.key || file?.src || file);
      // Don't reject — let it continue with legacy fallback if needed
    });
  });
}

function _createRobotAnims(scene) {
  const cs = (key, sheetKey, frames, frameRate, repeat = -1) => {
    if (!frames?.length || scene.anims.exists(key)) return;
    scene.anims.create({key,frames: frames.map(f => ({key: sheetKey, frame: f})),frameRate,repeat});
  };
  const ch = (animKeys, sheetKey, frameGroups, frameRate) => {
    animKeys.forEach((key, i) => cs(key, sheetKey, frameGroups[i], frameRate, 0));
  };
  const cq = (key, sheetKey, frames, frameRate, repeat = -1) => {
    if (!frames?.length || scene.anims.exists(key)) return;
    scene.anims.create({key,frames:frames.map(f => Number.isInteger(f) ? {key: sheetKey, frame: f} : {key: f}),frameRate,repeat});
  };
  const r = PLAYER_ASSET_PROFILES.robot;
  cs(r.idleAnim, r.idleSheet, r.idleFrames, r.idleAnimationFps, -1);
  cs(r.walkStartAnim, r.walkStartSheet, r.walkStartFrames, r.walkAnimation.baseFps, 0);
  cs(r.walkLoopAnim, r.walkLoopSheet, r.walkLoopFrames, r.walkAnimation.baseFps, -1);
  cs(r.walkRunAnim, r.walkRunSheet, r.walkRunFrames, r.walkRunAnimationFps, -1);
  cs(r.walkStopAnim, r.walkStopSheet, r.walkStopFrames, r.walkAnimation.baseFps, 0);
  cq(r.airborneAnim, r.airborneSheet, r.airborneFrames, r.airborneAnimationFps || 12, 0);
  cs(r.fallingAnim, r.fallingSheet, r.fallingFrames, r.fallingAnimationFps, -1);
  cq(r.duckAnim, r.duckSheet, r.duckFrames, r.duckAnimationFps || 8, 0);
  cs(r.digDownAnim, r.digDownSheet, r.digDownFrames, r.digDownAnimationFps, 0);
  ch(r.digSidewaysHitAnims, r.digSidewaysSheet, r.digSidewaysHitFrames, r.digSidewaysAnimationFps);
  ch(r.digUpHitAnims, r.digUpSheet, r.digUpHitFrames, r.digUpAnimationFps);
  ch(r.digUpSidewaysHitAnims, r.digUpSidewaysSheet, r.digUpSidewaysHitFrames, r.digUpAnimationFps);
  cq(r.digUpLookAnim, r.digUpLookSheet, r.digUpLookFrames || [r.digUpLookFrame], 1, -1);
  cs(r.wallPushAnim, r.wallPushSheet, r.wallPushFrames, r.wallPushAnimationFps, -1);
  cs(r.combatIdleRecoverAnim, r.combatIdleRecoverSheet, r.combatIdleRecoverFrames, r.combatIdleRecoverAnimationFps, 0);
  cs(r.climbAnim, r.climbSheet, r.climbFrames, r.flyClimbAnimationFps, -1);
  cs(r.flyAnim, r.flySheet, r.flyFrames, r.flyClimbAnimationFps, -1);
  cq(r.quickslashAnim, r.quickslashSheet, r.quickslashFrames, r.quickslashAnimationFps || 12, 0);
  cq(r.thunderStrikeChargeAnim, r.thunderStrikeChargeSheet, r.thunderStrikeChargeFrames, r.thunderStrikeChargeAnimationFps || 6, -1);
  cq(r.thunderStrikeStrikeAnim, r.thunderStrikeStrikeSheet, r.thunderStrikeStrikeFrames, r.thunderStrikeStrikeAnimationFps || 12, 0);
  cs(r.attackDownAnim, r.attackDownSheet, r.attackDownFrames, 12, 0);
  cs(r.earthquakeReactAnim, r.earthquakeReactSheet, r.earthquakeReactFrames, 10, 0);
}

function _createLivingDrillAnims(scene, profile) {
  const assertSheet = (sheetKey, frames) => {
    if (!scene.textures.exists(sheetKey)) {
      throw new Error(`[LivingDrill] Missing required spritesheet: ${sheetKey}`);
    }
    const missingFrame = frames.find(frame => !scene.textures.getFrame(sheetKey, String(frame)));
    if (missingFrame !== undefined) {
      throw new Error(`[LivingDrill] Spritesheet ${sheetKey} is missing frame ${missingFrame}`);
    }
  };
  const specs = new Map();
  const queue = (keys, sheetKey, frames, frameRate, repeat = -1) => {
    const keyList = Array.isArray(keys) ? keys : [keys];
    keyList.forEach(key => {
      if (!key || specs.has(key)) return;
      specs.set(key, { sheetKey, frames, frameRate, repeat });
    });
  };
  const create = (key, { sheetKey, frames, frameRate, repeat }) => {
    assertSheet(sheetKey, frames);
    if (scene.anims.exists(key)) scene.anims.remove(key);
    scene.anims.create({
      key,
      frames: frames.map(frame => ({ key: sheetKey, frame: String(frame) })),
      frameRate,
      repeat,
    });
  };

  queue([
    profile.idleAnim,
    profile.walkAnim,
    profile.walkStartAnim,
    profile.walkLoopAnim,
    profile.walkRunAnim,
    profile.walkStopAnim,
    profile.airborneAnim,
    profile.fallingAnim,
    profile.duckAnim,
    profile.digUpLookAnim,
    profile.wallPushAnim,
    profile.combatIdleRecoverAnim,
    profile.thunderStrikeChargeAnim,
    profile.earthquakeReactAnim,
  ], profile.idleSheet, profile.idleFrames, profile.idleAnimationFps || 7, -1);
  queue([
    profile.climbAnim,
    profile.flyAnim,
    profile.flyClimbAnim,
  ], profile.flySheet || profile.idleSheet, profile.flyFrames || profile.idleFrames, profile.flyAnimationFps || profile.idleAnimationFps || 7, -1);
  queue([
    profile.digSidewaysAnim,
    profile.digDownAnim,
    profile.digUpAnim,
    profile.digUpSidewaysAnim,
    profile.quickslashAnim,
    profile.thunderStrikeStrikeAnim,
    profile.attackDownAnim,
    ...(profile.digSidewaysHitAnims || []),
    ...(profile.digUpHitAnims || []),
    ...(profile.digUpSidewaysHitAnims || []),
  ], profile.digSheet, profile.digFrames, profile.digAnimationFps || 14, 0);
  specs.forEach((spec, key) => create(key, spec));
}

async function _setupSceneSafe(data = {}) {
  this.saveSlot = data.saveSlot || 1;
  this.worldIdentity = data.worldIdentity || `save-slot-${this.saveSlot}`;
  this.dugTileSaveStore = new DugTilesSaveStore({ slotId: this.saveSlot });
  this.worldModel = new WorldModel(this.config);
  const worldIdentityForSave = this.worldModel.getWorldIdentity();
  const initialCachedSave = this.dugTileSaveStore.loadCached(worldIdentityForSave);
  this._cachedSaveData = initialCachedSave;
  this.playerCharacterId = normalizePlayerCharacterId(data.playerCharacterId ?? initialCachedSave?.playerCharacterId);
  this.playerAssetProfile = getPlayerAssetProfile(this.playerCharacterId);

  if (this.playerAssetProfile.isLivingDrill) {
    this.config = Object.freeze({
      ...this.config,
      playerBodyWidthPx: this.config.tileSize,
      playerBodyHeightPx: this.config.tileSize,
      playerDisplaySizePx: this.config.tileSize,
      playerVisualOriginCenter: true,
    });
    const queuedLivingDrillSheets = _loadLivingDrillSheets(this);
    if (queuedLivingDrillSheets) {
      const loadComplete = _awaitLoadComplete(this, true);
      this.load.start();
      await loadComplete;
    }
    _createLivingDrillAnims(this, this.playerAssetProfile);
  }

  // ── Robot spritesheets — load on demand if missing, then create animations ─
  if (this.playerCharacterId === PLAYER_CHARACTER_IDS.robot) {
    const missingSheets = !this.textures.exists(PLAYER_ASSET_PROFILES.robot.idleSheet);
    if (missingSheets) {
      console.warn('[PlaySceneSetup] Robot sheets not found, loading on demand...');
      _loadRobotSheets(this);
    }
    if (this.load.isLoading()) {
      this.load.start();
      await _awaitLoadComplete(this);
    }
    // Only create robot animations if the idle sheet actually loaded
    if (this.textures.exists(PLAYER_ASSET_PROFILES.robot.idleSheet)) {
      _createRobotAnims(this);
      console.log('[PlaySceneSetup] Robot animations created');
    } else {
      console.warn('[PlaySceneSetup] Robot idle sheet failed to load, falling back to legacy');
      this.playerCharacterId = 'legacy';
      this.playerAssetProfile = getPlayerAssetProfile('legacy');
    }
  }
  this.npcManager = new NPCManager(this, ASSET_KEYS);
  this.backgroundRenderer = new BackgroundRenderer(this, ASSET_KEYS);
  if (!TILED_BACKGROUND_OBJECTS?.enabled) {
    this.backgroundRenderer.createTiledBackground();
  }
  this.bgObjectPlacer = new BackgroundObjectPlacer(this, ASSET_KEYS);
  this.bgObjectPlacer.placeObjects(TILED_BACKGROUND_OBJECTS, { debug: false });
  this.worldRenderer = new WorldRenderer(this, this.worldModel, this.config);
  this.worldRenderer.create();
  this.caveTemplateVisualSystem = new CaveTemplateVisualSystem(this);
  this.caveTemplateVisualSystem.create(this.worldModel);
  this.caveInteriorOcclusionSystem = new CaveInteriorOcclusionSystem(this);
  this.caveInteriorOcclusionSystem.create(this.worldModel);
  this.physics.world.setBounds(0, 0, this.config.worldWidthPx, this.config.worldDepthPx);

  this._safeReturnGfx = this.add.graphics();
  this._safeReturnText = this.add.text(HUD_LAYOUT.warnTextX, 0, "", { fontFamily: "Consolas, monospace", fontSize: HUD_LAYOUT.safeFontSize, color: HUD_LAYOUT.safeTextColor }).setDepth(5);
  this._lastSafeReturnDepth = -1;

  const warningY = (this.config.topAirRows + this.config.climbWarningDepthTiles) * this.config.tileSize;
  const warningGfx = this.add.graphics();
  warningGfx.lineStyle(HUD_LAYOUT.warnLineWidth, HUD_LAYOUT.warnLineColor, HUD_LAYOUT.warnLineAlpha);
  warningGfx.lineBetween(0, warningY, this.config.worldWidthPx, warningY);
  this.add.text(HUD_LAYOUT.warnTextX, warningY + HUD_LAYOUT.warnTextOffsetY, "⚠  Gem Power critical zone — returning is very difficult", { fontFamily: "Consolas, monospace", fontSize: HUD_LAYOUT.warnFontSize, color: HUD_LAYOUT.warnColor }).setDepth(5);

  const islandLabelX = (this.config.skyIslandTileX + this.config.skyIslandWidthTiles / 2) * this.config.tileSize;
  const islandLabelY = (this.config.skyIslandTileY - 2) * this.config.tileSize;
  this.add.text(islandLabelX, islandLabelY, "✦  Sky Island  ✦", { fontFamily: "Trebuchet MS, Segoe UI, sans-serif", fontSize: HUD_LAYOUT.skyLabelFontSize, color: HUD_LAYOUT.skyLabelColor }).setOrigin(0.5).setDepth(5);

  this.npcManager.createNPCs();

  const ts = this.config.tileSize;
  const playerSpawnTileX = Number.isFinite(this.config.playerSpawnTileX) ? this.config.playerSpawnTileX : this.config.spawnTileX;
  const playerSpawnTileY = Number.isFinite(this.config.playerSpawnTileY) ? this.config.playerSpawnTileY : this.config.spawnTileY;
  this.player = this.add.sprite(
    playerSpawnTileX * ts + ts / 2,
    (playerSpawnTileY + 1) * ts,
    this.playerAssetProfile.idleSheet,
    this.playerAssetProfile.isLivingDrill ? undefined : this.playerAssetProfile.idleFrames[0]
  );
  this.player.setOrigin(0.5, this.config.playerVisualOriginCenter ? 0.5 : 1);
  this.player.setDepth(HUD_LAYOUT.playerDepth);
  if (this.playerAssetProfile.isLivingDrill) {
    this.player.setScale(this.playerAssetProfile.visualScale || 1);
  } else {
    const displaySize = this.playerAssetProfile.displaySizePx || this.config.playerDisplaySizePx;
    this.player.setDisplaySize(displaySize, displaySize);
  }

  this._onAnimComplete = (animation) => {
    const profile = this.playerAssetProfile || ASSET_KEYS.player;
    if (!profile.isLivingDrill && profile.digAnims.includes(animation.key)) {
      this.flushPendingDigImpactFeedback?.();
      this.isDigAnimating = false;
      this._combatIdleRecoverUntilMs = (this.time?.now || 0) + 3000;
      this._combatIdleReturnActive = false;
      this._combatIdleReturnPlayed = false;
      this.player.setFlipX(false);
      this.player.anims.timeScale = 1.0;
      this.pickaxeTrailSystem?.stop();
      this.updatePlayerVisualState(true);
    } else if (animation.key === (profile.walkStartAnim || ASSET_KEYS.player.walkStartAnim)) {
      const motionState = this.playerController?.getMotionState?.();
      if (motionState === "walk-left" || motionState === "walk-right") {
        this._applyWalkAnimationTimeScale?.();
        this.player.play(this._getMovingWalkLoopAnim?.() || profile.walkLoopAnim || ASSET_KEYS.player.walkLoopAnim, true);
      }
    } else if (animation.key === (profile.walkStopAnim || ASSET_KEYS.player.walkStopAnim)) {
      this.player.anims.timeScale = 1.0;
      this.updatePlayerVisualState(true);
    } else if (animation.key === (profile.combatIdleToNormalIdleAnim || ASSET_KEYS.player.combatIdleToNormalIdleAnim)) {
      this._combatIdleRecoverUntilMs = 0;
      this._combatIdleReturnActive = false;
      this._combatIdleReturnPlayed = true;
      this.updatePlayerVisualState(true);
    }
  };
  this.player.on(Phaser.Animations.Events.ANIMATION_COMPLETE, this._onAnimComplete);

  this._onAnimUpdate = (anim, frame) => {
    const profile = this.playerAssetProfile || ASSET_KEYS.player;
    const isWalkAnim = (profile.walkMovingAnims || ASSET_KEYS.player.walkMovingAnims).includes(anim.key);
    const isFootstepFrame = frame.index === 1 || frame.index === 5;
    if (isWalkAnim && isFootstepFrame) {
      if (this.playerController && this.playerController.isGrounded() && this.soundSystem) {
        const motionState = this.playerController.getMotionState();
        if (motionState === "walk-left" || motionState === "walk-right") {
          this.soundSystem.playFootstep();
        }
      }
    }
  };
  this.player.on(Phaser.Animations.Events.ANIMATION_UPDATE, this._onAnimUpdate);

  this.cameras.main.setBounds(0, 0, this.config.worldWidthPx, this.config.worldDepthPx);
  this.cameras.main.startFollow(this.player, true, this.config.cameraLerpX, this.config.cameraLerpY);
  const _zoomNow = this.cameras.main.zoom || 1;
  const _dzW = (this.config.viewportWidth * (this.config.cameraDeadzoneXFrac ?? 0)) / _zoomNow;
  const _dzH = (this.config.viewportHeight * (this.config.cameraDeadzoneYFrac ?? 0)) / _zoomNow;
  if (typeof this.cameras.main.setDeadzone === "function" && (_dzW > 0 || _dzH > 0)) {
    this.cameras.main.setDeadzone(_dzW, _dzH);
  }
  this._cameraLookAheadX = 0;
  this._cameraLookAheadY = 0;
  this._lastPlayerX = this.player.x;
  this._lastPlayerY = this.player.y;
  this._cameraDepthBand = -1;
  this.shakeSystem = new CameraShakeSystem(this, undefined, {
    getDisplaySettings: () => USER_SETTINGS.getDisplay(),
  });
  this.add.rectangle(this.config.worldWidthPx + 5000, this.config.worldDepthPx / 2, 10000, this.config.worldDepthPx, 0x000000).setDepth(HUD_LAYOUT.bgMaskDepth);

  this.inputHandler = new PlayerInputHandler(this);
  this.overlayManager = new OverlayManager(this);
  this.comboSystem = new ComboSystem();
  this.specialBlockEffectsManager = new SpecialBlockEffectsManager(this);
  this.digSystem = new DigSystem(this.worldModel, this.worldRenderer, this.config, null, null, null, this.comboSystem, this.specialBlockEffectsManager);
  this.playerLevelSystem = new PlayerLevelSystem();
  this.playerLevelSystem.setComboSystem(this.comboSystem);
  this.upgradeSystem = new UpgradeSystem(this.digSystem);
  this.digSystem.setUpgradeSystem(this.upgradeSystem);
  this.digSystem.setPlayerLevelSystem(this.playerLevelSystem);
  // Create tile-based collision system (replaces Phaser Arcade Physics)
  this.tileCollisionSystem = new TileCollisionSystem(this.worldModel, this.config);
  this.playerController = new PlayerController(this, this.player, this.worldModel, this.config, this.upgradeSystem, this.inputHandler, this.playerLevelSystem, this.comboSystem, this.tileCollisionSystem);
  this.uiNotifications = new UINotificationSystem(this);
  this.hudSystem = new HUDSystem(this, this.config.worldWidthTiles - 1, this.config.hudRefreshIntervalMs);
  this.hudSystem.setComboSystem(this.comboSystem);
  this.hudSystem.setSpecialBlockEffectsManager(this.specialBlockEffectsManager);
  this.floatingTextSystem = new FloatingTextSystem(this);
  this.digSystem.setFloatingTextSystem(this.floatingTextSystem);
  this.lootPickupFxSystem = new LootPickupFxSystem(this, this.hudSystem);

  this.comboSystem.setMilestoneReachedCallback((milestone, multiplier, timestamp) => {
    const reward = COMBO_CONFIG.milestoneRewards?.[milestone];
    const message = reward?.message || "Combo";
    this.hudSystem.flashStatus(`${message} ${milestone}!`, "#ffdd44", 1500);
    if (this.shakeSystem) {
      this.shakeSystem.shake(comboShakeSignatureFor(milestone));
    }
  });
  this.comboSystem.setComboBreakCallback((finalCombo, finalMultiplier) => {
    if (finalCombo >= 25) {
      this.hudSystem.flashStatus(`Combo broken at ${finalCombo}! (${finalMultiplier.toFixed(2)}x)`, "#ff4444", 2000);
    }
  });

  this.milestoneBoardSystem = new MilestoneBoardSystem(this, this.config, this.worldModel);
  this.milestoneBoardSystem.create();
  this.biomeSystem = new BiomeSystem(this, this.config, this.worldModel);
  this.campfireSystem = new CampfireSystem(this, this.config, this.worldModel);
  this.campfireSystem.create();
  this.digSystem.setCampfireSystem(this.campfireSystem);
  this.playerLevelSystem.setCampfireSystem(this.campfireSystem);
  this.starPillarSystem = new StarPillarSystem(this, this.config, this.floatingTextSystem);
  this.starPillarSystem.create();
  this.floatingTextSystem.setConstellationUnlockedCallback((type) => {
    this.starPillarSystem.onConstellationUnlocked(type);
    const resourceNames = { dirt: 'Dirt', stone: 'Stone', copper: 'Copper', darkDirtNormal: 'Dark Dirt', darkDirtStrong: 'Hard Dirt', steel: 'Steel', iron: 'Iron', bronze: 'Bronze', silver: 'Silver', gold: 'Gold' };
    const passiveBuffText = `${resourceNames[type] || type} sky tiles +1x`;
    if (this.hudSystem) {
      this.hudSystem.flashStatus(`✦ ${passiveBuffText} unlocked!`, '#FFD700', 2500);
    }
    if (this.playerController && this.playerController.abilities) {
      this.playerController.abilities._refreshConstellationStats();
      const cStats = this.playerController.abilities.getConstellationStats();
      const buffs = [];
      const quickKey = USER_SETTINGS.getKeyLabel("quickslash");
      const thunderKey = USER_SETTINGS.getKeyLabel("thunderStrike");
      if (cStats.quickslashFlatDamage > 0) buffs.push(`+${cStats.quickslashFlatDamage} ${quickKey} dmg`);
      if (cStats.quickslashCostReduction > 0) buffs.push(`-${cStats.quickslashCostReduction} ${quickKey} cost`);
      if (cStats.quickslashBurstSpeed > 0) buffs.push(`+${cStats.quickslashBurstSpeed} ${quickKey} speed`);
      if (cStats.quickslashFreeAbovePct > 0) buffs.push(`${quickKey} free above 50% GP`);
      if (cStats.quickslashSpeedBonus > 0) buffs.push(`+${Math.round(cStats.quickslashSpeedBonus * 100)}% ${quickKey} mining`);
      if (cStats.thunderstrikeRange > 0) buffs.push(`+${cStats.thunderstrikeRange} ${thunderKey} range`);
      if (cStats.thunderstrikeDamageMult > 0) buffs.push(`+${Math.round(cStats.thunderstrikeDamageMult * 100)}% ${thunderKey} dmg`);
      if (cStats.thunderstrikeFalloffReduction > 0) buffs.push(`-${Math.round(cStats.thunderstrikeFalloffReduction * 100)}% ${thunderKey} falloff`);
      if (cStats.thunderstrikeCostReduction > 0) buffs.push(`-${cStats.thunderstrikeCostReduction} ${thunderKey} cost`);
      if (buffs.length > 0 && this.hudSystem) {
        setTimeout(() => { if (this.hudSystem) this.hudSystem.flashStatus(`${passiveBuffText} | ${buffs.join(' | ')}`, '#AABBEE', 3000); }, 1500);
      }
      if (this.shakeSystem) this.shakeSystem.shake("misc.constellationUnlock");
    }
  });

  this._gamefeelConfig = GAMEFEEL_CONFIG;
  this.hitstopSystem = new HitstopSystem(this, GAMEFEEL_CONFIG.hitstop);
  this.screenFlashSystem = new ScreenFlashSystem(this, GAMEFEEL_CONFIG.flash);
  this.pickaxeTrailSystem = new PickaxeTrailSystem(this, this.player, GAMEFEEL_CONFIG.trail);
  this.climbTrailSystem = new ClimbTrailSystem(this, this.player, GAMEFEEL_CONFIG.climb);

  const _gfx = this.make.graphics({ add: false });
  _gfx.fillStyle(0xffffff, 1);
  _gfx.fillCircle(GAMEFEEL_CONFIG.particles.size, GAMEFEEL_CONFIG.particles.size, GAMEFEEL_CONFIG.particles.size);
  _gfx.generateTexture('_gamefeel_particle', GAMEFEEL_CONFIG.particles.size * 2, GAMEFEEL_CONFIG.particles.size * 2);
  _gfx.destroy();

  this.specialTileSystem = new SpecialTileSystem(this, this.worldModel, this.playerController, this.floatingTextSystem);
  this.dayNightCycle = new DayNightCycle(this, this.config);
  this.weatherSystem = new WeatherSystem(this, this.config, this.config.weather);
  this.lightSystem = new LightSystem(this, this.playerController, this.dayNightCycle, this.weatherSystem);
  this.worldRenderer.setEmissiveRenderDepth(this.lightSystem.config.emissiveRenderDepth);
  this.shaderSystem = new ShaderSystem(this);
  this.shaderSystem.create();
  this.atmosphereSystem = new AtmosphereSystem(this, this.config);
  this.gameInputHandler = new GameInputHandler(this, this.inputHandler, this.playerController.input);
  this._refreshSafeReturnLine();
  this._gemPowerBarBg = this.add.graphics().setScrollFactor(0).setDepth(HUD_LAYOUT.hudDepth);
  this._gemPowerBarFill = this.add.graphics().setScrollFactor(0).setDepth(HUD_LAYOUT.hudOverlayDepth);
  this._gpLabelText = this.add.text(HUD_LAYOUT.gpLabelX, HUD_LAYOUT.gpLabelY, "", { fontFamily: "Consolas, monospace", fontSize: HUD_LAYOUT.gpLabelFontSize, color: HUD_LAYOUT.gpLabelColor }).setScrollFactor(0).setDepth(HUD_LAYOUT.hudOverlayDepth);

  this.soundSystem = new SoundSystem(this);
  this.soundSystem.init();
  USER_SETTINGS.applyAudioTo(this.soundSystem);
  this.soundSystem.loadSoundLibraries();
  this.soundSystem.loadVoiceLineLibraries();
  this.soundSystem.printStats();

  const viewportWidth = this.config.viewportWidth;
  this.uiMuteToggle = new UIMuteToggle(this, this.soundSystem, viewportWidth - 123, 20);
  this.uiInventoryPopup = new UIInventoryPopup(this);
  this.shopOverlay = new ShopOverlay(this, this.upgradeSystem, this.soundSystem);
  this.xpProgressBar = new XPProgressBar(this);
  this.levelUpPopup = new LevelUpPopup(this);

  const keys = this.inputHandler.getKeys();
  this.interactKey = keys.interact;
  this.aimBox = this.inputHandler.aimBox;
  this.overlayManager.createOverlay();

  this.earthquakeSystem = new EarthquakeSystem(this);
  this.depthGateSystem = new DepthGateSystem(this);
  this.upgradeSystem.setProgressionStateProvider(() => ({
    isDepthGateAccepted: threshold => this.depthGateSystem?.accepted?.has?.(threshold) === true,
  }));
  this.surfaceTunnelDoorSystem = new SurfaceTunnelDoorSystem(this);
  this.surfaceTunnelDoorSystem.create();
  installDebugUiSmokeHooks(this);
  installJkdE2EHarness(this);

  this._autosaveInterval = setInterval(() => this.queueDugTilesSave(), 60000);

  this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    if (this.comboSystem && this.dugTileSaveStore) {
      const specialTileData = this.specialTileSystem ? this.specialTileSystem.getSaveData() : null;
      const depthGateData = this.depthGateSystem ? this.depthGateSystem.getSaveData() : null;
      const dayNightData = this.dayNightCycle?.toJSON?.() ?? null;
      this.dugTileSaveStore.save(this.worldIdentity, this.worldModel.getDugTileKeys(), this.digSystem.getResourceTotals(), this.upgradeSystem.getUpgradeLevels(), this.playerLevelSystem.toJSON(), specialTileData, depthGateData, dayNightData, this.worldModel.getRubbleTiles(), this.playerCharacterId);
    }
    clearInterval(this._autosaveInterval);
    this.queueDugTilesSave();
    if (this.player) {
      this.player.off(Phaser.Animations.Events.ANIMATION_COMPLETE, this._onAnimComplete);
      this.player.off(Phaser.Animations.Events.ANIMATION_UPDATE, this._onAnimUpdate);
    }
    if (this._debugKey) { this._debugKey.off('down', this._debugKeyHandler); }
    if (this._debugUiSmokeKeyHandler) { this.input.keyboard.off('keydown', this._debugUiSmokeKeyHandler); this._debugUiSmokeKeyHandler = null; }
    if (this._resizeHandler) { this.scale.off('resize', this._resizeHandler); }
    this.uiResourceBar?.destroy();
    this.uiMuteToggle?.destroy();
    this.uiInventoryPopup?.destroy();
    this.shopOverlay?.destroy();
    this.milestoneBoardSystem?.destroy();
    this.biomeSystem?.destroy();
    this.campfireSystem?.destroy();
    this.specialTileSystem?.destroy();
    this.xpProgressBar?.destroy();
    this.levelUpPopup?.destroy();
    this._gpLabelText?.destroy();
    this.hitstopSystem?.destroy();
    this.screenFlashSystem?.destroy();
    this.pickaxeTrailSystem?.destroy();
    this.climbTrailSystem?.destroy();
    this._livingDrillTween?.stop();
    this._livingDrillOccluder?.destroy();
    this.starPillarSystem?.destroy();
    this.lootPickupFxSystem?.destroy();
    this.floatingTextSystem?.destroy();
    this.weatherSystem?.destroy();
    this.shaderSystem?.destroy();
    this.atmosphereSystem?.destroy();
    this.soundSystem?.destroy();
    this.hudSystem?.destroy();
    this.dayNightCycle?.destroy();
    this.lightSystem?.destroy();
    this.shadowMinerSystem?.destroy();
    this.voiceLineManager?.destroy();
    this.depthGateSystem?.destroy();
    this.surfaceTunnelDoorSystem?.destroy();
    this.earthquakeSystem?.destroy();
    this.uiNotifications?.destroy();
    this.shakeSystem?.stop();
    if (this._activeParticleChips) {
      this._activeParticleChips.forEach(chip => { this.tweens.killTweensOf(chip); chip.destroy(); });
      this._activeParticleChips = [];
    }
  });

  const worldIdentity = worldIdentityForSave;
  const cachedSave = this._cachedSaveData;
  if (cachedSave && cachedSave.levelData) { this.playerLevelSystem.fromJSON(cachedSave.levelData); }
  if (cachedSave && cachedSave.comboData) { this.comboSystem.fromJSON(cachedSave.comboData); }
  this.applyPersistentState(cachedSave, false);
  this.surfaceTunnelDoorSystem?.syncFromUpgrade();
  this.updatePlayerVisualState(true);
  this.restorePersistentState();
  if (data.autoStart !== false) { this.startRun(); } else { this.enterTitleState(); }
  this._resizeHandler = (gameSize, baseSize, displaySize, previousWidth, previousHeight) => { if (this.resize) { this.resize(gameSize, baseSize, displaySize, previousWidth, previousHeight); } };
  this.scale.on('resize', this._resizeHandler);
}
