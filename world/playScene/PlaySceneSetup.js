/**
 * PlayScene Setup Module
 * Handles scene initialization, world setup, and system creation
 */
import { ASSET_KEYS } from "../../values/assetKeys.js";
import {
  PLAYER_CHARACTER_IDS,
  normalizePlayerCharacterId,
  resolvePersistedPlayerCharacterId,
} from "../../values/playerCharacters.js?rev=20260718";
import {
  PLAYER_ASSET_PROFILES,
  getPlayerAssetProfile,
  resolvePlayerDisplaySizePx,
  resolvePlayerVisualOrigin,
} from "../../values/playerAssetProfiles.js?rev=20260718-mesh-grounded";
import {
  awaitLoadComplete,
  hasPlayerProfileSheets,
  queueLivingDrillSheets,
  queuePlayerProfileSheets,
  queueRobotSheets,
} from "../../player/PlayerAssetLoader.js";
import { createUalNativePlayerAnimations } from "../../player/UalNativePlayerAnimations.js";
import { UalActionContactTimeline } from "../../player/UalActionContactTimeline.js";
import { GAME_CONFIG } from "../../values/gameConfig.js";
import { HUD_LAYOUT } from "../../values/hudLayout.js";
import { WorldModel } from "../WorldModel.js";
import { createWorldRenderer } from
  "../rendering/WorldRenderFactory.js?rev=20260729-whole-world-expansion-v5-lineless-v10";
import { WORLD_VISUAL_RUNTIME_MODES } from
  "../../values/worldVisualRuntime.js?rev=20260729-whole-world-expansion-v5-lineless-v10";
