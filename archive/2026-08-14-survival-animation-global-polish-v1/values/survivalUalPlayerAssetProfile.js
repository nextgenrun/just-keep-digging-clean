import { PLAYER_CHARACTER_IDS } from "./playerCharacters.js";
import { MOVING_SIDE_DIG_ANIMATION } from "./movingSideDigAnimation.js";
import { PLAYER_ANIMATION_POLISH } from "./playerAnimationPolish.js";
import { SURVIVAL_BLENDER_V2_RUNTIME } from "./survivalBlenderV2Runtime.js?rev=20260814-quality-v1";
import { buildSurvivalUalAnimationPolishProfile } from "./survivalUalAnimationPolishProfile.js";
import { buildSurvivalUalMovingSideDigProfile } from "./survivalUalMovingSideDigProfile.js";
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
const digUpSheet = blenderV2.sheets.digUp;
const movingSideDig = buildSurvivalUalMovingSideDigProfile(MOVING_SIDE_DIG_ANIMATION);
const animationPolish = buildSurvivalUalAnimationPolishProfile({
  profile: remappedProfile,
  movingSideDig: MOVING_SIDE_DIG_ANIMATION,
  polish: PLAYER_ANIMATION_POLISH,
  retainedLegacyAnimationKeys: [remappedProfile.digDownAnim],
});
const digUpAnimationKeys = Object.freeze(Array.from(new Set([
  ...remappedProfile.digUpHitAnims,
  ...remappedProfile.digUpSidewaysHitAnims,
])));
const digUpContact = Object.freeze({
  textureFrame: digUpSheet.contactFrame,
  sequenceIndex: digUpSheet.contactSequenceIndex,
  sourceAction: digUpSheet.sourceAction,
  markerGroup: "hands",
});
const digUpContactByAnimation = Object.freeze(Object.fromEntries(
  digUpAnimationKeys.map((key) => [key, digUpContact]),
));
const digUpVariants = Object.freeze(digUpAnimationKeys.map((key) => Object.freeze({
  key,
  sheet: digUpSheet.key,
  frames: blenderV2.frames.digUp,
  frameRate: digUpSheet.frameRate,
  repeat: 0,
})));
const blenderOverrides = Object.freeze({
  idleSheet: Object.freeze({ key: blenderV2.sheets.idle.key, fileName: blenderV2.sheets.idle.fileName }),
  idleTalkSheet: Object.freeze({ key: blenderV2.sheets.idle.key, fileName: blenderV2.sheets.idle.fileName }),
  walkSheet: Object.freeze({ key: blenderV2.sheets.walk.key, fileName: blenderV2.sheets.walk.fileName }),
  flySheet: Object.freeze({
    key: blenderV2.sheets.fly.key,
    fileName: blenderV2.sheets.fly.fileName,
    framesKey: "flySourceFrames",
  }),
  uppercutSheet: Object.freeze({
    key: digUpSheet.key,
    fileName: digUpSheet.fileName,
    framesKey: "digUpFrames",
  }),
});
const sheetFiles = Object.freeze([
  ...remappedProfile.sheetFiles.filter(([profileKey]) => !animationPolish.runPolishEnabled || profileKey !== "walkRunSheet").map(([profileKey, fileName, framesKey]) => {
    const override = blenderOverrides[profileKey];
    return Object.freeze(override
      ? [profileKey, override.fileName, override.framesKey || framesKey, blenderV2.basePath]
      : [profileKey, fileName.replace(UAL_RUNTIME_FILE_PREFIX, `${SURVIVAL_UAL_RUNTIME_PREFIX}-`), framesKey]);
  }),
  ...movingSideDig.actions.map((action) => Object.freeze([
    action.id === MOVING_SIDE_DIG_ANIMATION.actions.jab.id
      ? "movingSideDigJabSheet"
      : "movingSideDigCrossSheet",
    action.fileName,
    action.id === MOVING_SIDE_DIG_ANIMATION.actions.jab.id
      ? "movingSideDigJabFrames"
      : "movingSideDigCrossFrames",
  ])),
  Object.freeze([
    "movingSideDigPhaseHandoffSheet",
    movingSideDig.handoff.atlas.fileName,
    "movingSideDigPhaseHandoffFrames",
  ]),
  ...animationPolish.animationPolishSheetFiles,
]);

