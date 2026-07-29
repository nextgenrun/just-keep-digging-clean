/** Builds shared loop and one-shot selections for the UAL locomotion state machine. */

export function beginLocomotionTransition(
  phase,
  animationKey,
  facingFlipX,
  timeScale = null,
) {
  return {
    phase,
    animationKey,
    facingFlipX,
    timeScale,
    observedPlaying: false,
  };
}

export function advanceLocomotionTransition(transition, state) {
  if (!transition) return { completed: true, selection: null };
  if (state.currentAnimationKey === transition.animationKey && state.isPlaying) {
    transition.observedPlaying = true;
  }
  if (
    transition.observedPlaying
    && state.currentAnimationKey === transition.animationKey
    && !state.isPlaying
  ) return { completed: true, selection: null };
  return {
    completed: false,
    selection: {
      animationKey: transition.animationKey,
      phase: transition.phase,
      facingFlipX: transition.facingFlipX,
      timeScale: transition.timeScale,
      restart: !transition.observedPlaying,
      loop: false,
    },
  };
}

export function loopLocomotionSelection(animationKey, phase, facingFlipX, state) {
  return {
    animationKey,
    phase,
    facingFlipX,
    restart: state.currentAnimationKey !== animationKey || !state.isPlaying,
    loop: true,
  };
}

export function facingForVelocity(velocity, currentFlipX, config) {
  const epsilon = config.facing.directionEpsilonPxPerSec;
  const direction = velocity > epsilon ? 1 : velocity < -epsilon ? -1 : 0;
  if (direction === 0) return currentFlipX;
  return config.facing.sourceFacesRight ? direction < 0 : direction > 0;
}