import { WorldBackgroundMasterSystem } from "../rendering/WorldBackgroundMasterSystem.js";
import { WorldBackgroundAmbientMotionSystem } from "../rendering/WorldBackgroundAmbientMotionSystem.js";
import { LevelOneLivingBackdropSystem } from "../rendering/LevelOneLivingBackdropSystem.js";
import { WorldScenicFacadeSystem } from "../rendering/WorldScenicFacadeSystem.js";
import { DeepWorldLivingBackdropSystem } from "../rendering/DeepWorldLivingBackdropSystem.js";
import { StartZoneScenicBackgroundSystem } from "../rendering/StartZoneScenicBackgroundSystem.js";
import { StartZoneGroundFacadeSystem } from "../rendering/StartZoneGroundFacadeSystem.js";
import { LevelOneGroundFacadeSystem } from "../rendering/LevelOneGroundFacadeSystem.js";
import { SecondWorldTownRenderer } from "../secondWorld/SecondWorldTownRenderer.js";
import { PlayerController } from "../../player/PlayerController.js?rev=20260718-mesh-grounded";
import { TileCollisionSystem } from "../../systems/mining/TileCollisionSystem.js";
import { DigSystem } from "../../systems/mining/DigSystem.js";
import { reportPlaySceneSetupFailure } from "../../systems/health/RuntimeCanarySystem.js";
import { HUDSystem } from "../../systems/visual/HUDSystem.js";
import { SoundSystem } from "../../sound/SoundSystem.js";
import { FloatingTextSystem } from "../../systems/visual/FloatingTextSystem.js";
import { WorldMapDiscoverySystem } from "../../systems/map/WorldMapDiscoverySystem.js";
import { WorldMapActivityRegistry } from "../../systems/map/WorldMapActivityRegistry.js";
import { UINotificationSystem } from "../../ui/UINotificationSystem.js";
import { createButton } from "../../ui/PhaserUiKit.js";
import { createIconBadge, createModalShell } from "../../ui/UiModalShell.js";
import { UpgradeSystem } from "../../systems/progression/UpgradeSystem.js";
import { PlayerLevelSystem } from "../../systems/progression/PlayerLevelSystem.js";
import { AncientRelicSystem } from "../../systems/progression/AncientRelicSystem.js";
import { HeavenblocksProgressionSystem } from "../../systems/progression/HeavenblocksProgressionSystem.js";
import { RetentionProgressSystem } from "../../systems/progression/RetentionProgressSystem.js";
import { TitanClueSystem } from "../../systems/progression/TitanClueSystem.js";
import { CraftingSystem } from "../../systems/crafting/CraftingSystem.js";
import { StarHeartProgressionSystem } from "../../systems/celestial/StarHeartProgressionSystem.js";
import { DugTilesSaveStore } from "../model/DugTilesSaveStore.js?rev=20260727-save-transfer-v1";
import { sanitizeHardcoreModeData } from "../../values/hardcoreMode.js";
import { PlayerInputHandler } from "./PlayerInputHandler.js";
import { GameInputHandler } from "./GameInputHandler.js";
import { ThunderStrikeActionRuntime } from "./ThunderStrikeActionRuntime.js?rev=20260727-restart-lifecycle-v1";
import { CelestialEngineController } from "./CelestialEngineController.js";
import { OverlayManager } from "./OverlayManager.js";
import { NPCManager } from "./NPCManager.js";
import { BackgroundRenderer } from "./BackgroundRenderer.js";
import { BackgroundObjectPlacer } from "../rendering/BackgroundObjectPlacer.js";
import { TILED_BACKGROUND_OBJECTS } from "../../values/tiledBackgroundObjects.js";
import { SpecialTileSystem } from "../../systems/mining/SpecialTileSystem.js";
import { DayNightCycle } from "../../systems/environment/DayNightCycle.js";
import { AtmosphereSystem } from "../../systems/environment/AtmosphereSystem.js";
import { HitstopSystem } from "../../systems/combo/HitstopSystem.js";
import { ScreenFlashSystem } from "../../systems/visual/ScreenFlashSystem.js";
import { ScreenRecordSystem } from "../../systems/visual/ScreenRecordSystem.js";
import { NextPromiseHudSystem } from "../../systems/visual/NextPromiseHudSystem.js";
import { MiningIntentPreviewSystem } from "../../systems/visual/MiningIntentPreviewSystem.js";
import { LootPickupFxSystem } from "../../systems/visual/LootPickupFxSystem.js";
import { RelicDiscoveryFxSystem } from "../../systems/visual/RelicDiscoveryFxSystem.js";
import { WeatherSystem } from "../../systems/environment/WeatherSystem.js";
import { ShaderSystem } from "../../systems/lighting/ShaderSystem.js";
import { LightFrameSync } from "../../systems/lighting/LightFrameSync.js";
import { PickaxeTrailSystem } from "../../systems/visual/PickaxeTrailSystem.js";
import { ClimbTrailSystem } from "../../systems/visual/ClimbTrailSystem.js";
import { FlightFootParticleSystem } from "../../systems/visual/FlightFootParticleSystem.js";
import { PostFxSystem } from "../../systems/visual/PostFxSystem.js";
import { PlayerBodyLanguageSystem } from "../../systems/visual/PlayerBodyLanguageSystem.js";
import { PlayerMotionPolishSystem } from "../../systems/visual/PlayerMotionPolishSystem.js";
import { PlayerKinematicMotionSystem } from "../../systems/visual/PlayerKinematicMotionSystem.js";
import { UalNativeLocomotionTransitionSelector } from "../../systems/visual/UalNativeLocomotionTransitionSelector.js";
import { PlayerRigContactSystem } from "../../systems/visual/PlayerRigContactSystem.js";
import { PlayerSolidOcclusionSystem } from "../../systems/visual/PlayerSolidOcclusionSystem.js";
import { AmbientParticleSystem } from "../../systems/environment/AmbientParticleSystem.js";
import { DepthMilestoneCinematic } from "../../systems/visual/DepthMilestoneCinematic.js";
import { GAMEFEEL_CONFIG } from "../../values/gamefeel.js";
import { ComboSystem } from "../../systems/combo/ComboSystem.js";
import {
  CONSTELLATION_ABILITY_PREREQUISITES,
  CONSTELLATION_BUFFS,
  CONSTELLATION_MATCHING_STAR_YIELD_BONUS,
} from "../../values/constellationBuffs.js";
import { StarPillarSystem } from "../../systems/visual/StarPillarSystem.js";
import { StarHeartOverlay } from "../../ui/overlays/StarHeartOverlay.js";
import { StarlightTalentTreeView } from "../../ui/overlays/StarlightTalentTreeView.js";
import { CaveTemplateVisualSystem } from "../../systems/visual/CaveTemplateVisualSystem.js";
import { CaveAtmosphereSystem } from "../../systems/visual/CaveAtmosphereSystem.js";
import { CaveHazardView } from "../../systems/visual/CaveHazardView.js";
import { CaveInteriorOcclusionSystem } from "../../systems/visual/CaveInteriorOcclusionSystem.js";
import { SpecialBlockEffectsManager } from "../../systems/mining/SpecialBlockEffectsManager.js";
import { MilestoneBoardSystem } from "../../systems/visual/MilestoneBoardSystem.js";
import { COMBO_CONFIG } from "../../values/comboConfig.js";
import BiomeSystem from "../../systems/environment/BiomeSystem.js";
import { CampfireSystem } from "../../systems/environment/CampfireSystem.js";
import { CaveHazardSystem } from "../../systems/environment/CaveHazardSystem.js";
import { EarthquakeSystem } from "../../systems/environment/EarthquakeSystem.js";
import { EarthquakeFeedbackUI } from "../../systems/visual/EarthquakeFeedbackUI.js";
import { EarthquakeHazardOverlay } from "../../systems/visual/EarthquakeHazardOverlay.js";
import { EarthquakeTileFeedbackSystem } from "../../systems/visual/EarthquakeTileFeedbackSystem.js";
import { DepthGateSystem } from "../../systems/progression/DepthGateSystem.js";
import { createJourneyRuntime } from "./JourneyBridge.js";
import { SurfaceTunnelDoorSystem } from "../../systems/environment/SurfaceTunnelDoorSystem.js";
import { ArcCoreVehicleSystem } from "../../systems/vehicles/ArcCoreVehicleSystem.js";
import { V11SkyIslandVisualSystem } from "../../systems/environment/V11SkyIslandVisualSystem.js";
import { HeavenblocksAccessSystem } from "../../systems/environment/HeavenblocksAccessSystem.js";
import { HeavenblocksPresentationSystem } from "../../systems/visual/HeavenblocksPresentationSystem.js";
import { OpeningFlightArtifactSystem } from "../../systems/onboarding/OpeningFlightArtifactSystem.js";
import { TownSquareTutorialSystem } from "../../systems/onboarding/TownSquareTutorialSystem.js";
import { HardcoreMemorialStore } from "../../systems/hardcore/HardcoreMemorialStore.js";
import { HardcoreMemorialWorldSystem } from "../../systems/visual/HardcoreMemorialWorldSystem.js";

const PLAY_SCENE_UI_FACTORIES = Object.freeze({
  createButton,
  createIconBadge,
  createModalShell,
  createStarlightTalentTreeView: (scene, options) => (
    new StarlightTalentTreeView(scene, options)
  ),
});
import { LightSystem } from "../../systems/lighting/LightSystem.js";
import { CameraShakeSystem } from "../../systems/visual/CameraShakeSystem.js";
import { USER_SETTINGS } from "../../systems/UserSettings.js";
import { installJkdE2EHarness } from "../../testing/JkdE2EHarness.js?rev=20260729-whole-world-expansion-v5-lineless-v10";
import { CaveEntryController } from "./CaveEntryController.js";
import {
  createGraveborerWurmRuntime,
  destroyGraveborerWurmRuntime,
} from "./GraveborerWurmBridge.js";
import {
  createHardcoreModeRuntime,
  destroyHardcoreModeRuntime,
} from "./HardcoreModeBridge.js";

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

