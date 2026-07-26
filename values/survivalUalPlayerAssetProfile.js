import { PLAYER_CHARACTER_IDS } from "./playerCharacters.js";
import { SURVIVAL_BLENDER_V2_RUNTIME } from "./survivalBlenderV2Runtime.js?rev=20260726-superman-prone-v3";
import { UAL_NATIVE_PLAYER_ASSET_PROFILE } from "./ualNativePlayerAssetProfile.js";

const UAL_RUNTIME_KEY_PREFIX = "ual-native-v1";
const UAL_RUNTIME_FILE_PREFIX = "ual-native-player-v1-";
const SURVIVAL_UAL_RUNTIME_PREFIX = "survival-ual-player-v1";

const remapUalRuntimeString = (value) => value
  .split(UAL_RUNTIME_KEY_PREFIX)
  .join(SURVIVAL_UAL_RUNTIME_PREFIX);

function remapUalRuntimeValue(value) {
  if (typeof value === "string") return remapUalRuntimeString(value);
  if (Array.isArray(value)) return Object.freeze(value.map(remapUalRuntimeValue));
  if (!value || typeof value !== "object") return value;
  return Object.freeze(Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      remapUalRuntimeString(key),
      remapUalRuntimeValue(nestedValue),
    ]),
  ));
}

const remappedProfile = remapUalRuntimeValue(UAL_NATIVE_PLAYER_ASSET_PROFILE);
const blenderV2 = SURVIVAL_BLENDER_V2_RUNTIME;
const groundedVisual = blenderV2.groundedVisualCalibration;
const blenderOverrides = Object.freeze({
  idleSheet: Object.freeze({ key: blenderV2.sheets.idle.key, fileName: blenderV2.sheets.idle.fileName }),
  idleTalkSheet: Object.freeze({ key: blenderV2.sheets.idle.idleTalkKey, fileName: blenderV2.sheets.idle.fileName }),
  walkSheet: Object.freeze({ key: blenderV2.sheets.walk.key, fileName: blenderV2.sheets.walk.fileName }),
  flySheet: Object.freeze({
    key: blenderV2.sheets.fly.key,
    fileName: blenderV2.sheets.fly.fileName,
    framesKey: "flySourceFrames",
  }),
});

const sheetFiles = Object.freeze(remappedProfile.sheetFiles.map(([profileKey, fileName, framesKey]) => {
  const override = blenderOverrides[profileKey];
  return Object.freeze(override
    ? [profileKey, override.fileName, override.framesKey || framesKey, blenderV2.basePath]
    : [profileKey, fileName.replace(UAL_RUNTIME_FILE_PREFIX, `${SURVIVAL_UAL_RUNTIME_PREFIX}-`), framesKey]);
}));

const requiredSheets = Object.freeze(remappedProfile.requiredSheets.map((sheetKey) => {
  const profileKey = Object.entries(remappedProfile).find(([, value]) => value === sheetKey)?.[0];
  return blenderOverrides[profileKey]?.key || sheetKey;
}));

const blenderCoreDisplaySizeByAnimation = Object.freeze({
  [remappedProfile.idleAnim]: groundedVisual.idle.displaySizePx,
  [remappedProfile.idleTalkAnim]: groundedVisual.idle.displaySizePx,
  [remappedProfile.walkAnim]: groundedVisual.walk.displaySizePx,
  [remappedProfile.walkStartAnim]: groundedVisual.walk.displaySizePx,
  [remappedProfile.walkLoopAnim]: groundedVisual.walk.displaySizePx,
  [remappedProfile.walkStopAnim]: groundedVisual.walk.displaySizePx,
  [remappedProfile.walkRunAnim]: remappedProfile.displaySizePxByAnimation[remappedProfile.walkRunAnim],
  ...Object.fromEntries(blenderV2.idleFidgets.map((fidget) => [
    fidget.key,
    groundedVisual.idle.displaySizePx,
  ])),
});

const blenderCoreOriginBySheet = Object.freeze({
  [blenderV2.sheets.idle.key]: Object.freeze({ x: 0.5, y: groundedVisual.idle.originY }),
  [blenderV2.sheets.idle.idleTalkKey]: Object.freeze({ x: 0.5, y: groundedVisual.idle.originY }),
  [blenderV2.sheets.walk.key]: Object.freeze({ x: 0.5, y: groundedVisual.walk.originY }),
  [remappedProfile.walkRunSheet]: Object.freeze({
    x: remappedProfile.visualOriginX,
    y: remappedProfile.visualOriginY,
  }),
});

