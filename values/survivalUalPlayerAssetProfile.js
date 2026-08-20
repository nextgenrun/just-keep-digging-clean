import { PLAYER_CHARACTER_IDS } from "./playerCharacters.js";
import { MOVING_SIDE_DIG_ANIMATION } from "./movingSideDigAnimation.js";
import { PLAYER_ANIMATION_POLISH } from "./playerAnimationPolish.js";
import { MIXAMO_ACCEPTED_PLAYER_ANIMATIONS } from "./mixamoAcceptedPlayerAnimations.js?rev=20260819-hurricane-quickslash-v2";
import { SURVIVAL_BLENDER_V2_RUNTIME } from "./survivalBlenderV2Runtime.js?rev=20260815-animation-contract-repair-v2";
import { SURVIVAL_COMPLEX_DIG_PROFILE } from "./survivalComplexDigProfile.js";
import { buildSurvivalUalAnimationPolishProfile } from "./survivalUalAnimationPolishProfile.js";
import { buildSurvivalUalMovingSideDigProfile } from "./survivalUalMovingSideDigProfile.js";
import { UAL_NATIVE_PLAYER_ASSET_PROFILE } from "./ualNativePlayerAssetProfile.js";
import { ANIMATION_TILE_CLEARANCE_POLICIES } from "./animationTileClearance.js";

const UAL_RUNTIME_KEY_PREFIX = "ual-native-v1";
const UAL_RUNTIME_FILE_PREFIX = "ual-native-player-v1-";
const SURVIVAL_UAL_RUNTIME_PREFIX = "survival-ual-player-v1";
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
const legacySideDigKeys = Object.freeze(Array.from(new Set(
  remappedProfile.digSidewaysHitAnims,
)));
const contactAwareSideDigKeys = Object.freeze([
  complexDig.profileProperties.complexDigSideAnimationKeys[0],
  ...legacySideDigKeys,
  ...complexDig.profileProperties.complexDigSideAnimationKeys.slice(1),
]);
const contactAwareUpDigKeys = Object.freeze([
  remappedProfile.digUpHitAnims[0],
  complexDig.profileProperties.complexDigUpAnimationKeys[0],
]);
const animationTileClearanceByAnimation = Object.freeze({
  ...Object.fromEntries(legacySideDigKeys.map(key => [
    key,
    ANIMATION_TILE_CLEARANCE_POLICIES.sideCanonical,
  ])),
  ...Object.fromEntries(remappedProfile.digUpHitAnims.map(key => [
    key,
    ANIMATION_TILE_CLEARANCE_POLICIES.upCanonical,
  ])),
  ...Object.fromEntries(remappedProfile.digUpSidewaysHitAnims.map(key => [
    key,
    ANIMATION_TILE_CLEARANCE_POLICIES.diagonalCanonical,
  ])),
  [remappedProfile.digDownAnim]: ANIMATION_TILE_CLEARANCE_POLICIES.downCanonical,
  ...complexDig.clearanceByAnimation,
});
const groundedVisual = blenderV2.groundedVisualCalibration;
const digUpSheet = blenderV2.sheets.digUp;
const movingSideDig = buildSurvivalUalMovingSideDigProfile(MOVING_SIDE_DIG_ANIMATION);
const animationPolish = buildSurvivalUalAnimationPolishProfile({
  profile: remappedProfile,
  movingSideDig: MOVING_SIDE_DIG_ANIMATION,
  polish: PLAYER_ANIMATION_POLISH,
  retainedLegacyAnimationKeys: [remappedProfile.digDownAnim],
});
const acceptedGroundHandoff = Object.freeze({
  ...animationPolish.animationPolishConfig.groundHandoff,
  start: Object.freeze({
    ...animationPolish.animationPolishConfig.groundHandoff.start,
    key: mixamoAnimations.walkStart,
  }),
  stopAnimationKeyByOutgoingJogFrame: Object.freeze(
    animationPolish.animationPolishConfig.groundHandoff
      .stopAnimationKeyByOutgoingJogFrame
      .map(() => mixamoAnimations.walkStop),
  ),
});
const acceptedAnimationPolishConfig = Object.freeze({
  ...animationPolish.animationPolishConfig,
  groundHandoff: acceptedGroundHandoff,
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
    )).map((sheetKey) => (
      sheetOverrideByOriginalKey[sheetKey]?.key || sheetKey
    )),
    ...movingSideDig.actions.map((action) => action.sheetKey),
    movingSideDig.handoff.atlas.sheetKey,
    ...animationPolish.animationPolishRequiredSheets,
    ...Object.values(mixamoSheets).map((sheetSpec) => sheetSpec.key),
    ...complexDig.requiredSheets,
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
  ...Object.fromEntries(Object.values(mixamoSheets).map((sheetSpec) => [
    sheetSpec.key,
    sheetSpec.origin,
  ])),
  ...complexDig.originBySheet,
});

export const SURVIVAL_UAL_PLAYER_ASSET_PROFILE = Object.freeze({
  ...remappedProfile,
  ...complexDig.profileProperties,
  complexDigSideAnimationKeys: contactAwareSideDigKeys,
  complexDigUpAnimationKeys: contactAwareUpDigKeys,
  animationTileClearanceByAnimation,
  characterId: PLAYER_CHARACTER_IDS.survivalUal,
  renderPipeline: "survival-blender-v2-piskel-polish-v2-mixamo-complex-dig-v1",
  basePath: "sprites/character/survival-ual-player-v1/runtime",
  version: "survival-complex-dig-runtime-v1-20260820",
  visualSkin: blenderV2.visualId,
  coreAnimationPolicy: "Accepted Mixamo handoffs, abilities and user-approved complex SIDE/UP mining on the Survival V4 render; complex mining has one-contact authority and an instant legacy rollback",
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
  ...animationPolish,
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
    movingQuickslash: "Mixamo Hurricane Kick retargeted to approved Survival rig",
    quickslash: "Mixamo Hurricane Kick retargeted to approved Survival rig",
    fly: "Mixamo Flying Idle retargeted to approved Survival rig",
    flyHover: "Mixamo Flying Idle retargeted to approved Survival rig",
    hardLanding: "Mixamo Jumping Down From Higher Level impact and recovery",
    crouch: "Mixamo Crouch Idle with matched authored entry and exit",
    thunderStrike: "Mixamo Standing 2H Magic Area Attack 01 retargeted without weapon",
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
  ]))),
  digAnimationVariants: Object.freeze([
    ...remappedProfile.digAnimationVariants.filter((variant) => !digUpAnimationKeys.includes(variant.key)),
    ...digUpVariants,
    ...movingSideDig.variants,
    ...movingSideDig.quickslashVariants,
    ...animationPolish.diagonalDigAnimationVariants,
    ...complexDig.animations,
  ]),
  digAnims: Object.freeze(Array.from(new Set([
    ...remappedProfile.digAnims,
    ...movingSideDig.animationKeys,
    ...movingSideDig.quickslashAnimationKeys,
    ...animationPolish.movingDiagonalDigAnimationKeys,
    ...complexDig.animationKeys,
  ]))),
  punchActionAnims: Object.freeze(Array.from(new Set([
    ...remappedProfile.punchActionAnims,
    ...movingSideDig.animationKeys,
    mixamoAnimations.quickslash,
    ...animationPolish.movingDiagonalDigAnimationKeys,
    ...complexDig.animationKeys,
  ]))),
  movingSideDigConfig: MOVING_SIDE_DIG_ANIMATION,
  movingSideDigAnimationMap: movingSideDig.animationMap,
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
