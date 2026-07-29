/** Derives Survival-profile animation data from the generated moving-side-dig contract. */

export function buildSurvivalUalMovingSideDigProfile(config) {
  const actions = Object.freeze(Object.values(config.actions));
  const handoff = config.phaseHandoff;
  const phaseVariants = handoff.variants;
  const animationKeys = Object.freeze(
    phaseVariants.map((variant) => variant.animationKey),
  );
  const animationMap = Object.freeze(Object.fromEntries(
    actions.map((action) => [action.baseAnimationKey, action.animationKey]),
  ));
  const contactByAnimation = Object.freeze(Object.fromEntries(
    phaseVariants.map((variant) => [variant.animationKey, Object.freeze({
      textureFrame: config.contactFrame,
      sequenceIndex: config.contactSequenceIndex,
      sourceAction: variant.manifestAction,
      markerGroup: "hands",
      visualAlignmentMode: config.contactAlignmentMode,
    })]),
  ));
  const variants = Object.freeze(phaseVariants.map((variant) => Object.freeze({
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
  });
}
