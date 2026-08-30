import {
  PLAYER_TRAVERSAL_CONFIG,
  resolvePlayerLedgeAssistEnabled,
} from "../values/playerTraversal.js";
import {
  findReachableLedge,
  resolveLedgeSearchDirections,
} from "./playerLedgeAssistGeometry.js";

const PHASE = Object.freeze({ catch: "catch", hang: "hang", climb: "climb" });
const RESULT = Object.freeze({ active: "active", completed: "completed", released: "released" });
const clamp01 = value => Math.max(0, Math.min(1, value));
const smooth = value => value * value * (3 - 2 * value);
const lerp = (from, to, alpha) => from + (to - from) * alpha;

export class PlayerLedgeAssist {
  constructor(body, worldModel, collisionSystem, tileSize, config = PLAYER_TRAVERSAL_CONFIG.ledgeAssist) {
    this.body = body;
    this.worldModel = worldModel;
    this.collisionSystem = collisionSystem;
    this.tileSize = tileSize;
    this.config = config;
    this.enabled = resolvePlayerLedgeAssistEnabled(globalThis.location?.search || "", config);
    this.phase = null;
    this.ledge = null;
    this.phaseElapsedMs = 0;
    this.pendingClimb = false;
    this.regrabCooldownMs = 0;
    this.catchOffset = null;
  }

  isActive() { return this.phase !== null; }

  updateCooldown(deltaMs) {
    this.regrabCooldownMs = Math.max(0, this.regrabCooldownMs - Math.max(0, deltaMs || 0));
  }

  tryGrab({ input, grounded, flightActive, facingRight, actionLocked }) {
    if (!this.enabled || this.isActive() || this.regrabCooldownMs > 0) return false;
    if (grounded || flightActive || actionLocked || !this.body) return false;
    const minimumFallSpeed = this.tileSize
      * this.config.capture.minimumFallSpeedTilesPerSecond;
    if ((this.body.vy || 0) < minimumFallSpeed) return false;
    const directions = resolveLedgeSearchDirections({
      input,
      body: this.body,
      facingRight,
      config: {
        ...this.config.capture,
        velocityDirectionThresholdTilesPerSecond: this.tileSize
          * this.config.capture.velocityDirectionThresholdTilesPerSecond,
      },
    });
    const ledge = findReachableLedge({
      body: this.body,
      worldModel: this.worldModel,
      collisionSystem: this.collisionSystem,
      tileSize: this.tileSize,
      directions,
      config: this.config.capture,
    });
    if (!ledge) return false;
    this.ledge = ledge;
    this.phase = PHASE.catch;
    this.phaseElapsedMs = 0;
    this.pendingClimb = false;
    this.catchOffset = Object.freeze({
      x: this.body.x - ledge.hangX,
      y: this.body.y - ledge.hangY,
    });
    this.body.setPosition(ledge.hangX, ledge.hangY);
    this.body.resetVelocity();
    this.body.onGround = false;
    return true;
  }

  updateActive(deltaMs, input, { flightActive = false } = {}) {
    if (!this.isActive()) return RESULT.released;
    if (flightActive) {
      this.cancel();
      return RESULT.released;
    }
    if (!this._ledgeStillValid()) {
      this.drop();
      return RESULT.released;
    }
    this.phaseElapsedMs += Math.max(0, deltaMs || 0);
    this.body.resetVelocity();
    this.body.onGround = false;
    if (this.phase === PHASE.catch) return this._updateCatch(input);
    if (this.phase === PHASE.hang) return this._updateHang(input);
    return this._updateClimb(deltaMs);
  }

  _captureGripInput(input) {
    const horizontal = input?.getHorizontalMovement?.() || {};
    const vertical = input?.getVerticalAim?.() || {};
    const movingAway = this.ledge.direction > 0 ? horizontal.left : horizontal.right;
    if (vertical.down || movingAway) {
      this.drop();
      return false;
    }
    this.pendingClimb = this.pendingClimb
      || input?.consumeJumpInput?.() === true
      || input?.isUp?.() === true;
    return true;
  }

