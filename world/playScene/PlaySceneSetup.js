/**
 * PlayScene Setup Module
 * Handles scene initialization, world setup, and system creation
 */
import { ASSET_KEYS } from "../../values/assetKeys.js";
import {
  resolvePlayerDisplaySizePx,
  resolvePlayerVisualOrigin,
} from "../../values/playerAssetProfiles.js?rev=20260820-complex-dig-v1";
import { PlayerAbilityAssetController } from
  "../../player/PlayerAbilityAssetController.js";
import { PlayerDeferredAnimationAssetController } from
  "../../player/PlayerDeferredAnimationAssetController.js?rev=20260820-complex-dig-v1";
import { UalActionContactTimeline } from "../../player/UalActionContactTimeline.js";
import { GAME_CONFIG } from "../../values/gameConfig.js";
import { HUD_LAYOUT } from "../../values/hudLayout.js";
import { WorldModel } from "../WorldModel.js";
import { createWorldRenderer } from
  "../rendering/WorldRenderFactory.js?rev=20260729-native-density-v14";
import { RuntimeAssetLoadCoordinator } from
  "../rendering/RuntimeAssetLoadCoordinator.js";
import { RuntimeFeatureAssetManager } from
  "../rendering/RuntimeFeatureAssetManager.js";
import { createPlaySceneSaveCoordinator } from "./PlaySceneSaveRuntime.js";
import { preparePlayScenePlayerAssets } from "./PlayScenePlayerAssetSetup.js?rev=20260820-complex-dig-v1";
import { RuntimeFeaturePrefetchSystem } from
  "../rendering/RuntimeFeaturePrefetchSystem.js";
import { WORLD_VISUAL_RUNTIME_MODES } from
  "../../values/worldVisualRuntime.js?rev=20260729-native-density-v14";
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
import { AnimatedCacheVisualSystem } from
  "../../systems/visual/AnimatedCacheVisualSystem.js";
import { InteractiveWorldStateTextureBank } from
  "../../systems/visual/InteractiveWorldStateTextureBank.js";
import { MemoryReliquaryWorldSystem } from
  "../../systems/visual/MemoryReliquaryWorldSystem.js";
import { WorldMapDiscoverySystem } from "../../systems/map/WorldMapDiscoverySystem.js";
import { WorldMapActivityRegistry } from "../../systems/map/WorldMapActivityRegistry.js";
import { UpgradeSystem } from "../../systems/progression/UpgradeSystem.js";
import { PlayerLevelSystem } from "../../systems/progression/PlayerLevelSystem.js";
import { AncientRelicSystem } from "../../systems/progression/AncientRelicSystem.js";
import { HeavenblocksProgressionSystem } from "../../systems/progression/HeavenblocksProgressionSystem.js";
import { MemoryReliquaryDiscoverySystem } from
  "../../systems/progression/MemoryReliquaryDiscoverySystem.js";
