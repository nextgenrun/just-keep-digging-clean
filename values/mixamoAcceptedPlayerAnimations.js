const range = (length, start = 0) => Object.freeze(
  Array.from({ length }, (_, index) => start + index),
);

const sheet = ({ key, fileName, frames, frameRate, originY }) => Object.freeze({
  key,
  fileName,
  frames: range(frames),
  frameRate,
  displaySizePx: 101,
  origin: Object.freeze({ x: 0.5, y: originY }),
});

// Runtime projection of values/mixamoAcceptedRuntime.json. These clips were
// explicitly accepted in the replacement review and rendered through the
// approved Survival V4 mesh/material pipeline at 1024px before one downsample.
export const MIXAMO_ACCEPTED_PLAYER_ANIMATIONS = Object.freeze({
  version: "mixamo-accepted-runtime-v2-20260819",
  basePath: "sprites/character/survival-character-blender-v2/runtime",
  sheets: Object.freeze({
    flight: sheet({
      key: "survival-mixamo-v1-flight-loop-sheet",
      fileName: "survival-character-mixamo-v1-flight-loop-sheet.png",
      frames: 48,
      frameRate: 18,
      // Preserve the approved prone-flight body-center offset rather than
      // anchoring the airborne silhouette to its transparent cell bottom.
      originY: 0.915,
    }),
    walkStart: sheet({
      key: "survival-mixamo-v1-walk-start-sheet",
      fileName: "survival-character-mixamo-v1-walk-start-sheet.png",
      frames: 16,
      frameRate: 30,
      originY: 899 / 1024,
    }),
    walkStop: sheet({
      key: "survival-mixamo-v1-walk-stop-sheet",
      fileName: "survival-character-mixamo-v1-walk-stop-sheet.png",
      frames: 16,
      frameRate: 30,
      originY: 898 / 1024,
    }),
    idleFidget: sheet({
      key: "survival-mixamo-v1-idle-fidget-sheet",
      fileName: "survival-character-mixamo-v1-idle-looking-sheet.png",
      frames: 120,
      frameRate: 18,
      originY: 903 / 1024,
    }),
    crouch: sheet({
      key: "survival-mixamo-v1-crouch-idle-sheet",
      fileName: "survival-character-mixamo-v1-crouch-idle-sheet.png",
      frames: 28,
      frameRate: 20,
      originY: 918 / 1024,
    }),
    crouchEnter: sheet({
      key: "survival-mixamo-v1-crouch-enter-sheet",
      fileName: "survival-character-mixamo-v1-crouch-enter-sheet.png",
      frames: 18,
      frameRate: 24,
      originY: 915 / 1024,
    }),
    crouchExit: sheet({
      key: "survival-mixamo-v1-crouch-exit-sheet",
      fileName: "survival-character-mixamo-v1-crouch-exit-sheet.png",
      frames: 18,
      frameRate: 24,
      originY: 916 / 1024,
    }),
    thunderStrike: sheet({
      key: "survival-mixamo-v1-thunder-ground-sheet",
      fileName: "survival-character-mixamo-v1-thunder-ground-sheet.png",
      frames: 30,
      frameRate: 24,
      originY: 917 / 1024,
    }),
    hardLanding: Object.freeze({
      ...sheet({
        key: "survival-mixamo-v1-hard-landing-sheet",
        fileName: "survival-character-mixamo-v1-hard-landing-sheet.png",
        frames: 24,
        frameRate: 30,
        originY: 897 / 1024,
      }),
      // The game selects landing after contact. Start just before the authored
      // impact instead of replaying the clip's long airborne descent on ground.
      runtimeFrames: range(14, 10),
    }),
    quickslash: sheet({
      key: "survival-mixamo-v2-hurricane-quickslash-sheet",
      fileName: "survival-character-mixamo-v2-hurricane-quickslash-sheet.png",
      frames: 28,
      frameRate: 30,
      originY: 912 / 1024,
    }),
  }),
  animations: Object.freeze({
    flight: "survival-mixamo-v1-flight-loop-anim",
    walkStart: "survival-mixamo-v1-walk-start-anim",
    walkStop: "survival-mixamo-v1-walk-stop-anim",
    idleFidget: "survival-mixamo-v1-idle-looking-fidget-anim",
    crouch: "survival-mixamo-v1-crouch-idle-anim",
    crouchEnter: "survival-mixamo-v1-crouch-enter-anim",
    crouchExit: "survival-mixamo-v1-crouch-exit-anim",
    thunderStrike: "survival-mixamo-v1-thunder-ground-anim",
    hardLanding: "survival-mixamo-v1-hard-landing-anim",
    quickslash: "survival-mixamo-v2-hurricane-quickslash-anim",
  }),
  thunderContactSequenceIndex: 20,
  quickslashContactSequenceIndex: 16,
});
