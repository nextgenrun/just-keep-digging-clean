import { PLAYER_CHARACTER_IDS } from "./playerCharacters.js";
import { MOVING_COMPLEX_DIG_ANIMATION } from "./movingComplexDigAnimation.js";
import { MOVING_COMPLEX_DIG_ANIMATION_UNIFIED_V1 } from
  "./movingComplexDigAnimationUnifiedV1.js";
import { MOVING_SIDE_DIG_ANIMATION } from "./movingSideDigAnimation.js";
import { PLAYER_ANIMATION_POLISH } from "./playerAnimationPolish.js";
import { MIXAMO_ACCEPTED_PLAYER_ANIMATIONS } from "./mixamoAcceptedPlayerAnimations.js?rev=20260819-hurricane-quickslash-v2";
import { SURVIVAL_BLENDER_V2_RUNTIME } from "./survivalBlenderV2Runtime.js?rev=20260815-animation-contract-repair-v2";
import { COMPLEX_DIG_ANIMATIONS } from "./complexDigAnimations.js";
import { MIXAMO_LEDGE_ASSIST_ANIMATION } from "./mixamoLedgeAssistAnimation.js";
import { resolvePlayerLedgeAssistEnabled } from "./playerTraversal.js";
import { SURVIVAL_COMPLEX_DIG_PROFILE } from "./survivalComplexDigProfile.js";
import { buildSurvivalUalAnimationPolishProfile } from "./survivalUalAnimationPolishProfile.js";
import { buildSurvivalUalMovingSideDigProfile } from "./survivalUalMovingSideDigProfile.js";
import { UAL_NATIVE_PLAYER_ASSET_PROFILE } from "./ualNativePlayerAssetProfile.js";
import {
  applySurvivalUnifiedAnimationRuntimeV1,
  resolveSurvivalUnifiedAnimationEnabled,
} from "./survivalUnifiedAnimationRuntimeV1.js";

const UAL_RUNTIME_KEY_PREFIX = "ual-native-v1";
const UAL_RUNTIME_FILE_PREFIX = "ual-native-player-v1-";
const SURVIVAL_UAL_RUNTIME_PREFIX = "survival-ual-player-v1";
const unifiedAnimationEnabled = resolveSurvivalUnifiedAnimationEnabled();
// Marker-derived travel across both planted steps of the approved 28-frame
// Jog loop. This is profile-local so alternate characters retain their own
// reviewed cadence.
const SURVIVAL_RUN_STRIDE_TILES_PER_CYCLE = 1.12;
// The two-frame Piskel bridges have different source alpha envelopes from the
// 256px Blender sheets. These measured cell sizes keep idle/start/run/stop at
// one ~75.3px visible height without resampling or changing their motion.
const GROUND_HANDOFF_DISPLAY_SIZE_PX = Object.freeze({ start: 119, stop: 123 });

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
const mixamo = MIXAMO_ACCEPTED_PLAYER_ANIMATIONS;
const mixamoSheets = mixamo.sheets;
const mixamoAnimations = mixamo.animations;
const complexDig = SURVIVAL_COMPLEX_DIG_PROFILE;
const ledgeAssist = MIXAMO_LEDGE_ASSIST_ANIMATION;
const ledgeAssistEnabled = resolvePlayerLedgeAssistEnabled();
const groundedVisual = blenderV2.groundedVisualCalibration;
const digUpSheet = blenderV2.sheets.digUp;
const movingSideDig = buildSurvivalUalMovingSideDigProfile(MOVING_SIDE_DIG_ANIMATION);
const movingComplexDig = unifiedAnimationEnabled
  ? MOVING_COMPLEX_DIG_ANIMATION_UNIFIED_V1
  : MOVING_COMPLEX_DIG_ANIMATION;
