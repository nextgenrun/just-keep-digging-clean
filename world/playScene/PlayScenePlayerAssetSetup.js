import {
  PLAYER_CHARACTER_IDS,
  normalizePlayerCharacterId,
  resolvePersistedPlayerCharacterId,
} from "../../values/playerCharacters.js?rev=20260718";
import {
  PLAYER_ASSET_PROFILES,
  getPlayerAssetProfile,
} from "../../values/playerAssetProfiles.js?rev=20260718-mesh-grounded";
import {
  awaitLoadComplete,
  hasPlayerProfileSheets,
  queueLivingDrillSheets,
  queuePlayerProfileSheets,
  queueRobotSheets,
} from "../../player/PlayerAssetLoader.js";
import { createUalNativePlayerAnimations } from
  "../../player/UalNativePlayerAnimations.js";
import { sanitizeHardcoreModeData } from "../../values/hardcoreMode.js";

async function loadQueuedAssets(scene, queued, label) {
  if (!queued) return;
  const loadComplete = awaitLoadComplete(scene, {
    forceNextLoad: true,
    onLoadError: file => console.warn(
      `[PlaySceneSetup] ${label} load error:`,
      file?.key || file?.src || file,
    ),
  });
  scene.load.start();
  await loadComplete;
}

function createRobotAnimations(scene) {
  const create = (key, sheetKey, frames, frameRate, repeat = -1) => {
    if (!scene.textures.exists(sheetKey) || !frames?.length || scene.anims.exists(key)) return;
    scene.anims.create({
      key,
      frames: frames.map(frame => (
        Number.isInteger(frame) ? { key: sheetKey, frame } : { key: frame }
      )),
      frameRate,
      repeat,
    });
  };
  const createHits = (keys, sheetKey, groups, frameRate) => {
    keys.forEach((key, index) => create(key, sheetKey, groups[index], frameRate, 0));
  };
  const r = PLAYER_ASSET_PROFILES.robot;
  create(r.idleAnim, r.idleSheet, r.idleFrames, r.idleAnimationFps);
  create(r.walkStartAnim, r.walkStartSheet, r.walkStartFrames, r.walkAnimation.baseFps, 0);
  create(r.walkLoopAnim, r.walkLoopSheet, r.walkLoopFrames, r.walkAnimation.baseFps);
  create(r.walkRunAnim, r.walkRunSheet, r.walkRunFrames, r.walkRunAnimationFps);
  create(r.walkStopAnim, r.walkStopSheet, r.walkStopFrames, r.walkAnimation.baseFps, 0);
  create(r.airborneAnim, r.airborneSheet, r.airborneFrames, r.airborneAnimationFps || 12, 0);
  create(r.fallingAnim, r.fallingSheet, r.fallingFrames, r.fallingAnimationFps);
  create(r.duckAnim, r.duckSheet, r.duckFrames, r.duckAnimationFps || 8, 0);
  create(r.digDownAnim, r.digDownSheet, r.digDownFrames, r.digDownAnimationFps, 0);
  createHits(r.digSidewaysHitAnims, r.digSidewaysSheet, r.digSidewaysHitFrames, r.digSidewaysAnimationFps);
  createHits(r.digUpHitAnims, r.digUpSheet, r.digUpHitFrames, r.digUpAnimationFps);
  createHits(r.digUpSidewaysHitAnims, r.digUpSidewaysSheet, r.digUpSidewaysHitFrames, r.digUpAnimationFps);
  create(r.digUpLookAnim, r.digUpLookSheet, r.digUpLookFrames || [r.digUpLookFrame], 1);
  create(r.wallPushAnim, r.wallPushSheet, r.wallPushFrames, r.wallPushAnimationFps);
  create(r.combatIdleRecoverAnim, r.combatIdleRecoverSheet, r.combatIdleRecoverFrames, r.combatIdleRecoverAnimationFps, 0);
  create(r.flyAnim, r.flySheet, r.flyFrames, r.flightAnimationFps || r.flyAnimationFps || 12);
  create(r.quickslashAnim, r.quickslashSheet, r.quickslashFrames, r.quickslashAnimationFps || 12, 0);
  create(r.thunderStrikeChargeAnim, r.thunderStrikeChargeSheet, r.thunderStrikeChargeFrames, r.thunderStrikeChargeAnimationFps || 6);
  create(r.thunderStrikeStrikeAnim, r.thunderStrikeStrikeSheet, r.thunderStrikeStrikeFrames, r.thunderStrikeStrikeAnimationFps || 12, 0);
  create(r.attackDownAnim, r.attackDownSheet, r.attackDownFrames, 12, 0);
  create(r.earthquakeReactAnim, r.earthquakeReactSheet, r.earthquakeReactFrames, 10, 0);
}

