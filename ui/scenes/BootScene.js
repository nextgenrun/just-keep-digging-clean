import {
  ASSET_KEYS,
  getHeavenblocksSkyAltarPreloadAssets,
  getPickaxeHudPreloadAssets,
  getPickaxeIconPreloadAssets,
  getSurfacePropPreloadAssets,
} from "../../values/assetKeys.js";
import {
  APPROVED_SFX_FAMILIES,
  AUDIO_RUNTIME_LOADING,
  resolveRuntimeAudioStreamingEnabled,
} from "../../values/audioConfig.js";
import {
  CAMPFIRE_TIERS,
  getCampfireTierAsset,
} from "../../values/campfireConfig.js";
import { CELESTIAL_ACTION_BAR_EAGER_ASSETS } from "../../values/celestialActionBar.js";
import { CELESTIAL_ENGINE_CORE_ASSETS } from "../../values/celestialEngines.js";
import { CELESTIAL_CURRENCY_HUD_PRELOAD_ASSETS } from
  "../../values/celestialCurrencyHud.js";
import { CELESTIAL_TALENT_TREE_PRELOAD_ASSETS } from
  "../../values/celestialTalentTreeUi.js";
import { SKYLINE_WEATHER_VFX } from "../../values/skylineWeatherVfx.js";
import { GEM_POWER_BLOCK_TIERS } from "../../values/specialBlocks.js";
import { ARC_CORE_VISUAL_PACK } from "../../values/arcCoreVisualAssets.js?rev=20260728-arc-core-dig-repair-v4";
import {
  GAMEPLAY_FEATURE_IDS,
  isGameplayFeatureEnabled,
} from "../../values/gameplayDevFlags.js";
import { THUNDER_STRIKE_CHAIN_CONFIG } from "../../values/thunderStrikeChain.js";
import { WORLD_MAP_CONFIG } from "../../values/worldMapConfig.js";
import { APPROVED_HUD_SKIN } from "../../values/approvedHudSkin.js";
import { XP_GATHERING_CONFIG } from "../../values/xpGathering.js";
import { AUTHORED_BACKGROUND_ASSET_OVERRIDES } from "../../values/authoredBackgroundAssetOverrides.js";
import { BRAND_CONFIG } from "../../values/branding.js";
import { CINEMATIC_VIDEO_CONFIG } from "../../values/cinematicVideoConfig.js";
import { TILED_BACKGROUND_OBJECTS } from "../../values/tiledBackgroundObjects.js";
import {
  WORLD_BACKGROUND_MASTER_TEST,
  resolveWorldBackgroundMasterEnabled,
} from "../../values/worldBackgroundMasterTest.js";
import { START_ZONE_SCENIC_BACKGROUND } from "../../values/startZoneScenicBackground.js";
import { LEVEL_ONE_GROUND_FACADE } from "../../values/levelOneGroundFacade.js";
import {
  getWorldVisualPreloadAssets,
  isScenicWorldVisualRuntime,
} from "../../values/worldVisualRuntime.js?rev=20260826-surface-motion-v2";
import { getWorldVisualStartupMaterialAssets } from "../../values/worldVisualMaterials.js";
import { getWorldVisualDepthBackdropPreloadAssets } from
  "../../values/worldVisualDepthBackdrops.js?rev=20260729-native-density-v14";
import { getWorldVisualFeedbackPreloadAssets } from "../../values/worldVisualFeedback.js";
import { getWorldVisualDamagePreloadAssets } from "../../values/worldVisualDamage.js";
import { getWorldVisualSemanticPreloadAssets } from "../../values/worldVisualSemanticAssets.js";
import { getWorldVisualLandmarkPreloadAssets } from "../../values/worldVisualLandmarks.js";
import {
  getStarBlockPulsePreloadAssets,
  getStarBlockSteadyLightPreloadAssets,
} from "../../values/lightConfig.js";
import { getOldSchoolLampLightPreloadAssets } from
  "../../values/oldSchoolLampLightConfig.js";
import { getCollectedStarReleasePreloadAssets } from "../../values/starConstellations.js";
import { getStarIdentityPreloadAssets } from
  "../../values/starIdentityLibrary.js?rev=20260826-inventory-codex-v2";
import { getInventoryCodexPreloadAssets } from
  "../../values/inventoryCodex.js?rev=20260826-inventory-codex-v2";
import {
  RUNTIME_ASSET_LOADING,
  RUNTIME_ASSET_PACK_IDS,
  RUNTIME_ASSET_RESIDENCY_CLASSES,
  resolveRuntimeFeatureAssetDeferralEnabled,
} from "../../values/runtimeAssetLoading.js";
import { getCapabilityTitanGameplayPreloadAssets } from
  "../../values/titanRuntimeCapabilities.js";
import { getTitanArchivePreloadAssets } from
  "../../values/titanDiscoveries.js";
import { RuntimeAssetCatalog } from "../../world/rendering/RuntimeAssetCatalog.js";
import {
  NPC_ACTIVITY_CONFIG,
  getNpcActivityPreloadAssets,
  resolveNpcActivitiesEnabled,
} from "../../values/npcActivityConfig.js";
import { CAVE_SCENE_CONFIG } from "../../values/caveSceneConfig.js";
import { LOADING_MESSAGES } from "../../values/loadingMessages.js";
import {
  getPauseFeatureLoadingDecorationAssets,
  getPauseFeatureLoadingPreloadAssets,
} from "../../values/pauseFeatureLoading.js";
import { TELEPORT_PORTAL_CONFIG } from "../../values/teleportPortalConfig.js";
import { GRAVEBORER_WURM_CONFIG } from "../../values/graveborerWurm.js";
import { RANDOM_EVENT_PRELOAD_ASSETS } from "../../values/randomWorldEvents.js";
import { PILLAR_VISUAL_CONFIG } from "../../values/pillarVisuals.js";
import { WORLDROOT_CONFIG } from "../../values/worldroot.js";
import { getEarthquakeFeedbackPreloadAssets } from "../../values/earthquakeFeedback.js";
import { getTileDestructionFxPreloadAssets } from "../../values/tileDestructionFx.js";
import { getMiningTargetFeedbackPreloadAssets } from "../../values/miningTargetFeedback.js";
import { UI_ICON_ATLAS } from "../../values/uiIcons.js";
import {
  createMenuLoadingScreen,
  addMenuBackground,
  getSelectedMenuBackgroundAsset,
  getSelectedMenuBackgroundKey,
} from "../components/LoadingScreenView.js";
import {
  getCapabilitySurfaceSkyPropAtlases,
  getCapabilitySurfaceHeroAssets,
  queueCapabilityFireAssets,
  queueCapabilityUiAssets,
  queueLevelTwoResourceTileAssets,
} from "./BootCapabilityAssetPreloader.js?rev=20260815-shallow-material-v1";

const SKY_PORTAL_CANONICAL_PATH = TELEPORT_PORTAL_CONFIG.canonicalAssetPath;
const SKY_PORTAL_FILENAME = TELEPORT_PORTAL_CONFIG.gateFilename;
const FALLBACK_MUSIC_PLAYLIST = Object.freeze([
  "j-k-d-amb-1.ogg",
  "j-k-d-amb-2.ogg",
  "j-k-d-amb-3.ogg",
]);

function makeAuthoredBackgroundBaseKey(path) {
  const keyName = getRuntimeAuthoredAssetFilename(path) || String(path);
  const slug = keyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `authored-bg-${slug || "asset"}`;
}

function collectAuthoredBackgroundPaths(tiledBackgroundObjects) {
  const paths = new Set();
  const layers = tiledBackgroundObjects?.layers ?? {};
  for (const objects of Object.values(layers)) {
    if (!Array.isArray(objects)) continue;
    for (const obj of objects) {
      const resolvedFilename = extractAuthoredObjectFilename(obj?.resolvedFilename);
      const sourcePath = obj?.properties?.sourcePath;
      if (typeof sourcePath === "string" && sourcePath.trim()) {
        paths.add(sourcePath.trim().replace(/\\/g, "/"));
      }

      if (resolvedFilename) {
        paths.add(resolvedFilename);
      } else if (!sourcePath) {
        const imageName = extractAuthoredObjectFilename(obj?.name);
        if (imageName) paths.add(imageName);
      }
    }
  }
  return [...paths].sort();
}

const FULL_NON_TILE_RUNTIME_LIBRARY = "exports/pallet-v10/dig_game_full_non_tile_runtime_assets_v10_08_07_2026/";
const FULL_NON_TILE_SPRITES_BASE = `${FULL_NON_TILE_RUNTIME_LIBRARY}sprites/`;
const GENERATED_RUNTIME_BG_BASE = `${FULL_NON_TILE_SPRITES_BASE}backgrounds/generated-runtime-v1/`;
const GENERATED_RUNTIME_PROP_BASE = `${FULL_NON_TILE_SPRITES_BASE}background-props/generated-runtime-v1/`;
const AUTHORED_LAYER_BASE = `${FULL_NON_TILE_SPRITES_BASE}bg12/`;
const AUTHORED_L11_PROPS_BASE = `${FULL_NON_TILE_SPRITES_BASE}props/near_props_seam_breakers/`;
const AUTHORED_LAYER_DIRS = Object.freeze({
  l01: "l01_base_colour_field",
  l02: "l02_atmospheric_depth",
  l03: "l03_far_light_volume",
  l04: "l04_distant_skyline_belt",
  l05: "l05_far_landmark_band",
  l06: "l06_mid_terrain_masses",
  l07: "l07_mid_structural_cards",
  l08: "l08_overhang_ceiling_cards",
  l09: "l09_foreground_frame_layer",
  l10: "l10_traversable_edge_cards",
  l11: "l11_near_props_seam_breakers",
  l12: "l12_fx_accent_layer",
});

function isAuthoredLayerImageName(name) {
  return typeof name === "string" && /__l\d{2}__.+\.png$/i.test(name.trim());
}

function extractAuthoredObjectFilename(name) {
  if (typeof name !== "string") return "";
  const cleaned = name.trim().replace(/^\d+:\s*/, "").replace(/\\/g, "/");
  const withoutQuery = cleaned.split("?")[0].split("#")[0];
  const filename = withoutQuery.split("/").pop() || "";
  return /\.(png|webp)$/i.test(filename) ? filename : "";
}

function resolveAuthoredBackgroundPath(path, options = {}) {
  const useCleanupOverrides = options.useCleanupOverrides !== false;
  const normalized = String(path || "").trim().replace(/\\/g, "/");
  const filename = extractAuthoredObjectFilename(normalized);
  const overridePath = getAuthoredBackgroundOverridePath(filename, { useCleanupOverrides });
  if (overridePath) return overridePath;

  if (filename.toLowerCase() === SKY_PORTAL_FILENAME) {
    return SKY_PORTAL_CANONICAL_PATH;
  }
  if (normalized.startsWith("sprites/backgrounds/generated-runtime-v1/")) {
    return normalized.replace(
      "sprites/backgrounds/generated-runtime-v1/",
      GENERATED_RUNTIME_BG_BASE
    );
  }
  if (normalized.startsWith("sprites/background-props/generated-runtime-v1/")) {
    return normalized.replace(
      "sprites/background-props/generated-runtime-v1/",
      GENERATED_RUNTIME_PROP_BASE
    );
  }

  const layerFilename = getRuntimeAuthoredLayerFilename(filename);
  if (isAuthoredLayerImageName(layerFilename)) {
    const layerId = layerFilename.match(/__(l\d{2})__/i)?.[1]?.toLowerCase();
    if (layerId === "l11") return `${AUTHORED_L11_PROPS_BASE}${layerFilename}`;

    const layerDir = AUTHORED_LAYER_DIRS[layerId];
    if (layerDir) return `${AUTHORED_LAYER_BASE}${layerDir}/${layerFilename}`;
  }
  if (/^bg_.+\.webp$/i.test(filename)) {
    return `${GENERATED_RUNTIME_BG_BASE}${filename}`;
  }
  if (/^prop_.+\.webp$/i.test(filename)) {
    return `${GENERATED_RUNTIME_PROP_BASE}${filename}`;
  }
  return normalized;
}

