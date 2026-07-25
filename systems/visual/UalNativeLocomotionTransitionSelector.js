import {
  UAL_NATIVE_LOCOMOTION_PHASES as PHASE,
  UAL_NATIVE_LOCOMOTION_TRANSITION_CONFIG,
} from "../../values/ualNativeLocomotionTransitions.js";

const GROUND_TRANSITIONS = new Set([
  PHASE.WALK_START, PHASE.WALK_STOP, PHASE.PIVOT_STOP, PHASE.PIVOT_START, PHASE.LANDING,
]);
const FLIGHT_TRANSITIONS = new Set([
  PHASE.FLIGHT_ENTER, PHASE.FLIGHT_TRAVEL_ENTER, PHASE.FLIGHT_EXIT,
]);

function requireAnimationKeys(profile) {
  const keys = {
    idle: profile?.idleAnim,
    walkStart: profile?.walkStartAnim,
    walkLoop: profile?.walkLoopAnim,
    run: profile?.walkRunAnim,
    walkStop: profile?.walkStopAnim,
    flightEnter: profile?.flightEnterAnim,
    flightTravelEnter: profile?.flightTravelEnterAnim,
    flightTravelLoop: profile?.flightTravelLoopAnim,
    flightHover: profile?.flightHoverAnim,
    flightExit: profile?.flightExitAnim,
    airborneRise: profile?.airborneRiseAnim,
    airborneFall: profile?.airborneFallAnim,
    landing: profile?.landingAnim,
  };
  const missing = Object.entries(keys)
    .filter(([, value]) => typeof value !== "string" || value.length === 0)
    .map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(`UAL locomotion profile is missing animation keys: ${missing.join(", ")}`);
  }
  return Object.freeze(keys);
}
const finite = (value) => (Number.isFinite(value) ? value : 0);
export class UalNativeLocomotionTransitionSelector {
  constructor(profile, config = UAL_NATIVE_LOCOMOTION_TRANSITION_CONFIG) {
    this.keys = requireAnimationKeys(profile);
    this.config = config;
    this.reset();
  }
  reset({ grounded = true, flying = false, facingFlipX = false } = {}) {
    this._wasGrounded = grounded === true;
    this._wasFlying = flying === true;
    this._groundMoving = false;
    this._groundRunning = false;
    this._flightTraveling = false;
    this._airbornePhase = PHASE.AIRBORNE_RISE;
    this._airborneIntervalActive = !this._wasGrounded || this._wasFlying;
    this._landingConsumed = false;
    this._lastMoveDirection = 0;
    this._pendingPivotDirection = 0;
    this._facingFlipX = facingFlipX === true;
    this._transition = null;
    return this;
  }
  resolve(snapshot = {}) {
    const state = {
      grounded: snapshot.grounded === true,
      flying: snapshot.flying === true,
      horizontalVelocity: finite(snapshot.horizontalVelocity),
      verticalVelocity: finite(snapshot.verticalVelocity),
      currentAnimationKey: snapshot.currentAnimationKey || null,
      isPlaying: snapshot.isPlaying === true,
      facingFlipX: typeof snapshot.facingFlipX === "boolean" ? snapshot.facingFlipX : null,
    };
    if (
      state.facingFlipX !== null
      && Math.abs(state.horizontalVelocity) <= this.config.facing.directionEpsilonPxPerSec
      && this._transition?.phase !== PHASE.PIVOT_STOP
    ) {
      this._facingFlipX = state.facingFlipX;
    }
    const enteredFlight = state.flying && !this._wasFlying;
    const exitedFlight = !state.flying && this._wasFlying;
    this._wasGrounded = state.grounded;
    this._wasFlying = state.flying;

    if (enteredFlight) {
      this._beginTransition(PHASE.FLIGHT_ENTER, this.keys.flightEnter, this._facingFlipX);
      this._markAirborneInterval();
      this._flightTraveling = false;
    } else if (exitedFlight) {
      this._beginTransition(PHASE.FLIGHT_EXIT, this.keys.flightExit, this._facingFlipX);
      this._markAirborneInterval();
      this._flightTraveling = false;
    }
    if (this._transition?.phase === PHASE.FLIGHT_ENTER
      || this._transition?.phase === PHASE.FLIGHT_EXIT) {
      const pending = this._advanceTransition(state);
      if (pending) return pending;
    }
    if (state.flying) return this._resolveFlight(state);
    if (!state.grounded) return this._resolveAirborne(state);
    return this._resolveGround(state);
  }
  _resolveFlight(state) {
    if (this._transition && GROUND_TRANSITIONS.has(this._transition.phase)) this._transition = null;
    this._groundMoving = false;
    this._groundRunning = false;
    this._markAirborneInterval();
    this._adoptVelocityFacing(state.horizontalVelocity);

    const speed = Math.abs(state.horizontalVelocity);
    const flight = this.config.flight;
    const wantsTravel = speed >= (this._flightTraveling
      ? flight.travelExitSpeedPxPerSec
      : flight.travelEnterSpeedPxPerSec);

    if (this._transition?.phase === PHASE.FLIGHT_TRAVEL_ENTER) {
      if (!wantsTravel) this._transition = null;
      else {
        const pending = this._advanceTransition(state);
        if (pending) return pending;
        this._flightTraveling = true;
      }
    }
    if (wantsTravel && !this._flightTraveling) {
      this._beginTransition(
        PHASE.FLIGHT_TRAVEL_ENTER,
        this.keys.flightTravelEnter,
        this._facingFlipX,
      );
      return this._advanceTransition(state);
    }
    if (wantsTravel) {
      this._flightTraveling = true;
      return this._loop(this.keys.flightTravelLoop, PHASE.FLIGHT_TRAVEL_LOOP, state);
    }
    this._flightTraveling = false;
    return this._loop(this.keys.flightHover, PHASE.FLIGHT_HOVER, state);
  }
  _resolveAirborne(state) {
    if (this._transition && (GROUND_TRANSITIONS.has(this._transition.phase)
      || FLIGHT_TRANSITIONS.has(this._transition.phase))) this._transition = null;
    this._groundMoving = false;
    this._groundRunning = false;
    this._flightTraveling = false;
    this._markAirborneInterval();
    this._adoptVelocityFacing(state.horizontalVelocity);

    const airborne = this.config.airborne;
    if (state.verticalVelocity <= airborne.riseEnterVelocityPxPerSec) {
      this._airbornePhase = PHASE.AIRBORNE_RISE;
    } else if (state.verticalVelocity >= airborne.fallEnterVelocityPxPerSec) {
      this._airbornePhase = PHASE.AIRBORNE_FALL;
    }
    const key = this._airbornePhase === PHASE.AIRBORNE_FALL
      ? this.keys.airborneFall
      : this.keys.airborneRise;
    return this._loop(key, this._airbornePhase, state);
  }

