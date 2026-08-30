export function resolveHeldTorchBaseAnimationKey(profile, animationKey) {
  return profile?.heldTorchBaseAnimationByVariant?.[animationKey] || animationKey || null;
}

export function resolveHeldTorchAnimationKey(profile, animationKey, torchActive) {
  if (!torchActive || profile?.heldTorchRuntime?.enabled !== true) return animationKey;
  return profile.heldTorchAnimationByBaseAnimation?.[animationKey] || animationKey;
}

export function isHeldTorchAnimationKey(profile, animationKey) {
  return Boolean(profile?.heldTorchBaseAnimationByVariant?.[animationKey]);
}

export function resolveHeldTorchPresentation(profile, animationKey, carriedVisible) {
  const available = profile?.heldTorchRuntime?.enabled === true;
  const visible = available
    && carriedVisible
    && isHeldTorchAnimationKey(profile, animationKey);
  return {
    available,
    visible,
    legacyVisible: carriedVisible && !available,
    snapshot: available ? {
      available: true,
      visible,
      source: "blender-character-animation",
      animationKey,
    } : null,
  };
}
