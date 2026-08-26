/** Selects the shared crouch enter, hold, and exit animation without owning input. */
export function resolveUalCrouchTransitionAnimation({
  wantsCrouch = false,
  currentAnimationKey = null,
  isPlaying = false,
  crouchIdleAnimationKey = null,
  crouchEnterAnimationKey = null,
  crouchExitAnimationKey = null,
} = {}) {
  if (!crouchIdleAnimationKey) return null;
  if (wantsCrouch) {
    if (!crouchEnterAnimationKey) return crouchIdleAnimationKey;
    if (currentAnimationKey === crouchEnterAnimationKey) {
      return isPlaying ? crouchEnterAnimationKey : crouchIdleAnimationKey;
    }
    return currentAnimationKey === crouchIdleAnimationKey
      ? crouchIdleAnimationKey
      : crouchEnterAnimationKey;
  }
  if (!crouchExitAnimationKey) return null;
  if (currentAnimationKey === crouchExitAnimationKey && isPlaying) {
    return crouchExitAnimationKey;
  }
  if (
    currentAnimationKey === crouchIdleAnimationKey
    || currentAnimationKey === crouchEnterAnimationKey
  ) return crouchExitAnimationKey;
  return null;
}
