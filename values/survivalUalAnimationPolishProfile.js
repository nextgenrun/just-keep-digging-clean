import { isPlayerAnimationFeatureEnabled } from "./playerAnimationPolish.js";

const frozenUnique = (values) => Object.freeze(Array.from(new Set(values.filter(Boolean))));

function freezeMap(entries) {
  return Object.freeze(Object.fromEntries(entries));
}

function bodyLockedContact(spec) {
  return Object.freeze({
    textureFrame: spec.textureFrame,
    sequenceIndex: spec.sequenceIndex,
    sourceAction: spec.sourceAction,
    markerGroup: spec.markerGroup,
    visualAlignmentEnabled: false,
  });
}

function bodyLockedContacts(specs = []) {
  return freezeMap(specs.map((spec) => [
    spec.animationKey,
    bodyLockedContact(spec),
  ]));
}

function verticalContacts(polish, enabled, retainedLegacyAnimationKeys) {
  if (!enabled) return Object.freeze({});
  const entries = [];
  for (const family of ["up", "down"]) {
    const spec = polish.verticalMining[family];
    for (const animationKey of spec.animationKeys) {
      if (retainedLegacyAnimationKeys.has(animationKey)) continue;
      entries.push([animationKey, bodyLockedContact({
        ...spec,
        animationKey,
        textureFrame: spec.sourceContactFrame,
        sequenceIndex: spec.contactSequenceIndex,
      })]);
    }
  }
  return freezeMap(entries);
}

function animationDefinition(spec) {
  return Object.freeze({
    key: spec.key || spec.animationKey,
    sheet: spec.sheet || spec.sheetKey,
    frames: spec.frames,
    frameRate: spec.frameRate,
    repeat: spec.repeat ?? 0,
  });
}

function recoveryMap(profile, movingSideDig, polish, recovery) {
  const result = {};
  const variants = profile.digAnimationVariants || [];
  const crossSheet = profile.punchCrossSheet;
  for (const key of frozenUnique(profile.digSidewaysHitAnims || [])) {
    const variant = variants.find((entry) => entry.key === key);
    result[key] = variant?.sheet === crossSheet
      ? recovery.families.cross.key
      : recovery.families.jab.key;
  }
  for (const key of frozenUnique([
    ...(profile.digUpHitAnims || []),
    ...(profile.digUpSidewaysHitAnims || []),
  ])) result[key] = recovery.families.up.key;
  for (const key of frozenUnique([
    ...(profile.digDownHitAnims || []),
    ...(profile.digDownSidewaysHitAnims || []),
  ])) result[key] = recovery.families.down.key;
  for (const variant of movingSideDig?.phaseHandoff?.variants || []) {
    result[variant.animationKey] = variant.action === "cross"
      ? recovery.families.cross.key
      : recovery.families.jab.key;
  }
  for (const variant of polish.diagonalMining.variants || []) {
    result[variant.animationKey] = variant.family === "up"
      ? recovery.families.up.key
      : recovery.families.down.key;
  }
  return Object.freeze(result);
}

function diagonalContacts(polish) {
  return freezeMap(polish.diagonalMining.variants.map((variant) => [
    variant.animationKey,
    Object.freeze({
      textureFrame: variant.contactFrame,
      sequenceIndex: variant.contactSequenceIndex,
      sourceAction: variant.sourceAction,
      markerGroup: variant.markerGroup,
      visualAlignmentEnabled: false,
    }),
  ]));
}

