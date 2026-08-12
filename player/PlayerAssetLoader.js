import { PLAYER_ASSET_PROFILES } from "../values/playerAssetProfiles.js";
import {
  RUNTIME_ASSET_LOADING,
  RUNTIME_ASSET_RESIDENCY_CLASSES,
} from "../values/runtimeAssetLoading.js";
import {
  PLAYER_ABILITY_ASSET_IDS,
  PLAYER_ABILITY_ASSET_PACKS,
  getUniquePlayerSheetEntries,
  highestReferencedPlayerFrame,
  isPlayerAbilityUnlocked,
} from "./PlayerAssetSheetCatalog.js";

export { PLAYER_ABILITY_ASSET_IDS };

function registerPlayerAsset(scene, key, path, profile, abilityId = null, deferredId = null) {
  const catalog = scene.registry?.get?.("runtimeAssetCatalog");
  if (!catalog) return true;
  const ability = PLAYER_ABILITY_ASSET_PACKS[abilityId];
  return Boolean(catalog.registerQueuedAsset({ key, path }, {
    owner: ability?.owner || (deferredId
      ? RUNTIME_ASSET_LOADING.owners.playerMode
      : RUNTIME_ASSET_LOADING.owners.playerCore),
    priority: ability
      ? RUNTIME_ASSET_LOADING.priorities.abilityUnlock
      : deferredId
        ? RUNTIME_ASSET_LOADING.priorities.playerMode
      : RUNTIME_ASSET_LOADING.priorities.playerCore,
    residencyClass: ability
      ? RUNTIME_ASSET_RESIDENCY_CLASSES.unlock
      : deferredId
        ? RUNTIME_ASSET_RESIDENCY_CLASSES.onDemand
      : RUNTIME_ASSET_RESIDENCY_CLASSES.core,
    packId: ability
      ? `ability:${abilityId}:${profile?.characterId || "unknown"}`
      : deferredId
        ? `player-action:${deferredId}:${profile?.characterId || "unknown"}`
      : `player-core:${profile?.characterId || "unknown"}`,
    consumers: [abilityId || deferredId || "selected-player"],
    managed: Boolean(ability || deferredId),
  }));
}

function queueRobotSheet(scene, sheetKey, fileName, frames, robot, abilityId = null) {
  if (!sheetKey || !frames?.length || scene.textures.exists(sheetKey)) return false;
  const path = `${robot.basePath}/${fileName}?v=${robot.version}`;
  if (!registerPlayerAsset(scene, sheetKey, path, robot, abilityId)) return false;
  scene.load.spritesheet(sheetKey, path, {
    frameWidth: 341,
    frameHeight: 341,
    endFrame: highestReferencedPlayerFrame(frames),
  });
  return true;
}

function queueDrillSheet(scene, sheetKey, fileName, frames, drill) {
  if (!sheetKey || !frames?.length) return false;
  const hasExpectedFrames = scene.textures.exists(sheetKey)
    && frames.every((frame) => scene.textures.getFrame(sheetKey, String(frame)));
  if (hasExpectedFrames) return false;
  if (scene.textures.exists(sheetKey)) scene.textures.remove(sheetKey);
  const path = `${drill.basePath}/${fileName}?v=${drill.version}`;
  if (!registerPlayerAsset(scene, sheetKey, path, drill)) return false;
  scene.load.spritesheet(sheetKey, path, {
    frameWidth: drill.frameWidth || 94,
    frameHeight: drill.frameHeight || 94,
    endFrame: highestReferencedPlayerFrame(frames),
  });
  return true;
}

function hasExpectedSheetFrames(scene, sheetKey, frames) {
  return Boolean(
    sheetKey
    && frames?.length
    && scene.textures.exists(sheetKey)
    && frames.every((frame) => scene.textures.getFrame(sheetKey, String(frame))),
  );
}

function queueProfileSheet(
  scene,
  sheetKey,
  fileName,
  frames,
  profile,
  sourceBasePath = profile.basePath,
  abilityId = null,
) {
  if (!sheetKey || !frames?.length) return false;
  if (hasExpectedSheetFrames(scene, sheetKey, frames)) return false;
  if (scene.textures.exists(sheetKey)) scene.textures.remove(sheetKey);
  const path = `${sourceBasePath}/${fileName}?v=${profile.version}`;
  if (!registerPlayerAsset(scene, sheetKey, path, profile, abilityId)) return false;
  scene.load.spritesheet(
    sheetKey,
    path,
    {
      frameWidth: profile.frameWidth,
      frameHeight: profile.frameHeight,
      endFrame: highestReferencedPlayerFrame(frames),
    },
  );
  return true;
}

