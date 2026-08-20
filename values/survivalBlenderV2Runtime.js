const range = (length) => Object.freeze(Array.from({ length }, (_, index) => index));
const segment = (start, endExclusive) => Object.freeze(
  Array.from({ length: endExclusive - start }, (_, index) => start + index),
);
const reversed = (frames) => Object.freeze([...frames].reverse());

// These PNGs use a fixed Blender camera, unlike the baseline-cropped UAL
// action sheets. Keep the rendered mesh at the same 0.8-tile visible height
// as the gameplay body, without changing the body/collider itself.
const FRAME_SIZE_PX = 256;
const TARGET_GROUNDED_VISIBLE_HEIGHT_PX = 75.2; // 0.8 of the live 94px tile.
const groundedVisual = (visibleHeightPx, groundAnchorPx) => Object.freeze({
  displaySizePx: Math.round((TARGET_GROUNDED_VISIBLE_HEIGHT_PX * FRAME_SIZE_PX) / visibleHeightPx),
  originY: groundAnchorPx / FRAME_SIZE_PX,
});
const GROUNDED_VISUAL_CALIBRATION = Object.freeze({
  // Contract-authority alpha audit: idle 191px/228px, walk 185px/224px,
  // polished UAL run 158px/248px median. The anchor is the visible foot baseline.
  idle: groundedVisual(191, 228),
  walk: groundedVisual(185, 224),
  run: groundedVisual(158, 248),
});

const IDLE_FIDGETS = Object.freeze([
  Object.freeze({
    key: "survival-blender-v2-idle-breath-fidget-anim",
    profileSheetKey: "idleTalkSheet",
    // Continue through the settle tail so the one-shot ends beside idle frame 0
    // instead of snapping from frame 27 back to the start of the base loop.
    frames: segment(8, 48),
    frameRate: 18,
    repeat: 0,
  }),
  Object.freeze({
    key: "survival-blender-v2-idle-settle-fidget-anim",
    profileSheetKey: "idleTalkSheet",
    frames: segment(28, 48),
    frameRate: 18,
    repeat: 0,
  }),
]);

export const SURVIVAL_BLENDER_V2_RUNTIME = Object.freeze({
  basePath: "sprites/character/survival-character-blender-v2/runtime",
  visualId: "approved-survival-blender-v2",
  sheets: Object.freeze({
    idle: Object.freeze({
      key: "survival-blender-v2-idle-sheet",
      idleTalkKey: "survival-blender-v2-idle-talk-sheet",
      fileName: "survival-character-blender-v2-idle-sheet.png",
    }),
    walk: Object.freeze({
      key: "survival-blender-v2-walk-sheet",
      fileName: "survival-character-blender-v2-walk-sheet.png",
    }),
    run: Object.freeze({
      key: "survival-blender-v2-run-sheet",
      fileName: "survival-character-blender-v2-run-sheet.png",
    }),
    fly: Object.freeze({
      key: "survival-blender-v2-fly-sheet",
      fileName: "survival-character-blender-v2-superman-flight-prone-v3-sheet.png",
      // Mean alpha-bounds center across all 36 frames in the 256px source cells.
      visibleCenterNormalized: Object.freeze({
        x: 137.72222222222223 / 256,
        y: 134.76388888888889 / 256,
      }),
    }),
    digUp: Object.freeze({
      key: "survival-blender-v2-dig-up-polished-sheet",
      fileName: "survival-character-blender-v2-dig-up-piskel-polished-sheet.png",
      frameRate: 27,
      contactFrame: 11,
      contactSequenceIndex: 11,
      displaySizePx: 109,
      originX: 0.5,
      originY: 247 / 256,
      sourceAction: "survival-blender-v2-dig-up-polished",
    }),
  }),
  frames: Object.freeze({
    idle: range(48),
    walk: range(24),
    walkStart: segment(0, 6),
    walkStop: reversed(segment(0, 6)),
    run: range(28),
    fly: range(36),
    flyEnter: segment(0, 10),
    flyTravel: segment(8, 28),
    flyHover: segment(18, 32),
    flyExit: segment(26, 36),
    digUp: range(24),
  }),
  idleFidgets: IDLE_FIDGETS,
  groundedVisualCalibration: GROUNDED_VISUAL_CALIBRATION,
});