function setAuthoredBackgroundVisualMode(scene, mode) {
  const requestedMode = mode === "raw" ? "raw" : "clean";
  if (scene._authoredBackgroundMode === requestedMode) return;

  if (
    scene.worldBackgroundMasterSystem?.enabled
    && scene.worldBackgroundMasterSystem.config?.suppressLegacyAuthoredObjectsWhenEnabled
  ) {
    scene._authoredBackgroundMode = requestedMode;
    scene.hudSystem?.flashStatus?.(
      "TMX background: v11 master is authoritative",
      "#88c9ff",
      1200
    );
    return;
  }

  if (!scene.bgObjectPlacer || !TILED_BACKGROUND_OBJECTS?.enabled) {
    scene._authoredBackgroundMode = requestedMode;
    return;
  }

  scene._authoredBackgroundMode = requestedMode;
  scene.bgObjectPlacer.setAuthoredBackgroundMode(requestedMode);
  scene.bgObjectPlacer.destroy();
  scene.bgObjectPlacer.placeObjects(TILED_BACKGROUND_OBJECTS, { debug: false });
  const modeLabel = requestedMode === "raw" ? "RAW authored" : "Clean authored";
  scene.hudSystem?.flashStatus?.(
    `TMX background: ${modeLabel}`,
    "#88c9ff",
    1200
  );
}