const sheetOverrideByOriginalKey = Object.freeze(Object.fromEntries(
  Object.entries(blenderOverrides).map(([profileKey, override]) => [
    remappedProfile[profileKey],
    override,
  ]),
));
const requiredSheets = Object.freeze(Array.from(new Set(
  [
    ...remappedProfile.requiredSheets.map((sheetKey) => (
      sheetOverrideByOriginalKey[sheetKey]?.key || sheetKey
    )),
    ...movingSideDig.actions.map((action) => action.sheetKey),
    movingSideDig.handoff.atlas.sheetKey,
    ...animationPolish.animationPolishRequiredSheets,
  ],
)));

const blenderCoreDisplaySizeByAnimation = Object.freeze({
  [remappedProfile.idleAnim]: groundedVisual.idle.displaySizePx,
  [remappedProfile.idleTalkAnim]: groundedVisual.idle.displaySizePx,
  [remappedProfile.walkAnim]: groundedVisual.walk.displaySizePx,
  [remappedProfile.walkStartAnim]: groundedVisual.walk.displaySizePx,
  [remappedProfile.walkLoopAnim]: groundedVisual.walk.displaySizePx,
  [remappedProfile.walkStopAnim]: groundedVisual.walk.displaySizePx,
  [remappedProfile.walkRunAnim]: remappedProfile.displaySizePxByAnimation[remappedProfile.walkRunAnim],
  ...Object.fromEntries(digUpAnimationKeys.map((key) => [key, digUpSheet.displaySizePx])),
  ...Object.fromEntries(movingSideDig.phaseVariants.map((variant) => [
    variant.animationKey,
    MOVING_SIDE_DIG_ANIMATION.displaySizePx,
  ])),
  ...Object.fromEntries(movingSideDig.quickslashPhaseVariants.map((variant) => [
    variant.animationKey,
    MOVING_SIDE_DIG_ANIMATION.displaySizePx,
  ])),
  ...Object.fromEntries(blenderV2.idleFidgets.map((fidget) => [
    fidget.key,
    groundedVisual.idle.displaySizePx,
  ])),
  ...animationPolish.customDisplaySizes,
});

const blenderCoreOriginBySheet = Object.freeze({
  [blenderV2.sheets.idle.key]: Object.freeze({ x: 0.5, y: groundedVisual.idle.originY }),
  [blenderV2.sheets.idle.idleTalkKey]: Object.freeze({ x: 0.5, y: groundedVisual.idle.originY }),
  [blenderV2.sheets.walk.key]: Object.freeze({ x: 0.5, y: groundedVisual.walk.originY }),
  [remappedProfile.walkRunSheet]: Object.freeze({
    x: remappedProfile.visualOriginX,
    y: remappedProfile.visualOriginY,
  }),
  [digUpSheet.key]: Object.freeze({ x: digUpSheet.originX, y: digUpSheet.originY }),
  ...Object.fromEntries(movingSideDig.actions.map((action) => [action.sheetKey, Object.freeze({
    x: MOVING_SIDE_DIG_ANIMATION.visualOriginX,
    y: MOVING_SIDE_DIG_ANIMATION.visualOriginY,
  })])),
  [movingSideDig.handoff.atlas.sheetKey]: Object.freeze({
    x: MOVING_SIDE_DIG_ANIMATION.visualOriginX,
    y: MOVING_SIDE_DIG_ANIMATION.visualOriginY,
  }),
  ...animationPolish.customOriginBySheet,
});

