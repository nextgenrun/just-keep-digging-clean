import { ANIMATION_TILE_CLEARANCE_POLICIES } from "./animationTileClearance.js";

const range = (from, to) => Object.freeze(
  Array.from({ length: to - from + 1 }, (_, index) => from + index),
);

const clip = ({
  id, fileName, from, to, contactFrame, contactSequenceIndex,
  originY, markerGroup, sourceAction, clearance,
}) => Object.freeze({
  id,
  sheetKey: `survival-mixamo-v3-complex-dig-${id}-sheet`,
  animationKey: `survival-mixamo-v3-complex-dig-${id}-anim`,
  fileName,
  frames: range(from, to),
  frameRate: 30,
  contact: Object.freeze({
    textureFrame: contactFrame,
    sequenceIndex: contactSequenceIndex,
    sourceAction,
    markerGroup,
    visualAlignmentEnabled: false,
  }),
  origin: Object.freeze({ x: 0.5, y: originY }),
  clearance,
});

const clips = Object.freeze({
  cross: clip({ id: "cross", fileName: "survival-character-mixamo-v3-dig-side-cross-sheet.png", from: 3, to: 14, contactFrame: 10, contactSequenceIndex: 7, originY: 912 / 1024, markerGroup: "hands", sourceAction: "mixamo-cross-punch", clearance: ANIMATION_TILE_CLEARANCE_POLICIES.sideExpressiveHands }),
  jab: clip({ id: "jab", fileName: "survival-character-mixamo-v3-dig-side-jab-sheet.png", from: 3, to: 13, contactFrame: 9, contactSequenceIndex: 6, originY: 905 / 1024, markerGroup: "hands", sourceAction: "mixamo-jab-punch", clearance: ANIMATION_TILE_CLEARANCE_POLICIES.sideExpressiveHands }),
  roundhouse: clip({ id: "roundhouse", fileName: "survival-character-mixamo-v3-dig-side-roundhouse-sheet.png", from: 2, to: 18, contactFrame: 8, contactSequenceIndex: 6, originY: 921 / 1024, markerGroup: "feet", sourceAction: "mixamo-mma-roundhouse-kick", clearance: ANIMATION_TILE_CLEARANCE_POLICIES.sideWideKick }),
  jabElbow: clip({ id: "jab-elbow", fileName: "survival-character-mixamo-v3-dig-side-jab-elbow-sheet.png", from: 1, to: 28, contactFrame: 20, contactSequenceIndex: 19, originY: 911 / 1024, markerGroup: "hands", sourceAction: "mixamo-jab-to-elbow-combo", clearance: ANIMATION_TILE_CLEARANCE_POLICIES.sideExpressiveHands }),
  lowKick: clip({ id: "low-kick", fileName: "survival-character-mixamo-v3-dig-side-low-kick-sheet.png", from: 2, to: 16, contactFrame: 8, contactSequenceIndex: 6, originY: 908 / 1024, markerGroup: "feet", sourceAction: "mixamo-mma-low-kick", clearance: ANIMATION_TILE_CLEARANCE_POLICIES.sideWideKick }),
  highKick: clip({ id: "high-kick", fileName: "survival-character-mixamo-v3-dig-side-high-kick-sheet.png", from: 2, to: 20, contactFrame: 9, contactSequenceIndex: 7, originY: 915 / 1024, markerGroup: "feet", sourceAction: "mixamo-mma-high-kick", clearance: ANIMATION_TILE_CLEARANCE_POLICIES.sideWideKick }),
  spinningBackKick: clip({ id: "spinning-back-kick", fileName: "survival-character-mixamo-v3-dig-side-spinning-back-kick-sheet.png", from: 2, to: 23, contactFrame: 16, contactSequenceIndex: 14, originY: 918 / 1024, markerGroup: "feet", sourceAction: "mixamo-mma-spinning-back-kick", clearance: ANIMATION_TILE_CLEARANCE_POLICIES.sideWideKick }),
  elbowUppercut: clip({ id: "elbow-uppercut", fileName: "survival-character-mixamo-v3-dig-side-elbow-uppercut-sheet.png", from: 1, to: 26, contactFrame: 22, contactSequenceIndex: 21, originY: 913 / 1024, markerGroup: "hands", sourceAction: "mixamo-elbow-uppercut-combo", clearance: ANIMATION_TILE_CLEARANCE_POLICIES.sideExpressiveHands }),
  singleElbow: clip({ id: "single-elbow", fileName: "survival-character-mixamo-v3-dig-side-single-elbow-sheet.png", from: 3, to: 13, contactFrame: 10, contactSequenceIndex: 7, originY: 924 / 1024, markerGroup: "hands", sourceAction: "mixamo-male-elbow-punch", clearance: ANIMATION_TILE_CLEARANCE_POLICIES.sideExpressiveHands }),
  hook: clip({ id: "hook", fileName: "survival-character-mixamo-v3-dig-side-hook-sheet.png", from: 4, to: 17, contactFrame: 11, contactSequenceIndex: 7, originY: 911 / 1024, markerGroup: "hands", sourceAction: "mixamo-hook-punch", clearance: ANIMATION_TILE_CLEARANCE_POLICIES.sideExpressiveHands }),
  uppercut: clip({ id: "uppercut", fileName: "survival-character-mixamo-v3-dig-up-uppercut-sheet.png", from: 3, to: 19, contactFrame: 17, contactSequenceIndex: 14, originY: 912 / 1024, markerGroup: "hands", sourceAction: "mixamo-uppercut", clearance: ANIMATION_TILE_CLEARANCE_POLICIES.upExpressive }),
});

const sideFamilies = Object.freeze([
  Object.freeze(["cross", "jab", "roundhouse"]),
  Object.freeze(["jabElbow"]),
  Object.freeze(["lowKick", "highKick", "spinningBackKick"]),
  Object.freeze(["elbowUppercut", "singleElbow", "hook"]),
]);

export const COMPLEX_DIG_ANIMATIONS = Object.freeze({
  version: "complex-dig-animations-v1-20260820",
  enabledByDefault: true,
  rollbackQuery: "complexDig",
  disabledQueryValue: "0",
  runtimeGlobal: "__DIG_GAME_COMPLEX_DIG_ANIMATIONS__",
  toggle: Object.freeze({ code: "Digit9", ctrlKey: true, altKey: true }),
  basePath: "sprites/character/survival-character-blender-v2/runtime",
  displaySizePx: 101,
  sourceFacesRight: true,
  clips,
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