function toggleAuthoredBackgroundVisualMode(scene) {
  const requestedMode = scene._authoredBackgroundMode === "raw" ? "clean" : "raw";
  setAuthoredBackgroundVisualMode(scene, requestedMode);
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
      case 8: toggleAuthoredBackgroundVisualMode(scene); break;
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
    reportPlaySceneSetupFailure(err);
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

async function _ensureUalNativePlayer(scene, profile) {
  const queuedUalSheets = queuePlayerProfileSheets(scene, profile);
  if (queuedUalSheets) {
    const loadComplete = awaitLoadComplete(scene, {
      forceNextLoad: true,
      onLoadError: (file) => {
        console.warn('[PlaySceneSetup] UAL native sheet load error:', file?.key || file?.src || file);
      },
    });
    scene.load.start();
    await loadComplete;
  }
  if (!hasPlayerProfileSheets(scene, profile)) {
    throw new Error('UAL native production sheets failed to load; no substitute character path is allowed');
  }
  createUalNativePlayerAnimations(scene, profile);
  scene.config = Object.freeze({
    ...scene.config,
    playerBodyWidthPx: profile.playerBodyWidthPx,
    playerBodyHeightPx: profile.playerBodyHeightPx,
    playerDisplaySizePx: profile.displaySizePx,
    playerVisualOriginCenter: false,
  });
  console.log('[PlaySceneSetup] UAL profile-timed animations and measured hitbox ready');
}

async function _setupSceneSafe(data = {}) {
  this._isShuttingDown = false;
  this.saveSlot = data.saveSlot || 1;
  this.worldIdentity = data.worldIdentity || `save-slot-${this.saveSlot}`;
  this.dugTileSaveStore = new DugTilesSaveStore({ slotId: this.saveSlot });
  if (data.isNewSave === true) this.dugTileSaveStore.beginNewSave();
  this.worldModel = new WorldModel(this.config);
  const worldIdentityForSave = this.worldModel.getWorldIdentity();
  const initialCachedSave = this.dugTileSaveStore.loadCached(worldIdentityForSave);
  this._cachedSaveData = initialCachedSave;
  this.hardcoreModeData = sanitizeHardcoreModeData(
    initialCachedSave?.hardcoreModeData ?? data.hardcoreModeData,
  );
  const cachedPlayerCharacterId = resolvePersistedPlayerCharacterId(initialCachedSave?.playerCharacterId);
  this.playerCharacterId = normalizePlayerCharacterId(data.playerCharacterId ?? cachedPlayerCharacterId);
  this.playerAssetProfile = getPlayerAssetProfile(this.playerCharacterId);

  if (this.playerAssetProfile.isUalNative) {
    await _ensureUalNativePlayer(this, this.playerAssetProfile);
  }

  if (this.playerAssetProfile.isLivingDrill) {
    this.config = Object.freeze({
      ...this.config,
      playerBodyWidthPx: this.config.tileSize,
      playerBodyHeightPx: this.config.tileSize,
      playerDisplaySizePx: this.config.tileSize,
      playerVisualOriginCenter: true,
    });
    const queuedLivingDrillSheets = queueLivingDrillSheets(this);
    if (queuedLivingDrillSheets) {
      const loadComplete = awaitLoadComplete(this, {
        forceNextLoad: true,
        onLoadError: (file) => {
          console.warn('[PlaySceneSetup] Character sheet load error:', file?.key || file?.src || file);
        },
      });
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
      const queuedRobotSheets = queueRobotSheets(this);
      if (queuedRobotSheets) {
        const loadComplete = awaitLoadComplete(this, {
          forceNextLoad: true,
          onLoadError: (file) => {
            console.warn('[PlaySceneSetup] Robot sheet load error:', file?.key || file?.src || file);
          },
        });
        this.load.start();
        await loadComplete;
      }
    } else if (this.load.isLoading()) {
      this.load.start();
      await awaitLoadComplete(this);
    }
    // Only create robot animations if the idle sheet actually loaded
    if (this.textures.exists(PLAYER_ASSET_PROFILES.robot.idleSheet)) {
      _createRobotAnims(this);
      console.log('[PlaySceneSetup] Robot animations created');
    } else {
      console.warn('[PlaySceneSetup] Robot idle sheet failed to load, falling back to UAL native');
      this.playerCharacterId = PLAYER_CHARACTER_IDS.ualNative;
      this.playerAssetProfile = getPlayerAssetProfile(PLAYER_CHARACTER_IDS.ualNative);
      await _ensureUalNativePlayer(this, this.playerAssetProfile);
    }
  }
  this.npcManager = new NPCManager(this, ASSET_KEYS);
  this.backgroundRenderer = new BackgroundRenderer(this, ASSET_KEYS);
  const worldVisualSelection = createWorldRenderer(this, this.worldModel, this.config);
  this.worldVisualRuntimeMode = worldVisualSelection.mode;
  this.worldRenderer = worldVisualSelection.renderer;

  if (this.worldVisualRuntimeMode === WORLD_VISUAL_RUNTIME_MODES.legacy) {
    this.backgroundRenderer.createUniverseSkyBackground();
    this.startZoneScenicBackgroundSystem = new StartZoneScenicBackgroundSystem(this);
    this.startZoneScenicBackgroundSystem.create();
    this._authoredBackgroundMode = "clean";
    this.worldBackgroundMasterSystem = new WorldBackgroundMasterSystem(this);
    const v11MasterActive = this.worldBackgroundMasterSystem.create();
    this.bgObjectPlacer = new BackgroundObjectPlacer(this, ASSET_KEYS, { useRawAuthoredBackgrounds: this._authoredBackgroundMode === "raw" });
    const suppressLegacyAuthoredObjects = v11MasterActive
      && this.worldBackgroundMasterSystem.config?.suppressLegacyAuthoredObjectsWhenEnabled;
    if (!suppressLegacyAuthoredObjects) {
      if (!TILED_BACKGROUND_OBJECTS?.enabled) this.backgroundRenderer.createTiledBackground();
      this.bgObjectPlacer.placeObjects(TILED_BACKGROUND_OBJECTS, { debug: false });
    } else {
      console.info("[PlaySceneSetup] v11 master active; skipped legacy v7 background objects");
    }
    this.worldRenderer.create();
    this.levelOneGroundFacadeSystem = new LevelOneGroundFacadeSystem(this, this.worldModel);
    const levelOneFacadeActive = this.levelOneGroundFacadeSystem.create();
    this.startZoneGroundFacadeSystem = new StartZoneGroundFacadeSystem(this, this.worldModel);
    if (!levelOneFacadeActive) this.startZoneGroundFacadeSystem.create();
    this.worldScenicFacadeSystem = new WorldScenicFacadeSystem(this, this.worldModel);
    this.worldScenicFacadeSystem.create();
    this.deepWorldLivingBackdropSystem = new DeepWorldLivingBackdropSystem(this);
    this.deepWorldLivingBackdropSystem.create();
    this.worldBackgroundAmbientMotionSystem = new WorldBackgroundAmbientMotionSystem(this);
    this.worldBackgroundAmbientMotionSystem.create();
    this.levelOneLivingBackdropSystem = new LevelOneLivingBackdropSystem(this);
    this.levelOneLivingBackdropSystem.create();
    this.secondWorldTownRenderer = new SecondWorldTownRenderer(this);
    this.secondWorldTownRenderer.create();
    this.caveTemplateVisualSystem = new CaveTemplateVisualSystem(this);
    this.caveTemplateVisualSystem.create(this.worldModel);
  } else {
    this._authoredBackgroundMode = "scenic-v2";
    this.worldRenderer.create();
    console.info("[PlaySceneSetup] Scenic-v2 owns the complete visible world; legacy visual stack was not constructed");
  }

  // Cave identity is part of gameplay presentation, so it remains active in
  // both the production scenic renderer and the explicit legacy rollback.
  this.caveAtmosphereSystem = new CaveAtmosphereSystem(this);
  this.caveAtmosphereSystem.create(this.worldModel);
  this.caveHazardView = new CaveHazardView(this);
  this.caveHazardSystem = new CaveHazardSystem(this, this.caveHazardView);
  this.caveHazardSystem.create(this.worldModel);
  this.caveInteriorOcclusionSystem = new CaveInteriorOcclusionSystem(this);
  this.caveInteriorOcclusionSystem.create(this.worldModel);

  // Sky Island platforms and eclipse gates are gameplay landmarks, not part of
  // either terrain renderer. Construct them for both the legacy rollback and
  // scenic-v2 so SpecialTileSystem's saved teleport graph never becomes an
  // invisible, still-functional interaction layer.
  this.v11SkyIslandVisualSystem = new V11SkyIslandVisualSystem(this);
  this.v11SkyIslandVisualSystem.create();
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
  const playerOrigin = resolvePlayerVisualOrigin(
    this.playerAssetProfile,
    this.playerAssetProfile.idleAnim,
    this.player.texture?.key,
    { x: 0.5, y: this.config.playerVisualOriginCenter ? 0.5 : 1 },
  );
  this.player.setOrigin(playerOrigin.x, playerOrigin.y);
  this.player.setDepth(HUD_LAYOUT.playerDepth);
  if (this.playerAssetProfile.isLivingDrill) {
    this.player.setScale(this.playerAssetProfile.visualScale || 1);
  } else {
    const displaySize = resolvePlayerDisplaySizePx(
      this.playerAssetProfile,
      this.config.playerDisplaySizePx,
      this.playerAssetProfile.idleAnim,
    );
    this.player.setDisplaySize(displaySize, displaySize);
  }

  this.ualActionContactTimeline = this.playerAssetProfile.isUalNative
    ? new UalActionContactTimeline(this.player)
    : null;
  this._ualMovingSideDigResumeJogFrame = null;

  this._onAnimComplete = (animation) => {
    const profile = this.playerAssetProfile || ASSET_KEYS.player;
    const now = this.time?.now || 0;
    if (
      this.thunderStrikeActionRuntime?.isAnimating
      && animation.key === profile.thunderStrikeStrikeAnim
    ) {
      return;
    } else if (this._teleportInAnimating && animation.key === profile.teleportInAnim) {
      this._teleportInAnimating = false;
      this.player.anims.timeScale = 1;
      this.updatePlayerVisualState(true);
    } else if (
      !profile.isLivingDrill
      && (profile.punchActionAnims || profile.digAnims).includes(animation.key)
    ) {
      this.flushPendingDigImpactFeedback?.();
      this.isDigAnimating = false;
      this.playerRigContact?.endAction();
      const settledFlipX = typeof this._postActionFacingFlipX === "boolean"
        ? this._postActionFacingFlipX
        : this._actionFlipX;
      this._combatIdleFlipX = settledFlipX;
      const recoverDurationMs = this.playerMotionPolish?.getPostActionRecoverDurationMs?.() ?? 3000;
      this._combatIdleRecoverUntilMs = now + recoverDurationMs;
      this._combatIdleReturnActive = false;
      this._combatIdleReturnPlayed = false;
      if (typeof settledFlipX === "boolean") {
        this.player.setFlipX(settledFlipX);
        this.playerController?.setFacingRight?.(!settledFlipX);
      }
      this._actionFlipX = null;
      this._postActionFacingFlipX = null;
      this.player.anims.timeScale = 1.0;
      this.pickaxeTrailSystem?.stop();
      const resumeJogFrame = this._ualMovingSideDigResumeJogFrame;
      this._ualMovingSideDigResumeJogFrame = null;
      const motionState = this.playerController?.getMotionState?.();
      const movementActive = motionState === "walk-left" || motionState === "walk-right";
      if (Number.isFinite(resumeJogFrame) && movementActive) {
        this.ualLocomotionTransitionSelector?.requestRunResume(resumeJogFrame);
      } else {
        this.playerMotionPolish?.beginActionRecovery?.(animation.key, settledFlipX);
      }
      this.updatePlayerVisualState(true);
    } else if (this.playerMotionPolish?.onAnimationComplete?.(animation.key, now)) {
      this.updatePlayerVisualState(true);
    } else if (
      profile.isUalNative
      && (profile.locomotionTransitionAnims || []).includes(animation.key)
    ) {
      this.updatePlayerVisualState(false);
    } else if (animation.key === (profile.walkStartAnim || ASSET_KEYS.player.walkStartAnim)) {
      const motionState = this.playerController?.getMotionState?.();
      if (motionState === "walk-left" || motionState === "walk-right") {
        const movingKey = this._getMovingWalkLoopAnim?.() || profile.walkLoopAnim || ASSET_KEYS.player.walkLoopAnim;
        this.player.play(movingKey, true);
        this._applyWalkAnimationTimeScale?.(movingKey);
      }
    } else if (animation.key === (profile.walkStopAnim || ASSET_KEYS.player.walkStopAnim)) {
      this.player.anims.timeScale = 1.0;
      this.updatePlayerVisualState(true);
    } else if (animation.key === (profile.combatIdleToNormalIdleAnim || ASSET_KEYS.player.combatIdleToNormalIdleAnim)) {
      this._combatIdleRecoverUntilMs = 0;
      this._combatIdleReturnActive = false;
      this._combatIdleReturnPlayed = true;
      this._combatIdleFlipX = null;
      this.updatePlayerVisualState(true);
    }
  };
  this.player.on(Phaser.Animations.Events.ANIMATION_COMPLETE, this._onAnimComplete);

  this._onAnimUpdate = (anim, frame) => {
    const profile = this.playerAssetProfile || ASSET_KEYS.player;
    const isWalkAnim = (profile.walkMovingAnims || ASSET_KEYS.player.walkMovingAnims).includes(anim.key);
    const authoredFootsteps = profile.footstepFrameIndices?.[anim.key];
    const isFootstepFrame = authoredFootsteps
      ? authoredFootsteps.includes(frame.index)
      : frame.index === 1 || frame.index === 5;
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
  this._cameraDepthBand = -1;
  this.shakeSystem = new CameraShakeSystem(this, undefined, {
    getDisplaySettings: () => USER_SETTINGS.getDisplay(),
  });
  this.add.rectangle(this.config.worldWidthPx + 5000, this.config.worldDepthPx / 2, 10000, this.config.worldDepthPx, 0x000000).setDepth(HUD_LAYOUT.bgMaskDepth);

  this.inputHandler = new PlayerInputHandler(this);
  this.caveEntryController = new CaveEntryController(this);
  this.caveEntryController.create();
  this.overlayManager = new OverlayManager(this);
  this.comboSystem = new ComboSystem();
  this.specialBlockEffectsManager = new SpecialBlockEffectsManager(this);
  this.digSystem = new DigSystem(this.worldModel, this.worldRenderer, this.config, null, null, null, this.comboSystem, this.specialBlockEffectsManager);
  this.retentionProgressSystem = new RetentionProgressSystem({ saveSlot: this.saveSlot });
  this.digSystem.setRetentionProgressSystem(this.retentionProgressSystem);
  this.ancientRelicSystem = new AncientRelicSystem();
  this.digSystem.setAncientRelicSystem(this.ancientRelicSystem);
  this.heavenblocksProgressionSystem = new HeavenblocksProgressionSystem({
    relicCountProvider: () => this.ancientRelicSystem?.getCount?.() || 0,
    initialData: this._cachedSaveData?.heavenblocksData,
  });
  this.playerLevelSystem = new PlayerLevelSystem();
  this.playerLevelSystem.setComboSystem(this.comboSystem);
  this.playerLevelSystem.setTemporaryCriticalDamageBonusProvider(
    () => this.retentionProgressSystem.getChestCritDamageBonus(this.time?.now || 0)
  );
  this.upgradeSystem = new UpgradeSystem(this.digSystem, this.playerLevelSystem);
  this.titanClueSystem = new TitanClueSystem({
    retention: this.retentionProgressSystem,
    wallet: this.upgradeSystem,
    onStateChanged: () => this.queueDugTilesSave?.(),
  });
  this.digSystem.setUpgradeSystem(this.upgradeSystem);
  this.digSystem.setPlayerLevelSystem(this.playerLevelSystem);
  this.craftingSystem = new CraftingSystem({
    digSystem: this.digSystem,
    upgradeSystem: this.upgradeSystem,
    ancientRelicSystem: this.ancientRelicSystem,
    heavenblocksProgressionSystem: this.heavenblocksProgressionSystem,
  });
  const craftingHealth = this.craftingSystem.getHealthSnapshot();
  if (!craftingHealth.ready) {
    throw new Error("[PlaySceneSetup] Arc Forge dependencies failed their startup health check.");
  }
  // Create tile-based collision system (replaces Phaser Arcade Physics)
  this.tileCollisionSystem = new TileCollisionSystem(this.worldModel, this.config);
  this.playerController = new PlayerController(this, this.player, this.worldModel, this.config, this.upgradeSystem, this.inputHandler, this.playerLevelSystem, this.comboSystem, this.tileCollisionSystem);
  this.uiNotifications = new UINotificationSystem(this);
  this.hudSystem = new HUDSystem(this, this.config.worldWidthTiles - 1, this.config.hudRefreshIntervalMs);
  this.hudSystem.setComboSystem(this.comboSystem);
  this.hudSystem.setSpecialBlockEffectsManager(this.specialBlockEffectsManager);
  this.floatingTextSystem = new FloatingTextSystem(this, this.saveSlot);
  this.worldMapDiscoverySystem = new WorldMapDiscoverySystem(this, this.saveSlot);
  this.worldMapActivityRegistry = new WorldMapActivityRegistry();
  this.worldMapDiscoverySystem.updatePlayerDiscovery(true);
  this.digSystem.setFloatingTextSystem(this.floatingTextSystem);
  this.starHeartProgressionSystem = new StarHeartProgressionSystem({
    isGodModeActive: () => this.upgradeSystem?.godModeActive === true,
    onChanged: (snapshot, event) => {
      this.queueDugTilesSave?.();
      if (event === "heart-earned") {
        this.uiNotifications?.success?.(
          `STAR HEART FORGED  •  ${snapshot.charge}/${snapshot.chargeCapacity}`
            + " CHARGE  •  RETURN TO THE STAR PILLAR",
          { key: "star-heart-forged", durationMs: 3600 },
        );
      }
    },
  });
  this.starHeartProgressionSystem.loadSaveData(
    this._cachedSaveData?.starHeartData,
    this.floatingTextSystem.getUnlockedConstellations().length,
  );
  this.floatingTextSystem.setCollectedSkyStarCallback((detail) => {
    const gained = this.starHeartProgressionSystem.recordCollectedSkyStar(detail.rarity);
    this.starPillarSystem?.onCollectedSkyStar?.(detail);
    if (gained > 0) this.hudSystem?.pulseGemPower?.(true);
  });
  this.lootPickupFxSystem = new LootPickupFxSystem(this, this.hudSystem);
  this.relicDiscoveryFxSystem = new RelicDiscoveryFxSystem(this, {
    targetProvider: () => (
      this.player?.getCenter?.({ x: 0, y: 0 }, true)
      || (Number.isFinite(this.player?.x) && Number.isFinite(this.player?.y)
        ? { x: this.player.x, y: this.player.y }
        : null)
    ),
  });
  this.digSystem.setRelicDiscoveryFxSystem?.(this.relicDiscoveryFxSystem);
  this.comboSystem.setMilestoneReachedCallback((milestone) => {
    const reward = COMBO_CONFIG.milestoneRewards?.[milestone];
    const restored = this.playerController?.abilities?.restoreGemPower?.(reward?.gpRestore || 0) || 0;
    if (restored > 0) this.hudSystem?.pulseGemPower?.(true);
    if (this.shakeSystem) {
      this.shakeSystem.shake(comboShakeSignatureFor(milestone));
    }
  });
  this.milestoneBoardSystem = new MilestoneBoardSystem(
    this,
    this.config,
    this.worldModel,
    PLAY_SCENE_UI_FACTORIES,
    this.saveSlot,
    this.retentionProgressSystem
  );
  this.milestoneBoardSystem.create();
  this.biomeSystem = new BiomeSystem(this, this.config, this.worldModel);
  this.campfireSystem = new CampfireSystem(this, this.config, this.worldModel, PLAY_SCENE_UI_FACTORIES, this.saveSlot);
  this.campfireSystem.create();
  this.digSystem.setCampfireSystem(this.campfireSystem);
  this.playerLevelSystem.setCampfireSystem(this.campfireSystem);
  this.starHeartOverlay = new StarHeartOverlay(this, this.starHeartProgressionSystem);
  this.starPillarSystem = new StarPillarSystem(
    this,
    this.config,
    this.floatingTextSystem,
    PLAY_SCENE_UI_FACTORIES,
    this.starHeartOverlay,
  );
  this.starPillarSystem.create();
  this.floatingTextSystem.setConstellationUnlockedCallback((type) => {
    this.starPillarSystem.onConstellationUnlocked(type);
    this.starHeartProgressionSystem.syncConstellationCount(
      this.floatingTextSystem.getUnlockedConstellations().length,
    );
    const resourceNames = { dirt: 'Dirt', stone: 'Stone', copper: 'Copper', darkDirtNormal: 'Dark Dirt', darkDirtStrong: 'Hard Dirt', steel: 'Steel', iron: 'Iron', bronze: 'Bronze', silver: 'Silver', gold: 'Gold' };
    const passiveBuffText = (
      `${resourceNames[type] || type} Star Blocks +${CONSTELLATION_MATCHING_STAR_YIELD_BONUS}x yield`
    );
    const abilities = this.playerController?.abilities;
    const buff = CONSTELLATION_BUFFS[type];
    const prerequisite = CONSTELLATION_ABILITY_PREREQUISITES[buff?.ability];
    abilities?._refreshConstellationStats?.();
    const abilityOwned = prerequisite
      && abilities?.[prerequisite.unlockMethod]?.() === true;
    const mutationText = buff && prerequisite
      ? abilityOwned
        ? `${buff.name} active  •  ${buff.description}`
        : `${buff.name} sealed  •  Buy ${prerequisite.abilityName} from ${prerequisite.merchantName}`
      : "";
    if (this.hudSystem) {
      this.hudSystem.flashStatus(
        `${resourceNames[type] || type} constellation mastered`
          + `  •  ${passiveBuffText}`
          + (mutationText ? `\n${mutationText}` : ""),
        '#FFD700',
        3000,
      );
    }
    if (abilities) {
      if (this.shakeSystem) this.shakeSystem.shake("misc.constellationUnlock");
    }
  });

  this._gamefeelConfig = GAMEFEEL_CONFIG;
  this.hitstopSystem = new HitstopSystem(this, GAMEFEEL_CONFIG.hitstop);
  this.screenFlashSystem = new ScreenFlashSystem(this, GAMEFEEL_CONFIG.flash);
  this.pickaxeTrailSystem = new PickaxeTrailSystem(this, this.player, GAMEFEEL_CONFIG.trail);
  this.climbTrailSystem = new ClimbTrailSystem(this, this.player, GAMEFEEL_CONFIG.climb);
  this.flightFootParticleSystem = new FlightFootParticleSystem(
    this,
    this.player,
    this.playerAssetProfile,
  );

  // ── AAA polish layer: postFX grading, body language, ambient atmosphere ──
  this.postFxSystem = new PostFxSystem(this);
  this.postFxSystem.create();
  this.playerBodyLanguage = new PlayerBodyLanguageSystem(this, this.player);
  this.playerBodyLanguage.create();
  this.playerMotionPolish = this.playerAssetProfile.isUalNative
    ? new PlayerMotionPolishSystem(this.playerAssetProfile)
    : null;
  this.playerMotionPolish?.reset(this.time?.now || 0);
  this.playerKinematicMotion = new PlayerKinematicMotionSystem(
    this,
    this.player,
    this.playerController,
    this.playerAssetProfile,
  );
  this.ualLocomotionTransitionSelector = this.playerAssetProfile.isUalNative
    ? new UalNativeLocomotionTransitionSelector(this.playerAssetProfile)
    : null;
  this.ualLocomotionTransitionSelector?.reset({
    grounded: this.playerController?.isGrounded?.() !== false,
    flying: this.playerController?.abilities?.isFlying?.() === true,
    facingFlipX: !this.playerController?.isFacingRight?.(),
  });
  this.playerRigContact = new PlayerRigContactSystem(
    this,
    this.player,
    this.playerController,
    this.playerAssetProfile,
  );
  this.playerRigContact.create();
  this.playerSolidOcclusion = new PlayerSolidOcclusionSystem(
    this,
    this.player,
    this.worldModel,
    this.playerAssetProfile,
  );
  this.playerSolidOcclusion.create();
  this.ambientParticleSystem = new AmbientParticleSystem(this);
  this.ambientParticleSystem.create();
  this.depthMilestoneCinematic = new DepthMilestoneCinematic(this);
  this.depthMilestoneCinematic.create();

  const _gfx = this.make.graphics({ add: false });
  _gfx.fillStyle(0xffffff, 1);
  _gfx.fillCircle(GAMEFEEL_CONFIG.particles.size, GAMEFEEL_CONFIG.particles.size, GAMEFEEL_CONFIG.particles.size);
  _gfx.generateTexture('_gamefeel_particle', GAMEFEEL_CONFIG.particles.size * 2, GAMEFEEL_CONFIG.particles.size * 2);
  _gfx.destroy();

  this.specialTileSystem = new SpecialTileSystem(this, this.worldModel, this.playerController, this.floatingTextSystem);
  this.heavenblocksPresentationSystem = new HeavenblocksPresentationSystem(this, this.worldModel);
  this.heavenblocksAccessSystem = new HeavenblocksAccessSystem(this, {
    worldModel: this.worldModel,
    playerController: this.playerController,
    progressionSystem: this.heavenblocksProgressionSystem,
    ancientRelicSystem: this.ancientRelicSystem,
    upgradeSystem: this.upgradeSystem,
    presentationSystem: this.heavenblocksPresentationSystem,
    onChanged: () => this.queueDugTilesSave?.(),
  });
  this.heavenblocksAccessSystem.create();
  this.dayNightCycle = new DayNightCycle(this, this.config);
  this.weatherSystem = new WeatherSystem(this, this.config, this.config.weather);
  this.lightSystem = new LightSystem(this, this.playerController, this.dayNightCycle, this.weatherSystem);
  this.worldRenderer.setEmissiveRenderDepth(this.lightSystem.config.emissiveRenderDepth);
  this.shaderSystem = new ShaderSystem(this);
  this.shaderSystem.create();
  this.lightFrameSync = new LightFrameSync(this);
  this.atmosphereSystem = new AtmosphereSystem(this, this.config);
  this.gameInputHandler = new GameInputHandler(this, this.inputHandler, this.playerController.input);
  this.screenRecordSystem = new ScreenRecordSystem(this);
  this._refreshSafeReturnLine();
  this._gemPowerBarBg = this.add.graphics().setScrollFactor(0).setDepth(HUD_LAYOUT.hudDepth);
  this._gemPowerBarFill = this.add.graphics().setScrollFactor(0).setDepth(HUD_LAYOUT.hudOverlayDepth);
  this._gpLabelText = this.add.text(HUD_LAYOUT.gpLabelX, HUD_LAYOUT.gpLabelY, "", { fontFamily: "Consolas, monospace", fontSize: HUD_LAYOUT.gpLabelFontSize, color: HUD_LAYOUT.gpLabelColor }).setScrollFactor(0).setDepth(HUD_LAYOUT.hudOverlayDepth);
  this.hudSystem?.bindGemPowerObjects(this._gemPowerBarBg, this._gemPowerBarFill, this._gpLabelText);

  this.soundSystem = new SoundSystem(this);
  this.soundSystem.init();
  USER_SETTINGS.applyAudioTo(this.soundSystem);
  this.soundSystem.loadSoundLibraries();
  this.soundSystem.loadVoiceLineLibraries();
  this.soundSystem.printStats();

  this.createSceneUI();
  this.hardcoreMemorialStore = new HardcoreMemorialStore();
  this.hardcoreMemorialSystem = new HardcoreMemorialWorldSystem(
    this,
    this.hardcoreMemorialStore.getForSlot(this.saveSlot),
  );
  createHardcoreModeRuntime(this);
  this.celestialEngineController = new CelestialEngineController(
    this,
    this.starHeartProgressionSystem,
  );
  this.nextPromiseHudSystem = new NextPromiseHudSystem(this);
  this.miningIntentPreviewSystem = new MiningIntentPreviewSystem(this);
  this.thunderStrikeActionRuntime = new ThunderStrikeActionRuntime(this);
  this.openingFlightArtifactSystem = new OpeningFlightArtifactSystem(this);
  this.townSquareTutorialSystem = new TownSquareTutorialSystem(this);

  const keys = this.inputHandler.getKeys();
  this.interactKey = keys.interact;
  this.aimBox = this.inputHandler.aimBox;
  this.overlayManager.createOverlay();

  this.earthquakeSystem = new EarthquakeSystem(this);
  this.earthquakeFeedbackUI = new EarthquakeFeedbackUI(this, this.earthquakeSystem);
  this.earthquakeHazardOverlay = new EarthquakeHazardOverlay(this, this.earthquakeSystem);
  this.earthquakeTileFeedbackSystem = new EarthquakeTileFeedbackSystem(this);
  this.depthGateSystem = new DepthGateSystem(this, this._hardcoreRuntime?.modal);
  this.journeySystem = createJourneyRuntime(this);
  this.upgradeSystem.setProgressionStateProvider(() => ({
    isDepthGateAccepted: threshold => this.depthGateSystem?.accepted?.has?.(threshold) === true,
  }));
  this.surfaceTunnelDoorSystem = new SurfaceTunnelDoorSystem(this);
  this.surfaceTunnelDoorSystem.create();
  this.arcCoreVehicleSystem = new ArcCoreVehicleSystem(this);
  this.arcCoreVehicleSystem.create();
  createGraveborerWurmRuntime(this);
  installDebugUiSmokeHooks(this);
  installJkdE2EHarness(this);

  this._autosaveInterval = setInterval(() => this.queueDugTilesSave(), 60000);

  this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    this._isShuttingDown = true;
    this.caveEntryController?.destroy();
    clearInterval(this._autosaveInterval);
    this.queueDugTilesSave();
    if (this.player) {
      this.player.off(Phaser.Animations.Events.ANIMATION_COMPLETE, this._onAnimComplete);
      this.player.off(Phaser.Animations.Events.ANIMATION_UPDATE, this._onAnimUpdate);
    }
    this.thunderStrikeActionRuntime?.destroy();
    this.ualActionContactTimeline?.destroy();
    if (this._debugKey) { this._debugKey.off('down', this._debugKeyHandler); }
    if (this._debugUiSmokeKeyHandler) { this.input.keyboard.off('keydown', this._debugUiSmokeKeyHandler); this._debugUiSmokeKeyHandler = null; }
    if (this._resizeHandler) { this.scale.off('resize', this._resizeHandler); }
    this.worldMapOverlay?.destroy?.();
    this.worldMapOverlay = null;
    destroyHardcoreModeRuntime(this);
    this.hardcoreMemorialSystem?.destroy();
    this.hardcoreMemorialSystem = null;
    this.hardcoreMemorialStore = null;
    this.destroySceneUI();
    this.titanClueSystem?.destroy();
    this.npcManager?.destroy();
    this.overlayManager?.destroy();
    this.startZoneScenicBackgroundSystem?.destroy();
    this.levelOneGroundFacadeSystem?.destroy();
    this.startZoneGroundFacadeSystem?.destroy();
    this.deepWorldLivingBackdropSystem?.destroy();
    this.worldScenicFacadeSystem?.destroy();
    this.worldBackgroundAmbientMotionSystem?.destroy();
    this.levelOneLivingBackdropSystem?.destroy();
    this.v11SkyIslandVisualSystem?.destroy();
    this.worldRenderer?.destroy();
    this.bgObjectPlacer?.destroy();
    this.caveTemplateVisualSystem?.destroy();
    this.caveAtmosphereSystem?.destroy();
    this.caveHazardSystem?.destroy();
    this.caveInteriorOcclusionSystem?.destroy();
    this.specialBlockEffectsManager?.destroy();
    this.milestoneBoardSystem?.destroy();
    this.biomeSystem?.destroy();
    this.campfireSystem?.destroy();
    this.specialTileSystem?.destroy();
    this.heavenblocksAccessSystem?.destroy();
    this.heavenblocksPresentationSystem?.destroy();
    this.nextPromiseHudSystem?.destroy();
    this.miningIntentPreviewSystem?.destroy();
    this._gpLabelText?.destroy();
    this.hitstopSystem?.destroy();
    this.screenFlashSystem?.destroy();
    this.screenRecordSystem?.destroy();
    this.pickaxeTrailSystem?.destroy();
    this.climbTrailSystem?.destroy();
    this.flightFootParticleSystem?.destroy();
    this.postFxSystem?.destroy();
    this.playerBodyLanguage?.destroy();
    this.playerMotionPolish?.destroy();
    this.playerKinematicMotion?.destroy();
    this.ualLocomotionTransitionSelector?.reset();
    this.ualLocomotionTransitionSelector = null;
    this.playerRigContact?.destroy();
    this.ualMiningComboSelector?.reset?.();
    this.ualMiningComboSelector = null;
    this._ualFlightTravelVisual = false;
    this.playerSolidOcclusion?.destroy();
    this.ambientParticleSystem?.destroy();
    this.depthMilestoneCinematic?.destroy();
    this._livingDrillTween?.stop();
    this._livingDrillOccluder?.destroy();
    this.celestialEngineController?.destroy();
    this.starPillarSystem?.destroy();
    this.starHeartProgressionSystem?.destroy();
    this.lootPickupFxSystem?.destroy();
    this.relicDiscoveryFxSystem?.destroy();
    this.floatingTextSystem?.destroy();
    this.worldMapDiscoverySystem?.destroy();
    this.worldMapActivityRegistry?.destroy();
    this.weatherSystem?.destroy();
    this.lightFrameSync?.destroy();
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
    this.openingFlightArtifactSystem?.destroy();
    this.townSquareTutorialSystem?.destroy();
    this.arcCoreVehicleSystem?.destroy();
    destroyGraveborerWurmRuntime(this);
    this.earthquakeSystem?.destroy();
    this.earthquakeFeedbackUI?.destroy();
    this.earthquakeHazardOverlay?.destroy();
    this.earthquakeTileFeedbackSystem?.destroy();
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
  this.journeySystem?.seedCurrentState?.();
  if (this.retentionProgressSystem?.getTutorialState?.().choice === null) {
    this.retentionProgressSystem.configureTutorialChoice(data.tutorialChoice);
  }
  this.openingFlightArtifactSystem?.create();
  this.townSquareTutorialSystem?.create();
  this.syncHardcoreArmingFromFlight?.();
  this.surfaceTunnelDoorSystem?.syncFromUpgrade();
  this.arcCoreVehicleSystem?.syncOwnership();
  this.updatePlayerVisualState(true);
  // An explicitly selected new save must remain fresh. In particular, do not
  // let a stale remote payload return after a failed permadeath remote delete
  // once beginNewSave() has intentionally cleared the local tombstone.
  if (data.isNewSave !== true) this.restorePersistentState();
  if (data.autoStart !== false) { this.startRun(); } else { this.enterTitleState(); }
  if (data.isNewSave === true) this.queueDugTilesSave?.();
  this._resizeHandler = (gameSize, baseSize, displaySize, previousWidth, previousHeight) => { if (this.resize) { this.resize(gameSize, baseSize, displaySize, previousWidth, previousHeight); } };
  this.scale.on('resize', this._resizeHandler);
}