function getAuthoredBackgroundOverridePath(filename, options = {}) {
  if (options.useCleanupOverrides === false || !AUTHORED_BACKGROUND_ASSET_OVERRIDES.enabled) return "";
  const key = String(filename || "").trim().toLowerCase();
  return AUTHORED_BACKGROUND_ASSET_OVERRIDES.byFilename[key] || "";
}

function isSkyPortalCanonicalPath(path) {
  return String(path || "").trim().replace(/\\/g, "/").toLowerCase() === SKY_PORTAL_CANONICAL_PATH.toLowerCase();
}

function getRuntimeAuthoredAssetFilename(path) {
  const filename = extractAuthoredObjectFilename(path);
  return getRuntimeAuthoredLayerFilename(filename || String(path || ""));
}

function getRuntimeAuthoredLayerFilename(filename) {
  if (typeof filename !== "string") return "";
  return filename.trim();
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
    this.audioAssetManager = null;
    this.debugText = null;
    this.loadingUi = null;
    this._queuedImagePaths = new Map();
    this._queuedVideoKeys = new Set();
    this._deferFeatureAssets = resolveRuntimeFeatureAssetDeferralEnabled();
    this._queuedAudioKeys = new Set();
    this._isPreloading = false;
    this._bootAttempt = 0;
    this._playlistFiles = null;
    this._bootMusicSeedIndex = -1;
    this._menuFirstLoadComplete = false;
    this._hydratedMenuSoundSystem = null;
  }

  preload() {
    console.log('[BootScene] ===== MINI PRELOAD STARTED =====');

    this.gameplayCapabilities = this.registry?.get?.("gameplayCapabilities");
    this.runtimeAssetCatalog = this.registry?.get?.("runtimeAssetCatalog")
      || new RuntimeAssetCatalog(this.gameplayCapabilities);
    this.registry?.set?.("runtimeAssetCatalog", this.runtimeAssetCatalog);

    const menuBackground = getSelectedMenuBackgroundAsset();
    this.queueImage(ASSET_KEYS.branding.logo, BRAND_CONFIG.logoAssetPath);
    this.queueImage(menuBackground.key, menuBackground.path);
    for (const asset of getPauseFeatureLoadingPreloadAssets()) {
      this.queueImage(asset.key, asset.path);
    }
    for (const asset of getPauseFeatureLoadingDecorationAssets()) {
      this.queueImage(asset.key, asset.path);
    }
  }

  async create() {
    console.log('[BootScene] ===== CREATE STARTED =====');

    try {
      this.debugText = this.add.text(20, 20, 'BootScene: Loading assets...', {
      fontFamily: 'Consolas, monospace',
      fontSize: '16px',
      color: '#00ff00',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 }
      }).setDepth(9999).setVisible(false);

      this.ensureLoadingUi(
        "Loading music and boot menu...",
        "Preparing the first screen before the full game load.",
      );
      const menuAudioReady = await this.startMenuFirstPreload();
      if (menuAudioReady) {
        this.ensureMenuAudioScene();
        this.scene.get("MenuAudioScene")?.startMenuAudio();
      }
      await this.startFullPreload();
    } catch (error) {
      this.handleBootFailure(error);
    }
  }

  queueImage(key, path, metadata = {}) {
    if (this.textures.exists(key)) return;
    if (this.runtimeAssetCatalog && !this.runtimeAssetCatalog.registerQueuedAsset(
      { key, path },
      {
        priority: RUNTIME_ASSET_LOADING.priorities.bootCore,
        residencyClass: RUNTIME_ASSET_RESIDENCY_CLASSES.boot,
        managed: false,
        consumers: ["boot"],
        ...metadata,
      },
    )) return;

    if (!this._queuedImagePaths.has(path)) {
      this._queuedImagePaths.set(path, new Set());
    }
    const keysForPath = this._queuedImagePaths.get(path);
    if (keysForPath.has(key)) return;

    keysForPath.add(key);
    if (path && path !== "") {
      this.load.image(key, path);
    }
  }

  queueResidentUiImage(key, path, consumer) {
    this.queueImage(key, path, {
      owner: RUNTIME_ASSET_LOADING.owners.bootCore,
      packId: RUNTIME_ASSET_PACK_IDS.bootCore,
      residencyClass: RUNTIME_ASSET_RESIDENCY_CLASSES.boot,
      managed: false,
      consumers: ["boot", consumer],
    });
  }

  queueVideo(key, path, metadata = {}) {
    if (this.cache.video.exists(key) || this._queuedVideoKeys.has(key)) return;
    const asset = { key, path, type: RUNTIME_ASSET_LOADING.types.video };
    if (this.runtimeAssetCatalog && !this.runtimeAssetCatalog.registerQueuedAsset(
      asset,
      {
        priority: RUNTIME_ASSET_LOADING.priorities.bootCore,
        residencyClass: RUNTIME_ASSET_RESIDENCY_CLASSES.boot,
        managed: false,
        consumers: ["boot", "surface-motion"],
        ...metadata,
      },
    )) return;
    this._queuedVideoKeys.add(key);
    this.load.video(key, path, true);
  }

  queueAudio(key, path, { preload = true } = {}) {
    if (!key || !path) return;
    ASSET_KEYS.audio.runtime.paths[key] = path;
    if (!preload || this.cache.audio.exists(key) || this._queuedAudioKeys.has(key)) return;
    this._queuedAudioKeys.add(key);
    this.load.audio(key, path);
  }

  ensureLoadingUi(label, detail, progress = 0) {
    if (!this.loadingUi) {
      this.loadingUi = createMenuLoadingScreen(this, {
        title: BRAND_CONFIG.name,
        subtitle: "A L P H A",
        label,
        detail,
        preferLogo: true,
        progress,
        backgroundKey: getSelectedMenuBackgroundKey(),
        backgroundAlpha: 0.24,
        overlayAlpha: 0.34,
      });
      return;
    }

    this.loadingUi.setLabel(label);
    this.loadingUi.setDetail(detail);
    this.loadingUi.setProgress(progress);
    this.loadingUi.clearFailure?.();
  }

  async startMenuFirstPreload() {
    if (this._menuFirstLoadComplete) return true;

    if (typeof this.load.reset === "function") {
      this.load.reset();
    }
    this._queuedAudioKeys.clear();

    await this.preloadMenuAudio();
    const seedKey = ASSET_KEYS.audio.music.bootSeedKey;
    if (!seedKey || this.cache.audio.exists(seedKey)) {
      this._menuFirstLoadComplete = Boolean(seedKey);
      return this._menuFirstLoadComplete;
    }

    return new Promise((resolve) => {
      let seedFailed = false;
      const cleanup = () => {
        this.load.off("progress", onProgress);
        this.load.off("loaderror", onLoadError);
        this.load.off("complete", onComplete);
      };
      const onProgress = (value) => {
        this.loadingUi?.setProgress(value * 0.1);
      };
      const onLoadError = (file) => {
        if (file?.key !== seedKey) return;
        seedFailed = true;
        console.warn("[BootScene] Priority menu music unavailable; full preload will retry:", seedKey);
      };
      const onComplete = () => {
        cleanup();
        this._menuFirstLoadComplete = !seedFailed && this.cache.audio.exists(seedKey);
        resolve(this._menuFirstLoadComplete);
      };

      this.load.on("progress", onProgress);
      this.load.on("loaderror", onLoadError);
      this.load.on("complete", onComplete);

      try {
        this.load.start();
      } catch (error) {
        cleanup();
        console.warn("[BootScene] Priority menu preload could not start; continuing with full preload:", error);
        resolve(false);
      }
    });
  }

  async startFullPreload() {
    if (this._isPreloading) return;
    this._isPreloading = true;
    this._bootAttempt += 1;
    const attempt = this._bootAttempt;

    if (typeof this.load.reset === "function") {
      this.load.reset();
    }
    this._queuedAudioKeys.clear();
    this._queuedVideoKeys.clear();

    const initialLabel = `Loading game assets... (${attempt})`;
    const menuProgress = this._menuFirstLoadComplete ? 0.1 : 0;
    this.ensureLoadingUi(
      initialLabel,
      "Preparing remaining game assets...",
      menuProgress,
    );
    this.loadingUi?.setRetryHandler(() => {
      this.startFullPreload();
    });

    const totalMessages = LOADING_MESSAGES.length;
    let msgPool = Array.from({ length: totalMessages }, (_, i) => i);
    for (let i = msgPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [msgPool[i], msgPool[j]] = [msgPool[j], msgPool[i]];
    }
    let poolIndex = 0;
    let hasLoadFailure = false;
    const failedKeys = [];

    const startIndex = Math.floor(Math.random() * totalMessages);
    const initial = LOADING_MESSAGES[startIndex];
    this.loadingUi?.setLabel(initial.label || initialLabel);
    this.loadingUi?.setDetail(initial.detail || "Preparing your adventure...");

    this._messageTimer = this.time.addEvent({
      delay: 8000,
      loop: true,
      callback: () => {
        const idx = msgPool[poolIndex % totalMessages];
        poolIndex = (poolIndex + 1) % totalMessages;
        const msg = LOADING_MESSAGES[idx];
        this.loadingUi?.setLabel(msg.label);
        this.loadingUi?.setDetail(msg.detail);
      },
    });

    const onProgress = (value) => {
      this.loadingUi?.setProgress(menuProgress + (value * (1 - menuProgress)));
    };
    const onLoadError = (file) => {
      const target = file?.key || file?.src || file?.url || file || "unknown asset";
      const optionalAudio = file?.type === "audio";
      if (optionalAudio || String(target).startsWith("authored-bg-") || String(target).startsWith(APPROVED_HUD_SKIN.assetPrefix)) {
        console.warn('[BootScene] Optional asset unavailable; runtime fallback will be used:', target);
        return;
      }
      hasLoadFailure = true;
      if (!failedKeys.includes(target)) failedKeys.push(target);
      const failLabel = failedKeys.length > 1 ? `${failedKeys.length} assets failed` : `Asset failed: ${target}`;
      console.warn('[BootScene] Failed to load asset:', target);
      this.loadingUi?.setFailure(failLabel);
      this.loadingUi?.setLabel("Load error");
    };

    this.load.on('progress', onProgress);
    this.load.on('loaderror', onLoadError);
    this.load.once('complete', () => {
      this.load.off('progress', onProgress);
      this.load.off('loaderror', onLoadError);
      this._messageTimer?.remove();
      this._messageTimer = null;

      if (hasLoadFailure) {
        this._isPreloading = false;
        this.loadingUi?.setFailure(failedKeys.length > 1 ? `${failedKeys.length} assets failed to load.` : `Failed to load: ${failedKeys[0] || "an asset"}`);
        this.loadingUi?.setRetryHandler(() => this.startFullPreload());
        return;
      }

      this.loadingUi?.clearFailure?.();
      this.loadingUi?.setProgress(1);
      this.loadingUi?.setLabel("Loading complete!");
      this.loadingUi?.setDetail("The mine awaits...");
      this.runtimeAssetCatalog?.adoptTextureManager?.(this.textures);
      this.loadingUi?.fadeOut(300, () => {
        this._isPreloading = false;
        this.finishBoot();
      });
    });

    try {
      this.preloadBranding();
      this.preloadBackgrounds();
      this.preloadSurfaceSkyPropAtlasesV3();
      this.preloadWeatherVfx();
      this.preloadConstellationSprites();
      this.preloadPillarSprites();
      this.preloadOpeningFlightSprites();
      this.preloadNPCs();
      this.preloadTileSprites();
      this.preloadFxSprites();
      this.preloadHeavenblocksSkyAltars();
      this.preloadGraveborerWurmSprites();
      this.preloadUiSprites();
      await this.preloadAudio();
      this.load.start();
    } catch (error) {
      this.loadingUi?.setFailure("Unable to start asset load. Retry to try again.");
      this.loadingUi?.setLabel("Boot queue error");
      this._isPreloading = false;
      this._messageTimer?.remove();
      throw error;
    }
  }

  preloadBranding() {
    this.queueImage(ASSET_KEYS.branding.logo, BRAND_CONFIG.logoAssetPath);
  }

  preloadBackgrounds() {
    if (isScenicWorldVisualRuntime()) {
      this.preloadScenicWorldRuntime();
      const menuBackground = getSelectedMenuBackgroundAsset();
      this.queueImage(menuBackground.key, menuBackground.path);
      return;
    }

    this.queueImage(ASSET_KEYS.background.world1, `${FULL_NON_TILE_SPRITES_BASE}backgrounds/base-background-world-1.webp`);
    this.queueImage(ASSET_KEYS.background.startZoneScenic, START_ZONE_SCENIC_BACKGROUND.assetPath);
    this.queueImage(
      ASSET_KEYS.background.startZoneGroundFacade,
      START_ZONE_SCENIC_BACKGROUND.groundFacade.assetPath
    );
    const preloadFacadeIndex = LEVEL_ONE_GROUND_FACADE.streaming.preloadChunkIndex;
    const preloadFacadeChunk = LEVEL_ONE_GROUND_FACADE.chunks[preloadFacadeIndex];
    this.queueImage(
      ASSET_KEYS.background.levelOneGroundFacade.chunks[preloadFacadeIndex],
      preloadFacadeChunk.assetPath
    );
    this.queueImage(
      ASSET_KEYS.background.levelOneGroundFacade.recognitionAtlas,
      LEVEL_ONE_GROUND_FACADE.recognitionAtlas.assetPath
    );
    if (isGameplayFeatureEnabled(GAMEPLAY_FEATURE_IDS.LEVEL_TWO, this.gameplayCapabilities)) {
      this.queueImage(
        ASSET_KEYS.background.secondWorldTown,
        "sprites/backgrounds/second-world/industrial-town-alcove-33x20-v2.png"
      );
    }

    this.queueImage(ASSET_KEYS.background.houseMoneyMonster, `${FULL_NON_TILE_SPRITES_BASE}backgrounds/background-town/money-monster-npc-house.webp`);
    this.queueImage(ASSET_KEYS.background.housePlayerUpgrade, `${FULL_NON_TILE_SPRITES_BASE}backgrounds/background-town/player-upgrade-npc-house.webp`);
    
    const menuBackground = getSelectedMenuBackgroundAsset();
    this.queueImage(menuBackground.key, menuBackground.path);

    const townLoop = ASSET_KEYS.background.townLoop;
    this.load.image(townLoop.aboveFloor, `${FULL_NON_TILE_SPRITES_BASE}infinate-loops/above-floor-layer.png`);
    this.load.image(townLoop.floor, `${FULL_NON_TILE_SPRITES_BASE}infinate-loops/floor-layer.png`);

    const undergroundBase = `${FULL_NON_TILE_SPRITES_BASE}infinate-loops/underground-0-1000/`;
    ASSET_KEYS.background.undergroundLoops.forEach((background, index) => {
      const startDepth = String(index * 200).padStart(3, "0");
      const endDepth = String((index + 1) * 200).padStart(3, "0");
      this.load.image(background.source, `${undergroundBase}depth-${startDepth}-${endDepth}.png`);
    });

    const sky = ASSET_KEYS.background.skyBackgrounds;
    const skyBase = `${FULL_NON_TILE_SPRITES_BASE}backgrounds/background-database/sky-background-v3/`;
    this.load.image(sky.base, skyBase + "sky-v3-base.webp");
    this.load.image(sky.nebula, skyBase + "sky-v3-nebula-veil.webp");
    this.load.image(sky.aurora, skyBase + "sky-v3-aurora-ribbons.webp");
    this.load.image(sky.horizon, skyBase + "sky-v3-horizon-glow.webp");
    this.load.image(sky.cloudsFar, skyBase + "sky-v3-clouds-far.webp");
    this.load.image(sky.cloudsNear, skyBase + "sky-v3-clouds-near.webp");
    this.load.image(sky.planet1, skyBase + "sky-v3-planet-1.webp");
    this.load.image(sky.planet2, skyBase + "sky-v3-planet-2.webp");

    if (resolveWorldBackgroundMasterEnabled(WORLD_BACKGROUND_MASTER_TEST)) {
      console.info("[BootScene] v11 master active; legacy v7 background assets are rollback-only");
    } else {
      this.preloadAuthoredBackgroundObjects();
    }
  }

  preloadWeatherVfx() {
    const weatherVfx = ASSET_KEYS.environment.skylineWeatherVfx;
    const weatherVfxBase = SKYLINE_WEATHER_VFX.assetBasePath;
    Object.entries(SKYLINE_WEATHER_VFX.sheets).forEach(([name, sheet]) => {
      this.load.image(weatherVfx[name], weatherVfxBase + sheet.file);
    });
    this.load.spritesheet(
      weatherVfx.particles,
      weatherVfxBase + SKYLINE_WEATHER_VFX.particleSheet.file,
      {
        frameWidth: SKYLINE_WEATHER_VFX.particleSheet.frameWidth,
        frameHeight: SKYLINE_WEATHER_VFX.particleSheet.frameHeight,
      },
    );
  }

  preloadScenicWorldRuntime() {
    const levelTwoEnabled = isGameplayFeatureEnabled(
      GAMEPLAY_FEATURE_IDS.LEVEL_TWO,
      this.gameplayCapabilities,
    );
    const surfacePropLevels = levelTwoEnabled
      ? ["level1", "level2"]
      : ["level1"];
    const assets = [
      ...getWorldVisualPreloadAssets(),
      ...getWorldVisualStartupMaterialAssets(),
      ...getWorldVisualDepthBackdropPreloadAssets(),
      ...getWorldVisualFeedbackPreloadAssets(),
      ...getWorldVisualDamagePreloadAssets(),
      ...getWorldVisualSemanticPreloadAssets(),
      ...getWorldVisualLandmarkPreloadAssets(),
      ...getSurfacePropPreloadAssets(ASSET_KEYS, surfacePropLevels),
      ...getCapabilitySurfaceHeroAssets(this.gameplayCapabilities),
    ];
    for (const asset of assets) {
      if (asset.type === RUNTIME_ASSET_LOADING.types.video) {
        this.queueVideo(asset.key, asset.path, { dimensions: asset.dimensions });
      } else {
        this.queueImage(asset.key, asset.path);
      }
    }
    console.info(
      `[BootScene] Queued ${assets.length} scenic-v2 startup assets; depth materials stream on demand and legacy Tiled visuals were skipped`
    );
  }

  preloadSurfaceSkyPropAtlasesV3() {
    const atlases = getCapabilitySurfaceSkyPropAtlases(this.gameplayCapabilities);
    for (const asset of atlases) {
      if (!this.textures.exists(asset.key)) {
        this.load.atlas(asset.key, asset.path, asset.dataPath);
      }
    }
    console.info(
      `[BootScene] Queued ${atlases.length} capability-owned surface/sky prop V3 atlases`
    );
  }

  preloadAuthoredBackgroundObjects() {
    const paths = collectAuthoredBackgroundPaths(TILED_BACKGROUND_OBJECTS);
    const resolvedByKey = new Map();

    for (const path of paths) {
      const key = makeAuthoredBackgroundBaseKey(path);
      const cleanResolved = resolveAuthoredBackgroundPath(path, { useCleanupOverrides: true });
      const existing = resolvedByKey.get(key) || {};

      if (!cleanResolved) {
        continue;
      }

      // Force canonical eclipse-gate texture if it appears anywhere with duplicate names.
      if (cleanResolved && (!existing.clean || (isSkyPortalCanonicalPath(cleanResolved) && !isSkyPortalCanonicalPath(existing.clean)))) {
        existing.clean = cleanResolved;
      }

      resolvedByKey.set(key, existing);
    }

    for (const [key, resolved] of resolvedByKey) {
      if (resolved.clean) {
        this.queueImage(key, resolved.clean);
      }
    }
    console.log(`[BootScene] Queued ${resolvedByKey.size} authored TMX background assets`);
  }

  preloadConstellationSprites() {
    // ESC and the physical Star Pillar share one complete resident asset pack.
    // The pack owns every visible node icon as well as its authored chrome so
    // memory-pressure cleanup cannot leave loaded sockets with missing art.
    for (const asset of CELESTIAL_TALENT_TREE_PRELOAD_ASSETS) {
      this.queueResidentUiImage(asset.key, asset.path, "starlight-ui");
    }
  }

  preloadPillarSprites() {
    const keys = ASSET_KEYS.environment.pillars;
    const base = PILLAR_VISUAL_CONFIG.assetBasePath;
    keys.milestoneStages.forEach((key, index) => {
      this.queueImage(key, `${base}${PILLAR_VISUAL_CONFIG.milestone.filenames[index]}`);
    });
    keys.starStages.forEach((key, index) => {
      this.queueImage(key, `${base}${PILLAR_VISUAL_CONFIG.star.filenames[index]}`);
    });
    Object.values(WORLDROOT_CONFIG.assets).forEach(asset => {
      this.queueImage(asset.key, asset.path);
    });
    for (const [role, path] of Object.entries(CELESTIAL_ENGINE_CORE_ASSETS)) {
      this.queueImage(ASSET_KEYS.celestialEngines[role], path);
    }
  }

    preloadOpeningFlightSprites() {
    const opening = ASSET_KEYS.onboarding.openingFlightV2;
    this.queueImage(opening.artifact, opening.paths.artifact);
    this.queueImage(opening.shaftMarker, opening.paths.shaftMarker);
    this.queueImage(opening.flightRing, opening.paths.flightRing);
    this.queueImage(opening.ascentCache, opening.paths.ascentCache);
    this.queueImage(opening.objectiveHudFrame, opening.paths.objectiveHudFrame);
  }

  preloadNPCs() {
    const base = "sprites/npc/npc-v3/sheets";
    const generatedMerchantBase = NPC_ACTIVITY_CONFIG.baselineAssets.staticBasePath;
    const animatedMerchantBase = NPC_ACTIVITY_CONFIG.baselineAssets.videoBasePath;
    const baselineVersion = NPC_ACTIVITY_CONFIG.baselineAssets.assetVersion;
    const frame1024 = { frameWidth: 1024, frameHeight: 1024 };
    const frame1280 = { frameWidth: 1280, frameHeight: 1280 };

    const reviewLegacySheets = this.gameplayCapabilities?.profileId === "full-review"
      && new URLSearchParams(globalThis.location?.search || "")
        .get("legacyNpcSheets") === "1";
    if (reviewLegacySheets) {
      this.load.spritesheet(ASSET_KEYS.npcs.boboIdleSheet, `${base}/bobo-idle-sheet.webp`, frame1024);
      this.load.spritesheet(ASSET_KEYS.shadowMiner.sheet, `${base}/shadow-miner-sheet.webp`, frame1280);
    }

    this.load.image(ASSET_KEYS.npcs.merchantSprites.moneyMonster, `${generatedMerchantBase}/money-monster.webp?v=${baselineVersion}`);
    const arcCoresEnabled = isGameplayFeatureEnabled(
      GAMEPLAY_FEATURE_IDS.ARC_CORES,
      this.gameplayCapabilities,
    );
    if (arcCoresEnabled) {
      this.load.image(ASSET_KEYS.npcs.merchantSprites.magmaMoneyMonster, `${generatedMerchantBase}/magma-money-monster.webp?v=${baselineVersion}`);
    }
    this.load.image(ASSET_KEYS.npcs.merchantSprites.playerUpgrades, `${generatedMerchantBase}/player-upgrades.webp?v=${baselineVersion}`);
    this.load.image(ASSET_KEYS.npcs.merchantSprites.gearMerchant, `${generatedMerchantBase}/gear-merchant.webp?v=${baselineVersion}`);
    this.load.image(ASSET_KEYS.npcs.merchantSprites.boboMerchant, `${generatedMerchantBase}/bobo-merchant.webp?v=${baselineVersion}`);
    this.load.image(ASSET_KEYS.npcs.merchantSprites.gemPowerMerchant, `${generatedMerchantBase}/gem-power-merchant.webp?v=${baselineVersion}`);

    if (resolveNpcActivitiesEnabled(
      NPC_ACTIVITY_CONFIG,
      globalThis.location?.search || "",
      this.gameplayCapabilities,
    )) {
      const disabledArcActivityKeys = new Set(
        Object.values(ASSET_KEYS.npcs.merchantActivities.magmaMoneyMonster || {}),
      );
      for (const asset of getNpcActivityPreloadAssets(ASSET_KEYS.npcs.merchantActivities)) {
        if (!arcCoresEnabled && disabledArcActivityKeys.has(asset.key)) continue;
        this.load.image(asset.key, asset.path);
      }
    }

    const supportsAnimatedMerchants = this.sys.game.device.video.webm && this.sys.game.device.video.vp9;
    if (supportsAnimatedMerchants) {
      this.load.video(ASSET_KEYS.npcs.merchantIdleVideos.moneyMonster, `${animatedMerchantBase}/money-monster-idle-alpha.webm?v=${baselineVersion}`, true);
      this.load.video(ASSET_KEYS.npcs.merchantIdleVideos.playerUpgrades, `${animatedMerchantBase}/player-upgrades-idle-alpha.webm?v=${baselineVersion}`, true);
      this.load.video(ASSET_KEYS.npcs.merchantIdleVideos.gearMerchant, `${animatedMerchantBase}/gear-merchant-idle-alpha.webm?v=${baselineVersion}`, true);
      this.load.video(ASSET_KEYS.npcs.merchantIdleVideos.boboMerchant, `${animatedMerchantBase}/bobo-merchant-idle-alpha.webm?v=${baselineVersion}`, true);
      this.load.video(ASSET_KEYS.npcs.merchantIdleVideos.gemPowerMerchant, `${animatedMerchantBase}/gem-power-merchant-idle-alpha.webm?v=${baselineVersion}`, true);
    } else {
      console.warn('[BootScene] VP9 WebM is unavailable; merchant NPCs will use static fallback sprites.');
    }

    if (arcCoresEnabled) {
      this.load.image(
        ASSET_KEYS.vehicles.arcCore.legacy,
        "sprites/vehicles/arc-core-v1/arc-core.png?v=approved-v1-20260713",
      );
      this.load.pack(
        ASSET_KEYS.vehicles.arcCore.pack,
        `${ARC_CORE_VISUAL_PACK.path}?rev=${ARC_CORE_VISUAL_PACK.revision}`,
      );
    }

    if (!this._deferFeatureAssets) {
      for (let level = 1; level <= CAMPFIRE_TIERS.length; level += 1) {
        const asset = getCampfireTierAsset(level);
        this.queueImage(asset.key, asset.path);
      }
    }
  }

  finishBoot() {
    try {
      this.createAnimations();
      console.log('[BootScene] Menu and NPC animations created successfully');
      this.ensureMenuAudioScene();
      this.hydrateMenuAudioLibraries();
      this.scene.get("MenuAudioScene")?.startMenuAudio();
      this.showBootSplash();
    } catch (error) {
      this.handleBootFailure(error);
    }
  }

  ensureMenuAudioScene() {
    if (!this.scene.isActive("MenuAudioScene")) {
      this.scene.launch("MenuAudioScene");
    }
    this.scene.get("MenuAudioScene")?.attachTo?.(this);
  }

  hydrateMenuAudioLibraries() {
    const soundSystem = this.scene.get("MenuAudioScene")?.soundSystem;
    if (!soundSystem || this._hydratedMenuSoundSystem === soundSystem) return;

    for (const library of Object.values(soundSystem.soundLibraryManager?.libraries || {})) {
      if (Array.isArray(library)) library.length = 0;
    }
    soundSystem.loadSoundLibraries();
    soundSystem.loadVoiceLineLibraries();
    this._hydratedMenuSoundSystem = soundSystem;
  }

  showBootSplash() {
    if (this.debugText) {
      this.debugText.setText('BootScene: Creating logo splash...').setVisible(false);
    }

    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    console.log('[BootScene] Canvas dimensions:', W, 'x', H);
    console.log('[BootScene] Logo key:', ASSET_KEYS.branding.logo);
    console.log('[BootScene] Logo texture exists:', this.textures.exists(ASSET_KEYS.branding.logo));

    if (!this.textures.exists(ASSET_KEYS.branding.logo)) {
      console.error('[BootScene] ERROR: Logo texture not found! Key:', ASSET_KEYS.branding.logo);
      console.error('[BootScene] Available textures:', this.textures.getTextureKeys());
      if (this.debugText) {
        this.debugText.setText('ERROR: Logo not found! Skipping to menu...').setColor('#ff0000').setVisible(true);
      }
      this.scene.start("MainMenuScene");
      return;
    }

    this.add.rectangle(W / 2, H / 2, W, H, 0x0d1117);
    addMenuBackground(this, {
      width: W,
      height: H,
      key: getSelectedMenuBackgroundKey(),
      alpha: 0.26,
    });
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.32);

    console.log('[BootScene] Attempting to create logo image...');
    const logo = this.add.image(W / 2, H / 2, ASSET_KEYS.branding.logo);
    console.log('[BootScene] Logo created successfully. Dimensions:', logo.width, 'x', logo.height);

    const scale = Math.min(560 / logo.width, 200 / logo.height);
    console.log('[BootScene] Logo scale:', scale);

    logo.setScale(scale).setAlpha(0);

    console.log('[BootScene] Starting logo animation...');
    this.tweens.add({
      targets: logo,
      alpha: 1,
      duration: 380,
      ease: 'Sine.easeIn',
      yoyo: true,
      hold: 700,
      onComplete: () => {
        console.log('[BootScene] Logo animation complete, transitioning to opening cinematic');
        if (this.debugText) {
          this.debugText.setText('BootScene: Transitioning to opening cinematic...').setVisible(false);
        }
        this.scene.start(CINEMATIC_VIDEO_CONFIG.scenes.opening);
      },
    });
  }

  handleBootFailure(error) {
    console.error('[BootScene] CRITICAL ERROR:', error);
    console.error('[BootScene] Error stack:', error?.stack);

    if (this.debugText) {
      this.debugText.setText('ERROR: ' + (error?.message || error)).setColor('#ff0000').setVisible(true);
    }

    console.log('[BootScene] Attempting to continue to MainMenuScene despite error...');
    try {
      this.scene.start("MainMenuScene");
    } catch (sceneError) {
      console.error('[BootScene] FATAL: Cannot start MainMenuScene:', sceneError);
      if (this.debugText) {
        this.debugText.setText('FATAL: Cannot start menu!').setColor('#ff0000').setVisible(true);
      }
    }
  }

  preloadPlayerSprites() {
    const baseV2 = "sprites/character/character-v2";
    const player = ASSET_KEYS.player;
    const frame341 = { frameWidth: 341, frameHeight: 341 };
    const runtimeV8Base = "sprites/character/character-v8/runtime";
    const legacyRuntimeVersion = "legacy-v8-feedback-polish-20260713";
    const loadRuntimeSheet = (key, filename, frames) => {
      if (!key || !frames?.length) return;
      this.load.spritesheet(key, `${runtimeV8Base}/${filename}?v=${legacyRuntimeVersion}`, {
        ...frame341,
        endFrame: frames.length - 1,
      });
    };

    loadRuntimeSheet(player.idleSheet, "legacy-idle-clean-sheet.webp", player.idleFrames);
    loadRuntimeSheet(player.walkSheet, "legacy-walk-clean-sheet.webp", player.walkFrames);
    loadRuntimeSheet(player.digSidewaysSheet, "legacy-dig-sideways-clean-sheet.webp", player.digSidewaysFrames);
    loadRuntimeSheet(player.digUpSheet, "legacy-dig-up-clean-sheet.webp", player.digUpFrames);
    loadRuntimeSheet(player.digUpSidewaysSheet, "legacy-dig-up-sideways-clean-sheet.webp", player.digUpSidewaysFrames);
    loadRuntimeSheet(player.flightSheet, "legacy-fly-climb-clean-sheet.webp", player.flightFrames);
    this.load.image(player.digUpLookFrame, `${runtimeV8Base}/legacy-dig-up-look-clean.png?v=${legacyRuntimeVersion}`);

    loadRuntimeSheet(player.duckSheet, "duck-downwards-sheet.webp", player.duckFrames);
    loadRuntimeSheet(player.digDownSheet, "dig-down-sheet.webp", player.digDownFrames);
    loadRuntimeSheet(player.thunderStrikeChargeSheet, "thunder-charge-sheet.webp", player.thunderStrikeChargeFrames);
    loadRuntimeSheet(player.thunderStrikeStrikeSheet, "thunder-strike-sheet.webp", player.thunderStrikeStrikeFrames);
    loadRuntimeSheet(player.wallPushSheet, "wall-push-sheet.webp", player.wallPushFrames);
    loadRuntimeSheet(player.leanAgainstWallSheet, "leans-against-wall-sheet.webp", player.leanAgainstWallFrames);
    loadRuntimeSheet(player.fallingSheet, "falling-downward-through-sky-sheet.webp", player.fallingFrames);
    loadRuntimeSheet(player.walkRunSheet, "walk-run-sheet.webp", player.walkRunFrames);
    loadRuntimeSheet(player.combatIdleRecoverSheet, "combat-idle-recover-sheet.webp", player.combatIdleRecoverFrames);
    loadRuntimeSheet(player.combatIdleToNormalIdleSheet, "combat-idle-to-normal-idle-sheet.webp", player.combatIdleToNormalIdleFrames);
    loadRuntimeSheet(player.quickslashSheet, "quickslash-v2-clean-sheet.webp", player.quickslashFrames);
    loadRuntimeSheet(player.teleportInSheet, "teleport-in-clean-sheet.webp", player.teleportInFrames);
    const movementBase = `${baseV2}/character-movement/movement-bare-hands`;
    this.load.image('char-v2-airborne-1', `${movementBase}/jump/jump-1.webp`);
    this.load.image('char-v2-duck-1', `${movementBase}/duck/duck-1.webp`);

    const digBase = `${baseV2}/digging/digging-bare-hand`;
    this.load.image('char-v2-dig-down-1', `${digBase}/dig-down/dig-down-1.webp`);

    const quickslashBase = `${baseV2}/digging/abilities/quickslash`;
    this.load.image('char-v2-quickslash-1', `${quickslashBase}/uickslash-1.webp`);
    this.load.image('char-v2-quickslash-2', `${quickslashBase}/uickslash-2 .webp`);

    const thunderBase = `${baseV2}/digging/abilities/thunder-strike`;
    this.load.image('char-v2-thunder-charge', `${thunderBase}/charging.webp`);
    this.load.image('char-v2-thunder-strike', `${thunderBase}/thunder-strike.webp`);

  }

  applyPlayerTextureQuality() {
    const requestedFilter = String(ASSET_KEYS.player.textureFilter || "NEAREST").toUpperCase();
    const filterMode = Phaser.Textures.FilterMode[requestedFilter];
    if (typeof filterMode !== "number") {
      console.warn(`[BootScene] Unknown player texture filter: ${requestedFilter}`);
      return;
    }

    const textureKeys = new Set([
      "char-v2-airborne-1",
      "char-v2-duck-1",
      "char-v2-dig-down-1",
      "char-v2-quickslash-1",
      "char-v2-quickslash-2",
      "char-v2-thunder-charge",
      "char-v2-thunder-strike",
    ]);
    const collectLoadedTextureKeys = (value) => {
      if (typeof value === "string") {
        if (this.textures.exists(value)) textureKeys.add(value);
        return;
      }
      if (Array.isArray(value)) {
        value.forEach(collectLoadedTextureKeys);
        return;
      }
      if (value && typeof value === "object") {
        Object.values(value).forEach(collectLoadedTextureKeys);
      }
    };
    collectLoadedTextureKeys(ASSET_KEYS.player);

    let applied = 0;
    textureKeys.forEach((key) => {
      if (!this.textures.exists(key)) return;
      this.textures.get(key).setFilter(filterMode);
      applied += 1;
    });
    console.log(`[BootScene] Player texture sampling: ${requestedFilter} (${applied} textures)`);
  }

  preloadTileSprites() {
    const approvedWorldBase = "sprites/tiles/approved-world";
    const caveEntrance = CAVE_SCENE_CONFIG.overworldEntrance;
    const v11SkyIslandBase = "sprites/backgrounds/world-v11-sky-islands-v1";
    const levelTwoEnabled = isGameplayFeatureEnabled(
      GAMEPLAY_FEATURE_IDS.LEVEL_TWO,
      this.gameplayCapabilities,
    );
    this.load.image(ASSET_KEYS.background.skyIslands.level1Platform, `${v11SkyIslandBase}/level1-platform.webp`);
    this.load.image(ASSET_KEYS.background.skyIslands.level1Portal, `${v11SkyIslandBase}/level1-eclipse-gate.webp`);
    if (levelTwoEnabled) {
      this.load.image(ASSET_KEYS.background.skyIslands.level2Platform, `${v11SkyIslandBase}/level2-platform.webp`);
      this.load.image(ASSET_KEYS.background.skyIslands.level2Portal, `${v11SkyIslandBase}/level2-eclipse-gate.webp`);
    }
    this.queueImage(ASSET_KEYS.tiles.bedrock, `${approvedWorldBase}/bedrock-megalith-lock-v1.png`);
    this.load.image(caveEntrance.legacy.textureKey, caveEntrance.legacy.assetPath);
    this.load.image(caveEntrance.scenic.textureKey, caveEntrance.scenic.assetPath);
    this.load.image(ASSET_KEYS.tiles.caveEdge, `${approvedWorldBase}/cave-edge.webp`);
    this.load.image(ASSET_KEYS.tiles.caveCeiling, `${approvedWorldBase}/cave-ceiling.webp`);
    this.load.image(ASSET_KEYS.tiles.caveCeilingChains, `${approvedWorldBase}/cave-ceiling-chains.webp`);
    this.load.image(ASSET_KEYS.tiles.treasureStone, `${approvedWorldBase}/treasure-stone.webp`);
    this.load.image(ASSET_KEYS.tiles.skyIslandTop, `${approvedWorldBase}/sky-island-top.webp`);
    this.load.image(ASSET_KEYS.tiles.chestNormal, `${approvedWorldBase}/chest-normal.webp`);
    this.load.image(ASSET_KEYS.tiles.chestRare, `${approvedWorldBase}/chest-rare.webp`);
    this.load.image(ASSET_KEYS.tiles.ancientRelicCache, `${approvedWorldBase}/ancient-relic-cache-v1.webp`);
    this.load.image(ASSET_KEYS.tiles.townExit, `${approvedWorldBase}/town-exit.webp`);

    const soil = ASSET_KEYS.tiles.dynamicSoil;
    const soilBase = "sprites/tiles/dynamic-soil/";
    const depthBands = ["000-200", "200-400", "400-600", "600-800", "800-1000"];
    soil.bases.forEach((bandKeys, band) => {
      bandKeys.forEach((key, variant) => {
        this.load.image(key, `${soilBase}bases/soil-${depthBands[band]}-v${variant + 1}.webp`);
      });
    });
    const deepDepthBands = ["1000-1200", "1200-1400", "1400-1600", "1600-plus"];
    soil.deepBases?.forEach((bandKeys, band) => {
      bandKeys.forEach((key, variant) => {
        this.load.image(key, `${soilBase}deep-bases/deep-soil-${deepDepthBands[band]}-v${variant + 1}.png`);
      });
    });
    soil.cracks.forEach((key, stage) => {
      this.load.image(key, `${soilBase}overlays/crack-stage-${stage + 1}.png`);
    });
    this.load.image(soil.hardness.compact, `${soilBase}overlays/hardness-compact.png`);
    this.load.image(soil.hardness.strong, `${soilBase}overlays/hardness-strong.png`);
    this.load.image(soil.rarity.rich, `${soilBase}overlays/rarity-rich.png`);
    this.load.image(soil.rarity.packed, `${soilBase}overlays/rarity-packed.png`);
    this.load.image(soil.rarity.ancient, `${soilBase}overlays/rarity-ancient.png`);
    this.load.image(soil.material.damp, `${soilBase}overlays/material-damp.png`);
    this.load.image(soil.material.ash, `${soilBase}overlays/material-ash.png`);
    this.load.image(soil.material.rubble, `${soilBase}overlays/material-rubble.png`);

    const loadDamageStages = (keys, basePath) => {
      keys.forEach((key, index) => {
        this.load.image(key, `${basePath}/${index + 1}-of-5-hp.webp`);
      });
    };
    const loadOpaqueImageGenResource = (keys, fileName) => {
      keys.forEach((key) => {
        this.load.image(key, `sprites/tiles/resource-tiles-imagegen-v3/${fileName}.webp`);
      });
    };

    loadDamageStages(
      [ASSET_KEYS.tiles.dirtHp1, ASSET_KEYS.tiles.dirtHp2, ASSET_KEYS.tiles.dirtHp3, ASSET_KEYS.tiles.dirtHp4, ASSET_KEYS.tiles.dirtHp5],
      "sprites/tiles/tiles-under-1000/dirt-tiles"
    );

    loadOpaqueImageGenResource(
      [ASSET_KEYS.tiles.stoneHp1, ASSET_KEYS.tiles.stoneHp2, ASSET_KEYS.tiles.stoneHp3, ASSET_KEYS.tiles.stoneHp4, ASSET_KEYS.tiles.stoneHp5],
      "stone"
    );

    loadOpaqueImageGenResource(
      [ASSET_KEYS.tiles.copperHp1, ASSET_KEYS.tiles.copperHp2, ASSET_KEYS.tiles.copperHp3, ASSET_KEYS.tiles.copperHp4, ASSET_KEYS.tiles.copperHp5],
      "copper"
    );

    // Dark dirt variants
    loadDamageStages(
      [ASSET_KEYS.tiles.darkDirtNormalHp1, ASSET_KEYS.tiles.darkDirtNormalHp2, ASSET_KEYS.tiles.darkDirtNormalHp3, ASSET_KEYS.tiles.darkDirtNormalHp4, ASSET_KEYS.tiles.darkDirtNormalHp5],
      "sprites/tiles/tiles-under-1000/dirt-tiles/dark-dirt/dark-dirt-normal"
    );
    loadDamageStages(
      [ASSET_KEYS.tiles.darkDirtStrongHp1, ASSET_KEYS.tiles.darkDirtStrongHp2, ASSET_KEYS.tiles.darkDirtStrongHp3, ASSET_KEYS.tiles.darkDirtStrongHp4, ASSET_KEYS.tiles.darkDirtStrongHp5],
      "sprites/tiles/tiles-under-1000/dirt-tiles/dark-dirt/dark-dirt-strong"
    );

    loadOpaqueImageGenResource(
      [ASSET_KEYS.tiles.bronzeHp1, ASSET_KEYS.tiles.bronzeHp2, ASSET_KEYS.tiles.bronzeHp3, ASSET_KEYS.tiles.bronzeHp4, ASSET_KEYS.tiles.bronzeHp5],
      "bronze"
    );
    loadOpaqueImageGenResource(
      [ASSET_KEYS.tiles.steelHp1, ASSET_KEYS.tiles.steelHp2, ASSET_KEYS.tiles.steelHp3, ASSET_KEYS.tiles.steelHp4, ASSET_KEYS.tiles.steelHp5],
      "steel"
    );
    loadOpaqueImageGenResource(
      [ASSET_KEYS.tiles.ironHp1, ASSET_KEYS.tiles.ironHp2, ASSET_KEYS.tiles.ironHp3, ASSET_KEYS.tiles.ironHp4, ASSET_KEYS.tiles.ironHp5],
      "iron"
    );
    loadOpaqueImageGenResource(
      [ASSET_KEYS.tiles.silverHp1, ASSET_KEYS.tiles.silverHp2, ASSET_KEYS.tiles.silverHp3, ASSET_KEYS.tiles.silverHp4, ASSET_KEYS.tiles.silverHp5],
      "silver"
    );
    loadOpaqueImageGenResource(
      [ASSET_KEYS.tiles.goldHp1, ASSET_KEYS.tiles.goldHp2, ASSET_KEYS.tiles.goldHp3, ASSET_KEYS.tiles.goldHp4, ASSET_KEYS.tiles.goldHp5],
      "gold"
    );
    if (levelTwoEnabled) {
      queueLevelTwoResourceTileAssets(ASSET_KEYS, {
        loadDamageStages,
        loadOpaqueImageGenResource,
      });
    } else {
      // The inventory collection remains a complete visual field guide even
      // when Level Two gameplay is excluded from the active capability pack.
      loadDamageStages(
        [ASSET_KEYS.tiles.lavaDirtHp1, ASSET_KEYS.tiles.lavaDirtHp2,
          ASSET_KEYS.tiles.lavaDirtHp3, ASSET_KEYS.tiles.lavaDirtHp4,
          ASSET_KEYS.tiles.lavaDirtHp5],
        "sprites/tiles/second-world/lava-dirt",
      );
      // Ember is a Campfire rare find in Level One as well as Level Two.
      loadOpaqueImageGenResource(
        [ASSET_KEYS.tiles.emberOreHp1, ASSET_KEYS.tiles.emberOreHp2,
          ASSET_KEYS.tiles.emberOreHp3, ASSET_KEYS.tiles.emberOreHp4,
          ASSET_KEYS.tiles.emberOreHp5],
        "ember-ore",
      );
    }

    this.load.image(
      ASSET_KEYS.tiles.teleportTile,
      "sprites/tiles/special-tiles-v2/teleport-tile.webp"
    );
    this.load.image(ASSET_KEYS.tiles.gambleTile, "sprites/tiles/special-tiles-imagegen-v3/gamble.webp");

    this.load.image(ASSET_KEYS.tiles.floorTown1, "sprites/tiles/base-tiles/floor-town-1.webp");
    this.load.image(ASSET_KEYS.tiles.floorTown2, "sprites/tiles/base-tiles/floor-town-2.webp");

    for (const tier of GEM_POWER_BLOCK_TIERS) {
      this.load.image(ASSET_KEYS.tiles.gemPowerBlockTiers[tier.id], tier.assetPath);
    }
    this.load.image(ASSET_KEYS.tiles.speedBlock, "sprites/tiles/special-tiles-imagegen-v3/speed.webp");
    this.load.image(ASSET_KEYS.tiles.xpBlock, "sprites/tiles/special-tiles-imagegen-v3/level-up.webp");
    this.load.image(ASSET_KEYS.tiles.sellBlock, "sprites/tiles/special-tiles-imagegen-v3/sell.webp");
    this.load.image(ASSET_KEYS.tiles.critBlock, "sprites/tiles/special-tiles-imagegen-v3/crit.webp");
    this.load.image(ASSET_KEYS.tiles.berserkBlock, "sprites/tiles/special-tiles-imagegen-v3/berserk.webp");
    this.load.image(ASSET_KEYS.tiles.comboBlock, "sprites/tiles/special-tiles-imagegen-v3/combo.webp");
    this.load.image(ASSET_KEYS.tiles.legendBlock, "sprites/tiles/special-tiles-imagegen-v3/legend.webp");

  }

  preloadFxSprites() {
    this.load.image(ASSET_KEYS.fx.break1, "sprites/tiles/tiles-under-1000/dirt-tiles/breaking-animation/breaking-1.webp");
    this.load.image(ASSET_KEYS.fx.break2, "sprites/tiles/tiles-under-1000/dirt-tiles/breaking-animation/breaking-2.webp");
    queueCapabilityFireAssets(this);
    for (const asset of getOldSchoolLampLightPreloadAssets()) {
      if (!this.textures.exists(asset.key)) {
        this.load.spritesheet(asset.key, asset.path, asset.frameConfig);
      }
    }
    if (!this._deferFeatureAssets) {
      for (const asset of getStarBlockSteadyLightPreloadAssets()) {
        this.queueImage(asset.key, asset.path);
      }
      for (const asset of getStarBlockPulsePreloadAssets()) {
        this.queueImage(asset.key, asset.path);
      }
      for (const asset of getCollectedStarReleasePreloadAssets()) {
        this.queueImage(asset.key, asset.path);
      }
    }
    for (const asset of getMiningTargetFeedbackPreloadAssets()) {
      this.queueImage(asset.key, asset.path);
    }
  }

  preloadHeavenblocksSkyAltars() {
    if (!isGameplayFeatureEnabled(
      GAMEPLAY_FEATURE_IDS.HEAVENBLOCKS,
      this.gameplayCapabilities,
    )) return;
    for (const asset of getHeavenblocksSkyAltarPreloadAssets()) {
      this.queueImage(asset.key, asset.path);
    }
  }

  preloadGraveborerWurmSprites() {
    const basePath = GRAVEBORER_WURM_CONFIG.assets.basePath;
    const files = GRAVEBORER_WURM_CONFIG.assets;
    const keys = ASSET_KEYS.environment.graveborerWurm;
    this.queueImage(keys.head, `${basePath}/${files.headFile}`);
    this.queueImage(keys.body, `${basePath}/${files.bodyFile}`);
    this.queueImage(keys.tail, `${basePath}/${files.tailFile}`);
    this.queueImage(keys.medallion, `${basePath}/${files.medallionFile}`);
    this.queueImage(keys.warning, `${basePath}/${files.warningFile}`);
  }

  preloadUiSprites() {
    for (const asset of [
      ...CELESTIAL_ACTION_BAR_EAGER_ASSETS,
      ...CELESTIAL_CURRENCY_HUD_PRELOAD_ASSETS,
    ]) {
      this.queueImage(asset.key, asset.path);
    }
    if (!this._deferFeatureAssets) {
      for (const asset of getStarIdentityPreloadAssets()) {
        this.queueImage(asset.key, asset.path);
      }
    }
    for (const asset of getInventoryCodexPreloadAssets()) {
      this.queueImage(asset.key, asset.path);
    }
    this.load.spritesheet(UI_ICON_ATLAS.key, UI_ICON_ATLAS.path, {
      frameWidth: UI_ICON_ATLAS.frameWidth,
      frameHeight: UI_ICON_ATLAS.frameHeight,
    });
    for (const asset of getPickaxeIconPreloadAssets()) {
      this.queueImage(asset.key, asset.path);
    }
    for (const asset of getPickaxeHudPreloadAssets()) {
      this.queueImage(asset.key, asset.path);
    }
    if (!this._deferFeatureAssets) {
      this.queueImage(ASSET_KEYS.ui.worldMapFrame, WORLD_MAP_CONFIG.assetPath);
      this.load.spritesheet(
        ASSET_KEYS.ui.worldMapSymbols,
        WORLD_MAP_CONFIG.symbolAtlas.path,
        {
          frameWidth: WORLD_MAP_CONFIG.symbolAtlas.frameWidth,
          frameHeight: WORLD_MAP_CONFIG.symbolAtlas.frameHeight,
          endFrame: WORLD_MAP_CONFIG.symbolAtlas.endFrame,
        },
      );
    }
    this.load.image(ASSET_KEYS.ui.resources.dirt, "sprites/UI/dirt/dirt-icon.webp");
    this.load.image(ASSET_KEYS.ui.resources.stone, "sprites/UI/stone/stone-icon.webp");
    this.load.image(ASSET_KEYS.ui.resources.copper, "sprites/UI/copper/copper-icon.webp");
    this.load.image(ASSET_KEYS.ui.lootBag, "sprites/UI/loot-pickups/inventory-bag.png");
    Object.entries(ASSET_KEYS.ui.approvedHud).forEach(([name, key]) => {
      const path = APPROVED_HUD_SKIN.paths[name];
      if (path) this.queueImage(key, path);
    });
    Object.values(ASSET_KEYS.ui.notificationControls).forEach(asset => {
      this.queueImage(asset.key, asset.path);
    });
    RANDOM_EVENT_PRELOAD_ASSETS.forEach(asset => {
      this.queueImage(asset.key, asset.path);
    });
    this.queueImage(
      ASSET_KEYS.ui.thunderStrikeChainFrame,
      THUNDER_STRIKE_CHAIN_CONFIG.timingBar.assetPath,
    );
    this.queueImage(
      ASSET_KEYS.ui.thunderStrikeTargetGate,
      THUNDER_STRIKE_CHAIN_CONFIG.timingBar.targetAssetPath,
    );
    this.queueImage(
      ASSET_KEYS.ui.thunderStrikeNeedle,
      THUNDER_STRIKE_CHAIN_CONFIG.timingBar.needleAssetPath,
    );
    // ESC navigation is synchronous: keep all 25 archive portraits resident.
    // Capability filtering still owns the separate in-world Titan assets.
    const titanArchiveAssets = getTitanArchivePreloadAssets();
    const titanAssets = [
      ...getCapabilityTitanGameplayPreloadAssets(
        undefined,
        undefined,
        this.gameplayCapabilities,
      ),
      ...titanArchiveAssets,
    ];
    for (const asset of titanAssets) {
      const archivePortrait = asset.key?.startsWith("titan-discovery-")
        && !asset.key.includes("chamber");
      if (archivePortrait) {
        this.queueResidentUiImage(asset.key, asset.path, "titan-archive-ui");
      } else {
        this.queueImage(asset.key, asset.path);
      }
    }
    console.info(
      `[BootScene] Resident Titan archive portraits queued: ${titanArchiveAssets.length}`,
    );
    for (const asset of getEarthquakeFeedbackPreloadAssets()) {
      this.queueImage(asset.key, asset.path);
    }
    for (const asset of getTileDestructionFxPreloadAssets()) {
      this.queueImage(asset.key, asset.path);
    }
    this.load.image(ASSET_KEYS.ui.lootPickups.dirt, "sprites/UI/loot-pickups/dirt.png");
    this.load.image(ASSET_KEYS.ui.lootPickups.stone, "sprites/UI/loot-pickups/stone.png");
    this.load.image(ASSET_KEYS.ui.lootPickups.copper, "sprites/UI/loot-pickups/copper.png");
    this.load.image(ASSET_KEYS.ui.lootPickups.darkDirtNormal, "sprites/UI/loot-pickups/dark-dirt-normal.png");
    this.load.image(ASSET_KEYS.ui.lootPickups.darkDirtStrong, "sprites/UI/loot-pickups/dark-dirt-strong.png");
    this.load.image(ASSET_KEYS.ui.lootPickups.steel, "sprites/UI/loot-pickups/steel.png");
    this.load.image(ASSET_KEYS.ui.lootPickups.iron, "sprites/UI/loot-pickups/iron.png");
    this.load.image(ASSET_KEYS.ui.lootPickups.bronze, "sprites/UI/loot-pickups/bronze.png");
    this.load.image(ASSET_KEYS.ui.lootPickups.silver, "sprites/UI/loot-pickups/silver.png");
    this.load.image(ASSET_KEYS.ui.lootPickups.gold, "sprites/UI/loot-pickups/gold.png");
    this.load.image(ASSET_KEYS.ui.xpGathering.routine, XP_GATHERING_CONFIG.assetPaths.routine);
    this.load.image(ASSET_KEYS.ui.xpGathering.special, XP_GATHERING_CONFIG.assetPaths.special);
    this.load.image(ASSET_KEYS.ui.xpGathering.levelUp, XP_GATHERING_CONFIG.assetPaths.levelUp);
    queueCapabilityUiAssets(this, ASSET_KEYS, this.gameplayCapabilities);
  }

  createAnimations() {
    const legacyPlayerAvailable = this.textures.exists(ASSET_KEYS.player.idleSheet);
    const sheetFrames = (sheetKey, frames) => frames.map((frame) => ({ key: sheetKey, frame }));
    const createSheetAnim = (key, sheetKey, frames, frameRate, repeat = -1, options = {}) => {
      if (!this.textures.exists(sheetKey) || this.anims.exists(key)) return;
      const fallbackToFirstFrame = options.fallbackToFirstFrame === true;
      const resolvedFrames = (frames && frames.length)
        ? frames
        : (fallbackToFirstFrame ? [0] : []);
      if (!resolvedFrames.length) return;
      this.anims.create({
        key,
        frames: sheetFrames(sheetKey, resolvedFrames),
        frameRate,
        repeat,
      });
    };
    const createImageAnim = (key, frameKey, frameRate, repeat = -1) => {
      if (this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: [{ key: frameKey }],
        frameRate,
        repeat,
      });
    };
    const createHitAnims = (animKeys, sheetKey, frameGroups, frameRate) => {
      animKeys.forEach((key, index) => {
        createSheetAnim(key, sheetKey, frameGroups[index], frameRate, 0);
      });
    };

    if (legacyPlayerAvailable && !this.anims.exists(ASSET_KEYS.player.idleAnim)) {
    this.anims.create({
      key: ASSET_KEYS.player.idleAnim,
      frames: sheetFrames(ASSET_KEYS.player.idleSheet, ASSET_KEYS.player.idleFrames),
      frameRate: ASSET_KEYS.player.idleAnimationFps,
      repeat: -1,
    });

    this.anims.create({
      key: ASSET_KEYS.player.walkStartAnim,
      frames: sheetFrames(ASSET_KEYS.player.walkSheet, ASSET_KEYS.player.walkStartFrames),
      frameRate: ASSET_KEYS.player.walkAnimation.baseFps,
      repeat: 0,
    });

    this.anims.create({
      key: ASSET_KEYS.player.walkLoopAnim,
      frames: sheetFrames(ASSET_KEYS.player.walkSheet, ASSET_KEYS.player.walkLoopFrames),
      frameRate: ASSET_KEYS.player.walkAnimation.baseFps,
      repeat: -1,
    });

    this.anims.create({
      key: ASSET_KEYS.player.walkStopAnim,
      frames: sheetFrames(ASSET_KEYS.player.walkSheet, ASSET_KEYS.player.walkStopFrames),
      frameRate: ASSET_KEYS.player.walkAnimation.baseFps,
      repeat: 0,
    });

    this.anims.create({
      key: ASSET_KEYS.player.airborneAnim,
      frames: ASSET_KEYS.player.airborneFrames.map((key) => ({ key })),
      frameRate: 12,
      repeat: 0,
    });

    if (this.textures.exists(ASSET_KEYS.player.duckSheet)) {
      createSheetAnim(ASSET_KEYS.player.duckAnim, ASSET_KEYS.player.duckSheet, ASSET_KEYS.player.duckFrames, ASSET_KEYS.player.duckAnimationFps, 0);
    } else {
      this.anims.create({
        key: ASSET_KEYS.player.duckAnim,
        frames: [{ key: "char-v2-duck-1" }],
        frameRate: 8,
        repeat: 0,
      });
    }

    if (this.textures.exists(ASSET_KEYS.player.walkRunSheet)) {
      createSheetAnim(ASSET_KEYS.player.walkRunAnim, ASSET_KEYS.player.walkRunSheet, ASSET_KEYS.player.walkRunFrames, ASSET_KEYS.player.walkRunAnimationFps, -1);
    }
    if (this.textures.exists(ASSET_KEYS.player.fallingSheet)) {
      createSheetAnim(ASSET_KEYS.player.fallingAnim, ASSET_KEYS.player.fallingSheet, ASSET_KEYS.player.fallingFrames, ASSET_KEYS.player.fallingAnimationFps, 0);
    }
    if (this.textures.exists(ASSET_KEYS.player.wallPushSheet)) {
      createSheetAnim(ASSET_KEYS.player.wallPushAnim, ASSET_KEYS.player.wallPushSheet, ASSET_KEYS.player.wallPushFrames, ASSET_KEYS.player.wallPushAnimationFps, 0);
    }
    if (this.textures.exists(ASSET_KEYS.player.leanAgainstWallSheet)) {
      createSheetAnim(ASSET_KEYS.player.leanAgainstWallAnim, ASSET_KEYS.player.leanAgainstWallSheet, ASSET_KEYS.player.leanAgainstWallFrames, ASSET_KEYS.player.leanAgainstWallAnimationFps, 0);
    }
    if (this.textures.exists(ASSET_KEYS.player.combatIdleRecoverSheet)) {
      createSheetAnim(
        ASSET_KEYS.player.combatIdleRecoverAnim,
        ASSET_KEYS.player.combatIdleRecoverSheet,
        ASSET_KEYS.player.combatIdleRecoverFrames,
        ASSET_KEYS.player.combatIdleRecoverAnimationFps,
        0,
        { fallbackToFirstFrame: true }
      );
    }
    if (this.textures.exists(ASSET_KEYS.player.combatIdleToNormalIdleSheet)) {
      createSheetAnim(ASSET_KEYS.player.combatIdleToNormalIdleAnim, ASSET_KEYS.player.combatIdleToNormalIdleSheet, ASSET_KEYS.player.combatIdleToNormalIdleFrames, ASSET_KEYS.player.combatIdleToNormalIdleAnimationFps, 0);
    }

    if (this.textures.exists(ASSET_KEYS.player.digDownSheet)) {
      createSheetAnim(ASSET_KEYS.player.digDownAnim, ASSET_KEYS.player.digDownSheet, ASSET_KEYS.player.digDownFrames, ASSET_KEYS.player.digDownAnimationFps, 0);
    } else {
      createImageAnim(ASSET_KEYS.player.digDownAnim, "char-v2-dig-down-1", ASSET_KEYS.player.digDownAnimationFps, 0);
    }

    createHitAnims(
      ASSET_KEYS.player.digSidewaysHitAnims,
      ASSET_KEYS.player.digSidewaysSheet,
      ASSET_KEYS.player.digSidewaysHitFrames,
      ASSET_KEYS.player.digSidewaysAnimationFps
    );
    createHitAnims(
      ASSET_KEYS.player.digUpHitAnims,
      ASSET_KEYS.player.digUpSheet,
      ASSET_KEYS.player.digUpHitFrames,
      ASSET_KEYS.player.digUpAnimationFps
    );
    createHitAnims(
      ASSET_KEYS.player.digUpSidewaysHitAnims,
      ASSET_KEYS.player.digUpSidewaysSheet,
      ASSET_KEYS.player.digUpSidewaysHitFrames,
      ASSET_KEYS.player.digUpAnimationFps
    );
    createImageAnim(ASSET_KEYS.player.digUpLookAnim, ASSET_KEYS.player.digUpLookFrame, 1, -1);
    createSheetAnim(
      ASSET_KEYS.player.flyAnim,
      ASSET_KEYS.player.flightSheet,
      ASSET_KEYS.player.flyFrames,
      ASSET_KEYS.player.flightAnimationFps,
      -1
    );

    if (this.textures.exists(ASSET_KEYS.player.quickslashSheet)) {
      createSheetAnim(
        ASSET_KEYS.player.quickslashAnim,
        ASSET_KEYS.player.quickslashSheet,
        ASSET_KEYS.player.quickslashFrames,
        ASSET_KEYS.player.quickslashAnimationFps,
        0
      );
    } else {
      this.anims.create({
        key: ASSET_KEYS.player.quickslashAnim,
        frames: [{ key: "char-v2-quickslash-1" }, { key: "char-v2-quickslash-2" }],
        frameRate: 12,
        repeat: 0,
      });
    }

    createSheetAnim(
      ASSET_KEYS.player.teleportInAnim,
      ASSET_KEYS.player.teleportInSheet,
      ASSET_KEYS.player.teleportInFrames,
      ASSET_KEYS.player.teleportInAnimationFps,
      0
    );

    if (this.textures.exists(ASSET_KEYS.player.thunderStrikeChargeSheet)) {
      createSheetAnim(ASSET_KEYS.player.thunderStrikeChargeAnim, ASSET_KEYS.player.thunderStrikeChargeSheet, ASSET_KEYS.player.thunderStrikeChargeFrames, ASSET_KEYS.player.thunderStrikeChargeAnimationFps, -1);
    } else {
      createImageAnim(ASSET_KEYS.player.thunderStrikeChargeAnim, "char-v2-thunder-charge", 6, -1);
    }

    if (this.textures.exists(ASSET_KEYS.player.thunderStrikeStrikeSheet)) {
      createSheetAnim(ASSET_KEYS.player.thunderStrikeStrikeAnim, ASSET_KEYS.player.thunderStrikeStrikeSheet, ASSET_KEYS.player.thunderStrikeStrikeFrames, ASSET_KEYS.player.thunderStrikeStrikeAnimationFps, 0);
    } else {
      createImageAnim(ASSET_KEYS.player.thunderStrikeStrikeAnim, "char-v2-thunder-strike", 12, 0);
    }
    }

    createSheetAnim(ASSET_KEYS.npcs.boboIdleAnim, ASSET_KEYS.npcs.boboIdleSheet, ASSET_KEYS.npcs.boboIdleFrames, 5, -1);

    createSheetAnim(ASSET_KEYS.shadowMiner.runAnim, ASSET_KEYS.shadowMiner.sheet, [ASSET_KEYS.shadowMiner.runFrame], 8, -1);

    // ── Robot animations are created on-demand in PlaySceneSetup ──────────
  }

  async getPlaylistFiles() {
    if (Array.isArray(this._playlistFiles)) return this._playlistFiles;

    try {
      const response = await fetch("sound/playlists/playlist.json");
      const files = await response.json();
      if (!Array.isArray(files) || files.length === 0) {
        throw new Error("playlist.json did not contain any tracks");
      }
      this._playlistFiles = files;
    } catch (error) {
      console.warn("[BootScene] playlist.json unavailable, using fallback tracks", error);
      this._playlistFiles = [...FALLBACK_MUSIC_PLAYLIST];
    }

    return this._playlistFiles;
  }

  async preloadMenuAudio() {
    const runtimeAudioStreaming = resolveRuntimeAudioStreamingEnabled();
    ASSET_KEYS.audio.runtime.paths = {};
    ASSET_KEYS.audio.runtime.streamingEnabled = runtimeAudioStreaming;
    ASSET_KEYS.audio.runtime.bootQueuedKeys = [];
    const playlistFiles = await this.getPlaylistFiles();
    const seedIndex = playlistFiles.length > 0
      ? (runtimeAudioStreaming ? Math.floor(Math.random() * playlistFiles.length) : 0)
      : -1;

    this._bootMusicSeedIndex = seedIndex;
    const playlistKeys = playlistFiles.map((file, index) => {
      const key = `music-track-${index + 1}`;
      this.queueAudio(key, `sound/playlists/${file}`, {
        preload: index === seedIndex,
      });
      return key;
    });
    ASSET_KEYS.audio.music.playlist = playlistKeys;
    ASSET_KEYS.audio.music.bootSeedKey = playlistKeys[seedIndex] || "";
    ASSET_KEYS.audio.runtime.bootQueuedKeys = [...this._queuedAudioKeys];
  }

  async preloadAudio() {
    const runtimeAudioStreaming = resolveRuntimeAudioStreamingEnabled();
    ASSET_KEYS.audio.runtime.paths = {};
    ASSET_KEYS.audio.runtime.streamingEnabled = runtimeAudioStreaming;
    ASSET_KEYS.audio.runtime.bootQueuedKeys = [];
    const playlistFiles = await this.getPlaylistFiles();

    const bootMusicIndexes = new Set();
    if (playlistFiles.length > 0) {
      const retainedSeedIndex = Number.isInteger(this._bootMusicSeedIndex)
        && this._bootMusicSeedIndex >= 0
        && this._bootMusicSeedIndex < playlistFiles.length
        ? this._bootMusicSeedIndex
        : -1;
      const seedIndex = retainedSeedIndex >= 0
        ? retainedSeedIndex
        : (runtimeAudioStreaming ? Math.floor(Math.random() * playlistFiles.length) : 0);
      this._bootMusicSeedIndex = seedIndex;
      const count = runtimeAudioStreaming
        ? Math.min(AUDIO_RUNTIME_LOADING.bootMusicTracks, playlistFiles.length)
        : playlistFiles.length;
      for (let offset = 0; offset < count; offset += 1) {
        bootMusicIndexes.add((seedIndex + offset) % playlistFiles.length);
      }
    }
    const playlistKeys = playlistFiles.map((file, i) => {
      const key = `music-track-${i + 1}`;
      this.queueAudio(key, `sound/playlists/${file}`, {
        preload: bootMusicIndexes.has(i),
      });
      return key;
    });
    ASSET_KEYS.audio.music.playlist = playlistKeys;
    ASSET_KEYS.audio.music.bootSeedKey = playlistKeys[[...bootMusicIndexes][0]] || "";

    // Load random voice line manifest dynamically — add/remove files in manifest.json, no code changes needed
    try {
      const manifestResp = await fetch('sound/voice-lines/player-voice-lines/random-voice-lines/manifest.json');
      ASSET_KEYS.audio.voiceLines.playerRandomFiles = await manifestResp.json();
    } catch (e) {
      console.warn('[BootScene] random-voice-lines manifest.json not found, using fallback');
      ASSET_KEYS.audio.voiceLines.playerRandomFiles = ['randomvoiceline-2.ogg', 'randomvoiceline-4.ogg', 'randomvoiceline-8.ogg'];
    }

    this.loadSoundEffectLibraries();
    this.loadVoiceLineLibraries({ streaming: runtimeAudioStreaming });
    ASSET_KEYS.audio.runtime.bootQueuedKeys = [...this._queuedAudioKeys];
    console.info(
      `[BootScene] Audio ${runtimeAudioStreaming ? "streaming" : "eager rollback"}: `
      + `${Object.keys(ASSET_KEYS.audio.runtime.paths).length} registered, `
      + `${ASSET_KEYS.audio.runtime.bootQueuedKeys.length} queued for boot.`,
    );
  }
  
  /**
   * Load sound effect libraries (called during preload phase)
   */
  loadSoundEffectLibraries() {
    const digBasePath = 'sound/soundEffects/costume-sounds/dig/';
    this.queueAudio('dig-0', digBasePath + 'dig-1.ogg');
    this.queueAudio('dig-1', digBasePath + 'dig-2.ogg');
    this.queueAudio('dig-star-0', digBasePath + 'dig-star/MUSCChim_Chimes dream 3 (ID 2081)_BigSoundBank.com.ogg');

    const footstepBasePath = 'sound/soundEffects/costume-sounds/footsteps/';
    this.queueAudio('footsteps-0', footstepBasePath + 'footstep-1.ogg');
    this.queueAudio('footsteps-1', footstepBasePath + 'footstep-3.ogg');
    this.queueAudio('footsteps-2', footstepBasePath + 'footstep-4.ogg');

    const tileBreakBasePath = 'sound/soundEffects/costume-sounds/tile-break/';
    this.queueAudio('tileBreak-0', tileBreakBasePath + 'CERMBrk_Broken plate 7 (ID 1649)_BigSoundBank.com.ogg');

    const tileHitBasePath = 'sound/soundEffects/costume-sounds/hit-reource-tile/';
    this.queueAudio('tileHit-0', tileHitBasePath + 'dig-1.ogg');

    const uiBasePath = 'sound/soundEffects/ui/';
    this.queueAudio(ASSET_KEYS.audio.sfx.uiSelect, uiBasePath + 'ui-select.wav');
    this.queueAudio(ASSET_KEYS.audio.sfx.uiConfirm, uiBasePath + 'ui-confirm.wav');

    Object.values(APPROVED_SFX_FAMILIES)
      .flat()
      .forEach(asset => this.queueAudio(asset.key, asset.path));

    Object.values(ASSET_KEYS.audio.weatherAmbience)
      .forEach(asset => this.queueAudio(asset.key, asset.path, { preload: false }));
  }

  loadVoiceLineLibraries({ streaming = false } = {}) {
    const shouldPreload = index => !streaming
      || index < AUDIO_RUNTIME_LOADING.bootVoiceLinesPerLibrary;
    const playerRandomFiles = ASSET_KEYS.audio.voiceLines.playerRandomFiles;
    const playerRandomBasePath = 'sound/voice-lines/player-voice-lines/random-voice-lines/';
    playerRandomFiles.forEach((file, index) => {
      const key = `player-random-${index}`;
      this.queueAudio(key, playerRandomBasePath + file, { preload: shouldPreload(index) });
    });

    const voiceDir = (subdir) => `sound/voice-lines/npc-voicelines/${subdir}/`;

    const loadNPC = (category, dir, files) => {
      files.forEach((file, index) => {
        const key = `npc-${category}-${index}`;
        this.queueAudio(key, voiceDir(dir) + file, {
          preload: shouldPreload(index),
        });
      });
    };

    const fmt = (name) => `${name}.ogg`;

    loadNPC('moneyMonster', 'voice-lines-money-monster',
      ['c1coj-ox77x', 'jmukr-6e0r4', 'money-monster-voice', 'money-monster-voice(1)',
       'money-monster-voice(2)', 'money-monster-voice(3)', 'money-monster-voice(4)',
       'money-monster-voice(5)', 'sjm2f-q0axa'].map(fmt));

    loadNPC('gearUpgrades', 'gear-upgrade-npc-voicelines',
      ['gear-upgrades', 'gear-upgrades2', 'gear-upgrades2(1)',
       'gear-upgrades3', 'gear-upgrades3(1)', 'gear-upgrades3(2)'].map(fmt));

    loadNPC('playerUpgrades', 'player-upgrade-npc-voicelines',
      ['player-upgrades', 'player-upgrades(1)', 'player-upgrades(2)'].map(fmt));

    // === UPDATE-2 VOICELINES (playerUpgrades) ===
    // 34 new .wav files from player-upgrade-npc-voicelines/update-2/
    // Keys: npc-playerUpgrades-3 through npc-playerUpgrades-36 (offset by 3 existing files)
    const playerUpgradeUpdate2Files = [
      'update-2/Big One Coming for You.wav',
      'update-2/Big One Coming for You(1).wav',
      'update-2/Big Upgrade.wav',
      'update-2/Big Upgrade(1).wav',
      'update-2/Dead in the Dark.wav',
      'update-2/Dead in the Dark(1).wav',
      'update-2/Dont Press N Key.wav',
      'update-2/Dont You Dare.wav',
      'update-2/Dwarf Uplifted.wav',
      'update-2/Dwarf Uplifted(1).wav',
      'update-2/Dwarf Villager.wav',
      'update-2/Dwarf Villager(1).wav',
      'update-2/got poop in my glasses dont make any pas.wav',
      'update-2/Got That Heavy Punch.wav',
      'update-2/Hey.wav',
      'update-2/Hey(1).wav',
      'update-2/I Got Many Yooo.wav',
      'update-2/I Got Nightmares Every Day.wav',
      'update-2/I Like Big.wav',
      'update-2/I Like Big(1).wav',
      'update-2/I Like Guys.wav',
      'update-2/I Like Guys(1).wav',
      'update-2/I Will Haunt You.wav',
      'update-2/I Will Haunt You(1).wav',
      'update-2/I Will Haunt You(2).wav',
      'update-2/Nightmare in my brain.wav',
      "update-2/They Ask Me Why I'm Happy.wav",
      "update-2/They Ask Me Why I'm Happy(1).wav",
      'update-2/We make a big hit.wav',
      'update-2/Why am I happy_.wav',
      'update-2/Why am I happy_(1).wav',
      'update-2/Yes yes yo yes yo.wav',
      'update-2/Yes yes yo yes yo(1).wav'
    ];
    
    // Load playerUpgrades update-2 files: keys npc-playerUpgrades-3..36
    playerUpgradeUpdate2Files.forEach((file, index) => {
      this.queueAudio(`npc-playerUpgrades-${index + 3}`, voiceDir('player-upgrade-npc-voicelines') + file, {
        preload: !streaming,
      });
    });

    // === GEM MERCHANT UPDATE-2 VOICELINES ===
    // Update-2 .wav files from gem-merchant-voice-lines/update-2/
    const gemMerchantUpdate2Files = [
      'update-2/A A A A A A.wav',
      'update-2/A A A A A A(1).wav',
      'update-2/Beyond 1000 Meter Lies the.wav',
      'update-2/Beyond 1000 Meter Lies the(1).wav',
      'update-2/Creepy Creep.wav',
      'update-2/Creepy Creep(1).wav',
      'update-2/Dark_ Darkness_ Demon_.wav',
      'update-2/Dark_ Darkness_ Demon_(1).wav',
      'update-2/Dig Deeper.wav',
      'update-2/Dig Deeper(1).wav',
      'update-2/Dont Dig Too Deep.wav',
      'update-2/Dont Dig Too Deep(1).wav',
      'update-2/Evil Laugh.wav',
      'update-2/Evil Laugh(1).wav',
      'update-2/Glad too see you!.wav',
      'update-2/Glad too see you!(1).wav',
      'update-2/Glad too see you!(2).wav',
      'update-2/I am the nightmare.wav',
      'update-2/I Got the Power for You!.wav',
      'update-2/I Got the Power for You!(1).wav',
      'update-2/I was born too glow AND.wav',
      'update-2/I was born too glow AND(1).wav',
      'update-2/I wish I was mortal.wav',
      'update-2/I wish I was mortal(1).wav',
      'update-2/I Wish This Stupid Dwarf Would.wav',
      'update-2/I Wish This Stupid Dwarf Would(1).wav',
      'update-2/My Existence is Agony.wav',
      'update-2/My Existence is Agony(1).wav',
      'update-2/Oke, Yes Oke.wav',
      'update-2/Oke, Yes Oke(1).wav',
      'update-2/That God Dam Happy Dwarf.wav',
      'update-2/The 300 Meter Mark.wav',
      'update-2/The 300 Meter Mark(1).wav',
      'update-2/The Caves They Rumble Under My.wav',
      'update-2/The Caves They Rumble Under My(1).wav',
      'update-2/The Gem Burns.wav',
      'update-2/The Gem Burns(1).wav',
      'update-2/The Gem, It Holds Great Power!.wav',
      'update-2/The Gem, It Holds Great Power!(1).wav',
      'update-2/The Gem.wav',
      'update-2/The Gem(1).wav',
      'update-2/The Gem(2).wav',
      'update-2/The Truth Is Sometimes Upside.wav',
      'update-2/The Truth Is Sometimes Upside(1).wav',
      'update-2/They Say I\'m a Monster.wav',
      'update-2/They Say I\'m a Monster(1).wav',
      'update-2/This Gem It Hurts Me.wav',
      'update-2/To the Core.wav',
      'update-2/To the Core(1).wav',
      'update-2/U want the power.wav',
      'update-2/U want the power(1).wav',
      'update-2/Where Are Your Shoes_.wav',
      'update-2/Where Are Your Shoes_(1).wav'
    ];
    
    // Load gem merchant update-2 files.
    gemMerchantUpdate2Files.forEach((file, index) => {
      this.queueAudio(`npc-gemPowerMerchant-${index}`, voiceDir('gem-merchant-voice-lines') + file, {
        preload: shouldPreload(index),
      });
    });

    loadNPC('boboMerchant', 'bobo-voice-lines',
      ['Bobo2', 'Bobo2(1)', 'Bobo2(2)', 'Bobo2(3)', 'Bobo2(4)', 'Bobo2(5)'].map(fmt));
  }
  
}