  _resolveGround(state) {
    this._flightTraveling = false;
    const ground = this.config.ground;
    const speed = Math.abs(state.horizontalVelocity);
    const wasMoving = this._groundMoving;
    const moving = speed >= (wasMoving
      ? ground.moveExitSpeedPxPerSec
      : ground.moveEnterSpeedPxPerSec);
    const wasRunning = this._groundRunning;
    const running = moving && speed >= (wasRunning
      ? ground.runExitSpeedPxPerSec
      : ground.runEnterSpeedPxPerSec);
    const direction = this._directionOf(state.horizontalVelocity);
    this._groundMoving = moving;
    this._groundRunning = running;

    if (this._airborneIntervalActive && !this._landingConsumed) {
      this._landingConsumed = true;
      this._beginTransition(PHASE.LANDING, this.keys.landing, this._facingFlipX);
    }
    if (this._transition?.phase === PHASE.LANDING) {
      const pending = this._advanceTransition(state);
      if (pending) return pending;
      this._airborneIntervalActive = false;
    }
    if (this._transition?.phase === PHASE.PIVOT_STOP) {
      if (direction !== 0) this._pendingPivotDirection = direction;
      const pending = this._advanceTransition(state);
      if (pending) return pending;
      this._lastMoveDirection = this._pendingPivotDirection || this._lastMoveDirection;
      this._facingFlipX = this._flipForDirection(this._lastMoveDirection);
      this._beginTransition(PHASE.PIVOT_START, this.keys.walkStart, this._facingFlipX);
      return this._advanceTransition(state);
    }
    if (this._transition?.phase === PHASE.PIVOT_START
      || this._transition?.phase === PHASE.WALK_START) {
      if (!moving) {
        this._beginTransition(PHASE.WALK_STOP, this.keys.walkStop, this._facingFlipX);
        return this._advanceTransition(state);
      }
      if (direction !== 0 && this._lastMoveDirection !== 0
        && direction !== this._lastMoveDirection) {
        this._pendingPivotDirection = direction;
        this._beginTransition(PHASE.PIVOT_STOP, this.keys.walkStop, this._facingFlipX);
        return this._advanceTransition(state);
      }
      const pending = this._advanceTransition(state);
      if (pending) return pending;
    } else if (this._transition?.phase === PHASE.WALK_STOP) {
      const pending = this._advanceTransition(state);
      if (pending) return pending;
      if (moving) {
        this._adoptGroundDirection(direction);
        this._beginTransition(PHASE.WALK_START, this.keys.walkStart, this._facingFlipX);
        return this._advanceTransition(state);
      }
    }
    if (moving && wasMoving && direction !== 0 && this._lastMoveDirection !== 0
      && direction !== this._lastMoveDirection && speed >= ground.pivotMinSpeedPxPerSec) {
      this._pendingPivotDirection = direction;
      this._beginTransition(PHASE.PIVOT_STOP, this.keys.walkStop, this._facingFlipX);
      return this._advanceTransition(state);
    }
    if (moving && !wasMoving) {
      this._adoptGroundDirection(direction);
      this._beginTransition(PHASE.WALK_START, this.keys.walkStart, this._facingFlipX);
      return this._advanceTransition(state);
    }
    if (!moving && wasMoving) {
      this._beginTransition(PHASE.WALK_STOP, this.keys.walkStop, this._facingFlipX);
      return this._advanceTransition(state);
    }
    if (moving) {
      this._adoptGroundDirection(direction);
      return running
        ? this._loop(this.keys.run, PHASE.RUN, state)
        : this._loop(this.keys.walkLoop, PHASE.WALK_LOOP, state);
    }
    return this._loop(this.keys.idle, PHASE.IDLE, state);
    }
  _markAirborneInterval() {
    this._airborneIntervalActive = true;
    this._landingConsumed = false;
  }