export const SURVIVAL_UAL_PLAYER_ASSET_PROFILE = Object.freeze({
  ...remappedProfile,
  characterId: PLAYER_CHARACTER_IDS.survivalUal,
  renderPipeline: "survival-blender-v2-piskel-central-animation-polish-v2-superman-prone-v3-quality-v1",
  basePath: "sprites/character/survival-ual-player-v1/runtime",
  version: "survival-blender-v2-approved-quality-v1-20260814",
  visualSkin: blenderV2.visualId,
  coreAnimationPolicy: "Blender idle/flight plus Piskel-owned root-centered Jog, planted handoffs, moving digs, landing, and wall brace",
  walkStartAnim: animationPolish.walkStartAnim,
  walkStopAnim: animationPolish.walkStopAnim,
  landingAnim: animationPolish.landingAnim,
  softLandingAnim: animationPolish.softLandingAnim,
  idleSheet: blenderV2.sheets.idle.key,
  idleTalkSheet: blenderV2.sheets.idle.key,
  walkSheet: blenderV2.sheets.walk.key,
  walkStartSheet: blenderV2.sheets.walk.key,
  walkLoopSheet: blenderV2.sheets.walk.key,
  walkRunSheet: animationPolish.runPolishEnabled
    ? animationPolish.animationPolishRunSheet
    : remappedProfile.walkRunSheet,
  walkStopSheet: blenderV2.sheets.walk.key,
  flySheet: blenderV2.sheets.fly.key,
  flightEnterSheet: blenderV2.sheets.fly.key,
  flightTravelEnterSheet: blenderV2.sheets.fly.key,
  flightTravelLoopSheet: blenderV2.sheets.fly.key,
  flightHoverSheet: blenderV2.sheets.fly.key,
  flightExitSheet: blenderV2.sheets.fly.key,
  digUpSheet: digUpSheet.key,
  digUpSidewaysSheet: digUpSheet.key,
  uppercutSheet: digUpSheet.key,
  movingSideDigJabSheet: MOVING_SIDE_DIG_ANIMATION.actions.jab.sheetKey,
  movingSideDigCrossSheet: MOVING_SIDE_DIG_ANIMATION.actions.cross.sheetKey,
  movingSideDigPhaseHandoffSheet: movingSideDig.handoff.atlas.sheetKey,
  ...animationPolish,
  continuousFlightLoop: true,
  leanAgainstWallSheet: blenderV2.sheets.idle.idleTalkKey,
  combatIdleRecoverSheet: blenderV2.sheets.idle.key,
  combatIdleToNormalIdleSheet: blenderV2.sheets.idle.key,
  idleFrames: blenderV2.frames.idle,
  idleTalkFrames: blenderV2.frames.idle,
  walkFrames: blenderV2.frames.walk,
  walkStartFrames: blenderV2.frames.walkStart,
  walkLoopFrames: blenderV2.frames.walk,
  walkRunFrames: animationPolish.runPolishEnabled
    ? animationPolish.animationPolishRunFrames
    : remappedProfile.walkRunFrames,
  walkStopFrames: blenderV2.frames.walkStop,
  flyFrames: blenderV2.frames.fly,
  flySourceFrames: blenderV2.frames.fly,
  flightEnterFrames: blenderV2.frames.fly,
  flightTravelEnterFrames: blenderV2.frames.fly,
  flightTravelLoopFrames: blenderV2.frames.fly,
  flightHoverFrames: blenderV2.frames.fly,
  flightExitFrames: blenderV2.frames.fly,
  digUpFrames: blenderV2.frames.digUp,
  digUpSidewaysFrames: blenderV2.frames.digUp,
  uppercutFrames: blenderV2.frames.digUp,
  uppercutPlaybackFrames: blenderV2.frames.digUp,
  movingSideDigJabFrames: MOVING_SIDE_DIG_ANIMATION.actions.jab.frames,
  movingSideDigCrossFrames: MOVING_SIDE_DIG_ANIMATION.actions.cross.frames,
  movingSideDigPhaseHandoffFrames: movingSideDig.handoff.atlas.frames,
  idleAnimationFps: 12,
  digUpAnimationFps: digUpSheet.frameRate,
  digUpLookAnimationFps: 30,
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
    run: animationPolish.runPolishEnabled
      ? "UAL Jog_Fwd_Loop + Piskel root-center/baseline polish"
      : "UAL Jog_Fwd_Loop",
    uppercut: "Blender MINER_dig_up + manifest-driven Piskel body-anchor polish",
    digUpPrimary: "Blender MINER_dig_up + manifest-driven Piskel body-anchor polish",
    digUpSecondary: "Blender MINER_dig_up + manifest-driven Piskel body-anchor polish",
    movingSideDigJab: MOVING_SIDE_DIG_ANIMATION.actions.jab.sourceClip,
    movingSideDigCross: MOVING_SIDE_DIG_ANIMATION.actions.cross.sourceClip,
    movingQuickslash: MOVING_SIDE_DIG_ANIMATION.quickslash.sourceClip,
    fly: "Blender DG_SUPERMAN_FLIGHT_IDLE_PRONE_V3 + restrained hover loop",
    flyHover: "Blender DG_SUPERMAN_FLIGHT_IDLE_PRONE_V3 + restrained hover loop",
  }),
  requiredSheets,
  sheetFiles,
  walkAnims: Object.freeze([
    animationPolish.walkStartAnim,
    remappedProfile.walkLoopAnim,
    remappedProfile.walkRunAnim,
    animationPolish.walkStopAnim,
  ]),
  walkMovingAnims: Object.freeze([
    animationPolish.walkStartAnim,
    remappedProfile.walkLoopAnim,
    remappedProfile.walkRunAnim,
  ]),
  locomotionTransitionAnims: Object.freeze(Array.from(new Set([
    ...remappedProfile.locomotionTransitionAnims,
    ...animationPolish.customAnimationKeys,
  ]))),
  digAnimationVariants: Object.freeze([
    ...remappedProfile.digAnimationVariants.filter((variant) => !digUpAnimationKeys.includes(variant.key)),
    ...digUpVariants,
    ...movingSideDig.variants,
    ...movingSideDig.quickslashVariants,
    ...animationPolish.diagonalDigAnimationVariants,
  ]),
  digAnims: Object.freeze(Array.from(new Set([
    ...remappedProfile.digAnims,
    ...movingSideDig.animationKeys,
    ...movingSideDig.quickslashAnimationKeys,
    ...animationPolish.movingDiagonalDigAnimationKeys,
  ]))),
  punchActionAnims: Object.freeze(Array.from(new Set([
    ...remappedProfile.punchActionAnims,
    ...movingSideDig.animationKeys,
    ...movingSideDig.quickslashAnimationKeys,
    ...animationPolish.movingDiagonalDigAnimationKeys,
  ]))),
  movingSideDigConfig: MOVING_SIDE_DIG_ANIMATION,
  movingSideDigAnimationMap: movingSideDig.animationMap,
  movingSideQuickslashAnimationKey: MOVING_SIDE_DIG_ANIMATION.quickslash.animationKey,
  movingSideQuickslashPhaseVariants: movingSideDig.quickslashPhaseVariants,
  movingSideQuickslashAnimationKeys: movingSideDig.quickslashAnimationKeys,
  movingSideQuickslashAnimationKeyByPhaseVariantId:
    movingSideDig.quickslashAnimationKeyByPhaseVariantId,
  actionContactByAnimation: Object.freeze({
    ...(remappedProfile.actionContactByAnimation || {}),
    ...digUpContactByAnimation,
    ...movingSideDig.contactByAnimation,
    ...animationPolish.diagonalDigContactByAnimation,
    ...animationPolish.stationaryContactByAnimation,
    ...animationPolish.verticalDigContactByAnimation,
  }),
  quickslashActionContactByAnimation: Object.freeze({
    ...movingSideDig.quickslashContactByAnimation,
    ...animationPolish.stationaryQuickslashContactByAnimation,
  }),
  idleFidgets: blenderV2.idleFidgets,
  displaySizePxByAnimation: Object.freeze({
    ...remappedProfile.displaySizePxByAnimation,
    ...blenderCoreDisplaySizeByAnimation,
  }),
  visualOriginBySheet: Object.freeze({
    ...(remappedProfile.visualOriginBySheet || {}),
    ...blenderCoreOriginBySheet,
  }),
  lightVisibleCenterBySheet: Object.freeze({
    ...(remappedProfile.lightVisibleCenterBySheet || {}),
    [blenderV2.sheets.fly.key]: blenderV2.sheets.fly.visibleCenterNormalized,
  }),
});