import { RetentionProgressSystem } from "../../systems/progression/RetentionProgressSystem.js";
import { TitanClueSystem } from "../../systems/progression/TitanClueSystem.js";
import { SystemIntroductionSystem } from "../../systems/onboarding/SystemIntroductionSystem.js";
import { CraftingSystem } from "../../systems/crafting/CraftingSystem.js";
import { StarHeartProgressionSystem } from "../../systems/celestial/StarHeartProgressionSystem.js";
import { DugTilesSaveStore } from "../model/DugTilesSaveStore.js?rev=20260727-save-transfer-v1";
import { PlayerInputHandler } from "./PlayerInputHandler.js";
import { GameInputHandler } from "./GameInputHandler.js";
import { ThunderStrikeActionRuntime } from "./ThunderStrikeActionRuntime.js?rev=20260727-restart-lifecycle-v1";
import { CelestialEngineController } from "./CelestialEngineController.js";
import { initializeCelestialOverhaulRuntime } from
  "./CelestialOverhaulRuntime.js";
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
import { FlightFootParticleSystem } from "../../systems/visual/FlightFootParticleSystem.js";
import { GroundFootstepFxSystem } from "../../systems/visual/GroundFootstepFxSystem.js";
import { PostFxSystem } from "../../systems/visual/PostFxSystem.js";
import { FullWorldMaterialSystem } from "../../systems/visual/FullWorldMaterialSystem.js";
import { PlayerBodyLanguageSystem } from "../../systems/visual/PlayerBodyLanguageSystem.js";
import { PlayerContactShadowSystem } from "../../systems/visual/PlayerContactShadowSystem.js";
import { PlayerMotionPolishSystem } from "../../systems/visual/PlayerMotionPolishSystem.js";
import { PlayerKinematicMotionSystem } from "../../systems/visual/PlayerKinematicMotionSystem.js";
import { UalNativeLocomotionTransitionSelector } from "../../systems/visual/UalNativeLocomotionTransitionSelector.js";
import { PlayerRigContactSystem } from "../../systems/visual/PlayerRigContactSystem.js";
import { PlayerSolidOcclusionSystem } from "../../systems/visual/PlayerSolidOcclusionSystem.js";
import { AmbientParticleSystem } from "../../systems/environment/AmbientParticleSystem.js";
import { DepthMilestoneCinematic } from "../../systems/visual/DepthMilestoneCinematic.js";
import { GAMEFEEL_CONFIG } from "../../values/gamefeel.js";
import { ComboSystem } from "../../systems/combo/ComboSystem.js";
import { StarPillarSystem } from "../../systems/visual/StarPillarSystem.js";
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
import { DebrisShieldSystem } from "../../systems/visual/DebrisShieldSystem.js";
import { EarthquakeFeedbackUI } from "../../systems/visual/EarthquakeFeedbackUI.js";
import { EarthquakeHazardOverlay } from "../../systems/visual/EarthquakeHazardOverlay.js";
import { EarthquakeTileFeedbackSystem } from "../../systems/visual/EarthquakeTileFeedbackSystem.js";
import { DepthGateSystem } from "../../systems/progression/DepthGateSystem.js";
import { createJourneyRuntime } from "./JourneyBridge.js";
import { SurfaceTunnelDoorSystem } from "../../systems/environment/SurfaceTunnelDoorSystem.js";
import { ArcCoreVehicleSystem } from "../../systems/vehicles/ArcCoreVehicleSystem.js";
import { V11SkyIslandVisualSystem } from "../../systems/environment/V11SkyIslandVisualSystem.js?rev=20260729-native-density-v14";
import { HeavenblocksAccessSystem } from "../../systems/environment/HeavenblocksAccessSystem.js";
import { HeavenblocksPresentationSystem } from "../../systems/visual/HeavenblocksPresentationSystem.js";
import { OpeningFlightArtifactSystem } from "../../systems/onboarding/OpeningFlightArtifactSystem.js";
import { TownSquareTutorialSystem } from "../../systems/onboarding/TownSquareTutorialSystem.js";
import { FirstSessionPortalSystem } from "../../systems/onboarding/FirstSessionPortalSystem.js";
import { UnderstarEndingSystem } from "../../systems/demo/UnderstarEndingSystem.js";
import { isHardcoreMode } from "../../values/hardcoreMode.js";

import { LightSystem } from "../../systems/lighting/LightSystem.js?rev=20260815-shallow-material-v1";
import { CameraShakeSystem } from "../../systems/visual/CameraShakeSystem.js";
import { TileDestructionFxSystem } from "../../systems/visual/TileDestructionFxSystem.js";
import { USER_SETTINGS } from "../../systems/UserSettings.js";
import { installJkdE2EHarness } from "../../testing/JkdE2EHarness.js?rev=20260729-native-density-v14";
import { CaveEntryController } from "./CaveEntryController.js";
import {
  createGraveborerWurmRuntime,
} from "./GraveborerWurmBridge.js";
import {
  createHardcoreModeRuntime,
} from "./HardcoreModeBridge.js";
import { ensureHardcorePresentationRuntime } from
  "./HardcorePresentationRuntime.js";
