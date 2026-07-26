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
    // The production run slot is the approved UAL Jog_Fwd_Loop. Grounded
    // movement always uses that gait; the walk thresholds remain available to
    // the isolated tuning lab and as a velocity fallback for non-runtime users.
    gaitAnimationRole: "run",
    moveEnterSpeedPxPerSec: 24,
    moveExitSpeedPxPerSec: 10,
    runEnterSpeedPxPerSec: 270,
    runExitSpeedPxPerSec: 230,
    pivotMinSpeedPxPerSec: 36,
  }),
  flight: Object.freeze({
    travelEnterSpeedPxPerSec: 72,
    travelExitSpeedPxPerSec: 38,
  }),
  airborne: Object.freeze({
    riseEnterVelocityPxPerSec: -18,
    fallEnterVelocityPxPerSec: 28,
  }),
  facing: Object.freeze({
    directionEpsilonPxPerSec: 1,
    sourceFacesRight: true,
  }),
});
