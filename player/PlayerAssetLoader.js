import { PLAYER_ASSET_PROFILES } from "../values/playerAssetProfiles.js";

function highestReferencedFrame(frames) {
  return frames.reduce((highest, frame) => Math.max(highest, Number(frame) || 0), 0);
}

function queueRobotSheet(scene, sheetKey, fileName, frames, robot) {
  if (!sheetKey || !frames?.length || scene.textures.exists(sheetKey)) return false;
  scene.load.spritesheet(sheetKey, `${robot.basePath}/${fileName}?v=${robot.version}`, {
    frameWidth: 341,
    frameHeight: 341,
    endFrame: highestReferencedFrame(frames),
  });
  return true;
}

function queueDrillSheet(scene, sheetKey, fileName, frames, drill) {
  if (!sheetKey || !frames?.length) return false;
  const hasExpectedFrames = scene.textures.exists(sheetKey)
    && frames.every((frame) => scene.textures.getFrame(sheetKey, String(frame)));
  if (hasExpectedFrames) return false;
  if (scene.textures.exists(sheetKey)) scene.textures.remove(sheetKey);
  scene.load.spritesheet(sheetKey, `${drill.basePath}/${fileName}?v=${drill.version}`, {
    frameWidth: drill.frameWidth || 94,
    frameHeight: drill.frameHeight || 94,
    endFrame: highestReferencedFrame(frames),
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

function queueProfileSheet(scene, sheetKey, fileName, frames, profile, sourceBasePath = profile.basePath) {
  if (!sheetKey || !frames?.length) return false;
  if (hasExpectedSheetFrames(scene, sheetKey, frames)) return false;
  if (scene.textures.exists(sheetKey)) scene.textures.remove(sheetKey);
  scene.load.spritesheet(
    sheetKey,
    `${sourceBasePath}/${fileName}?v=${profile.version}`,
    {
      frameWidth: profile.frameWidth,
      frameHeight: profile.frameHeight,
      endFrame: highestReferencedFrame(frames),
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

const ROBOT_SHEETS = Object.freeze([
  ["idleSheet", "idle-sheet.webp", "idleFrames"],
  ["walkStartSheet", "walk-start-sheet.webp", "walkStartFrames"],
  ["walkLoopSheet", "walk-loop-sheet.webp", "walkLoopFrames"],
  ["walkRunSheet", "walk-run-sheet.webp", "walkRunFrames"],
  ["walkStopSheet", "walk-stop-sheet.webp", "walkStopFrames"],
  ["airborneSheet", "jump-sheet.webp", "airborneFrames"],
  ["fallingSheet", "falling-sheet.webp", "fallingFrames"],
  ["duckSheet", "duck-sheet.webp", "duckFrames"],
  ["digDownSheet", "dig-down-sheet.webp", "digDownFrames"],
  ["digSidewaysSheet", "dig-sideways-sheet.webp", "digSidewaysFrames"],
  ["digUpSheet", "dig-up-sheet.webp", "digUpFrames"],
  ["digUpSidewaysSheet", "dig-up-sideways-sheet.webp", "digUpSidewaysFrames"],
  ["digUpLookSheet", "dig-up-look-sheet.webp", "digUpLookFrames"],
  ["wallPushSheet", "wall-push-sheet.webp", "wallPushFrames"],
  ["combatIdleRecoverSheet", "combat-idle-recover-sheet.webp", "combatIdleRecoverFrames"],
  ["climbSheet", "climb-sheet.webp", "climbFrames"],
  ["flySheet", "fly-sheet.webp", "flyFrames"],
  ["quickslashSheet", "quickslash-sheet.webp", "quickslashFrames"],
  ["thunderStrikeChargeSheet", "thunder-charge-sheet.webp", "thunderStrikeChargeFrames"],
  ["thunderStrikeStrikeSheet", "thunder-strike-sheet.webp", "thunderStrikeStrikeFrames"],
  ["attackDownSheet", "attack-down-sheet.webp", "attackDownFrames"],
  ["earthquakeReactSheet", "earthquake-react-sheet.webp", "earthquakeReactFrames"],
]);

export function queueRobotSheets(scene) {
  const robot = PLAYER_ASSET_PROFILES.robot;
  return ROBOT_SHEETS
    .map(([sheet, fileName, frames]) => queueRobotSheet(scene, robot[sheet], fileName, robot[frames], robot))
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

export function hasPlayerProfileSheets(scene, profile) {
  if (!profile?.sheetFiles?.length) return false;
  return profile.sheetFiles.every(([sheet, , frames]) => (
    hasExpectedSheetFrames(scene, profile[sheet], profile[frames])
  ));
}

export function queuePlayerProfileSheets(scene, profile) {
  if (!profile?.sheetFiles?.length) return false;
  const sheetsQueued = profile.sheetFiles
    .map(([sheet, fileName, frames, sourceBasePath]) => (
      queueProfileSheet(scene, profile[sheet], fileName, profile[frames], profile, sourceBasePath)
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