function createLivingDrillAnimations(scene, profile) {
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
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      if (key && !specs.has(key)) specs.set(key, { sheetKey, frames, frameRate, repeat });
    }
  };
  const idleAnimations = [
    profile.idleAnim, profile.walkAnim, profile.walkStartAnim,
    profile.walkLoopAnim, profile.walkRunAnim, profile.walkStopAnim,
    profile.airborneAnim, profile.fallingAnim, profile.duckAnim,
    profile.digUpLookAnim, profile.wallPushAnim, profile.combatIdleRecoverAnim,
    profile.thunderStrikeChargeAnim, profile.earthquakeReactAnim,
  ];
  const digAnimations = [
    profile.digSidewaysAnim, profile.digDownAnim, profile.digUpAnim,
    profile.digUpSidewaysAnim, profile.quickslashAnim,
    profile.thunderStrikeStrikeAnim, profile.attackDownAnim,
    ...(profile.digSidewaysHitAnims || []), ...(profile.digUpHitAnims || []),
    ...(profile.digUpSidewaysHitAnims || []),
  ];
  queue(idleAnimations, profile.idleSheet, profile.idleFrames, profile.idleAnimationFps || 7);
  queue(profile.flyAnim, profile.flySheet || profile.idleSheet,
    profile.flyFrames || profile.idleFrames,
    profile.flyAnimationFps || profile.idleAnimationFps || 7);
  queue(digAnimations, profile.digSheet, profile.digFrames, profile.digAnimationFps || 14, 0);
  for (const [key, spec] of specs) {
    assertSheet(spec.sheetKey, spec.frames);
    if (scene.anims.exists(key)) scene.anims.remove(key);
    scene.anims.create({
      key,
      frames: spec.frames.map(frame => ({ key: spec.sheetKey, frame: String(frame) })),
      frameRate: spec.frameRate,
      repeat: spec.repeat,
    });
  }
}

async function ensureUalNativePlayer(scene, profile, assetOptions) {
  await loadQueuedAssets(
    scene,
    queuePlayerProfileSheets(scene, profile, assetOptions),
    "UAL native sheet",
  );
  if (!hasPlayerProfileSheets(scene, profile, assetOptions)) {
    throw new Error("UAL native production sheets failed to load; no substitute character path is allowed");
  }
  createUalNativePlayerAnimations(scene, profile);
  scene.config = Object.freeze({
    ...scene.config,
    playerBodyWidthPx: profile.playerBodyWidthPx,
    playerBodyHeightPx: profile.playerBodyHeightPx,
    playerDisplaySizePx: profile.displaySizePx,
    playerVisualOriginCenter: false,
  });
}

export async function preparePlayScenePlayerAssets(scene, data, cachedSave) {
  const assetOptions = { upgradeLevels: cachedSave?.upgrades?.upgradeLevels || {} };
  scene.hardcoreModeData = sanitizeHardcoreModeData(
    cachedSave?.hardcoreModeData ?? data.hardcoreModeData,
  );
  const cachedId = resolvePersistedPlayerCharacterId(cachedSave?.playerCharacterId);
  scene.playerCharacterId = normalizePlayerCharacterId(data.playerCharacterId ?? cachedId);
  scene.playerAssetProfile = getPlayerAssetProfile(scene.playerCharacterId);

  if (scene.playerAssetProfile.isUalNative) {
    await ensureUalNativePlayer(scene, scene.playerAssetProfile, assetOptions);
  } else if (scene.playerAssetProfile.isLivingDrill) {
    scene.config = Object.freeze({
      ...scene.config,
      playerBodyWidthPx: scene.config.tileSize,
      playerBodyHeightPx: scene.config.tileSize,
      playerDisplaySizePx: scene.config.tileSize,
      playerVisualOriginCenter: true,
    });
    await loadQueuedAssets(scene, queueLivingDrillSheets(scene), "character sheet");
    createLivingDrillAnimations(scene, scene.playerAssetProfile);
  } else if (scene.playerCharacterId === PLAYER_CHARACTER_IDS.robot) {
    if (!scene.textures.exists(PLAYER_ASSET_PROFILES.robot.idleSheet)) {
      await loadQueuedAssets(scene, queueRobotSheets(scene, assetOptions), "Robot sheet");
    } else if (scene.load.isLoading()) {
      await awaitLoadComplete(scene);
    }
    if (scene.textures.exists(PLAYER_ASSET_PROFILES.robot.idleSheet)) {
      createRobotAnimations(scene);
    } else {
      scene.playerCharacterId = PLAYER_CHARACTER_IDS.ualNative;
      scene.playerAssetProfile = getPlayerAssetProfile(scene.playerCharacterId);
      await ensureUalNativePlayer(scene, scene.playerAssetProfile, assetOptions);
    }
  }
}
