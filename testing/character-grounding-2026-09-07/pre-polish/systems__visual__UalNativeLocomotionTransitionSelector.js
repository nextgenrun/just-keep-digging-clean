import {
  UAL_NATIVE_LOCOMOTION_PHASES as PHASE,
  UAL_NATIVE_LOCOMOTION_TRANSITION_CONFIG,
} from "../../values/ualNativeLocomotionTransitions.js";
import {
  PLAYER_ANIMATION_POLISH,
  isPlayerAnimationFeatureEnabled,
} from "../../values/playerAnimationPolish.js";
import { UalGroundPhaseHandoffSelector } from "./UalGroundPhaseHandoffSelector.js";
import { requireUalLocomotionAnimationKeys } from "./requireUalLocomotionAnimationKeys.js";
import {
  advanceLocomotionTransition,
  beginLocomotionTransition,
  facingForVelocity,
  loopLocomotionSelection,
  normalizeLocomotionSnapshot,
} from "./ualLocomotionSelections.js";

const GROUND_TRANSITIONS = new Set([
  PHASE.WALK_START, PHASE.WALK_STOP, PHASE.PIVOT_STOP, PHASE.PIVOT_START, PHASE.LANDING,
]);
const FLIGHT_TRANSITIONS = new Set([
  PHASE.FLIGHT_ENTER, PHASE.FLIGHT_TRAVEL_ENTER, PHASE.FLIGHT_EXIT,
]);

