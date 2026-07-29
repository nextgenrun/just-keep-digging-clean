const frozenUnique = (values) => Object.freeze(Array.from(new Set(values.filter(Boolean))));

function freezeMap(entries) {
  return Object.freeze(Object.fromEntries(entries));
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
      visualAlignmentMode: "immediate",
    }),
  ]));
}

export function buildSurvivalUalAnimationPolishProfile({
  profile,
  movingSideDig,
  polish,
}) {
  const transitionSheet = polish.sheets.transitions;
  const diagonalSheet = polish.sheets.diagonalDig;
  const ground = polish.groundHandoff;
  const landing = polish.landing;
  const wall = polish.wallBrace;
  const recovery = polish.actionRecovery;
  const defaultStop = ground.stopVariants[0];
  const transitionAnimations = polish.transitionAnimations.map(animationDefinition);
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
    animationPolishTransitionSheet: transitionSheet.sheetKey,
    animationPolishTransitionFrames: transitionSheet.frames,
    animationPolishDiagonalDigSheet: diagonalSheet.sheetKey,
    animationPolishDiagonalDigFrames: diagonalSheet.frames,
    animationPolishAnimations: Object.freeze([
      legacyLandingAnimation,
      ...transitionAnimations,
      ...diagonalAnimations,
    ]),
    animationPolishSheetFiles: Object.freeze([
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
    wallBraceExitAnim: wall.exit.key,
    actionRecoveryAnimationByCompletedAnimation,
    movingDiagonalDigAnimationMap,
    movingDiagonalDigAnimationKeys: diagonalAnimationKeys,
    movingDiagonalDigConfig: polish.diagonalMining,
    diagonalDigAnimationVariants: Object.freeze(diagonalAnimations),
    diagonalDigContactByAnimation: diagonalContacts(polish),
    customAnimationKeys,
    customDisplaySizes,
    customOriginBySheet: Object.freeze({
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
