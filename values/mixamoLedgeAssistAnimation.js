const range = (length, start = 0) => Object.freeze(
  Array.from({ length }, (_, index) => start + index),
);

const frames = range(35);
const catchFrames = Object.freeze([5, 4, 3, 2, 1, 0]);

export const MIXAMO_LEDGE_ASSIST_ANIMATION = Object.freeze({
  version: "mixamo-ledge-assist-runtime-v2-20260830",
  basePath: "sprites/character/survival-character-blender-v2/runtime",
  sheet: Object.freeze({
    key: "survival-mixamo-v4-ledge-climb-sheet",
    fileName: "survival-character-mixamo-v4-ledge-climb-sheet.png",
    frames,
    catchFrames,
    hangFrames: Object.freeze([0]),
    climbFrames: frames,
    frameRate: 30,
    displaySizePx: 101,
    origin: Object.freeze({ x: 0.59, y: 0.71 }),
  }),
  animations: Object.freeze({
    catch: "survival-mixamo-v4-ledge-catch-anim",
    hang: "survival-mixamo-v4-ledge-hang-anim",
    climb: "survival-mixamo-v4-ledge-climb-anim",
  }),
  sourceFacesRight: true,
  sourceClip: "Mixamo Braced Hang To Crouch",
  sheetSha256: "7eee1206897f6024aa84cf864570187123139446f492b969b8d32ed5fe9e4fa8",
});