const movingComplexAliases = movingComplexDig.aliases;
const movingComplexAnimationKeys = Object.freeze(
  movingComplexAliases.map((alias) => alias.animationKey),
);
const movingComplexDigVariants = Object.freeze(movingComplexAliases.map((alias) => Object.freeze({
  key: alias.animationKey,
  sheet: movingComplexDig.sheet.key,
  frames: alias.frames,
  frameRate: MOVING_SIDE_DIG_ANIMATION.frameRate,
  repeat: 0,
})));
const movingComplexContactByAnimation = Object.freeze(Object.fromEntries(
  movingComplexAliases.map((alias) => [alias.animationKey, alias.contact]),
));
const movingComplexDigAnimationMap = Object.freeze({
  ...movingSideDig.animationMap,
  ...movingComplexDig.defaultAnimationKeyByBaseAnimation,
});
const animationPolish = buildSurvivalUalAnimationPolishProfile({
  profile: remappedProfile,
  movingSideDig: MOVING_SIDE_DIG_ANIMATION,
  polish: PLAYER_ANIMATION_POLISH,
  retainedLegacyAnimationKeys: [remappedProfile.digDownAnim],
});
// Keep the phase-authored two-frame Piskel bridges as the runtime handoff.
// Replacing every outgoing Jog phase with one generic Mixamo stop made the
// apparent body scale and planted foot jump according to the interrupted frame.
const acceptedAnimationPolishConfig = animationPolish.animationPolishConfig;
const complexDigActionRecovery = Object.freeze({
  [COMPLEX_DIG_ANIMATIONS.clips.cross.animationKey]: PLAYER_ANIMATION_POLISH.actionRecovery.families.cross.key,
  [COMPLEX_DIG_ANIMATIONS.clips.jab.animationKey]: PLAYER_ANIMATION_POLISH.actionRecovery.families.jab.key,
  [COMPLEX_DIG_ANIMATIONS.clips.roundhouse.animationKey]: PLAYER_ANIMATION_POLISH.actionRecovery.families.cross.key,
  [COMPLEX_DIG_ANIMATIONS.clips.jabElbow.animationKey]: PLAYER_ANIMATION_POLISH.actionRecovery.families.jab.key,
  [COMPLEX_DIG_ANIMATIONS.clips.lowKick.animationKey]: PLAYER_ANIMATION_POLISH.actionRecovery.families.jab.key,
  [COMPLEX_DIG_ANIMATIONS.clips.highKick.animationKey]: PLAYER_ANIMATION_POLISH.actionRecovery.families.cross.key,
  [COMPLEX_DIG_ANIMATIONS.clips.spinningBackKick.animationKey]: PLAYER_ANIMATION_POLISH.actionRecovery.families.cross.key,
  [COMPLEX_DIG_ANIMATIONS.clips.elbowUppercut.animationKey]: PLAYER_ANIMATION_POLISH.actionRecovery.families.up.key,
  [COMPLEX_DIG_ANIMATIONS.clips.singleElbow.animationKey]: PLAYER_ANIMATION_POLISH.actionRecovery.families.jab.key,
  [COMPLEX_DIG_ANIMATIONS.clips.hook.animationKey]: PLAYER_ANIMATION_POLISH.actionRecovery.families.cross.key,
  [COMPLEX_DIG_ANIMATIONS.clips.uppercut.animationKey]: PLAYER_ANIMATION_POLISH.actionRecovery.families.up.key,
});
const movingComplexActionRecovery = Object.freeze(Object.fromEntries(
  movingComplexAliases.map((alias) => [
    alias.animationKey,
    complexDigActionRecovery[alias.baseAnimationKey],
  ]),
));
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
  ...remappedProfile.sheetFiles.filter(([profileKey]) => (
    profileKey !== "duckSheet"
    && profileKey !== "landingSheet"
    && profileKey !== "quickslashSheet"
    && (!animationPolish.runPolishEnabled || profileKey !== "walkRunSheet")
  )).map(([profileKey, fileName, framesKey]) => {
    const override = blenderOverrides[profileKey];
    const runtimeProperty = profileKey === "flySheet"
      ? "legacyFlightTransitionSheet"
      : profileKey;
    const runtimeFramesKey = profileKey === "flySheet"
      ? "legacyFlightTransitionFrames"
      : (override?.framesKey || framesKey);
    return Object.freeze(override
      ? [runtimeProperty, override.fileName, runtimeFramesKey, blenderV2.basePath]
      : [runtimeProperty, fileName.replace(UAL_RUNTIME_FILE_PREFIX, `${SURVIVAL_UAL_RUNTIME_PREFIX}-`), runtimeFramesKey]);
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
  Object.freeze([
    "movingComplexDigSheet",
    movingComplexDig.sheet.fileName,
    "movingComplexDigFrames",
    movingComplexDig.basePath,
  ]),
  ...animationPolish.animationPolishSheetFiles,
  ...Object.freeze([
    ["walkStartSheet", mixamoSheets.walkStart.fileName, "walkStartFrames", mixamo.basePath],
    ["walkStopSheet", mixamoSheets.walkStop.fileName, "walkStopFrames", mixamo.basePath],
    ["mixamoIdleFidgetSheet", mixamoSheets.idleFidget.fileName, "mixamoIdleFidgetFrames", mixamo.basePath],
    ["duckSheet", mixamoSheets.crouch.fileName, "duckFrames", mixamo.basePath],
    ["crouchEnterSheet", mixamoSheets.crouchEnter.fileName, "crouchEnterFrames", mixamo.basePath],
    ["crouchExitSheet", mixamoSheets.crouchExit.fileName, "crouchExitFrames", mixamo.basePath],
    ["flySheet", mixamoSheets.flight.fileName, "flyFrames", mixamo.basePath],
    ["landingSheet", mixamoSheets.hardLanding.fileName, "landingSourceFrames", mixamo.basePath],
    ["thunderStrikeStrikeSheet", mixamoSheets.thunderStrike.fileName, "thunderStrikeStrikeFrames", mixamo.basePath],
    ["quickslashSheet", mixamoSheets.quickslash.fileName, "quickslashFrames", mixamo.basePath],
  ].map(Object.freeze)),
  ...complexDig.sheetFiles,
  ...(ledgeAssistEnabled ? [Object.freeze([
    "ledgeClimbSheet",
    ledgeAssist.sheet.fileName,
    "ledgeClimbFrames",
    ledgeAssist.basePath,
  ])] : []),
]);