export const SURVIVAL_UAL_PLAYER_ASSET_PROFILE = Object.freeze({
  ...remappedProfile,
  characterId: PLAYER_CHARACTER_IDS.survivalUal,
  renderPipeline: "survival-blender-v2-superman-prone-v3-flight-ual-jog-four-hit-jab-cross-v1",
  basePath: "sprites/character/survival-ual-player-v1/runtime",
  version: "survival-blender-v2-superman-prone-v3-flight-ual-four-hit-jab-cross-20260726",
  visualSkin: blenderV2.visualId,
  coreAnimationPolicy: "blender-v2-idle-walk-superman-prone-v3-flight; ual-jog-jab-cross-jab-cross-ground-strike-actions-v1",
  idleSheet: blenderV2.sheets.idle.key,
  idleTalkSheet: blenderV2.sheets.idle.idleTalkKey,
  walkSheet: blenderV2.sheets.walk.key,
  walkStartSheet: blenderV2.sheets.walk.key,
  walkLoopSheet: blenderV2.sheets.walk.key,
  walkRunSheet: remappedProfile.walkRunSheet,
  walkStopSheet: blenderV2.sheets.walk.key,
  flySheet: blenderV2.sheets.fly.key,
  flyClimbSheet: blenderV2.sheets.fly.key,
  flightEnterSheet: blenderV2.sheets.fly.key,
  flightTravelEnterSheet: blenderV2.sheets.fly.key,
  flightTravelLoopSheet: blenderV2.sheets.fly.key,
  flightHoverSheet: blenderV2.sheets.fly.key,
  flightExitSheet: blenderV2.sheets.fly.key,
  continuousFlightLoop: true,
  leanAgainstWallSheet: blenderV2.sheets.idle.idleTalkKey,
  combatIdleRecoverSheet: blenderV2.sheets.idle.key,
  combatIdleToNormalIdleSheet: blenderV2.sheets.idle.key,
  idleFrames: blenderV2.frames.idle,
  idleTalkFrames: blenderV2.frames.idle,
  walkFrames: blenderV2.frames.walk,
  walkStartFrames: blenderV2.frames.walkStart,
  walkLoopFrames: blenderV2.frames.walk,
  walkRunFrames: remappedProfile.walkRunFrames,
  walkStopFrames: blenderV2.frames.walkStop,
  flyFrames: blenderV2.frames.fly,
  flySourceFrames: blenderV2.frames.fly,
  flyClimbFrames: blenderV2.frames.fly,
  flightEnterFrames: blenderV2.frames.fly,
  flightTravelEnterFrames: blenderV2.frames.fly,
  flightTravelLoopFrames: blenderV2.frames.fly,
  flightHoverFrames: blenderV2.frames.fly,
  flightExitFrames: blenderV2.frames.fly,
  idleAnimationFps: 12,
  digUpLookAnimationFps: 30,
  flyClimbAnimationFps: 16,
  flyAnimationFps: 16,
  flightEnterAnimationFps: 16,
  flightTravelEnterAnimationFps: 16,
  flightTravelLoopAnimationFps: 16,
  flightHoverAnimationFps: 16,
  flightExitAnimationFps: 16,
  leanAgainstWallFrames: blenderV2.frames.idle,
  combatIdleRecoverFrames: blenderV2.frames.idle,
  combatIdleToNormalIdleFrames: blenderV2.frames.idle,
  combatIdleRecoverAnim: remappedProfile.idleAnim,
  combatIdleToNormalIdleAnim: remappedProfile.idleAnim,
  sourceClips: Object.freeze({
    ...remappedProfile.sourceClips,
    idle: "Blender MINER_idle",
    idleTalk: "Blender MINER_idle",
    walk: "Blender MINER_walk",
    run: "UAL Jog_Fwd_Loop",
    fly: "Blender DG_SUPERMAN_FLIGHT_IDLE_PRONE_V3 + restrained hover loop",
    flyHover: "Blender DG_SUPERMAN_FLIGHT_IDLE_PRONE_V3 + restrained hover loop",
  }),
  requiredSheets,
  sheetFiles,
  idleFidgets: blenderV2.idleFidgets,
  displaySizePxByAnimation: Object.freeze({
    ...remappedProfile.displaySizePxByAnimation,
    ...blenderCoreDisplaySizeByAnimation,
  }),
  visualOriginBySheet: Object.freeze({
    ...(remappedProfile.visualOriginBySheet || {}),
    ...blenderCoreOriginBySheet,
  }),
});
