import { ASSET_KEYS } from "../../values/assetKeys.js";
import { PLAYER_ASSET_PROFILES } from "../../values/playerAssetProfiles.js";
import { TILED_BACKGROUND_OBJECTS } from "../../values/tiledBackgroundObjects.js";
import { LOADING_MESSAGES } from "../../values/loadingMessages.js";
import { TELEPORT_PORTAL_CONFIG } from "../../values/teleportPortalConfig.js";
import {
  MENU_BACKGROUND_ASSETS,
  createMenuLoadingScreen,
  addMenuBackground,
  getSelectedMenuBackgroundAsset,
  getSelectedMenuBackgroundKey,
} from "../components/LoadingScreenView.js";

const BRAND_LOGO_PATH = "sprites/branding/logo-enter-v-1/20260316_0321_Just Keep Digging Logo_simple_compose_01kkt3qqn1f9c95wecwtsbqe9y-Photoroom.webp";
const SKY_PORTAL_CANONICAL_PATH = TELEPORT_PORTAL_CONFIG.canonicalAssetPath;
const SKY_PORTAL_FILENAME = TELEPORT_PORTAL_CONFIG.gateFilename;

function makeAuthoredBackgroundKey(path) {
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
      if (resolvedFilename) {
        paths.add(resolvedFilename);
        continue;
      }

      const sourcePath = obj?.properties?.sourcePath;
      if (typeof sourcePath === "string" && sourcePath.trim()) {
        paths.add(sourcePath.trim().replace(/\\/g, "/"));
      } else {
        const imageName = extractAuthoredObjectFilename(obj?.name);
        if (imageName) paths.add(imageName);
      }
    }
  }
  return [...paths].sort();
}

const AUTHORED_LAYER_BASE = "exports/dig_game_12layer_palette_true_separate_v1/sprites/backgrounds/12layer-true-separate-v1/";
const AUTHORED_L11_PROPS_BASE = "exports/pallet-v9/dig_game_empty_backgrounds_and_separate_props_v1/sprites/props/near_props_seam_breakers/";
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

