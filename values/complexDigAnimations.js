const range = (from, to) => Object.freeze(
  Array.from({ length: to - from + 1 }, (_, index) => from + index),
);

const clip = ({
  id, fileName, from, to, contactFrame, contactSequenceIndex,
  contacts = null, originY, markerGroup, sourceAction,
}) => {
  const authoredContacts = Object.freeze((contacts || [
    Object.freeze({ textureFrame: contactFrame, sequenceIndex: contactSequenceIndex }),
  ]).map((entry) => Object.freeze({
    textureFrame: entry.textureFrame,
    sequenceIndex: entry.sequenceIndex,
  })));
  const primaryContact = authoredContacts[authoredContacts.length - 1];
  return Object.freeze({
    id,
    sheetKey: `survival-mixamo-v3-complex-dig-${id}-sheet`,
    animationKey: `survival-mixamo-v3-complex-dig-${id}-anim`,
    fileName,
    frames: range(from, to),
    frameRate: 30,
    contact: Object.freeze({
      textureFrame: primaryContact.textureFrame,
      sequenceIndex: primaryContact.sequenceIndex,
      contacts: authoredContacts,
      sourceAction,
      markerGroup,
      visualAlignmentEnabled: false,
    }),
    origin: Object.freeze({ x: 0.5, y: originY }),
  });
};

const clips = Object.freeze({
  cross: clip({ id: "cross", fileName: "survival-character-mixamo-v3-dig-side-cross-sheet.png", from: 3, to: 14, contactFrame: 10, contactSequenceIndex: 7, originY: 912 / 1024, markerGroup: "hands", sourceAction: "mixamo-cross-punch" }),
  jab: clip({ id: "jab", fileName: "survival-character-mixamo-v3-dig-side-jab-sheet.png", from: 3, to: 13, contactFrame: 9, contactSequenceIndex: 6, originY: 905 / 1024, markerGroup: "hands", sourceAction: "mixamo-jab-punch" }),
  roundhouse: clip({ id: "roundhouse", fileName: "survival-character-mixamo-v3-dig-side-roundhouse-sheet.png", from: 2, to: 18, contactFrame: 8, contactSequenceIndex: 6, originY: 921 / 1024, markerGroup: "feet", sourceAction: "mixamo-mma-roundhouse-kick" }),
  jabElbow: clip({ id: "jab-elbow", fileName: "survival-character-mixamo-v3-dig-side-jab-elbow-sheet.png", from: 1, to: 28, contactFrame: 20, contactSequenceIndex: 19, contacts: [Object.freeze({ textureFrame: 9, sequenceIndex: 8 }), Object.freeze({ textureFrame: 20, sequenceIndex: 19 })], originY: 911 / 1024, markerGroup: "hands", sourceAction: "mixamo-jab-to-elbow-combo" }),
  lowKick: clip({ id: "low-kick", fileName: "survival-character-mixamo-v3-dig-side-low-kick-sheet.png", from: 2, to: 16, contactFrame: 8, contactSequenceIndex: 6, originY: 918 / 1024, markerGroup: "feet", sourceAction: "mixamo-mma-low-kick" }),
  highKick: clip({ id: "high-kick", fileName: "survival-character-mixamo-v3-dig-side-high-kick-sheet.png", from: 2, to: 20, contactFrame: 9, contactSequenceIndex: 7, originY: 915 / 1024, markerGroup: "feet", sourceAction: "mixamo-mma-high-kick" }),
  spinningBackKick: clip({ id: "spinning-back-kick", fileName: "survival-character-mixamo-v3-dig-side-spinning-back-kick-sheet.png", from: 2, to: 23, contactFrame: 16, contactSequenceIndex: 14, originY: 918 / 1024, markerGroup: "feet", sourceAction: "mixamo-mma-spinning-back-kick" }),
  elbowUppercut: clip({ id: "elbow-uppercut", fileName: "survival-character-mixamo-v3-dig-side-elbow-uppercut-sheet.png", from: 1, to: 26, contactFrame: 22, contactSequenceIndex: 21, contacts: [Object.freeze({ textureFrame: 11, sequenceIndex: 10 }), Object.freeze({ textureFrame: 22, sequenceIndex: 21 })], originY: 913 / 1024, markerGroup: "hands", sourceAction: "mixamo-elbow-uppercut-combo" }),
  singleElbow: clip({ id: "single-elbow", fileName: "survival-character-mixamo-v3-dig-side-single-elbow-sheet.png", from: 3, to: 13, contactFrame: 10, contactSequenceIndex: 7, originY: 919 / 1024, markerGroup: "hands", sourceAction: "mixamo-male-elbow-punch" }),
  hook: clip({ id: "hook", fileName: "survival-character-mixamo-v3-dig-side-hook-sheet.png", from: 4, to: 17, contactFrame: 11, contactSequenceIndex: 7, originY: 911 / 1024, markerGroup: "hands", sourceAction: "mixamo-hook-punch" }),
  uppercut: clip({ id: "uppercut", fileName: "survival-character-mixamo-v3-dig-up-uppercut-sheet.png", from: 3, to: 19, contactFrame: 17, contactSequenceIndex: 14, originY: 912 / 1024, markerGroup: "hands", sourceAction: "mixamo-uppercut" }),
});

// Cross Punch was removed in error. Keep the resident Jab first so the
// remaining SIDE pack warms before the restored Cross is selected.
const excludedSideClips = Object.freeze([]);
const sideFamilies = Object.freeze([
  Object.freeze(["jab", "cross", "roundhouse"]),
  Object.freeze(["jabElbow"]),
  Object.freeze(["lowKick", "highKick", "spinningBackKick"]),
  Object.freeze(["elbowUppercut", "singleElbow", "hook"]),
]);

export const COMPLEX_DIG_ANIMATIONS = Object.freeze({
  version: "complex-dig-animations-v4-20260906",
  enabledByDefault: true,
  rollbackQuery: "complexDig",
  disabledQueryValue: "0",
  runtimeGlobal: "__DIG_GAME_COMPLEX_DIG_ANIMATIONS__",
  toggle: Object.freeze({ code: "Digit9", ctrlKey: true, altKey: true }),
  basePath: "sprites/character/survival-character-blender-v2/runtime",
  displaySizePx: 103,
  visualPolish: Object.freeze({
    piskelPackage: "complex-dig-piskel-polish-v2",
    editableSourceDirectory: "sprites/character/survival-character-blender-v2/piskel-polish/complex-dig-v2",
    renderAuthority: "Survival V4 PBR / 1024 px source / one downsample",
    uniformDisplaySizePx: 103,
    maximumHandoffDriftPx: 0.51,
    colorPolicy: "piskel-family-gamma-match-to-existing-idle-walk-preserve-v4-hues",
    scalePolicy: "one-fixed-scale-per-family-no-per-frame-resize",
  }),
  sourceFacesRight: true,
  clips,
  excludedSideClips,
  sideFamilies,
  sideSequence: Object.freeze(sideFamilies.flatMap((family) => family)),
  upSequence: Object.freeze(["uppercut"]),
});

export function resolveComplexDigAnimationsEnabled(
  search = globalThis.location?.search || "",
) {
  if (typeof search !== "string") return COMPLEX_DIG_ANIMATIONS.enabledByDefault;
  return new URLSearchParams(search).get(COMPLEX_DIG_ANIMATIONS.rollbackQuery)
    !== COMPLEX_DIG_ANIMATIONS.disabledQueryValue;
}