import { RandomEventBridge } from "./RandomEventBridge.js";
import { installPlaySceneLifecycle } from "./PlaySceneLifecycle.js";
import { installComplexDigAnimationRuntime } from "./ComplexDigAnimationRuntime.js";
import { SURFACE_TUNNEL_DOOR_CONFIG } from "../../values/surfaceTunnelDoorConfig.js";
import { WORLD_DEPTH_CONFIG } from "../../values/worldDepthConfig.js";
import {
  GAMEPLAY_FEATURE_IDS,
  isGameplayFeatureEnabled,
} from "../../values/gameplayDevFlags.js";

function resolveGameplayWorldBounds(config, gameplayCapabilities) {
  if (isGameplayFeatureEnabled(GAMEPLAY_FEATURE_IDS.LEVEL_TWO, gameplayCapabilities)) {
    return { width: config.worldWidthPx, height: config.worldDepthPx };
  }
  return {
    width: Math.min(
      config.worldWidthPx,
      (SURFACE_TUNNEL_DOOR_CONFIG.tileX + 1) * config.tileSize,
    ),
    height: Math.min(
      config.worldDepthPx,
      (
        WORLD_DEPTH_CONFIG.topAirRows
        + WORLD_DEPTH_CONFIG.levelOneRuntimeDepthTiles
        + 1
      ) * config.tileSize,
    ),
  };
}

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
      case 4: scene.campfireSystem?._openBuffSelection?.(); break;
      case 5: scene.milestoneBoardSystem?._openBoardView?.(); break;
      case 6: scene.depthGateSystem?._open?.({ threshold: 100, title: "DEPTH WARNING: 100M", message: "Smoke test depth confirmation." }); break;
      case 7: toggleAuthoredBackgroundVisualMode(scene); break;
      default: break;
    }
  };
  scene.input.keyboard.on("keydown", scene._debugUiSmokeKeyHandler);
}

/**
 * Entry point for PlayScene setup. Handles fatal errors with a visible error overlay.
 * Async so robot spritesheets can be loaded on-demand before animation creation.
 */
export async function setupScene(data = {}, uiPorts = this.uiPorts) {
  try {
    await _setupSceneSafe.call(this, data, uiPorts);
    return true;
  } catch (err) {
    this.memoryReliquaryWorldSystem?.destroy();
    this.animatedCacheVisualSystem?.destroy();
    this.memoryReliquaryDiscoverySystem?.destroy();
    this.interactiveWorldStateTextureBank?.destroy();
    console.error('[PlayScene] Fatal error during setupScene:', err);
    this.runtimeFeaturePrefetchSystem?.destroy();
    this.runtimeFeatureAssetManager?.destroy();
    this.runtimeAssetLoadCoordinator?.destroy();
    reportPlaySceneSetupFailure(err);
    this._saveWritesBlocked = true;
    this.sceneModeController?.enterSafePause?.({ subsystem: "play-scene-setup" });
    try {
      this._recoveryOverlay ||= uiPorts.createRecoveryOverlay(this);
      this._recoveryOverlay.show({ id: "play-scene-setup", phase: "loading", error: err });
    } catch (_) { /* ignore visual error */ }
    // Attempt to restore menu audio and return gracefully
    try {
      this.scene.launch('MenuAudioScene');
      this.scene.get('MenuAudioScene')?.attachTo?.(this);
    } catch (_) { /* ignore */ }
    return false;
  }
}

