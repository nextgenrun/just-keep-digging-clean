import { PLAYER_CHARACTER_IDS, normalizePlayerCharacterId } from "./playerCharacters.js";
import { SURVIVAL_UAL_PLAYER_ASSET_PROFILE } from "./survivalUalPlayerAssetProfile.js?rev=20260825-unified-animation-v1";
import { UAL_NATIVE_PLAYER_ASSET_PROFILE } from "./ualNativePlayerAssetProfile.js";

export { SURVIVAL_UAL_PLAYER_ASSET_PROFILE } from "./survivalUalPlayerAssetProfile.js?rev=20260825-unified-animation-v1";

const range = (length) => Array.from({ length }, (_, index) => index);

const splitFrameGroups = (frameCount, groupCount) => {
  const groups = [];
  let cursor = 0;
  for (let groupIndex = 0; groupIndex < groupCount; groupIndex += 1) {
    const remainingFrames = frameCount - cursor;
    const remainingGroups = groupCount - groupIndex;
    const groupSize = Math.ceil(remainingFrames / remainingGroups);
    groups.push(range(groupSize).map(index => cursor + index));
    cursor += groupSize;
  }
  return groups;
};

const robot = Object.freeze({
  characterId: PLAYER_CHARACTER_IDS.robot,
  basePath: "sprites/character/character-v8/robot-runtime",
  version: "robot-grok-box-20260624",

  idleSheet: "robot-v1-idle-sheet",
  walkStartSheet: "robot-v1-walk-start-sheet",
  walkLoopSheet: "robot-v1-walk-loop-sheet",
  walkSheet: "robot-v1-walk-loop-sheet",
  walkRunSheet: "robot-v1-walk-run-sheet",
  walkStopSheet: "robot-v1-walk-stop-sheet",
  airborneSheet: "robot-v1-airborne-sheet",
  fallingSheet: "robot-v1-falling-sheet",
  duckSheet: "robot-v1-duck-sheet",
  digDownSheet: "robot-v1-dig-down-sheet",
  digSidewaysSheet: "robot-v1-dig-sideways-sheet",
  digUpSheet: "robot-v1-dig-up-sheet",
  digUpSidewaysSheet: "robot-v1-dig-up-sideways-sheet",
  digUpLookSheet: "robot-v1-dig-up-look-sheet",
  wallPushSheet: "robot-v1-wall-push-sheet",
  combatIdleRecoverSheet: "robot-v1-combat-idle-recover-sheet",
  flySheet: "robot-v1-fly-sheet",
  quickslashSheet: "robot-v1-quickslash-sheet",
  thunderStrikeChargeSheet: "robot-v1-thunder-charge-sheet",
  thunderStrikeStrikeSheet: "robot-v1-thunder-strike-sheet",
  attackDownSheet: "robot-v1-attack-down-sheet",
  earthquakeReactSheet: "robot-v1-earthquake-react-sheet",

  idleFrames: range(19),
  walkFrames: range(52),
  walkStartFrames: range(21),
  walkLoopFrames: range(52),
  walkRunFrames: range(37),
  walkStopFrames: range(27),
  airborneFrames: range(39),
  fallingFrames: range(13),
  duckFrames: range(26),
  digDownFrames: range(39),
  digSidewaysFrames: range(26),
  digUpFrames: range(29),
  digUpSidewaysFrames: range(13),
  digUpLookFrames: range(1),
  wallPushFrames: range(8),
  combatIdleRecoverFrames: range(13),
  flyFrames: range(26),
  quickslashFrames: range(10),
  thunderStrikeChargeFrames: range(11),
  thunderStrikeStrikeFrames: range(13),
  attackDownFrames: range(13),
  earthquakeReactFrames: range(13),

  idleAnim: "robot-v1-idle-anim",
  walkAnim: "robot-v1-walk-loop-anim",
  walkStartAnim: "robot-v1-walk-start-anim",
  walkLoopAnim: "robot-v1-walk-loop-anim",
  walkRunAnim: "robot-v1-walk-run-anim",
  walkStopAnim: "robot-v1-walk-stop-anim",
  airborneAnim: "robot-v1-airborne-anim",
  fallingAnim: "robot-v1-falling-anim",
  duckAnim: "robot-v1-duck-anim",
  digDownAnim: "robot-v1-dig-down-anim",
  digSidewaysAnim: "robot-v1-dig-sideways-hit-1-anim",
  digUpAnim: "robot-v1-dig-up-hit-1-anim",
  digUpSidewaysAnim: "robot-v1-dig-up-sideways-hit-1-anim",
  digUpLookAnim: "robot-v1-dig-up-look-anim",
  wallPushAnim: "robot-v1-wall-push-anim",
  combatIdleRecoverAnim: "robot-v1-combat-idle-recover-anim",
  flyAnim: "robot-v1-fly-anim",
  quickslashAnim: "robot-v1-quickslash-anim",
  thunderStrikeChargeAnim: "robot-v1-thunder-charge-anim",
  thunderStrikeStrikeAnim: "robot-v1-thunder-strike-anim",
  attackDownAnim: "robot-v1-attack-down-anim",
  earthquakeReactAnim: "robot-v1-earthquake-react-anim",

  digSidewaysHitAnims: range(5).map(index => `robot-v1-dig-sideways-hit-${index + 1}-anim`),
  digUpHitAnims: range(3).map(index => `robot-v1-dig-up-hit-${index + 1}-anim`),
  digUpSidewaysHitAnims: range(6).map(index => `robot-v1-dig-up-sideways-hit-${index + 1}-anim`),
  digSidewaysHitFrames: splitFrameGroups(26, 5),
  digUpHitFrames: splitFrameGroups(29, 3),
  digUpSidewaysHitFrames: splitFrameGroups(13, 6),
  digAnims: [
    "robot-v1-dig-down-anim",
    ...range(5).map(index => `robot-v1-dig-sideways-hit-${index + 1}-anim`),
    ...range(3).map(index => `robot-v1-dig-up-hit-${index + 1}-anim`),
    ...range(6).map(index => `robot-v1-dig-up-sideways-hit-${index + 1}-anim`),
  ],
  walkAnims: ["robot-v1-walk-start-anim", "robot-v1-walk-loop-anim", "robot-v1-walk-run-anim", "robot-v1-walk-stop-anim"],
  walkMovingAnims: ["robot-v1-walk-start-anim", "robot-v1-walk-loop-anim", "robot-v1-walk-run-anim"],

  quickslashSourceFacesRight: false,
  wallPushAnimationFps: 8,
  digDownAnimationFps: 18,
  fallingAnimationFps: 12,
  walkRunAnimationFps: 16,
  combatIdleRecoverAnimationFps: 8,
  idleAnimationFps: 8,
  digSidewaysAnimationFps: 24,
  digUpAnimationFps: 24,
  quickslashAnimationFps: 12,
  thunderStrikeChargeAnimationFps: 8,
  thunderStrikeStrikeAnimationFps: 12,
  airborneAnimationFps: 12,
  duckAnimationFps: 8,
  walkAnimation: {
    baseSpeedPxPerSec: 200,
    baseFps: 14,
    minTimeScale: 0.75,
    maxTimeScale: 1.85,
    runSpeedRatioThreshold: 1.35,
  },
});

