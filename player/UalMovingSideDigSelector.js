import { MOVING_SIDE_DIG_ANIMATION } from "../values/movingSideDigAnimation.js";

function isDisabledByQuery(search, config) {
  if (typeof search !== "string" || search.length === 0) return false;
  return new URLSearchParams(search).get(config.rollbackQuery) === config.disabledQueryValue;
}

function directionFromMotion(motionState, horizontalVelocity, minimumSpeed) {
  const velocity = Number(horizontalVelocity) || 0;
  const threshold = Math.max(0, Number(minimumSpeed) || 0);
  if (Math.abs(velocity) < threshold) return 0;

  const direction = Math.sign(velocity);
  if (motionState === "walk-left" && direction !== -1) return 0;
  if (motionState === "walk-right" && direction !== 1) return 0;
  return direction;
}

function directionFromAim(aim) {
  if (aim === "LEFT") return -1;
  if (aim === "RIGHT") return 1;
  return 0;
}

function modulo(value, count) {
  return ((Math.floor(value) % count) + count) % count;
}

function resolveOutgoingJogFrame({
  profile,
  config,
  currentAnimationKey,
  currentFrameIndex,
  currentTextureFrame,
  fallbackAnimationKey,
}) {
  const handoff = config.phaseHandoff;
  const count = handoff.runFrameCount;
  const phaseVariants = [
    ...handoff.variants,
    ...(profile?.movingSideQuickslashPhaseVariants || []),
    ...(profile?.movingComplexDigPhaseVariants || []),
  ];
  if (currentAnimationKey === profile?.walkRunAnim && Number.isFinite(currentTextureFrame)) {
    return modulo(currentTextureFrame, count);
  }
  const activeVariant = phaseVariants.find(
    (variant) => variant.animationKey === currentAnimationKey,
  );
  if (activeVariant && Number.isFinite(currentFrameIndex)) {
    const sequenceIndex = Math.max(0, Math.floor(currentFrameIndex) - 1);
    const authoredRunFrame = activeVariant.runFrames?.[sequenceIndex];
    if (Number.isFinite(authoredRunFrame)) return modulo(authoredRunFrame, count);
    return modulo(activeVariant.runStartFrame + sequenceIndex, count);
  }
  const fallbackVariant = phaseVariants.find(
    (variant) => variant.base === true && variant.animationKey === fallbackAnimationKey,
  );
  if (fallbackVariant) {
    return modulo(fallbackVariant.runStartFrame - handoff.entryPhaseOffset, count);
  }
  return modulo(handoff.fallbackOutgoingJogFrame, count);
}

export function resolveMovingSideDigAnimation({
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
  const config = profile?.movingSideDigConfig || MOVING_SIDE_DIG_ANIMATION;
  const isQuickslash = actionKind === "quickslash";
  const replacement = isQuickslash && animationKey === profile?.quickslashAnim
    ? profile?.movingSideQuickslashAnimationKey
    : profile?.movingSideDigAnimationMap?.[animationKey];
  const supportedActionKind = actionKind === "normal"
    || (isQuickslash && config.quickslash?.enabledByDefault === true);
  const unchanged = Object.freeze({
    animationKey,
    outgoingJogFrame: null,
    resumeJogFrame: null,
    phaseVariantId: null,
    movingSideDigActive: false,
    targetDirectionX: 0,
  });
  if (
    !replacement
    || config.enabledByDefault !== true
    || !supportedActionKind
    || isDisabledByQuery(search, config)
  ) return unchanged;

  const targetDirection = directionFromAim(aim);
  if (targetDirection === 0) return unchanged;
  if (config.movement.requireGrounded && grounded !== true) return unchanged;
  const movementDirection = directionFromMotion(
    motionState,
    horizontalVelocity,
    config.movement.minHorizontalSpeedPxPerSec,
  );
  if (movementDirection === 0) return unchanged;
  if (config.movement.requireTowardTarget && movementDirection !== targetDirection) {
    return unchanged;
  }

  const handoff = config.phaseHandoff;
  if (
    handoff?.enabledByDefault !== true
    || isDisabledByQuery(search, handoff)
  ) {
    return Object.freeze({
      ...unchanged,
      animationKey: replacement,
      movingSideDigActive: true,
      targetDirectionX: targetDirection,
    });
  }
  const outgoingJogFrame = resolveOutgoingJogFrame({
    profile,
    config,
    currentAnimationKey,
    currentFrameIndex,
    currentTextureFrame,
    fallbackAnimationKey: replacement,
  });
  const variantId = handoff.entryVariantIdByOutgoingJogFrame[outgoingJogFrame];
  const variant = handoff.variants.find((entry) => entry.id === variantId);
  if (!variant) {
    return Object.freeze({
      ...unchanged,
      animationKey: replacement,
      movingSideDigActive: true,
      targetDirectionX: targetDirection,
    });
  }
  const movingComplexVariant = !isQuickslash
    ? profile?.movingComplexDigVariantByBaseAnimationAndPhaseVariantId
      ?.[animationKey]?.[variantId]
    : null;
  const phaseAnimationKey = isQuickslash
    ? profile?.movingSideQuickslashAnimationKeyByPhaseVariantId?.[variantId]
    : (movingComplexVariant?.animationKey || variant.animationKey);
  return Object.freeze({
    animationKey: phaseAnimationKey || replacement,
    outgoingJogFrame,
    resumeJogFrame: movingComplexVariant?.resumeJogFrame ?? variant.resumeJogFrame,
    phaseVariantId: variant.id,
    movingSideDigActive: true,
    targetDirectionX: targetDirection,
  });
}

export function resolveMovingSideDigAnimationKey(options = {}) {
  return resolveMovingSideDigAnimation(options).animationKey;
}
