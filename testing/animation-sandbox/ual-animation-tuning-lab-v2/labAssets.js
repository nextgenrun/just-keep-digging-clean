import { UAL_NATIVE_PLAYER_ASSET_PROFILE as PROFILE } from "../../../values/ualNativePlayerAssetProfile.js";
import { LAB_PATHS } from "./labConfig.js";

const clip = (id, actionId, frames, animationKey, options = {}) => Object.freeze({
  id,
  actionId,
  frames: Object.freeze(Array.from(frames || [])),
  animationKey,
  loop: options.loop === true,
  label: options.label || id,
  footstepIndices: Object.freeze(Array.from(options.footstepIndices || [])),
  flightTravel: options.flightTravel === true,
  kind: options.kind || "motion",
});

function configuredClips() {
  return new Map([
    ["idle", clip("idle", "idle", PROFILE.idleFrames, PROFILE.idleAnim, { loop: true, label: "Idle" })],
    ["walk", clip("walk", "walk", PROFILE.walkLoopFrames, PROFILE.walkLoopAnim, { loop: true, label: "Jog source review", footstepIndices: PROFILE.footstepFrameIndices[PROFILE.walkLoopAnim] })],
    ["run", clip("run", "run", PROFILE.walkRunFrames, PROFILE.walkRunAnim, { loop: true, label: "Production jog run", footstepIndices: PROFILE.footstepFrameIndices[PROFILE.walkRunAnim] })],
    ["airborne", clip("airborne", "airborne", PROFILE.airborneFrames, PROFILE.airborneRiseAnim, { label: "Jump start / rise" })],
    ["falling", clip("falling", "falling", PROFILE.airborneFallAnim ? PROFILE.fallingFrames : [], PROFILE.airborneFallAnim, { loop: true, label: "Falling" })],
    ["landing", clip("landing", "landing", PROFILE.landingFrames, PROFILE.landingAnim, { label: "Landing" })],
    ["flight-enter", clip("flight-enter", "airborne", PROFILE.flightEnterFrames, PROFILE.flightEnterAnim, { label: "Flight enter" })],
    ["flight-hover", clip("flight-hover", "airborne", PROFILE.flightHoverFrames, PROFILE.flightHoverAnim, { loop: true, label: "Flight hover" })],
    ["flight-travel-enter", clip("flight-travel-enter", "fly", PROFILE.flightTravelEnterFrames, PROFILE.flightTravelEnterAnim, { label: "Flight travel enter", flightTravel: true })],
    ["flight-travel", clip("flight-travel", "fly", PROFILE.flightTravelLoopFrames, PROFILE.flightTravelLoopAnim, { loop: true, label: "Flight travel", flightTravel: true })],
    ["flight-exit", clip("flight-exit", "airborne", PROFILE.flightExitFrames, PROFILE.flightExitAnim, { label: "Flight exit" })],
    ["jab", clip("jab", "punch-jab", PROFILE.quickslashFrames, PROFILE.digSidewaysHitAnims[0], { label: "Punch jab", kind: "action" })],
    ["cross", clip("cross", "punch-cross", PROFILE.punchCrossFrames, PROFILE.digSidewaysHitAnims[1], { label: "Cross", kind: "action" })],
    ["up-jab", clip("up-jab", "punch-uppercut", PROFILE.digUpFrames, PROFILE.digUpHitAnims[0], { label: "Uppercut A · neutral recovery", kind: "action" })],
    ["up-cross", clip("up-cross", "punch-uppercut", PROFILE.digUpFrames, PROFILE.digUpHitAnims[1], { label: "Uppercut B · neutral recovery", kind: "action" })],
    ["up-side-jab", clip("up-side-jab", "punch-uppercut", PROFILE.digUpSidewaysFrames, PROFILE.digUpSidewaysHitAnims[0], { label: "Up-side A · neutral recovery", kind: "action" })],
    ["up-side-cross", clip("up-side-cross", "punch-uppercut", PROFILE.digUpSidewaysFrames, PROFILE.digUpSidewaysHitAnims[1], { label: "Up-side B · neutral recovery", kind: "action" })],
    ["dig-down", clip("dig-down", "ground-strike", PROFILE.digDownFrames, PROFILE.digDownAnim, { label: "Dig down", kind: "action" })],
  ]);
}

function imageLoader(basePath) {
  const cache = new Map();
  return (action) => {
    if (cache.has(action.file)) return cache.get(action.file);
    const pending = new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Could not load ${action.file}`));
      image.src = `${basePath}/${action.file}`;
    });
    cache.set(action.file, pending);
    return pending;
  };
}

export async function loadProductionAssets() {
  const response = await fetch(LAB_PATHS.manifest, { cache: "no-store" });
  if (!response.ok) throw new Error(`Production manifest failed: ${response.status}`);
  const manifest = await response.json();
  const clips = configuredClips();
  const getImageForAction = imageLoader(LAB_PATHS.runtimeBase);

  function rawClip(actionId) {
    const action = manifest.actions[actionId];
    if (!action) return null;
    return clip(
      `raw-${actionId}`,
      actionId,
      Array.from({ length: action.frame_count }, (_, index) => index),
      `raw:${actionId}`,
      { loop: action.loop === true, label: actionId.replaceAll("-", " "), kind: "raw" },
    );
  }

  async function imageForClip(selectedClip) {
    const action = manifest.actions[selectedClip.actionId];
    if (!action) throw new Error(`Unknown production action ${selectedClip.actionId}`);
    return getImageForAction(action);
  }

  return Object.freeze({ manifest, clips, rawClip, imageForClip });
}