export function hasPlayerRigManifest(scene, profile) {
  const key = profile?.rigManifestKey;
  if (!key) return true;
  const jsonCache = scene?.cache?.json;
  if (typeof jsonCache?.exists === "function") return jsonCache.exists(key);
  return typeof jsonCache?.get === "function" && Boolean(jsonCache.get(key));
}

export function queuePlayerRigManifest(scene, profile) {
  if (!profile?.rigManifestKey || !profile?.rigManifestFile) return false;
  if (hasPlayerRigManifest(scene, profile) || typeof scene?.load?.json !== "function") return false;
  scene.load.json(
    profile.rigManifestKey,
    `${profile.basePath}/${profile.rigManifestFile}?v=${profile.version}`,
  );
  return true;
}

export function getPlayerAbilityAssetPack(profile, abilityId) {
  const ability = PLAYER_ABILITY_ASSET_PACKS[abilityId];
  if (!ability) return Object.freeze([]);
  return Object.freeze(getUniquePlayerSheetEntries(profile)
    .filter(entry => entry.abilityId === abilityId)
    .map(entry => Object.freeze({
      key: entry.key,
      path: entry.path,
      type: RUNTIME_ASSET_LOADING.types.spritesheet,
      frameConfig: entry.frameConfig,
    })));
}

export function getPlayerDeferredAssetPack(profile, deferredId) {
  return Object.freeze(getUniquePlayerSheetEntries(profile)
    .filter(entry => entry.deferredIds.includes(deferredId))
    .map(entry => Object.freeze({
      key: entry.key, path: entry.path,
      type: RUNTIME_ASSET_LOADING.types.spritesheet,
      frameConfig: entry.frameConfig,
    })));
}

export function queueRobotSheets(scene, { upgradeLevels = {} } = {}) {
  const robot = PLAYER_ASSET_PROFILES.robot;
  return getUniquePlayerSheetEntries(robot)
    .filter(entry => isPlayerAbilityUnlocked(entry.abilityId, upgradeLevels))
    .map(entry => queueRobotSheet(
      scene,
      entry.key,
      entry.fileName,
      entry.frames,
      robot,
      entry.abilityId,
    ))
    .some(Boolean);
}

export function queueLivingDrillSheets(scene) {
  const drill = PLAYER_ASSET_PROFILES.drillHead;
  return [
    ["idleSheet", "living-drill-idle-sheet.png", "idleFrames"],
    ["digSheet", "living-drill-dig-sheet.png", "digFrames"],
    ["flySheet", "living-drill-fly-sheet.png", "flyFrames"],
  ].map(([sheet, fileName, frames]) => queueDrillSheet(scene, drill[sheet], fileName, drill[frames], drill))
    .some(Boolean);
}

export function hasPlayerProfileSheets(scene, profile, { upgradeLevels = {} } = {}) {
  if (!profile?.sheetFiles?.length) return false;
  return getUniquePlayerSheetEntries(profile)
    .filter(entry => entry.deferredIds.length === 0)
    .filter(entry => isPlayerAbilityUnlocked(entry.abilityId, upgradeLevels))
    .every(entry => hasExpectedSheetFrames(scene, entry.key, entry.frames));
}

export function queuePlayerProfileSheets(scene, profile, { upgradeLevels = {} } = {}) {
  if (!profile?.sheetFiles?.length) return false;
  const sheetsQueued = getUniquePlayerSheetEntries(profile)
    .filter(entry => entry.deferredIds.length === 0)
    .filter(entry => isPlayerAbilityUnlocked(entry.abilityId, upgradeLevels))
    .map(entry => (
      queueProfileSheet(
        scene,
        entry.key,
        entry.fileName,
        entry.frames,
        profile,
        entry.sourceBasePath,
        entry.abilityId,
      )
    ))
    .some(Boolean);
  return queuePlayerRigManifest(scene, profile) || sheetsQueued;
}

export function awaitLoadComplete(scene, { forceNextLoad = false, onLoadError = null } = {}) {
  if (!forceNextLoad && !scene.load.isLoading()) return Promise.resolve();
  return new Promise((resolve) => {
    scene.load.once("complete", resolve);
    if (typeof onLoadError === "function") scene.load.once("loaderror", onLoadError);
  });
}
