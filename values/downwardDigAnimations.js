const frameRange = (from, to) => Object.freeze(
  Array.from({ length: to - from + 1 }, (_, index) => from + index),
);

const clip = ({
  id,
  fileName,
  reviewFileName,
  sourceSha256,
  unifiedSha256,
  from,
  to,
  contactFrame,
  sourceAction,
  markerGroup,
}) => Object.freeze({
  id,
  sheetKey: `survival-mixamo-v3-downward-dig-${id}-sheet`,
  animationKey: `survival-mixamo-v3-downward-dig-${id}-anim`,
  fileName,
  reviewFileName,
  sourceSha256,
  unifiedSha256,
  frames: frameRange(from, to),
  frameRate: 30,
  contact: Object.freeze({
    textureFrame: contactFrame,
    sequenceIndex: contactFrame - from,
    sourceAction,
    markerGroup,
    visualAlignmentEnabled: false,
  }),
  origin: Object.freeze({ x: 0.5, y: 228 / 256 }),
});

const clips = Object.freeze({
  bodyLow: clip({
    id: "body-low",
    fileName: "survival-character-mixamo-v3-dig-down-body-low-sheet.png",
    reviewFileName: "survival-mixamo-punch-v1-body-low-sheet.png",
    sourceSha256: "074163aa5a55440748c93334f8dff931534f454b121fb49585e04350739c8e51",
    unifiedSha256: "d4dfa5aef3c4c3e6f7240e17b8e13078654530ed33a8b8b3a05c281a080e17db",
    from: 2,
    to: 18,
    contactFrame: 12,
    sourceAction: "mixamo-body-punch-low",
    markerGroup: "hands",
  }),
  legSweep: clip({
    id: "leg-sweep",
    fileName: "survival-character-mixamo-v3-dig-down-leg-sweep-sheet.png",
    reviewFileName: "survival-mixamo-punch-v1-leg-sweep-sheet.png",
    sourceSha256: "f2cf0598c6c98875d111e20a24b187aab592e8bfe4c65c87d0eaf743dedb5471",
    unifiedSha256: "3613596aa33627cca1f7b04d456a201f79747bd78cc1b100c62345816c1edc6c",
    from: 2,
    to: 23,
    contactFrame: 16,
    sourceAction: "mixamo-leg-sweep",
    markerGroup: "feet",
  }),
});

export const DOWNWARD_DIG_ANIMATIONS = Object.freeze({
  version: "downward-dig-animations-v2-20260906",
  enabledByDefault: true,
  rollbackQuery: "downDigCombo",
  disabledQueryValue: "0",
  basePath: "sprites/character/survival-character-blender-v2/runtime",
  reviewSourceRoot:
    "testing/blender-animation-lab-v1/review-drafts/mixamo-punch-sequence-sandbox-v1/renders/candidate",
  displaySizePx: 103,
  sourceFacesRight: true,
  clips,
  // The wide turning leg-sweep step was rejected for downward mining.
  // Retain its source metadata for review; only this sequence enters runtime.
  sequence: Object.freeze(["bodyLow"]),
});

export function resolveDownwardDigAnimationsEnabled(
  search = globalThis.location?.search || "",
) {
  if (typeof search !== "string") return DOWNWARD_DIG_ANIMATIONS.enabledByDefault;
  return new URLSearchParams(search).get(DOWNWARD_DIG_ANIMATIONS.rollbackQuery)
    !== DOWNWARD_DIG_ANIMATIONS.disabledQueryValue;
}