export function buildSurvivalUalAnimationPolishProfile({
  profile,
  movingSideDig,
  polish,
  retainedLegacyAnimationKeys = [],
}) {
  const transitionSheet = polish.sheets.transitions;
  const diagonalSheet = polish.sheets.diagonalDig;
  const runSheet = polish.sheets.run;
  const runPolishEnabled = isPlayerAnimationFeatureEnabled(polish.runPolish);
  const ground = polish.groundHandoff;
  const landing = polish.landing;
  const wall = polish.wallBrace;
  const recovery = polish.actionRecovery;
  const verticalEnabled = isPlayerAnimationFeatureEnabled(polish.verticalMining);
  const stationaryContactEnabled = isPlayerAnimationFeatureEnabled(
    polish.stationaryContactPolish,
  );
  const wallEnabled = isPlayerAnimationFeatureEnabled(wall);
  const verticalAnimationKeys = new Set([
    ...polish.verticalMining.up.animationKeys,
    ...polish.verticalMining.down.animationKeys,
  ]);
  const retainedLegacyAnimationKeySet = new Set(retainedLegacyAnimationKeys);
  const defaultStop = ground.stopVariants[0];
  const transitionAnimations = polish.transitionAnimations
    .filter((spec) => (
      (
        !verticalAnimationKeys.has(spec.key)
        || (verticalEnabled && !retainedLegacyAnimationKeySet.has(spec.key))
      )
      && (!wallEnabled || spec.key !== wall.loop.key)
    ))
    .map(animationDefinition);
  const wallLoopAnimation = wallEnabled ? animationDefinition({
    key: wall.loop.key,
    sheet: profile.wallPushSheet,
    frames: profile.wallPushFrames,
    frameRate: profile.wallPushAnimationFps,
    repeat: -1,
  }) : null;
  const verticalContactByAnimation = verticalContacts(
    polish,
    verticalEnabled,
    retainedLegacyAnimationKeySet,
  );
  const stationaryContactByAnimation = bodyLockedContacts(
    stationaryContactEnabled ? polish.stationaryContactPolish.side : [],
  );
  const stationaryQuickslashContactByAnimation = bodyLockedContacts(
    stationaryContactEnabled ? polish.stationaryContactPolish.quickslash : [],
  );
  const legacyLandingAnimation = animationDefinition({
    key: profile.landingAnim,
    sheet: profile.landingSheet,
    frames: profile.landingFrames,
    frameRate: profile.landingAnimationFps,
    repeat: 0,
  });
  const diagonalAnimations = polish.diagonalMining.variants.map((variant) => (
    animationDefinition({
      key: variant.animationKey,
      sheet: variant.sheetKey,
      frames: variant.frames,
      frameRate: variant.frameRate,
      repeat: variant.repeat,
    })
  ));
  const customAnimationKeys = frozenUnique([
    ...transitionAnimations.map((animation) => animation.key),
    wallLoopAnimation?.key,
    ...diagonalAnimations.map((animation) => animation.key),
    legacyLandingAnimation.key,
  ]);
  const diagonalAnimationKeys = frozenUnique(
    polish.diagonalMining.variants.map((variant) => variant.animationKey),
  );
  const upBaseKeys = frozenUnique(profile.digUpSidewaysHitAnims || []);
  const downBaseKeys = frozenUnique(profile.digDownSidewaysHitAnims || []);
  const movingDiagonalDigAnimationMap = freezeMap([
    ...upBaseKeys.map((key) => [key, "up"]),
    ...downBaseKeys.map((key) => [key, "down"]),
  ]);
  const actionRecoveryAnimationByCompletedAnimation = recoveryMap(
    profile,
    movingSideDig,
    polish,
    recovery,
  );
  const customDisplaySizes = freezeMap(customAnimationKeys.map((key) => [
    key,
    polish.displaySizePx,
  ]));

  return Object.freeze({
    animationPolishConfig: polish,
    runPolishEnabled,
    animationPolishRunSheet: runSheet.sheetKey,
    animationPolishRunFrames: runSheet.frames,
    footstepRigAction: runPolishEnabled
      ? polish.runPolish.manifestAction
      : polish.runPolish.sourceAction,
    animationPolishTransitionSheet: transitionSheet.sheetKey,
    animationPolishTransitionFrames: transitionSheet.frames,
    animationPolishDiagonalDigSheet: diagonalSheet.sheetKey,
    animationPolishDiagonalDigFrames: diagonalSheet.frames,
    animationPolishAnimations: Object.freeze([
      legacyLandingAnimation,
      ...transitionAnimations,
      ...(wallLoopAnimation ? [wallLoopAnimation] : []),
      ...diagonalAnimations,
    ]),
    animationPolishSheetFiles: Object.freeze([
      Object.freeze([
        "animationPolishRunSheet",
        runSheet.fileName,
        "animationPolishRunFrames",
      ]),
      Object.freeze([
        "animationPolishTransitionSheet",
        transitionSheet.fileName,
        "animationPolishTransitionFrames",
      ]),
      Object.freeze([
        "animationPolishDiagonalDigSheet",
        diagonalSheet.fileName,
        "animationPolishDiagonalDigFrames",
      ]),
    ]),
    animationPolishRequiredSheets: Object.freeze([
      runSheet.sheetKey,
      transitionSheet.sheetKey,
      diagonalSheet.sheetKey,
    ]),
    walkStartAnim: ground.start.key,
    walkStopAnim: defaultStop.key,
    softLandingAnim: landing.soft.key,
    landingAnim: landing.hard.key,
    legacyLandingAnim: legacyLandingAnimation.key,
    landingAnimationFps: landing.frameRate,
    landingCompressionOwner: landing.compressionOwner,
    wallBraceEnterAnim: wall.entry.key,
    wallPushAnim: wallEnabled ? wall.loop.key : profile.wallPushAnim,
    wallBraceExitAnim: wall.exit.key,
    actionRecoveryAnimationByCompletedAnimation,
    movingDiagonalDigAnimationMap,
    movingDiagonalDigAnimationKeys: diagonalAnimationKeys,
    movingDiagonalDigConfig: polish.diagonalMining,
    diagonalDigAnimationVariants: Object.freeze(diagonalAnimations),
    diagonalDigContactByAnimation: diagonalContacts(polish),
    verticalDigContactByAnimation: verticalContactByAnimation,
    animationPolishRetainedLegacyAnimationKeys: frozenUnique(
      retainedLegacyAnimationKeys,
    ),
    stationaryContactByAnimation,
    stationaryQuickslashContactByAnimation,
    customAnimationKeys,
    customDisplaySizes,
    customOriginBySheet: Object.freeze({
      [runSheet.sheetKey]: Object.freeze({
        x: polish.visualOriginX,
        y: polish.visualOriginY,
      }),
      [transitionSheet.sheetKey]: Object.freeze({
        x: polish.visualOriginX,
        y: polish.visualOriginY,
      }),
      [diagonalSheet.sheetKey]: Object.freeze({
        x: polish.visualOriginX,
        y: polish.visualOriginY,
      }),
    }),
  });
}