  _directionOf(velocity) {
    const epsilon = this.config.facing.directionEpsilonPxPerSec;
    if (velocity > epsilon) return 1;
    if (velocity < -epsilon) return -1;
    return 0;
  }

  _flipForDirection(direction) {
    if (direction === 0) return this._facingFlipX;
    return this.config.facing.sourceFacesRight ? direction < 0 : direction > 0;
  }

  _adoptVelocityFacing(velocity) {
    const direction = this._directionOf(velocity);
    if (direction !== 0) this._facingFlipX = this._flipForDirection(direction);
  }

  _adoptGroundDirection(direction) {
    if (direction === 0) return;
    this._lastMoveDirection = direction;
    this._facingFlipX = this._flipForDirection(direction);
  }

  _beginTransition(phase, animationKey, facingFlipX) {
    this._transition = { phase, animationKey, facingFlipX, observedPlaying: false };
  }

  _advanceTransition(state) {
    const transition = this._transition;
    if (!transition) return null;
    if (state.currentAnimationKey === transition.animationKey && state.isPlaying) {
      transition.observedPlaying = true;
    }
    if (transition.observedPlaying
      && state.currentAnimationKey === transition.animationKey
      && !state.isPlaying) {
      this._transition = null;
      return null;
    }
    return {
      animationKey: transition.animationKey,
      phase: transition.phase,
      facingFlipX: transition.facingFlipX,
      restart: !transition.observedPlaying,
      loop: false,
    };
  }

  _loop(animationKey, phase, state) {
    return {
      animationKey,
      phase,
      facingFlipX: this._facingFlipX,
      restart: state.currentAnimationKey !== animationKey || !state.isPlaying,
      loop: true,
    };
  }
}