export class UalNativeLocomotionTransitionSelector {
  constructor(profile, config = UAL_NATIVE_LOCOMOTION_TRANSITION_CONFIG) {
    this.keys = requireUalLocomotionAnimationKeys(profile);
    this.config = config;
    this.continuousFlightLoop = profile?.continuousFlightLoop === true;
    this.animationPolish = profile?.animationPolishConfig || PLAYER_ANIMATION_POLISH;
    this.landingConfig = this.animationPolish.landing;
    this.landingEnabled = isPlayerAnimationFeatureEnabled(
      this.landingConfig,
      globalThis.location?.search || "",
      this.animationPolish,
    );
    this.softLandingAnimationKey = profile?.softLandingAnim || this.keys.landing;
    this.legacyLandingAnimationKey = profile?.legacyLandingAnim || this.keys.landing;
    this.groundHandoff = new UalGroundPhaseHandoffSelector(profile);
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
    this._maxAirborneDownwardSpeed = 0;
    this._landingMoveCancelFrame = 0;
    this._facingFlipX = facingFlipX === true;
    this._transition = null;
    this.groundHandoff.reset();
    return this;
  }
  requestRunResume(frame) {
    return this.groundHandoff.requestRunResume(frame);
  }
  resolve(snapshot = {}) {
    const state = normalizeLocomotionSnapshot(snapshot);
    state.previousFacingFlipX = this._facingFlipX;
    if (!state.grounded || state.flying) {
      this._markAirborneInterval();
      this._maxAirborneDownwardSpeed = Math.max(
        this._maxAirborneDownwardSpeed,
        state.verticalVelocity,
      );
    }
    if (state.grounded && !state.flying && state.facingFlipX !== null) {
      // Ground facing follows current input instead of smoothed displacement.
      // This makes low-speed reversals visible on the same frame.
      this._facingFlipX = state.facingFlipX;
    } else if (
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

    if (enteredFlight && !this.continuousFlightLoop) {
      this._beginTransition(PHASE.FLIGHT_ENTER, this.keys.flightEnter, this._facingFlipX);
      this._markAirborneInterval();
      this._flightTraveling = false;
    } else if (exitedFlight && !this.continuousFlightLoop) {
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
    this.groundHandoff.reset();
    this._groundMoving = false;
    this._groundRunning = false;
    this._markAirborneInterval();
    this._adoptVelocityFacing(state.horizontalVelocity);

    const speed = Math.hypot(state.horizontalVelocity, state.verticalVelocity);
    const flight = this.config.flight;
    const wantsTravel = speed >= (this._flightTraveling
      ? flight.travelExitSpeedPxPerSec
      : flight.travelEnterSpeedPxPerSec);

    if (this.continuousFlightLoop) {
      this._flightTraveling = wantsTravel;
      return this._loop(
        this.keys.flightTravelLoop,
        wantsTravel ? PHASE.FLIGHT_TRAVEL_LOOP : PHASE.FLIGHT_HOVER,
        state,
      );
    }

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
    this.groundHandoff.reset();
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
    const velocityMoving = speed >= (wasMoving
      ? ground.moveExitSpeedPxPerSec
      : ground.moveEnterSpeedPxPerSec);
    const moving = state.groundMovementActive ?? velocityMoving;
    this._groundMoving = moving;
    const wasRunning = this._groundRunning;
    const running = moving && state.running;
    this._groundRunning = running;

    if (this._airborneIntervalActive && !this._landingConsumed) {
      this._landingConsumed = true;
      const landing = this.landingEnabled ? this.landingConfig : this.config.landing;
      const impactSpeed = this._maxAirborneDownwardSpeed;
      const minimumImpact = landing.softMinImpactSpeedPxPerSec
        ?? landing.minImpactSpeedPxPerSec;
      if (impactSpeed >= minimumImpact) {
        const hardMinimum = landing.hardMinImpactSpeedPxPerSec
          ?? landing.minImpactSpeedPxPerSec;
        const hard = impactSpeed >= hardMinimum;
        const veryHard = landing.veryHardImpactSpeedPxPerSec
          ?? landing.hardImpactSpeedPxPerSec;
        const timeScale = hard
          ? impactSpeed >= veryHard ? landing.hardTimeScale : landing.mediumTimeScale
          : 1;
        const key = this.landingEnabled
          ? hard ? this.keys.landing : this.softLandingAnimationKey
          : this.legacyLandingAnimationKey;
        this._landingMoveCancelFrame = hard
          ? (landing.hardMoveCancelAfterFrameIndex ?? landing.moveCancelAfterFrameIndex)
          : (landing.softMoveCancelAfterFrameIndex ?? 0);
        this._beginTransition(PHASE.LANDING, key, this._facingFlipX, timeScale);
      } else {
        this._finishAirborneInterval();
      }
    }
    if (this._transition?.phase === PHASE.LANDING) {
      const movementCanCancel = moving
        && state.currentAnimationKey === this._transition.animationKey
        && state.isPlaying
        && state.currentFrameIndex >= this._landingMoveCancelFrame;
      if (movementCanCancel) {
        this._transition = null;
        if (this.landingEnabled) this.groundHandoff.requestRunResume(
          this.landingConfig.resumeJogFrame ?? 13,
        );
        this._finishAirborneInterval();
      }
      const pending = this._advanceTransition(state);
      if (pending) return pending;
      if (moving) {
        if (this.landingEnabled) this.groundHandoff.requestRunResume(
          this.landingConfig.resumeJogFrame ?? 13,
        );
      }
      this._finishAirborneInterval();
    }
    if (this._transition && this._transition.phase !== PHASE.LANDING) this._transition = null;
    let handoff = null;
    if (running || (wasRunning && !moving)) {
      handoff = this.groundHandoff.resolve({
        moving: running,
        horizontalSpeed: speed,
        currentAnimationKey: state.currentAnimationKey,
        currentFrameIndex: state.currentFrameIndex,
        isPlaying: state.isPlaying,
        currentTextureFrame: state.currentTextureFrame,
        previousFacingFlipX: state.previousFacingFlipX,
        nextFacingFlipX: this._facingFlipX,
      });
    } else {
      this.groundHandoff.reset();
    }
    const animationRole = running
      ? ground.runAnimationRole || ground.gaitAnimationRole
      : ground.walkAnimationRole;
    const base = moving
      ? this._loop(
        this.keys[animationRole] || (running ? this.keys.run : this.keys.walkLoop),
        running ? PHASE.RUN : PHASE.WALK_LOOP,
        state,
      )
      : this._loop(this.keys.idle, PHASE.IDLE, state);
    return { ...base, ...(handoff || {}) };
  }
  _markAirborneInterval() {
    if (this._airborneIntervalActive) return;
    this._airborneIntervalActive = true;
    this._landingConsumed = false;
    this._maxAirborneDownwardSpeed = 0;
  }

  _finishAirborneInterval() {
    this._airborneIntervalActive = false;
    this._landingConsumed = true;
    this._maxAirborneDownwardSpeed = 0;
  }

  _adoptVelocityFacing(velocity) {
    this._facingFlipX = facingForVelocity(velocity, this._facingFlipX, this.config);
  }

  _beginTransition(phase, animationKey, facingFlipX, timeScale = null) {
    this._transition = beginLocomotionTransition(
      phase,
      animationKey,
      facingFlipX,
      timeScale,
    );
  }

  _advanceTransition(state) {
    const advanced = advanceLocomotionTransition(this._transition, state);
    if (advanced.completed) this._transition = null;
    return advanced.selection;
  }

  _loop(animationKey, phase, state) {
    return loopLocomotionSelection(animationKey, phase, this._facingFlipX, state);
  }
}