const drillHead = Object.freeze({
  characterId: PLAYER_CHARACTER_IDS.drillHead,
  isLivingDrill: true,
  basePath: "sprites/character/living-drill-v1/runtime",
  version: "living-drill-eur5-polished-20260630",
  frameWidth: 94,
  frameHeight: 94,
  visualScale: 1.88,
  idleSheet: "living-drill-v1-idle-sheet",
  digSheet: "living-drill-v1-dig-sheet",
  flySheet: "living-drill-v1-fly-sheet",
  requiredSheets: ["living-drill-v1-idle-sheet", "living-drill-v1-dig-sheet", "living-drill-v1-fly-sheet"],
  idleFrames: range(8),
  digFrames: range(10),
  flyFrames: range(8),
  idleAnim: "living-drill-idle",
  walkAnim: "living-drill-idle",
  walkStartAnim: "living-drill-idle",
  walkLoopAnim: "living-drill-idle",
  walkRunAnim: "living-drill-idle",
  walkStopAnim: "living-drill-idle",
  airborneAnim: "living-drill-idle",
  fallingAnim: "living-drill-idle",
  duckAnim: "living-drill-idle",
  digDownAnim: "living-drill-dig",
  digSidewaysAnim: "living-drill-dig",
  digUpAnim: "living-drill-dig",
  digUpSidewaysAnim: "living-drill-dig",
  digUpLookAnim: "living-drill-idle",
  wallPushAnim: "living-drill-idle",
  combatIdleRecoverAnim: "living-drill-idle",
  flyAnim: "living-drill-fly",
  quickslashAnim: "living-drill-dig",
  thunderStrikeChargeAnim: "living-drill-idle",
  thunderStrikeStrikeAnim: "living-drill-dig",
  attackDownAnim: "living-drill-dig",
  earthquakeReactAnim: "living-drill-idle",
  digSidewaysHitAnims: ["living-drill-dig"],
  digUpHitAnims: ["living-drill-dig"],
  digUpSidewaysHitAnims: ["living-drill-dig"],
  digAnims: ["living-drill-dig"],
  walkAnims: ["living-drill-idle"],
  walkMovingAnims: ["living-drill-idle"],
  quickslashSourceFacesRight: false,
  idleAnimationFps: 7,
  digAnimationFps: 14,
  flyAnimationFps: 9,
  walkAnimation: {
    baseSpeedPxPerSec: 200,
    baseFps: 7,
    minTimeScale: 1,
    maxTimeScale: 1,
    runSpeedRatioThreshold: 1.35,
  },
});

