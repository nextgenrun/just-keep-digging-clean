/** Builds shared loop and one-shot selections for the UAL locomotion state machine. */

const finite = (value) => (Number.isFinite(value) ? value : 0);

export function normalizeLocomotionSnapshot(snapshot = {}) {
  return {
    grounded: snapshot.grounded === true,
    flying: snapshot.flying === true,
    horizontalVelocity: finite(snapshot.horizontalVelocity),
    verticalVelocity: finite(snapshot.verticalVelocity),
    currentAnimationKey: snapshot.currentAnimationKey || null,
    isPlaying: snapshot.isPlaying === true,
    facingFlipX: typeof snapshot.facingFlipX === "boolean" ? snapshot.facingFlipX : null,
    groundMovementActive: typeof snapshot.groundMovementActive === "boolean"
      ? snapshot.groundMovementActive
      : null,
    // Older callers omitted this field and retain the previous all-run gait.
    running: typeof snapshot.running === "boolean" ? snapshot.running : true,
    currentFrameIndex: Number.isFinite(snapshot.currentFrameIndex)
      ? Math.max(0, Math.floor(snapshot.currentFrameIndex))
      : 0,
    currentTextureFrame: Number.isFinite(Number(snapshot.currentTextureFrame))
      ? Math.max(0, Math.floor(Number(snapshot.currentTextureFrame)))
      : null,
  };
}

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
