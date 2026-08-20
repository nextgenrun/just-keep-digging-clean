const root = "../../../sprites/character/";
const blender = `${root}survival-character-blender-v2/runtime/`;
const ual = `${root}survival-ual-player-v1/runtime/`;
const range = (count, start = 0) => Array.from({ length: count }, (_, i) => start + i);

const clip = (file, frames, columns, fps, display, originY, options = {}) =>
  Object.freeze({
    file,
    frames: Array.isArray(frames) ? frames : range(frames),
    columns,
    fps,
    display,
    originY,
    loop: options.loop ?? true,
    offsetY: options.offsetY ?? 0,
    label: options.label || "Current runtime",
  });

export const CURRENT = Object.freeze({
  idle: clip(`${blender}survival-character-blender-v2-idle-sheet.png`, 48, 16, 12, 101, 228 / 256, { label: "Current Blender idle" }),
  walkStart: clip(`${blender}survival-character-mixamo-v1-walk-start-sheet.png`, 16, 16, 30, 101, 899 / 1024, { loop: false, label: "Current walk startup" }),
  walk: clip(`${blender}survival-character-blender-v2-walk-sheet.png`, 24, 16, 30, 104, 224 / 256, { label: "Current Blender walk" }),
  run: clip(`${ual}survival-ual-player-v1-animation-polish-run-sheet.webp`, 28, 16, 30, 123, 248 / 256, { label: "Current UAL run" }),
  walkStop: clip(`${blender}survival-character-mixamo-v1-walk-stop-sheet.png`, 16, 16, 30, 101, 898 / 1024, { loop: false, label: "Current walk slowdown" }),
  crouch: clip(`${blender}survival-character-mixamo-v1-crouch-idle-sheet.png`, 28, 16, 20, 101, 918 / 1024, { label: "Current duck" }),
  jump: clip(`${ual}survival-ual-player-v1-airborne-sheet.webp`, 41, 16, 30, 109, 247 / 256, { loop: false, label: "Current fixed jump" }),
  flight: clip(`${blender}survival-character-mixamo-v1-flight-loop-sheet.png`, 48, 16, 18, 101, 915 / 1024, { offsetY: -24, label: "Current Flight" }),
  landing: clip(`${blender}survival-character-mixamo-v1-hard-landing-sheet.png`, range(10, 14), 16, 30, 101, 897 / 1024, { loop: false, label: "Current hard landing" }),
  digSide: clip(`${blender}survival-character-mixamo-v3-dig-side-cross-sheet.png`, range(12, 3), 16, 30, 101, 912 / 1024, { loop: false, label: "Current side combo family" }),
  digUp: clip(`${blender}survival-character-mixamo-v3-dig-up-uppercut-sheet.png`, range(17, 3), 16, 30, 101, 912 / 1024, { loop: false, label: "Current up Uppercut" }),
  digDown: clip(`${ual}survival-ual-player-v1-ground-strike-sheet.webp`, 41, 16, 30, 101, 244 / 256, { loop: false, label: "Current down strike" }),
  wall: clip(`${ual}survival-ual-player-v1-animation-polish-transitions-sheet.webp`, range(16, 60), 16, 30, 101, 244 / 256, { label: "Current wall push" }),
  thunder: clip(`${blender}survival-character-mixamo-v1-thunder-ground-sheet.png`, 30, 16, 24, 101, 903 / 1024, { loop: false, label: "Current Thunder" }),
  teleport: clip(`${ual}survival-ual-player-v1-teleport-sheet.webp`, 45, 16, 30, 109, 244 / 256, { loop: false, label: "Current teleport roll" }),
  hit: clip(`${ual}survival-ual-player-v1-hit-react-sheet.webp`, 11, 11, 30, 101, 244 / 256, { loop: false, label: "Current hit reaction" }),
  death: clip(`${ual}survival-ual-player-v1-death-sheet.webp`, 73, 16, 30, 101, 244 / 256, { loop: false, label: "Current death" }),
});