  _updateCatch(input) {
    if (!this._captureGripInput(input)) return RESULT.released;
    if (this.phaseElapsedMs < this.config.catch.durationMs) return RESULT.active;
    this.phase = PHASE.hang;
    return this._beginClimbWhenReady();
  }

  _updateHang(input) {
    if (!this._captureGripInput(input)) return RESULT.released;
    return this._beginClimbWhenReady();
  }

  _beginClimbWhenReady() {
    if (
      this.pendingClimb
      && this.phaseElapsedMs >= this.config.hang.minimumDurationMs
    ) {
      this.phase = PHASE.climb;
      this.phaseElapsedMs = 0;
    }
    return RESULT.active;
  }

  _updateClimb(deltaMs) {
    const maxDeltaMs = this.config.climb.maxDeltaSeconds * 1000;
    const safeElapsed = this.phaseElapsedMs - Math.max(0, (deltaMs || 0) - maxDeltaMs);
    this.phaseElapsedMs = Math.max(0, safeElapsed);
    const progress = clamp01(this.phaseElapsedMs / this.config.climb.durationMs);
    const liftEnd = this.config.climb.liftEndProgress;
    const liftProgress = smooth(clamp01(progress / liftEnd));
    const overProgress = smooth(clamp01((progress - liftEnd) / (1 - liftEnd)));
    this.body.setPosition(
      lerp(this.ledge.hangX, this.ledge.standX, overProgress),
      lerp(this.ledge.hangY, this.ledge.standY, liftProgress),
    );
    if (progress < 1) return RESULT.active;
    this.body.setPosition(this.ledge.standX, this.ledge.standY);
    this.body.resetVelocity();
    this.body.onGround = true;
    this.cancel();
    return RESULT.completed;
  }

  _ledgeStillValid() {
    if (!this.ledge || !this.worldModel.isSolid(this.ledge.tx, this.ledge.ty)) return false;
    if (this.worldModel.isSolid(this.ledge.tx, this.ledge.ty - 1)) return false;
    const probe = {
      ...this.body,
      x: this.ledge.standX,
      y: this.ledge.standY,
      surfaceDropThroughRow: null,
    };
    return this.collisionSystem?.isBodyOverlappingSolid?.(probe) !== true;
  }

  drop() {
    if (!this.isActive()) return false;
    const direction = this.ledge?.direction || 1;
    this.cancel();
    this.body.vx = -direction * this.tileSize * this.config.capture.wallGapTiles;
    this.body.vy = this.tileSize * this.config.hang.dropVelocityTilesPerSecond;
    this.body.onGround = false;
    this.regrabCooldownMs = this.config.hang.regrabCooldownMs;
    return true;
  }

  cancel() {
    this.phase = null;
    this.ledge = null;
    this.phaseElapsedMs = 0;
    this.pendingClimb = false;
    this.catchOffset = null;
  }

  getVisualState() {
    if (!this.isActive()) return null;
    const catchProgress = this.phase === PHASE.catch
      ? smooth(clamp01(this.phaseElapsedMs / this.config.catch.durationMs))
      : 1;
    const offset = this.catchOffset && catchProgress < 1
      ? Object.freeze({
        x: lerp(this.catchOffset.x, 0, catchProgress),
        y: lerp(this.catchOffset.y, 0, catchProgress),
      })
      : Object.freeze({ x: 0, y: 0 });
    return Object.freeze({
      phase: this.phase,
      direction: this.ledge.direction,
      offset,
    });
  }

  getSnapshot() {
    return Object.freeze({
      enabled: this.enabled,
      phase: this.phase,
      direction: this.ledge?.direction || 0,
      support: this.ledge ? Object.freeze({ tx: this.ledge.tx, ty: this.ledge.ty }) : null,
      cooldownMs: this.regrabCooldownMs,
    });
  }
}