export const PLAYER_ASSET_PROFILES = Object.freeze({
  [PLAYER_CHARACTER_IDS.ualNative]: UAL_NATIVE_PLAYER_ASSET_PROFILE,
  [PLAYER_CHARACTER_IDS.survivalUal]: SURVIVAL_UAL_PLAYER_ASSET_PROFILE,
  [PLAYER_CHARACTER_IDS.robot]: robot,
  [PLAYER_CHARACTER_IDS.drillHead]: drillHead,
});

export function getPlayerAssetProfile(value) {
  return PLAYER_ASSET_PROFILES[normalizePlayerCharacterId(value)] || UAL_NATIVE_PLAYER_ASSET_PROFILE;
}

export function resolvePlayerDisplaySizePx(profile, fallbackSizePx, animationKey = null) {
  const animationSize = animationKey
    ? Number(profile?.displaySizePxByAnimation?.[animationKey])
    : NaN;
  if (Number.isFinite(animationSize) && animationSize > 0) return animationSize;
  const profileSize = Number(profile?.displaySizePx);
  if (Number.isFinite(profileSize) && profileSize > 0) return profileSize;
  return fallbackSizePx;
}

export function resolvePlayerVisualOrigin(profile, animationKey = null, textureKey = null, fallback = {}) {
  const animationOrigin = animationKey ? profile?.visualOriginByAnimation?.[animationKey] : null;
  const sheetOrigin = textureKey ? profile?.visualOriginBySheet?.[textureKey] : null;
  const override = animationOrigin || sheetOrigin;
  const fallbackX = Number.isFinite(fallback.x) ? fallback.x : 0.5;
  const fallbackY = Number.isFinite(fallback.y) ? fallback.y : 1;
  const profileX = Number.isFinite(profile?.visualOriginX) ? profile.visualOriginX : fallbackX;
  const profileY = Number.isFinite(profile?.visualOriginY) ? profile.visualOriginY : fallbackY;
  return {
    x: Number.isFinite(override?.x) ? override.x : profileX,
    y: Number.isFinite(override?.y) ? override.y : profileY,
  };
}
