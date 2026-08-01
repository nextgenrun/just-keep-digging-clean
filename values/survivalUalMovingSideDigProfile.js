/** Derives Survival-profile animation data from the generated moving-side-dig contract. */

function buildQuickslashPhaseVariants(config, phaseVariants) {
  const quickslash = config.quickslash;
  if (quickslash?.enabledByDefault !== true) return Object.freeze([]);
  return Object.freeze(phaseVariants.map((variant) => {
    const phase = String(variant.runStartFrame).padStart(2, "0");
    const animationKey = variant.id === quickslash.baseVariantId
      ? quickslash.animationKey
      : `${quickslash.variantAnimationKeyPrefix}-${variant.action}-phase-${phase}-anim`;
    return Object.freeze({
      id: variant.id,
      action: variant.action,
      animationKey,
      sheetKey: variant.sheetKey,
      frames: Object.freeze(quickslash.frameIndexes.map((index) => variant.frames[index])),
      runFrames: Object.freeze(quickslash.frameIndexes.map((index) => variant.runFrames[index])),
      manifestAction: variant.manifestAction,
      resumeJogFrame: variant.resumeJogFrame,
      base: variant.id === quickslash.baseVariantId,
    });
  }));
}

function contactSpec(config, textureFrame, sequenceIndex, sourceAction) {
  return Object.freeze({
    textureFrame,
    sequenceIndex,
    sourceAction,
    markerGroup: "hands",
    visualAlignmentEnabled: config.contactVisualAlignmentEnabled,
  });
}

export function buildSurvivalUalMovingSideDigProfile(config) {
  const actions = Object.freeze(Object.values(config.actions));
  const handoff = config.phaseHandoff;
  const phaseVariants = handoff.variants;
  const quickslashPhaseVariants = buildQuickslashPhaseVariants(config, phaseVariants);
  const animationKeys = Object.freeze(
    phaseVariants.map((variant) => variant.animationKey),
  );
  const quickslashAnimationKeys = Object.freeze(
    quickslashPhaseVariants.map((variant) => variant.animationKey),
  );
  const animationMap = Object.freeze(Object.fromEntries(
    actions.map((action) => [action.baseAnimationKey, action.animationKey]),
  ));
  const contactByAnimation = Object.freeze(Object.fromEntries(
    phaseVariants.map((variant) => [
      variant.animationKey,
      contactSpec(config, config.contactFrame, config.contactSequenceIndex, variant.manifestAction),
    ]),
  ));
  const quickslashContactByAnimation = Object.freeze(Object.fromEntries(
    quickslashPhaseVariants.map((variant) => [
      variant.animationKey,
      contactSpec(
        config,
        config.quickslash.contactFrame,
        config.quickslash.contactSequenceIndex,
        variant.manifestAction,
      ),
    ]),
  ));
  const variants = Object.freeze(phaseVariants.map((variant) => Object.freeze({
    key: variant.animationKey,
    sheet: variant.sheetKey,
    frames: variant.frames,
    frameRate: config.frameRate,
    repeat: 0,
  })));
  const quickslashVariants = Object.freeze(quickslashPhaseVariants.map((variant) => Object.freeze({
    key: variant.animationKey,
    sheet: variant.sheetKey,
    frames: variant.frames,
    frameRate: config.frameRate,
    repeat: 0,
  })));
  return Object.freeze({
    actions,
    handoff,
    phaseVariants,
    animationKeys,
    animationMap,
    contactByAnimation,
    variants,
    quickslashPhaseVariants,
    quickslashAnimationKeys,
    quickslashAnimationKeyByPhaseVariantId: Object.freeze(Object.fromEntries(
      quickslashPhaseVariants.map((variant) => [variant.id, variant.animationKey]),
    )),
    quickslashContactByAnimation,
    quickslashVariants,
  });
}
