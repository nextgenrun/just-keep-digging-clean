export const UAL_NATIVE_LOCOMOTION_PHASES = Object.freeze({
  IDLE: "idle",
  WALK_START: "walk-start",
  WALK_LOOP: "walk-loop",
  RUN: "run",
  WALK_STOP: "walk-stop",
  PIVOT_STOP: "pivot-stop",
  PIVOT_START: "pivot-start",
  FLIGHT_ENTER: "flight-enter",
  FLIGHT_TRAVEL_ENTER: "flight-travel-enter",
  FLIGHT_TRAVEL_LOOP: "flight-travel-loop",
  FLIGHT_HOVER: "flight-hover",
  FLIGHT_EXIT: "flight-exit",
  AIRBORNE_RISE: "airborne-rise",
  AIRBORNE_FALL: "airborne-fall",
  LANDING: "landing",
});

export const UAL_NATIVE_LOCOMOTION_TRANSITION_CONFIG = Object.freeze({
  ground: Object.freeze({
    // The production run slot preserves the existing animation key but now
    // carries the approved Mixamo Standard Walk. Every grounded speed uses that
    // gait so speed thresholds cannot switch mesh occupancy mid-stride.
    gaitAnimationRole: "run",
    moveEnterSpeedPxPerSec: 24,
    moveExitSpeedPxPerSec: 10,
    runEnterSpeedPxPerSec: 270,
    runExitSpeedPxPerSec: 230,
    pivotMinSpeedPxPerSec: 36,
  }),
  flight: Object.freeze({
    travelEnterSpeedPxPerSec: 92,
    travelExitSpeedPxPerSec: 48,
  }),
  airborne: Object.freeze({
    riseEnterVelocityPxPerSec: -18,
    fallEnterVelocityPxPerSec: 28,
  }),
  landing: Object.freeze({
    minImpactSpeedPxPerSec: 260,
    hardImpactSpeedPxPerSec: 600,
    mediumTimeScale: 1.4,
    hardTimeScale: 1,
    moveCancelAfterFrameIndex: 5,
  }),
  facing: Object.freeze({
    directionEpsilonPxPerSec: 1,
    sourceFacesRight: true,
  }),
});