const sheetOverrideByOriginalKey = Object.freeze(Object.fromEntries(
  Object.entries(blenderOverrides).map(([profileKey, override]) => [
    remappedProfile[profileKey],
    override,
  ]),
));
const requiredSheets = Object.freeze(Array.from(new Set(
  [
    ...remappedProfile.requiredSheets.filter((sheetKey) => (
      sheetKey !== remappedProfile.duckSheet
      && sheetKey !== remappedProfile.landingSheet
      && (!animationPolish.runPolishEnabled || sheetKey !== remappedProfile.walkRunSheet)
    )).map((sheetKey) => (
      sheetOverrideByOriginalKey[sheetKey]?.key || sheetKey
    )),
    ...movingSideDig.actions.map((action) => action.sheetKey),
    movingSideDig.handoff.atlas.sheetKey,
    movingComplexDig.sheet.key,
    ...animationPolish.animationPolishRequiredSheets,
    ...Object.values(mixamoSheets).map((sheetSpec) => sheetSpec.key),
    ...complexDig.requiredSheets,
    ...(ledgeAssistEnabled ? [ledgeAssist.sheet.key] : []),
  ],
)));

const blenderCoreDisplaySizeByAnimation = Object.freeze({
  [remappedProfile.idleAnim]: groundedVisual.idle.displaySizePx,
  [remappedProfile.idleTalkAnim]: groundedVisual.idle.displaySizePx,
  [remappedProfile.walkAnim]: groundedVisual.walk.displaySizePx,
  [remappedProfile.walkStartAnim]: groundedVisual.walk.displaySizePx,
  [remappedProfile.walkLoopAnim]: groundedVisual.walk.displaySizePx,
  [remappedProfile.walkStopAnim]: groundedVisual.walk.displaySizePx,
  [remappedProfile.walkRunAnim]: groundedVisual.run.displaySizePx,
  ...Object.fromEntries(digUpAnimationKeys.map((key) => [key, digUpSheet.displaySizePx])),
  ...Object.fromEntries(movingSideDig.phaseVariants.map((variant) => [
    variant.animationKey,
    MOVING_SIDE_DIG_ANIMATION.displaySizePx,
  ])),
  ...Object.fromEntries(movingSideDig.quickslashPhaseVariants.map((variant) => [
    variant.animationKey,
    MOVING_SIDE_DIG_ANIMATION.displaySizePx,
  ])),
  ...Object.fromEntries(movingComplexAnimationKeys.map((key) => [
    key,
    movingComplexDig.displaySizePx,
  ])),
  ...Object.fromEntries(blenderV2.idleFidgets.map((fidget) => [
    fidget.key,
    groundedVisual.idle.displaySizePx,
  ])),
  ...animationPolish.customDisplaySizes,
  [animationPolish.walkStartAnim]: GROUND_HANDOFF_DISPLAY_SIZE_PX.start,
  [animationPolish.walkStopAnim]: GROUND_HANDOFF_DISPLAY_SIZE_PX.stop,
  ...Object.fromEntries(Object.values(mixamoAnimations).map((key) => [
    key,
    mixamoSheets.walkStart.displaySizePx,
  ])),
  ...complexDig.displaySizeByAnimation,
  ...(ledgeAssistEnabled ? {
    [ledgeAssist.animations.hang]: ledgeAssist.sheet.displaySizePx,
    [ledgeAssist.animations.climb]: ledgeAssist.sheet.displaySizePx,
  } : {}),
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
  [movingComplexDig.sheet.key]: movingComplexDig.origin,
  ...animationPolish.customOriginBySheet,
  ...Object.fromEntries(Object.values(mixamoSheets).map((sheetSpec) => [
    sheetSpec.key,
    sheetSpec.origin,
  ])),
  ...complexDig.originBySheet,
  ...(ledgeAssistEnabled ? {
    [ledgeAssist.sheet.key]: ledgeAssist.sheet.origin,
  } : {}),
});

