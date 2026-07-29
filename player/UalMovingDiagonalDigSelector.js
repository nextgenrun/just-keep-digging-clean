import {
  PLAYER_ANIMATION_POLISH,
  isPlayerAnimationFeatureEnabled,
} from "../values/playerAnimationPolish.js";

function modulo(value, count) {
  return ((Math.floor(value) % count) + count) % count;
}

function directionFromAim(aim) {
  if (aim === "UP-LEFT" || aim === "DOWN-LEFT") return -1;
  if (aim === "UP-RIGHT" || aim === "DOWN-RIGHT") return 1;
  return 0;
}

function familyFromAim(aim) {
  if (aim === "UP-LEFT" || aim === "UP-RIGHT") return "up";
  if (aim === "DOWN-LEFT" || aim === "DOWN-RIGHT") return "down";
  return null;
}

function directionFromMotion(motionState, horizontalVelocity, minimumSpeed) {
  if (motionState === "walk-left") return -1;
  if (motionState === "walk-right") return 1;
  const velocity = Number(horizontalVelocity) || 0;
  if (Math.abs(velocity) < minimumSpeed) return 0;
  return Math.sign(velocity);
}

function phaseFromVariant(currentAnimationKey, currentFrameIndex, variants, count) {
  const variant = variants?.find((entry) => entry.animationKey === currentAnimationKey);
  if (!variant || !Number.isFinite(currentFrameIndex)) return null;
  const sequenceIndex = Math.max(0, Math.floor(currentFrameIndex) - 1);
  const authoredRunFrame = variant.runFrames?.[sequenceIndex];
  if (Number.isFinite(authoredRunFrame)) return modulo(authoredRunFrame, count);
  return modulo(variant.runStartFrame + sequenceIndex, count);
}

function outgoingJogFrame({
  profile,
  config,
  currentAnimationKey,
  currentFrameIndex,
  currentTextureFrame,
}) {
  const count = config.runFrameCount;
  if (
    currentAnimationKey === profile?.walkRunAnim
    && Number.isFinite(currentTextureFrame)
  ) return modulo(currentTextureFrame, count);
  const diagonalPhase = phaseFromVariant(
    currentAnimationKey,
    currentFrameIndex,
    config.variants,
    count,
  );
  if (diagonalPhase !== null) return diagonalPhase;
  const sidePhase = phaseFromVariant(
    currentAnimationKey,
    currentFrameIndex,
    profile?.movingSideDigConfig?.phaseHandoff?.variants,
    count,
  );
  if (sidePhase !== null) return sidePhase;
  return modulo(profile?.movingSideDigConfig?.phaseHandoff?.fallbackOutgoingJogFrame ?? 8, count);
}

export function resolveMovingDiagonalDigAnimation({
  profile,
  animationKey,
  aim,
  actionKind = "normal",
  grounded,
  motionState,
  horizontalVelocity = 0,
  currentAnimationKey = null,
  currentFrameIndex = 0,
  currentTextureFrame = null,
  search = globalThis.location?.search || "",
} = {}) {
  const polish = profile?.animationPolishConfig || PLAYER_ANIMATION_POLISH;
  const config = profile?.movingDiagonalDigConfig || polish.diagonalMining;
  const family = familyFromAim(aim);
  const unchanged = Object.freeze({
    animationKey,
    outgoingJogFrame: null,
    resumeJogFrame: null,
    phaseVariantId: null,
  });
  if (
    !family
    || profile?.movingDiagonalDigAnimationMap?.[animationKey] !== family
    || actionKind !== "normal"
    || !isPlayerAnimationFeatureEnabled(config, search, polish)
    || (config.requireGrounded && grounded !== true)
  ) return unchanged;

  const targetDirection = directionFromAim(aim);
  const movementDirection = directionFromMotion(
    motionState,
    horizontalVelocity,
    config.minHorizontalSpeedPxPerSec,
  );
  if (movementDirection === 0) return unchanged;
  if (config.requireTowardTarget && targetDirection !== movementDirection) return unchanged;

  const outgoing = outgoingJogFrame({
    profile,
    config,
    currentAnimationKey,
    currentFrameIndex,
    currentTextureFrame,
  });
  const variantId = config[family].entryVariantIdByOutgoingJogFrame[outgoing];
  const variant = config.variants.find((entry) => entry.id === variantId);
  if (!variant) return unchanged;
  return Object.freeze({
    animationKey: variant.animationKey,
    outgoingJogFrame: outgoing,
    resumeJogFrame: variant.resumeJogFrame,
    phaseVariantId: variant.id,
  });
}