async function _setupSceneSafe(data = {}, uiPorts = {}) {
  if (typeof uiPorts.createNotificationSystem !== "function" || !uiPorts.worldUiFactories) {
    throw new Error("[PlaySceneSetup] Required UI ports were not injected.");
  }
  this.uiPorts = uiPorts;
  const setupStartedAtMs = globalThis.performance?.now?.() || Date.now();
  const markSetupPhase = phase => {
    this._setupPhase = phase;
    this._setupTimeline ||= [];
    this._setupTimeline.push({
      phase,
      elapsedMs: Math.round((globalThis.performance?.now?.() || Date.now()) - setupStartedAtMs),
    });
  };
  markSetupPhase("world-model");
  this._isShuttingDown = false;
  this.saveSlot = data.saveSlot || 1;
  this.worldIdentity = data.worldIdentity || `save-slot-${this.saveSlot}`;
  this.dugTileSaveStore = new DugTilesSaveStore({ slotId: this.saveSlot });
  if (data.isNewSave === true) this.dugTileSaveStore.beginNewSave();
  this.worldModel = new WorldModel(this.config, this.gameplayCapabilities);
  const worldIdentityForSave = this.worldModel.getWorldIdentity();
  const initialCachedSave = this.dugTileSaveStore.loadCached(worldIdentityForSave);
  this._cachedSaveData = initialCachedSave;
  await preparePlayScenePlayerAssets(this, data, initialCachedSave);
  markSetupPhase("runtime-assets");
  this.runtimeAssetLoadCoordinator = new RuntimeAssetLoadCoordinator(this);
  this.npcManager = new NPCManager(this, ASSET_KEYS);
  this.runtimeFeatureAssetManager = new RuntimeFeatureAssetManager(this);
  this.runtimeFeaturePrefetchSystem = new RuntimeFeaturePrefetchSystem(this, this.runtimeFeatureAssetManager);
  void this.runtimeFeaturePrefetchSystem.start();
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
  markSetupPhase("world-presentation");

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
  const gameplayWorldBounds = resolveGameplayWorldBounds(this.config, this.gameplayCapabilities);
  this.physics.world.setBounds(0, 0, gameplayWorldBounds.width, gameplayWorldBounds.height);

  this._safeReturnGfx = this.add.graphics();
  this._safeReturnText = this.add.text(HUD_LAYOUT.warnTextX, 0, "", { fontFamily: "Consolas, monospace", fontSize: HUD_LAYOUT.safeFontSize, color: HUD_LAYOUT.safeTextColor }).setDepth(5);
  this._lastSafeReturnDepth = -1;

  const warningY = (this.config.topAirRows + this.config.flightWarningDepthTiles) * this.config.tileSize;
  this._gemPowerWarningGfx = this.add.graphics();
  this._gemPowerWarningGfx.lineStyle(HUD_LAYOUT.warnLineWidth, HUD_LAYOUT.warnLineColor, HUD_LAYOUT.warnLineAlpha);
  this._gemPowerWarningGfx.lineBetween(0, warningY, this.config.worldWidthPx, warningY);
  this._gemPowerWarningText = this.add.text(
    HUD_LAYOUT.warnTextX,
    warningY + HUD_LAYOUT.warnTextOffsetY,
    "⚠  Gem Power critical zone — returning is very difficult",
    { fontFamily: "Consolas, monospace", fontSize: HUD_LAYOUT.warnFontSize, color: HUD_LAYOUT.warnColor },
  ).setDepth(5);

  const islandLabelX = (this.config.skyIslandTileX + this.config.skyIslandWidthTiles / 2) * this.config.tileSize;
  const islandLabelY = (this.config.skyIslandTileY - 2) * this.config.tileSize;
  this._skyIslandLabel = this.add.text(
    islandLabelX,
    islandLabelY,
    "✦  Sky Island  ✦",
    { fontFamily: "Trebuchet MS, Segoe UI, sans-serif", fontSize: HUD_LAYOUT.skyLabelFontSize, color: HUD_LAYOUT.skyLabelColor },
  ).setOrigin(0.5).setDepth(5);

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

  this.cameras.main.setBounds(0, 0, gameplayWorldBounds.width, gameplayWorldBounds.height);
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
  this.overlayManager = new OverlayManager(this, uiPorts.worldUiFactories.createModalShell);
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
    gameplayCapabilities: this.gameplayCapabilities,
  });
  this.playerLevelSystem = new PlayerLevelSystem();
  this.playerLevelSystem.setComboSystem(this.comboSystem);
  this.playerLevelSystem.setTemporaryCriticalDamageBonusProvider(
    () => this.retentionProgressSystem.getChestCritDamageBonus(this.time?.now || 0)
  );
  this.upgradeSystem = new UpgradeSystem(this.digSystem, this.playerLevelSystem, {
    depthEconomyEnabled: this.config.resourceEconomyEnabled,
    gameplayCapabilities: this.gameplayCapabilities,
  });
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
    gameplayCapabilities: this.gameplayCapabilities,
  });
  const craftingHealth = this.craftingSystem.getHealthSnapshot();
  if (!craftingHealth.ready) {
    throw new Error("[PlaySceneSetup] Arc Forge dependencies failed their startup health check.");
  }
  // Create tile-based collision system (replaces Phaser Arcade Physics)
  this.tileCollisionSystem = new TileCollisionSystem(this.worldModel, this.config);
  this.playerController = new PlayerController(this, this.player, this.worldModel, this.config, this.upgradeSystem, this.inputHandler, this.playerLevelSystem, this.comboSystem, this.tileCollisionSystem);
  this.playerAbilityAssetController = new PlayerAbilityAssetController(
    this,
    this.playerAssetProfile,
  );
  this.playerDeferredAnimationAssetController =
    new PlayerDeferredAnimationAssetController(this, this.playerAssetProfile);
  this.playerController.abilities.setAbilityAssetReadiness(
    this.playerAbilityAssetController,
  );
  markSetupPhase("player-runtime");
  this.uiNotifications = uiPorts.createNotificationSystem(this);
  this.hudSystem = new HUDSystem(this, this.config.worldWidthTiles - 1, this.config.hudRefreshIntervalMs);
  this.hudSystem.setComboSystem(this.comboSystem);
  this.hudSystem.setSpecialBlockEffectsManager(this.specialBlockEffectsManager);
  this.floatingTextSystem = new FloatingTextSystem(
    this,
    this.saveSlot,
    this._cachedSaveData?.starCollectionData,
  );
  this.worldMapDiscoverySystem = new WorldMapDiscoverySystem(this, this.saveSlot);
  this.worldMapActivityRegistry = new WorldMapActivityRegistry();
  this.worldMapDiscoverySystem.updatePlayerDiscovery(true);
  this.digSystem.setFloatingTextSystem(this.floatingTextSystem);
  this.starHeartProgressionSystem = new StarHeartProgressionSystem({
    isGodModeActive: () => this.upgradeSystem?.godModeActive === true,
    onChanged: () => this.queueDugTilesSave?.(),
  });
  this.starHeartProgressionSystem.loadSaveData(
    this._cachedSaveData?.starHeartData,
    this.floatingTextSystem.getUnlockedConstellations().length,
  );
  initializeCelestialOverhaulRuntime(this, this._cachedSaveData);
  this.floatingTextSystem.setCollectedSkyStarCallback((detail) => {
    const gained = this.celestialTalentProgressionSystem
      ?.grantStarsFromRarity?.(detail.rarity) || 0;
    this.starPillarSystem?.onCollectedSkyStar?.(detail);
    if (gained > 0) {
      this.celestialCurrencyHudSystem?.update?.(true);
      this.celestialCurrencyHudSystem?.pulseStars?.();
    }
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
    uiPorts.worldUiFactories,
    this.saveSlot,
    this.retentionProgressSystem,
    this._cachedSaveData?.milestoneData,
  );
  this.milestoneBoardSystem.create();
  this.digSystem.setDepthMilestoneBonusProvider(
    () => this.milestoneBoardSystem?.getBonuses?.() || {},
  );
  this.biomeSystem = new BiomeSystem(this, this.config, this.worldModel);
  this.campfireSystem = new CampfireSystem(
    this,
    this.config,
    this.worldModel,
    uiPorts.worldUiFactories,
    this.saveSlot,
    this._cachedSaveData?.campfireData,
  );
  this.campfireSystem.create();
  this.digSystem.setCampfireSystem(this.campfireSystem);
  this.playerLevelSystem.setCampfireSystem(this.campfireSystem);
  this.starHeartOverlay = null;
  this.starPillarSystem = new StarPillarSystem(
    this,
    this.config,
    this.floatingTextSystem,
    uiPorts.worldUiFactories,
    null,
  );
  this.starPillarSystem.create();
  markSetupPhase("world-interactions");
  this.floatingTextSystem.setConstellationUnlockedCallback(() => {
    this.starHeartProgressionSystem.syncConstellationCount(
      this.floatingTextSystem.getUnlockedConstellations().length,
    );
    const abilities = this.playerController?.abilities;
    abilities?._refreshConstellationStats?.();
    if (abilities && this.shakeSystem) this.shakeSystem.shake("misc.constellationUnlock");
  });

  this._gamefeelConfig = GAMEFEEL_CONFIG;
  this.tileDestructionFxSystem = new TileDestructionFxSystem(this);
  this.groundFootstepFxSystem = new GroundFootstepFxSystem(
    this,
    this.player,
    this.playerController,
    this.worldModel,
    this.playerAssetProfile,
    { onFootstep: () => this.soundSystem?.playFootstep?.() },
  );
  this.groundFootstepFxSystem.create();
  this.hitstopSystem = new HitstopSystem(this, GAMEFEEL_CONFIG.hitstop);
  this.screenFlashSystem = new ScreenFlashSystem(this, GAMEFEEL_CONFIG.flash);
  this.pickaxeTrailSystem = new PickaxeTrailSystem(this, this.player, GAMEFEEL_CONFIG.trail);
  this.flightFootParticleSystem = new FlightFootParticleSystem(
    this,
    this.player,
    this.playerAssetProfile,
  );

  // ── AAA polish layer: postFX grading, body language, ambient atmosphere ──
  this.fullWorldMaterialSystem = new FullWorldMaterialSystem(this);
  this.fullWorldMaterialSystem.create();
  this.postFxSystem = new PostFxSystem(this);
  this.postFxSystem.create();
  this.playerBodyLanguage = new PlayerBodyLanguageSystem(this, this.player);
  this.playerBodyLanguage.create();
  this.playerContactShadow = new PlayerContactShadowSystem(this, this.player, this.playerController);
  this.playerContactShadow.create();
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

  this.specialTileSystem = new SpecialTileSystem(this, this.worldModel, this.playerController, this.floatingTextSystem);
  this.interactiveWorldStateTextureBank = new InteractiveWorldStateTextureBank(this);
  this.animatedCacheVisualSystem = new AnimatedCacheVisualSystem(
    this,
    this.worldModel,
    this.interactiveWorldStateTextureBank,
  );
  this.memoryReliquaryDiscoverySystem = new MemoryReliquaryDiscoverySystem(
    this.retentionProgressSystem,
    () => this.queueDugTilesSave?.(),
  );
  this.memoryReliquaryWorldSystem = new MemoryReliquaryWorldSystem(
    this,
    this.worldModel,
    this.interactiveWorldStateTextureBank,
    this.memoryReliquaryDiscoverySystem,
    () => `Press ${USER_SETTINGS.getKeyLabel("interact")}`,
  );
  this.memoryReliquaryWorldSystem.create();
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
  this.screenRecordSystem = GAME_CONFIG.debugMode ? new ScreenRecordSystem(this) : null;
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
  const hardcoreRuntime = createHardcoreModeRuntime(this);
  if (
    isHardcoreMode(this.hardcoreModeData)
    && !await ensureHardcorePresentationRuntime(this, hardcoreRuntime)
  ) throw new Error("[PlaySceneSetup] Hardcore presentation assets failed to load.");
  this.celestialEngineController = new CelestialEngineController(
    this,
    this.starHeartProgressionSystem,
    {
      talentProgression: this.celestialTalentProgressionSystem,
      showLegacyHud: false,
    },
  );
  this.nextPromiseHudSystem = new NextPromiseHudSystem(this);
  this.miningIntentPreviewSystem = new MiningIntentPreviewSystem(this);
  this.thunderStrikeActionRuntime = new ThunderStrikeActionRuntime(this);
  this.openingFlightArtifactSystem = new OpeningFlightArtifactSystem(this);
  this.firstSessionPortalSystem = new FirstSessionPortalSystem(this);
  this.townSquareTutorialSystem = new TownSquareTutorialSystem(this);

  const keys = this.inputHandler.getKeys();
  this.interactKey = keys.interact;
  this.aimBox = this.inputHandler.aimBox;
  this.overlayManager.createOverlay();

  this.earthquakeSystem = new EarthquakeSystem(this);
  this.debrisShieldSystem = new DebrisShieldSystem(this);
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
  this.randomEventBridge = new RandomEventBridge(this);
  this.worldModel.setTileDamageGuard?.(({ tileX, tileY }) => (
    this.randomEventBridge?.shouldProtectMineTarget?.({ tx: tileX, ty: tileY }) === true
  ));
  this.specialTileSystem?.setChestEventHandler?.(this.randomEventBridge);
  this.systemIntroductionSystem = new SystemIntroductionSystem(this, this.retentionProgressSystem);
  this.systemIntroductionSystem.refresh({ announce: false });
  this.understarEndingSystem = new UnderstarEndingSystem(this, {
    capabilities: this.gameplayCapabilities,
    assetCoordinator: this.runtimeAssetLoadCoordinator,
    createEndingOverlay: uiPorts.createUnderstarEndingOverlay,
    onChanged: reason => this.queueDugTilesSave?.(reason),
    onMainMenu: () => this.returnToMainMenu?.(),
  });

  installComplexDigAnimationRuntime(this);
  installDebugUiSmokeHooks(this);

  this.gameSaveCoordinator = createPlaySceneSaveCoordinator(this);
  installJkdE2EHarness(this);
  installPlaySceneLifecycle(this);
  markSetupPhase("persistent-state");

  const worldIdentity = worldIdentityForSave;
  const cachedSave = this._cachedSaveData;
  if (cachedSave && cachedSave.levelData) { this.playerLevelSystem.fromJSON(cachedSave.levelData); }
  if (cachedSave && cachedSave.comboData) { this.comboSystem.fromJSON(cachedSave.comboData); }
  this.applyPersistentState(cachedSave, false);
  this.playerAbilityAssetController.update();
  this.journeySystem?.seedCurrentState?.();
  if (this.retentionProgressSystem?.getTutorialState?.().choice === null) {
    this.retentionProgressSystem.configureTutorialChoice(data.tutorialChoice);
  }
  this.firstSessionPortalSystem?.ensure();
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
  markSetupPhase("ready");
  if (data.isNewSave === true) this.queueDugTilesSave?.();
  this._resizeHandler = (gameSize, baseSize, displaySize, previousWidth, previousHeight) => { if (this.resize) { this.resize(gameSize, baseSize, displaySize, previousWidth, previousHeight); } };
  this.lifecycleRegistry.listen(
    this.scale,
    "resize",
    this._resizeHandler,
    undefined,
    "scene-resize-listener",
  );
}