const survivalUalMixedPlayerAssetProfile = Object.freeze({
  ...remappedProfile,
  ...complexDig.profileProperties,
  characterId: PLAYER_CHARACTER_IDS.survivalUal,
  renderPipeline: "survival-blender-v2-piskel-polish-v2-mixamo-complex-dig-moving-v1",
  basePath: "sprites/character/survival-ual-player-v1/runtime",
  version: "survival-complex-dig-moving-runtime-v1-20260821",
  visualSkin: blenderV2.visualId,
  coreAnimationPolicy: "Phase-authored Piskel ground handoffs, accepted Mixamo abilities and user-approved complex SIDE/UP mining on the Survival V4 render; authored combo clips retain every reviewed contact and the family keeps an instant legacy rollback",
  walkStartAnim: mixamoAnimations.walkStart,
  walkStopAnim: mixamoAnimations.walkStop,
  landingAnim: mixamoAnimations.hardLanding,
  animationPolishConfig: acceptedAnimationPolishConfig,
  softLandingAnim: animationPolish.softLandingAnim,
  idleSheet: blenderV2.sheets.idle.key,
  idleTalkSheet: blenderV2.sheets.idle.key,
  walkSheet: blenderV2.sheets.walk.key,
  walkStartSheet: mixamoSheets.walkStart.key,
  walkLoopSheet: blenderV2.sheets.walk.key,
  walkRunSheet: animationPolish.runPolishEnabled
    ? animationPolish.animationPolishRunSheet
    : remappedProfile.walkRunSheet,
  walkStopSheet: mixamoSheets.walkStop.key,
  legacyFlightTransitionSheet: blenderV2.sheets.fly.key,
  flySheet: mixamoSheets.flight.key,
  flightEnterSheet: blenderV2.sheets.fly.key,
  flightTravelEnterSheet: blenderV2.sheets.fly.key,
  flightTravelLoopSheet: mixamoSheets.flight.key,
  flightHoverSheet: mixamoSheets.flight.key,
  flightExitSheet: blenderV2.sheets.fly.key,
  landingSheet: mixamoSheets.hardLanding.key,
  duckSheet: mixamoSheets.crouch.key,
  crouchEnterSheet: mixamoSheets.crouchEnter.key,
  crouchExitSheet: mixamoSheets.crouchExit.key,
  mixamoIdleFidgetSheet: mixamoSheets.idleFidget.key,
  thunderStrikeStrikeSheet: mixamoSheets.thunderStrike.key,
  quickslashSheet: mixamoSheets.quickslash.key,
  digUpSheet: digUpSheet.key,
  digUpSidewaysSheet: digUpSheet.key,
  uppercutSheet: digUpSheet.key,
  movingSideDigJabSheet: MOVING_SIDE_DIG_ANIMATION.actions.jab.sheetKey,
  movingSideDigCrossSheet: MOVING_SIDE_DIG_ANIMATION.actions.cross.sheetKey,
  movingSideDigPhaseHandoffSheet: movingSideDig.handoff.atlas.sheetKey,
  movingComplexDigSheet: movingComplexDig.sheet.key,
  ledgeAssistEnabled,
  ledgeClimbSheet: ledgeAssistEnabled ? ledgeAssist.sheet.key : null,
  ...animationPolish,
  actionRecoveryAnimationByCompletedAnimation: Object.freeze({
    ...animationPolish.actionRecoveryAnimationByCompletedAnimation,
    ...complexDigActionRecovery,
    ...movingComplexActionRecovery,
  }),
  // Accepted Mixamo replacements intentionally win over the retained Piskel
  // definitions. The old sheets stay on disk as rollback assets.
  walkStartAnim: mixamoAnimations.walkStart,
  walkStopAnim: mixamoAnimations.walkStop,
  landingAnim: mixamoAnimations.hardLanding,
  animationPolishConfig: acceptedAnimationPolishConfig,
  continuousFlightLoop: true,
  // Idle talk is intentionally routed to the approved Blender idle texture.
  // Using the unloaded alias key made this animation disappear at registration.
  leanAgainstWallSheet: blenderV2.sheets.idle.key,
  combatIdleRecoverSheet: blenderV2.sheets.idle.key,
  combatIdleToNormalIdleSheet: blenderV2.sheets.idle.key,
  idleFrames: blenderV2.frames.idle,
  idleTalkFrames: blenderV2.frames.idle,
  walkFrames: blenderV2.frames.walk,
  walkStartFrames: mixamoSheets.walkStart.frames,
  walkLoopFrames: blenderV2.frames.walk,
  walkRunFrames: animationPolish.runPolishEnabled
    ? animationPolish.animationPolishRunFrames
    : remappedProfile.walkRunFrames,
  walkStopFrames: mixamoSheets.walkStop.frames,
  legacyFlightTransitionFrames: blenderV2.frames.fly,
  flyFrames: mixamoSheets.flight.frames,
  flySourceFrames: blenderV2.frames.fly,
  flightEnterFrames: blenderV2.frames.fly,
  flightTravelEnterFrames: blenderV2.frames.fly,
  flightTravelLoopFrames: mixamoSheets.flight.frames,
  flightHoverFrames: mixamoSheets.flight.frames,
  flightExitFrames: blenderV2.frames.fly,
  landingFrames: mixamoSheets.hardLanding.runtimeFrames,
  landingSourceFrames: mixamoSheets.hardLanding.frames,
  duckFrames: mixamoSheets.crouch.frames,
  crouchEnterFrames: mixamoSheets.crouchEnter.frames,
  crouchExitFrames: mixamoSheets.crouchExit.frames,
  mixamoIdleFidgetFrames: mixamoSheets.idleFidget.frames,
  thunderStrikeStrikeFrames: mixamoSheets.thunderStrike.frames,
  quickslashFrames: mixamoSheets.quickslash.frames,
  digUpFrames: blenderV2.frames.digUp,
  digUpSidewaysFrames: blenderV2.frames.digUp,
  uppercutFrames: blenderV2.frames.digUp,
  uppercutPlaybackFrames: blenderV2.frames.digUp,
  movingSideDigJabFrames: MOVING_SIDE_DIG_ANIMATION.actions.jab.frames,
  movingSideDigCrossFrames: MOVING_SIDE_DIG_ANIMATION.actions.cross.frames,
  movingSideDigPhaseHandoffFrames: movingSideDig.handoff.atlas.frames,
  movingComplexDigFrames: movingComplexDig.sheet.frames,
  ledgeHangFrames: ledgeAssistEnabled ? ledgeAssist.sheet.hangFrames : Object.freeze([]),
  ledgeClimbFrames: ledgeAssistEnabled ? ledgeAssist.sheet.climbFrames : Object.freeze([]),
  idleAnimationFps: 12,
  digUpAnimationFps: digUpSheet.frameRate,
  digUpLookAnimationFps: 30,
  flyAnimationFps: mixamoSheets.flight.frameRate,
  flightEnterAnimationFps: 16,
  flightTravelEnterAnimationFps: 16,
  flightTravelLoopAnimationFps: mixamoSheets.flight.frameRate,
  flightHoverAnimationFps: mixamoSheets.flight.frameRate,
  flightExitAnimationFps: 16,
  landingAnimationFps: mixamoSheets.hardLanding.frameRate,
  duckAnimationFps: mixamoSheets.crouch.frameRate,
  crouchEnterAnimationFps: mixamoSheets.crouchEnter.frameRate,
  crouchExitAnimationFps: mixamoSheets.crouchExit.frameRate,
  thunderStrikeStrikeAnimationFps: mixamoSheets.thunderStrike.frameRate,
  quickslashAnimationFps: mixamoSheets.quickslash.frameRate,
  ledgeClimbAnimationFps: ledgeAssist.sheet.frameRate,
  ledgeSourceFacesRight: ledgeAssist.sourceFacesRight,
  quickslashSourceFacesRight: false,
  duckSourceFacesRight: true,
  crouchEnterAnim: mixamoAnimations.crouchEnter,
  crouchExitAnim: mixamoAnimations.crouchExit,
  duckAnim: mixamoAnimations.crouch,
  flyAnim: mixamoAnimations.flight,
  flightTravelLoopAnim: mixamoAnimations.flight,
  flightHoverAnim: mixamoAnimations.flight,
  thunderStrikeStrikeAnim: mixamoAnimations.thunderStrike,
  quickslashAnim: mixamoAnimations.quickslash,
  ledgeHangAnim: ledgeAssistEnabled ? ledgeAssist.animations.hang : null,
  ledgeClimbAnim: ledgeAssistEnabled ? ledgeAssist.animations.climb : null,
  leanAgainstWallFrames: blenderV2.frames.idle,
  combatIdleRecoverFrames: blenderV2.frames.idle,
  combatIdleToNormalIdleFrames: blenderV2.frames.idle,
  combatIdleRecoverAnim: remappedProfile.idleAnim,
  combatIdleToNormalIdleAnim: remappedProfile.idleAnim,
  sourceClips: Object.freeze({
    ...remappedProfile.sourceClips,
    ...complexDig.sourceClips,
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
    movingComplexDig: "Approved complex SIDE family over phase-locked Jog legs; Piskel green cleanup and fixed baseline",
    movingQuickslash: "Mixamo Hurricane Kick retargeted to approved Survival rig",
    quickslash: "Mixamo Hurricane Kick retargeted to approved Survival rig",
    fly: "Mixamo Flying Idle retargeted to approved Survival rig",
    flyHover: "Mixamo Flying Idle retargeted to approved Survival rig",
    hardLanding: "Mixamo Jumping Down From Higher Level impact and recovery",
    crouch: "Mixamo Crouch Idle with matched authored entry and exit",
    thunderStrike: "Mixamo Standing 2H Magic Area Attack 01 retargeted without weapon",
    ...(ledgeAssistEnabled ? { ledgeClimb: ledgeAssist.sourceClip } : {}),
  }),
  requiredSheets,
  sheetFiles,
  walkAnims: Object.freeze([
    mixamoAnimations.walkStart,
    remappedProfile.walkLoopAnim,
    remappedProfile.walkRunAnim,
    mixamoAnimations.walkStop,
  ]),
  walkMovingAnims: Object.freeze([
    mixamoAnimations.walkStart,
    remappedProfile.walkLoopAnim,
    remappedProfile.walkRunAnim,
  ]),
  locomotionTransitionAnims: Object.freeze(Array.from(new Set([
    ...remappedProfile.locomotionTransitionAnims,
    ...animationPolish.customAnimationKeys,
    mixamoAnimations.walkStart,
    mixamoAnimations.walkStop,
    mixamoAnimations.hardLanding,
    mixamoAnimations.crouchEnter,
    mixamoAnimations.crouchExit,
    ...(ledgeAssistEnabled ? [ledgeAssist.animations.hang, ledgeAssist.animations.climb] : []),
  ]))),
  digAnimationVariants: Object.freeze([
    ...remappedProfile.digAnimationVariants.filter((variant) => !digUpAnimationKeys.includes(variant.key)),
    ...digUpVariants,
    ...movingSideDig.variants,
    ...movingSideDig.quickslashVariants,
    ...movingComplexDigVariants,
    ...animationPolish.diagonalDigAnimationVariants,
    ...complexDig.animations,
  ]),
  digAnims: Object.freeze(Array.from(new Set([
    ...remappedProfile.digAnims,
    ...movingSideDig.animationKeys,
    ...movingSideDig.quickslashAnimationKeys,
    ...movingComplexAnimationKeys,
    ...animationPolish.movingDiagonalDigAnimationKeys,
    ...complexDig.animationKeys,
  ]))),
  punchActionAnims: Object.freeze(Array.from(new Set([
    ...remappedProfile.punchActionAnims,
    ...movingSideDig.animationKeys,
    ...movingComplexAnimationKeys,
    mixamoAnimations.quickslash,
    ...animationPolish.movingDiagonalDigAnimationKeys,
    ...complexDig.animationKeys,
  ]))),
  movingSideDigConfig: MOVING_SIDE_DIG_ANIMATION,
  movingSideDigAnimationMap: movingComplexDigAnimationMap,
  movingComplexDigPhaseVariants: movingComplexDig.phaseVariants,
  movingComplexDigAnimationKeys: movingComplexAnimationKeys,
  movingComplexDigVariantByBaseAnimationAndPhaseVariantId:
    movingComplexDig.variantByBaseAnimationAndPhaseVariantId,
  // Quickslash keeps the same gameplay/contact path while moving; only its
  // visual animation changes. Mining's phase-matched jab/cross family remains.
  movingSideQuickslashAnimationKey: mixamoAnimations.quickslash,
  movingSideQuickslashPhaseVariants: Object.freeze([]),
  movingSideQuickslashAnimationKeys: Object.freeze([mixamoAnimations.quickslash]),
  movingSideQuickslashAnimationKeyByPhaseVariantId: Object.freeze({}),
  actionContactByAnimation: Object.freeze({
    ...(remappedProfile.actionContactByAnimation || {}),
    ...digUpContactByAnimation,
    ...movingSideDig.contactByAnimation,
    ...movingComplexContactByAnimation,
    ...animationPolish.diagonalDigContactByAnimation,
    ...animationPolish.stationaryContactByAnimation,
    ...animationPolish.verticalDigContactByAnimation,
    ...complexDig.contactByAnimation,
    // The old Quickslash shared Punch Jab with SIDE mining. Splitting the
    // ability onto Hurricane Kick must not move the existing Jab tile contact.
    [remappedProfile.quickslashAnim]: Object.freeze({
      textureFrame: 7,
      sequenceIndex: 4,
      sourceAction: "punch-jab",
      markerGroup: "hands",
      visualAlignmentEnabled: false,
    }),
    [mixamoAnimations.thunderStrike]: Object.freeze({
      textureFrame: mixamo.thunderContactSequenceIndex,
      sequenceIndex: mixamo.thunderContactSequenceIndex,
      sourceAction: "mixamo-standing-2h-magic-area-attack-01",
      markerGroup: "hands",
      visualAlignmentEnabled: false,
    }),
  }),
  quickslashActionContactByAnimation: Object.freeze({
    ...movingSideDig.quickslashContactByAnimation,
    ...animationPolish.stationaryQuickslashContactByAnimation,
    [mixamoAnimations.quickslash]: Object.freeze({
      textureFrame: mixamo.quickslashContactSequenceIndex,
      sequenceIndex: mixamo.quickslashContactSequenceIndex,
      sourceAction: "mixamo-hurricane-kick",
      markerGroup: "feet",
      visualAlignmentEnabled: false,
    }),
  }),
  idleFidgets: Object.freeze([
    ...blenderV2.idleFidgets,
    Object.freeze({
      key: mixamoAnimations.idleFidget,
      profileSheetKey: "mixamoIdleFidgetSheet",
      frames: mixamoSheets.idleFidget.frames,
      frameRate: mixamoSheets.idleFidget.frameRate,
      repeat: 0,
    }),
  ]),
  displaySizePxByAnimation: Object.freeze({
    ...remappedProfile.displaySizePxByAnimation,
    ...blenderCoreDisplaySizeByAnimation,
  }),
  strideTilesPerCycleByAnimation: Object.freeze({
    [remappedProfile.walkRunAnim]: SURVIVAL_RUN_STRIDE_TILES_PER_CYCLE,
  }),
  visualOriginBySheet: Object.freeze({
    ...(remappedProfile.visualOriginBySheet || {}),
    ...blenderCoreOriginBySheet,
  }),
  lightVisibleCenterBySheet: Object.freeze({
    ...(remappedProfile.lightVisibleCenterBySheet || {}),
    [blenderV2.sheets.fly.key]: blenderV2.sheets.fly.visibleCenterNormalized,
    [mixamoSheets.flight.key]: Object.freeze({ x: 0.53, y: 0.44 }),
  }),
});

export const SURVIVAL_UAL_PLAYER_ASSET_PROFILE =
  applySurvivalUnifiedAnimationRuntimeV1(
    survivalUalMixedPlayerAssetProfile,
    unifiedAnimationEnabled,
  );