function resolveAuthoredBackgroundPath(path) {
  const normalized = String(path || "").trim().replace(/\\/g, "/");
  const filename = extractAuthoredObjectFilename(normalized);
  if (filename.toLowerCase() === SKY_PORTAL_FILENAME) {
    return SKY_PORTAL_CANONICAL_PATH;
  }
  if (normalized.startsWith("sprites/backgrounds/generated-runtime-v1/")) {
    return normalized.replace(
      "sprites/backgrounds/generated-runtime-v1/",
      "exports/dig_game_runtime_bg_props_v1/sprites/backgrounds/generated-runtime-v1/"
    );
  }
  if (normalized.startsWith("sprites/background-props/generated-runtime-v1/")) {
    return normalized.replace(
      "sprites/background-props/generated-runtime-v1/",
      "exports/cleaned/dig_game_palette_clean_overwrite_runtime_v3/sprites/background-props/generated-runtime-v1/"
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
    return `exports/dig_game_runtime_bg_props_v1/sprites/backgrounds/generated-runtime-v1/${filename}`;
  }
  if (/^prop_.+\.webp$/i.test(filename)) {
    return `exports/cleaned/dig_game_palette_clean_overwrite_runtime_v3/sprites/background-props/generated-runtime-v1/${filename}`;
  }
  return normalized;
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
    this._queuedImagePaths = new Set();
  }

  preload() {
    console.log('[BootScene] ===== MINI PRELOAD STARTED =====');

    const menuBackground = getSelectedMenuBackgroundAsset();
    this.queueImage(ASSET_KEYS.branding.logo, BRAND_LOGO_PATH);
    this.queueImage(menuBackground.key, menuBackground.path);
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

      await this.startFullPreload();
    } catch (error) {
      this.handleBootFailure(error);
    }
  }

  queueImage(key, path) {
    if (!this.textures.exists(key) && !this._queuedImagePaths.has(path)) {
      this._queuedImagePaths.add(path);
      this.load.image(key, path);
    }
  }

  queueAudio(key, path) {
    if (!this.cache.audio.exists(key)) {
      this.load.audio(key, path);
    }
  }

  async startFullPreload() {
    const totalMessages = LOADING_MESSAGES.length;

    // Build a shuffled index pool so we cycle randomly without repeats
    let msgPool = Array.from({ length: totalMessages }, (_, i) => i);
    // Fisher-Yates shuffle
    for (let i = msgPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [msgPool[i], msgPool[j]] = [msgPool[j], msgPool[i]];
    }
    let poolIndex = 0;

    // Start at a random message
    const startIndex = Math.floor(Math.random() * totalMessages);
    const initial = LOADING_MESSAGES[startIndex];
    this.loadingUi = createMenuLoadingScreen(this, {
      title: "Just Keep Digging",
      subtitle: "A L P H A",
      label: initial.label,
      detail: initial.detail,
      preferLogo: true,
      progress: 0,
      backgroundKey: getSelectedMenuBackgroundKey(),
      backgroundAlpha: 0.24,
      overlayAlpha: 0.34,
    });

    // Cycle messages every 8 seconds — randomly shuffled
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
      this.loadingUi?.setProgress(value);
    };
    const onLoadError = (file) => {
      console.warn('[BootScene] Failed to load asset:', file?.key || file?.src || file);
    };

    this.load.on('progress', onProgress);
    this.load.on('loaderror', onLoadError);
    this.load.once('complete', () => {
      this.load.off('progress', onProgress);
      this.load.off('loaderror', onLoadError);
      this._messageTimer?.remove();
      this.loadingUi?.setProgress(1);
      this.loadingUi?.setLabel("Loading complete!");
      this.loadingUi?.setDetail("The mine awaits...");
      this.loadingUi?.fadeOut(300, () => this.finishBoot());
    });

    this.preloadBranding();
    this.preloadBackgrounds();
    this.preloadConstellationSprites();
    this.preloadNPCs();
    this.preloadPlayerSprites();
    this.preloadTileSprites();
    this.preloadFxSprites();
    this.preloadUiSprites();
    await this.preloadAudio();
    this.load.start();
  }

  preloadBranding() {
    this.queueImage(ASSET_KEYS.branding.logo, BRAND_LOGO_PATH);
  }

  preloadBackgrounds() {
    this.queueImage(ASSET_KEYS.background.world1, "sprites/backgrounds/base-background-world-1.webp");
    
    // Load town houses
    this.queueImage(ASSET_KEYS.background.houseMoneyMonster, "sprites/backgrounds/background-town/money-monster-npc-house.webp");
    this.queueImage(ASSET_KEYS.background.housePlayerUpgrade, "sprites/backgrounds/background-town/player-upgrade-npc-house.webp");
    
    // Load background database images
    MENU_BACKGROUND_ASSETS.forEach(({ key, path }) => this.queueImage(key, path));

    const townLoop = ASSET_KEYS.background.townLoop;
    this.load.image(townLoop.aboveFloor, "sprites/infinate-loops/above-floor-layer.png");
    this.load.image(townLoop.floor, "sprites/infinate-loops/floor-layer.png");

    const undergroundBase = "sprites/infinate-loops/underground-0-1000/";
    ASSET_KEYS.background.undergroundLoops.forEach((background, index) => {
      const startDepth = String(index * 200).padStart(3, "0");
      const endDepth = String((index + 1) * 200).padStart(3, "0");
      this.load.image(background.source, `${undergroundBase}depth-${startDepth}-${endDepth}.png`);
    });

    // Load layered sky backgrounds (above ground)
    const sky = ASSET_KEYS.background.skyBackgrounds;
    const skyBase = "sprites/backgrounds/background-database/sky-background-v3/";
    this.load.image(sky.base, skyBase + "sky-v3-base.webp");
    this.load.image(sky.nebula, skyBase + "sky-v3-nebula-veil.webp");
    this.load.image(sky.aurora, skyBase + "sky-v3-aurora-ribbons.webp");
    this.load.image(sky.horizon, skyBase + "sky-v3-horizon-glow.webp");
    this.load.image(sky.cloudsFar, skyBase + "sky-v3-clouds-far.webp");
    this.load.image(sky.cloudsNear, skyBase + "sky-v3-clouds-near.webp");
    this.load.image(sky.planet1, skyBase + "sky-v3-planet-1.webp");
    this.load.image(sky.planet2, skyBase + "sky-v3-planet-2.webp");

    this.preloadAuthoredBackgroundObjects();
  }

  preloadAuthoredBackgroundObjects() {
    const paths = collectAuthoredBackgroundPaths(TILED_BACKGROUND_OBJECTS);
    const resolvedByKey = new Map();

    for (const path of paths) {
      const key = makeAuthoredBackgroundKey(path);
      const resolved = resolveAuthoredBackgroundPath(path);
      const existing = resolvedByKey.get(key);

      if (!resolved) {
        continue;
      }

      // Force canonical eclipse-gate texture if it appears anywhere with duplicate names.
      if (!existing || (isSkyPortalCanonicalPath(resolved) && !isSkyPortalCanonicalPath(existing))) {
        resolvedByKey.set(key, resolved);
      }
    }

    for (const [key, resolved] of resolvedByKey) {
      this.queueImage(key, resolved);
    }
    console.log(`[BootScene] Queued ${resolvedByKey.size} authored TMX background assets`);
  }

  preloadConstellationSprites() {
    const signs = ASSET_KEYS.constellations.signs;
    const base = "sprites/constellations/star-signs-v2/";

    this.queueImage(signs.dirt, `${base}dirt-shovel.png`);
    this.queueImage(signs.stone, `${base}stone-mountain.png`);
    this.queueImage(signs.copper, `${base}copper-anvil.png`);
    this.queueImage(signs.darkDirtNormal, `${base}darkDirtNormal-cave.png`);
    this.queueImage(signs.darkDirtStrong, `${base}darkDirtStrong-fortress.png`);
    this.queueImage(signs.bronze, `${base}bronze-shield.png`);
    this.queueImage(signs.steel, `${base}steel-sword.png`);
    this.queueImage(signs.iron, `${base}iron-hammer.png`);
    this.queueImage(signs.silver, `${base}silver-crescent.png`);
    this.queueImage(signs.gold, `${base}gold-crown.png`);
  }

  preloadNPCs() {
    const base = "sprites/npc/npc-v3/sheets";
    const generatedMerchantBase = "sprites/npc/npc-v5-generated/singles/merchant-idle";
    const generatedMerchantVersion = "solid-generated-v2-20260623";
    const frame1024 = { frameWidth: 1024, frameHeight: 1024 };
    const frame1280 = { frameWidth: 1280, frameHeight: 1280 };

    this.load.spritesheet(ASSET_KEYS.npcs.boboIdleSheet, `${base}/bobo-idle-sheet.webp`, frame1024);
    this.load.spritesheet(ASSET_KEYS.shadowMiner.sheet, `${base}/shadow-miner-sheet.webp`, frame1280);
    this.load.spritesheet(ASSET_KEYS.shadowMiner.idleSheet, `${base}/shadow-miner-idle-sheet.webp`, frame1280);

    this.load.image(ASSET_KEYS.npcs.merchantSprites.moneyMonster, `${generatedMerchantBase}/money-monster.webp?v=${generatedMerchantVersion}`);
    this.load.image(ASSET_KEYS.npcs.merchantSprites.playerUpgrades, `${generatedMerchantBase}/player-upgrades.webp?v=${generatedMerchantVersion}`);
    this.load.image(ASSET_KEYS.npcs.merchantSprites.gearMerchant, `${generatedMerchantBase}/gear-merchant.webp?v=${generatedMerchantVersion}`);
    this.load.image(ASSET_KEYS.npcs.merchantSprites.boboMerchant, `${generatedMerchantBase}/bobo-merchant.webp?v=${generatedMerchantVersion}`);
    this.load.image(ASSET_KEYS.npcs.merchantSprites.gemPowerMerchant, `${generatedMerchantBase}/gem-power-merchant.webp?v=${generatedMerchantVersion}`);

    // Campfire sprites - grounded bottom-anchor textures for each upgrade tier.
    const campfireBase = "sprites/npc/campfire";
    for (let i = 1; i <= 10; i += 1) {
      const tier = String(i).padStart(2, '0');
      this.load.image(`campfire-tier-${tier}`, `${campfireBase}/generated/campfire-tier-${tier}.png`);
    }
  }

  finishBoot() {
    try {
      this.createAnimations();
      console.log('[BootScene] Animations created successfully');
      this.ensureMenuAudioScene();
      // Start music IMMEDIATELY during BootScene splash — if AudioContext is
      // locked (browser policy), the MenuAudioScene gesture listeners will
      // trigger it on the first keypress/click.
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
        console.log('[BootScene] Logo animation complete, transitioning to MainMenuScene');
        if (this.debugText) {
          this.debugText.setText('BootScene: Transitioning to MainMenu...').setVisible(false);
        }
        this.scene.start("MainMenuScene");
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
    const legacyRuntimeVersion = "legacy-v8-frame-review-20260702";
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
    loadRuntimeSheet(player.flyClimbSheet, "legacy-fly-climb-clean-sheet.webp", player.flyClimbFrames);
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

    // ── Robot spritesheets ─────────────────────────────────────────────────
    // Preload here so textures exist when PlayScene creates animations.
    // ~20MB heap cost at boot rather than mid-game jank.
    const robot = PLAYER_ASSET_PROFILES.robot;
    const robotBase = robot.basePath;
    const robotVersion = robot.version;
    const loadRobotSheet = (sheetKey, fileName, frames) => {
      if (!sheetKey || !frames?.length) return;
      if (this.textures.exists(sheetKey)) return;
      this.load.spritesheet(sheetKey, `${robotBase}/${fileName}?v=${robotVersion}`, {
        frameWidth: 341, frameHeight: 341, endFrame: frames.length - 1,
      });
    };
    loadRobotSheet(robot.idleSheet, "idle-sheet.webp", robot.idleFrames);
    loadRobotSheet(robot.walkStartSheet, "walk-start-sheet.webp", robot.walkStartFrames);
    loadRobotSheet(robot.walkLoopSheet, "walk-loop-sheet.webp", robot.walkLoopFrames);
    loadRobotSheet(robot.walkRunSheet, "walk-run-sheet.webp", robot.walkRunFrames);
    loadRobotSheet(robot.walkStopSheet, "walk-stop-sheet.webp", robot.walkStopFrames);
    loadRobotSheet(robot.airborneSheet, "jump-sheet.webp", robot.airborneFrames);
    loadRobotSheet(robot.fallingSheet, "falling-sheet.webp", robot.fallingFrames);
    loadRobotSheet(robot.duckSheet, "duck-sheet.webp", robot.duckFrames);
    loadRobotSheet(robot.digDownSheet, "dig-down-sheet.webp", robot.digDownFrames);
    loadRobotSheet(robot.digSidewaysSheet, "dig-sideways-sheet.webp", robot.digSidewaysFrames);
    loadRobotSheet(robot.digUpSheet, "dig-up-sheet.webp", robot.digUpFrames);
    loadRobotSheet(robot.digUpSidewaysSheet, "dig-up-sideways-sheet.webp", robot.digUpSidewaysFrames);
    loadRobotSheet(robot.digUpLookSheet, "dig-up-look-sheet.webp", robot.digUpLookFrames);
    loadRobotSheet(robot.wallPushSheet, "wall-push-sheet.webp", robot.wallPushFrames);
    loadRobotSheet(robot.combatIdleRecoverSheet, "combat-idle-recover-sheet.webp", robot.combatIdleRecoverFrames);
    loadRobotSheet(robot.climbSheet, "climb-sheet.webp", robot.climbFrames);
    loadRobotSheet(robot.flySheet, "fly-sheet.webp", robot.flyFrames);
    loadRobotSheet(robot.quickslashSheet, "quickslash-sheet.webp", robot.quickslashFrames);
    loadRobotSheet(robot.thunderStrikeChargeSheet, "thunder-charge-sheet.webp", robot.thunderStrikeChargeFrames);
    loadRobotSheet(robot.thunderStrikeStrikeSheet, "thunder-strike-sheet.webp", robot.thunderStrikeStrikeFrames);
    loadRobotSheet(robot.attackDownSheet, "attack-down-sheet.webp", robot.attackDownFrames);
    loadRobotSheet(robot.earthquakeReactSheet, "earthquake-react-sheet.webp", robot.earthquakeReactFrames);
  }

  preloadTileSprites() {
    const approvedWorldBase = "sprites/tiles/approved-world";
    this.load.image(ASSET_KEYS.tiles.bedrock, `${approvedWorldBase}/bedrock-wall.webp`);
    this.load.image(ASSET_KEYS.tiles.caveWall, `${approvedWorldBase}/cave-wall.webp`);
    this.load.image(ASSET_KEYS.tiles.caveEdge, `${approvedWorldBase}/cave-edge.webp`);
    this.load.image(ASSET_KEYS.tiles.caveCeiling, `${approvedWorldBase}/cave-ceiling.webp`);
    this.load.image(ASSET_KEYS.tiles.caveCeilingChains, `${approvedWorldBase}/cave-ceiling-chains.webp`);
    this.load.image(ASSET_KEYS.tiles.treasureStone, `${approvedWorldBase}/treasure-stone.webp`);
    this.load.image(ASSET_KEYS.tiles.skyIslandTop, `${approvedWorldBase}/sky-island-top.webp`);
    this.load.image(ASSET_KEYS.tiles.chestNormal, `${approvedWorldBase}/chest-normal.webp`);
    this.load.image(ASSET_KEYS.tiles.chestRare, `${approvedWorldBase}/chest-rare.webp`);
    this.load.image(ASSET_KEYS.tiles.townExit, `${approvedWorldBase}/town-exit.webp`);

    const soil = ASSET_KEYS.tiles.dynamicSoil;
    const soilBase = "sprites/tiles/dynamic-soil/";
    const depthBands = ["000-200", "200-400", "400-600", "600-800", "800-1000"];
    soil.bases.forEach((bandKeys, band) => {
      bandKeys.forEach((key, variant) => {
        this.load.image(key, `${soilBase}bases/soil-${depthBands[band]}-v${variant + 1}.webp`);
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
    this.load.image(ASSET_KEYS.tiles.rootOverlay, `${soilBase}overlays/roots-shallow.png`);
    this.load.image(ASSET_KEYS.tiles.rootOverlayDeep, `${soilBase}overlays/roots-deep.png`);
    this.load.image(soil.material.damp, `${soilBase}overlays/material-damp.png`);
    this.load.image(soil.material.ash, `${soilBase}overlays/material-ash.png`);
    this.load.image(soil.material.rubble, `${soilBase}overlays/material-rubble.png`);

    const loadDamageStages = (keys, basePath) => {
      keys.forEach((key, index) => {
        this.load.image(key, `${basePath}/${index + 1}-of-5-hp.webp`);
      });
    };

    loadDamageStages(
      [ASSET_KEYS.tiles.dirtHp1, ASSET_KEYS.tiles.dirtHp2, ASSET_KEYS.tiles.dirtHp3, ASSET_KEYS.tiles.dirtHp4, ASSET_KEYS.tiles.dirtHp5],
      "sprites/tiles/tiles-under-1000/dirt-tiles"
    );

    loadDamageStages(
      [ASSET_KEYS.tiles.stoneHp1, ASSET_KEYS.tiles.stoneHp2, ASSET_KEYS.tiles.stoneHp3, ASSET_KEYS.tiles.stoneHp4, ASSET_KEYS.tiles.stoneHp5],
      "sprites/tiles/tiles-under-1000/resource-stone-tile"
    );

    loadDamageStages(
      [ASSET_KEYS.tiles.copperHp1, ASSET_KEYS.tiles.copperHp2, ASSET_KEYS.tiles.copperHp3, ASSET_KEYS.tiles.copperHp4, ASSET_KEYS.tiles.copperHp5],
      "sprites/tiles/tiles-under-1000/resource-copper-tile"
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

    // Resource tiles
    loadDamageStages(
      [ASSET_KEYS.tiles.bronzeHp1, ASSET_KEYS.tiles.bronzeHp2, ASSET_KEYS.tiles.bronzeHp3, ASSET_KEYS.tiles.bronzeHp4, ASSET_KEYS.tiles.bronzeHp5],
      "sprites/tiles/tiles-under-1000/resource-bronze-tile"
    );
    loadDamageStages(
      [ASSET_KEYS.tiles.steelHp1, ASSET_KEYS.tiles.steelHp2, ASSET_KEYS.tiles.steelHp3, ASSET_KEYS.tiles.steelHp4, ASSET_KEYS.tiles.steelHp5],
      "sprites/tiles/tiles-under-1000/resource-steel-tile"
    );
    loadDamageStages(
      [ASSET_KEYS.tiles.ironHp1, ASSET_KEYS.tiles.ironHp2, ASSET_KEYS.tiles.ironHp3, ASSET_KEYS.tiles.ironHp4, ASSET_KEYS.tiles.ironHp5],
      "sprites/tiles/tiles-under-1000/resource-iron-tile"
    );
    loadDamageStages(
      [ASSET_KEYS.tiles.silverHp1, ASSET_KEYS.tiles.silverHp2, ASSET_KEYS.tiles.silverHp3, ASSET_KEYS.tiles.silverHp4, ASSET_KEYS.tiles.silverHp5],
      "sprites/tiles/tiles-under-1000/resource-silver-tile"
    );
    loadDamageStages(
      [ASSET_KEYS.tiles.goldHp1, ASSET_KEYS.tiles.goldHp2, ASSET_KEYS.tiles.goldHp3, ASSET_KEYS.tiles.goldHp4, ASSET_KEYS.tiles.goldHp5],
      "sprites/tiles/tiles-under-1000/resource-gold-tile"
    );

    // Special tiles
    this.load.image(ASSET_KEYS.tiles.teleportTile, "sprites/tiles/special-tiles-v2/teleport-tile.webp");
    this.load.image(ASSET_KEYS.tiles.gambleTile, "sprites/tiles/special-tiles-v2/gamble-tile.webp");

    // Town floor tiles
    this.load.image(ASSET_KEYS.tiles.floorTown1, "sprites/tiles/base-tiles/floor-town-1.webp");
    this.load.image(ASSET_KEYS.tiles.floorTown2, "sprites/tiles/base-tiles/floor-town-2.webp");

    // Special Blocks - custom textures with glow effects added by renderer
    this.load.image(ASSET_KEYS.tiles.gemPowerBlock, "sprites/tiles/special-tiles-v2/gempower-block.webp");
    this.load.image(ASSET_KEYS.tiles.speedBlock, "sprites/tiles/special-tiles-v2/speed-block.webp");
    this.load.image(ASSET_KEYS.tiles.xpBlock, "sprites/tiles/special-tiles-v2/xp-block.webp");
    this.load.image(ASSET_KEYS.tiles.sellBlock, "sprites/tiles/special-tiles-v2/sell-block.webp");
    this.load.image(ASSET_KEYS.tiles.critBlock, "sprites/tiles/special-tiles-v2/crit-block.webp");
    this.load.image(ASSET_KEYS.tiles.berserkBlock, "sprites/tiles/special-tiles-v2/berserk-block.webp");
    this.load.image(ASSET_KEYS.tiles.comboBlock, "sprites/tiles/special-tiles-v2/combo-block.webp");
    this.load.image(ASSET_KEYS.tiles.legendBlock, "sprites/tiles/special-tiles-v2/crown-block.webp");

    // Sky tile uses bedrock texture as base with graphics overlay effects
    // No separate texture file needed
  }

  preloadFxSprites() {
    this.load.image(ASSET_KEYS.fx.break1, "sprites/tiles/tiles-under-1000/dirt-tiles/breaking-animation/breaking-1.webp");
    this.load.image(ASSET_KEYS.fx.break2, "sprites/tiles/tiles-under-1000/dirt-tiles/breaking-animation/breaking-2.webp");
  }

  preloadUiSprites() {
    this.load.image(ASSET_KEYS.ui.resources.dirt, "sprites/UI/dirt/dirt-icon.webp");
    this.load.image(ASSET_KEYS.ui.resources.stone, "sprites/UI/stone/stone-icon.webp");
    this.load.image(ASSET_KEYS.ui.resources.copper, "sprites/UI/copper/copper-icon.webp");
    this.load.image(ASSET_KEYS.ui.lootBag, "sprites/UI/loot-pickups/inventory-bag.png");
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
  }

  createAnimations() {
    if (this.anims.exists(ASSET_KEYS.player.idleAnim)) {
      return;
    }

    const sheetFrames = (sheetKey, frames) => frames.map((frame) => ({ key: sheetKey, frame }));
    const createSheetAnim = (key, sheetKey, frames, frameRate, repeat = -1) => {
      if (!frames?.length || this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: sheetFrames(sheetKey, frames),
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
      createSheetAnim(ASSET_KEYS.player.combatIdleRecoverAnim, ASSET_KEYS.player.combatIdleRecoverSheet, ASSET_KEYS.player.combatIdleRecoverFrames, ASSET_KEYS.player.combatIdleRecoverAnimationFps, 0);
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
      ASSET_KEYS.player.climbAnim,
      ASSET_KEYS.player.flyClimbSheet,
      ASSET_KEYS.player.climbFrames,
      ASSET_KEYS.player.flyClimbAnimationFps,
      -1
    );
    createSheetAnim(
      ASSET_KEYS.player.flyAnim,
      ASSET_KEYS.player.flyClimbSheet,
      ASSET_KEYS.player.flyFrames,
      ASSET_KEYS.player.flyClimbAnimationFps,
      -1
    );

    if (this.textures.exists(ASSET_KEYS.player.quickslashSheet)) {
      createSheetAnim(ASSET_KEYS.player.quickslashAnim, ASSET_KEYS.player.quickslashSheet, ASSET_KEYS.player.quickslashFrames, 12, 0);
    } else {
      this.anims.create({
        key: ASSET_KEYS.player.quickslashAnim,
        frames: [{ key: "char-v2-quickslash-1" }, { key: "char-v2-quickslash-2" }],
        frameRate: 12,
        repeat: 0,
      });
    }

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

    this.anims.create({
      key: ASSET_KEYS.npcs.boboIdleAnim,
      frames: sheetFrames(ASSET_KEYS.npcs.boboIdleSheet, ASSET_KEYS.npcs.boboIdleFrames),
      frameRate: 5,
      repeat: -1,
    });

    createSheetAnim(
      ASSET_KEYS.shadowMiner.idleAnim,
      ASSET_KEYS.shadowMiner.idleSheet,
      ASSET_KEYS.shadowMiner.idleFrames,
      5,
      -1
    );

    // Shadow Miner run animation (single frame, will loop for floating effect)
    this.anims.create({
      key: ASSET_KEYS.shadowMiner.runAnim,
      frames: sheetFrames(ASSET_KEYS.shadowMiner.sheet, [ASSET_KEYS.shadowMiner.runFrame]),
      frameRate: 8,
      repeat: -1,
    });

    // ── Robot animations are created on-demand in PlaySceneSetup ──────────
  }

  async preloadAudio() {
    let playlistFiles = [];
    try {
      const resp = await fetch('sound/playlists/playlist.json');
      playlistFiles = await resp.json();
    } catch (e) {
      console.warn('[BootScene] playlist.json not found, using fallback tracks');
      playlistFiles = ['j-k-d-amb-1.ogg', 'j-k-d-amb-2.ogg', 'j-k-d-amb-3.ogg'];
    }

    const playlistKeys = playlistFiles.map((file, i) => {
      const key = `music-track-${i + 1}`;
      this.queueAudio(key, `sound/playlists/${file}`);
      return key;
    });
    ASSET_KEYS.audio.music.playlist = playlistKeys;

    // Load random voice line manifest dynamically — add/remove files in manifest.json, no code changes needed
    try {
      const manifestResp = await fetch('sound/voice-lines/player-voice-lines/random-voice-lines/manifest.json');
      ASSET_KEYS.audio.voiceLines.playerRandomFiles = await manifestResp.json();
    } catch (e) {
      console.warn('[BootScene] random-voice-lines manifest.json not found, using fallback');
      ASSET_KEYS.audio.voiceLines.playerRandomFiles = ['randomvoiceline-2.ogg', 'randomvoiceline-4.ogg', 'randomvoiceline-8.ogg'];
    }

    this.loadSoundEffectLibraries();
    this.loadVoiceLineLibraries();
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
  }

  loadVoiceLineLibraries() {
    const playerRandomFiles = ASSET_KEYS.audio.voiceLines.playerRandomFiles;
    const playerRandomBasePath = 'sound/voice-lines/player-voice-lines/random-voice-lines/';
    playerRandomFiles.forEach((file, index) => {
      const key = `player-random-${index}`;
      this.queueAudio(key, playerRandomBasePath + file);
    });

    const voiceDir = (subdir) => `sound/voice-lines/npc-voicelines/${subdir}/`;

    const loadNPC = (category, dir, files) => {
      files.forEach((file, index) => {
        const key = `npc-${category}-${index}`;
        this.queueAudio(key, voiceDir(dir) + file);
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
      this.queueAudio(`npc-playerUpgrades-${index + 3}`, voiceDir('player-upgrade-npc-voicelines') + file);
    });

    // === GEM MERCHANT UPDATE-2 VOICELINES ===
    // 55 new .wav files from gem-merchant-voice-lines/update-2/
    // Keys: npc-gemPowerMerchant-0..54
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
      'update-2/Gem Vision.wav',
      'update-2/Gem Vision(1).wav',
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
    
    // Load gem merchant update-2 files: keys npc-gemPowerMerchant-0..54
    gemMerchantUpdate2Files.forEach((file, index) => {
      this.queueAudio(`npc-gemPowerMerchant-${index}`, voiceDir('gem-merchant-voice-lines') + file);
    });

    loadNPC('boboMerchant', 'bobo-voice-lines',
      ['Bobo2', 'Bobo2(1)', 'Bobo2(2)', 'Bobo2(3)', 'Bobo2(4)', 'Bobo2(5)'].map(fmt));
  }
  
}
